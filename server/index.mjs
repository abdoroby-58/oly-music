import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import {
  randomUUID,
  randomBytes,
  createHash,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  all,
  one,
  run,
  tx,
  init,
  cloud,
  demo,
  hashPassword,
  notify,
} from "./db.mjs";
if (process.env.NODE_ENV === "production" && !cloud)
  throw new Error(
    "Configure your Supabase DATABASE_URL before starting production.",
  );
await init();
const mediaRoot = path.resolve(process.env.MEDIA_PATH || "data/media");
const app = express(),
  port = Number(process.env.PORT || 5173);
app.set("trust proxy", 1);
app.disable("x-powered-by");
const DAY = 86400000,
  cats = ["مهرجانات", "حزينة", "راب", "شعبي"];
const time = () => Date.now();
const storage =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      ).storage.from(process.env.SUPABASE_STORAGE_BUCKET || "oly-media")
    : null;
const err = (code, message) => {
  throw Object.assign(new Error(message), { status: code, expected: true });
};
const text = (v, l = 120) =>
  String(v ?? "")
    .trim()
    .normalize("NFC")
    .slice(0, l);
const hash = (s) => createHash("sha256").update(s).digest("hex");
const parseCookies = (s) =>
  Object.fromEntries((s || "").split(";").map((v) => v.trim().split("=")));
const cookie = (req, res, key, value, maxAge) => {
  const secure = req.secure || req.get("host")?.endsWith(".e2b.app");
  res.cookie(key, value, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    partitioned: secure,
    path: "/",
    maxAge,
  });
};
function validateName(n) {
  if (!/^[\p{L}\p{M}\p{N}_. -]{3,32}$/u.test(n))
    err(
      400,
      "اسم المستخدم من 3 إلى 32 حرفًا، ويمكن أن يحتوي على أرقام أو شرطة سفلية.",
    );
}
const expose = (u) =>
  u
    ? {
        id: u.id,
        username: u.username,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        verified: !!u.verified,
        banned: !!u.banned,
        about: u.about,
        created_at: Number(u.created_at),
        username_changed_at: Number(u.username_changed_at),
        notification_seen_at: Number(u.notification_seen_at),
      }
    : null;
const ensure = (req) => {
  if (!req.user) err(401, "سجّل الدخول أولًا للمتابعة.");
  if (req.user.banned) err(403, "هذا الحساب محظور من الموقع.");
  return req.user;
};
const staff = (req) => {
  const u = ensure(req);
  if (u.role !== "admin") err(403, "هذه الصفحة متاحة للإدارة فقط.");
  return u;
};
const limits = new Map();
function limit(key, max, ms) {
  let a = limits.get(key) || { n: 0, reset: time() + ms };
  if (a.reset < time()) a = { n: 0, reset: time() + ms };
  a.n++;
  limits.set(key, a);
  if (a.n > max) err(429, "طلبات كثيرة في وقت قصير. حاول مرة أخرى لاحقًا.");
  if (limits.size > 15000)
    for (const [k, v] of limits) if (v.reset < time()) limits.delete(k);
}
app.use("/api", express.json({ limit: "128kb" }));
app.use("/api", async (req, res, next) => {
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("origin")) {
    let origin;
    try {
      origin = new URL(req.get("origin")).host;
    } catch {
      err(403, "مصدر الطلب غير صالح.");
    }
    if (
      ![
        req.get("host"),
        req.get("x-forwarded-host")?.split(",")[0]?.trim(),
      ].includes(origin)
    )
      err(403, "مصدر الطلب غير مسموح.");
  }
  const c = parseCookies(req.headers.cookie);
  req.session = c.oly_session;
  req.visitor = c.oly_visitor;
  if (!req.visitor || !/^[a-f0-9-]{36}$/.test(req.visitor)) {
    req.visitor = randomUUID();
    cookie(req, res, "oly_visitor", req.visitor, 365 * DAY);
    await run(
      "INSERT INTO visitors(id,first_seen) VALUES(?,?) ON CONFLICT(id) DO NOTHING",
      [req.visitor, time()],
    );
  }
  if (req.session)
    req.user = await one(
      "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires_at>?",
      [hash(req.session), time()],
    );
  if (req.user?.banned && !["/auth/logout", "/me"].includes(req.path))
    err(403, "حسابك محظور. لا يمكنك استخدام الموقع بهذا الحساب.");
  next();
});
async function session(req, res, u) {
  const token = randomBytes(32).toString("hex");
  await run("DELETE FROM sessions WHERE expires_at<?", [time()]);
  await run("INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)", [
    hash(token),
    u.id,
    time() + 30 * DAY,
  ]);
  cookie(req, res, "oly_session", token, 30 * DAY);
}
app.get("/api/me", async (req, res) =>
  res.json({ user: expose(req.user), demo }),
);
app.post("/api/auth/register", async (req, res) => {
  limit("reg:" + req.ip, 12, 60 * 60000);
  const username = text(req.body.username, 40),
    email = text(req.body.email, 260).toLowerCase(),
    password = String(req.body.password || "");
  validateName(username);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    err(400, "اكتب عنوان بريد إلكتروني صالحًا.");
  if (password.length < 8 || password.length > 128)
    err(400, "يجب أن تكون كلمة السر بين 8 و128 حرفًا.");
  const id = randomUUID(),
    pw = hashPassword(password);
  await tx(async () => {
    if (
      await one("SELECT id FROM users WHERE lower(username)=lower(?)", [
        username,
      ])
    )
      err(409, "اسم المستخدم محجوز، جرّب اسمًا آخر.");
    if (await one("SELECT id FROM users WHERE lower(email)=?", [email]))
      err(409, "البريد الإلكتروني مسجّل بالفعل.");
    await run(
      "INSERT INTO users(id,username,email,password,created_at,username_changed_at) VALUES(?,?,?,?,?,?)",
      [id, username, email, pw, time(), time()],
    );
    await notify(
      "admins",
      "signup",
      "حساب جديد",
      "انضم " + username + " إلى Oly Music.",
    );
    await notify(
      id,
      "welcome",
      "أهلًا بك في Oly Music",
      "مكتبتك جاهزة. اكتشف أول أغنية مفضلة لك.",
    );
  });
  const u = await one("SELECT * FROM users WHERE id=?", [id]);
  await session(req, res, u);
  res.status(201).json({ user: expose(u) });
});
app.post("/api/auth/login", async (req, res) => {
  limit("login:" + req.ip, 35, 15 * 60000);
  const email = text(req.body.email, 254).toLowerCase(),
    p = String(req.body.password || "");
  if (p.length > 128) err(400, "بيانات الدخول غير صحيحة.");
  const u = await one("SELECT * FROM users WHERE lower(email)=?", [email]);
  const [salt, h] = (u?.password || "empty:" + "0".repeat(128)).split(":");
  if (!timingSafeEqual(scryptSync(p, salt, 64), Buffer.from(h, "hex")) || !u)
    err(401, "البريد الإلكتروني أو كلمة السر غير صحيحة.");
  if (u.banned) err(403, "تم حظر هذا الحساب من الموقع.");
  await session(req, res, u);
  res.json({ user: expose(u) });
});
app.post("/api/auth/logout", async (req, res) => {
  if (req.session)
    await run("DELETE FROM sessions WHERE token=?", [hash(req.session)]);
  cookie(req, res, "oly_session", "", 0);
  res.json({ ok: true });
});
const songSelect = `SELECT s.*,u.username,u.avatar,u.verified,(SELECT count(*) FROM likes l WHERE l.song_id=s.id) AS likes_count FROM songs s JOIN users u ON u.id=s.user_id`;
app.get("/api/catalog", async (req, res) => {
  const songs = await all(
    songSelect +
      " WHERE s.status='approved' AND s.flagged=0 AND u.banned=0 ORDER BY s.published_at DESC",
  );
  const artists = await all(
    "SELECT u.id,u.username,u.avatar,u.verified,u.about FROM users u WHERE u.banned=0 AND EXISTS(SELECT 1 FROM songs s WHERE s.user_id=u.id AND s.status='approved' AND s.flagged=0) ORDER BY u.verified DESC,u.created_at ASC,u.username",
  );
  const banners = await all("SELECT * FROM banners ORDER BY id");
  res.json({
    songs: songs.map(
      ({ review_note, reports_count, flagged, ...song }) => song,
    ),
    artists,
    banners,
  });
});
app.get("/api/library", async (req, res) => {
  const u = ensure(req),
    [likes, favs, follows, mine] = await Promise.all([
      all("SELECT song_id FROM likes WHERE user_id=?", [u.id]),
      all("SELECT song_id FROM favorites WHERE user_id=?", [u.id]),
      all("SELECT artist_id FROM follows WHERE user_id=?", [u.id]),
      all(songSelect + " WHERE s.user_id=? ORDER BY s.created_at DESC", [u.id]),
    ]);
  res.json({
    likes: likes.map((x) => x.song_id),
    favorites: favs.map((x) => x.song_id),
    follows: follows.map((x) => x.artist_id),
    mine,
  });
});
const playable = async (id) => {
  const s = await one(
    "SELECT s.* FROM songs s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.status='approved' AND s.flagged=0 AND u.banned=0",
    [id],
  );
  if (!s) err(404, "هذه الأغنية غير متاحة حاليًا.");
  return s;
};
app.post("/api/songs/:id/play", async (req, res) => {
  limit("play:" + req.visitor, 100, 60000);
  await tx(async () => {
    const s = await playable(req.params.id);
    const changed = await run(
      "INSERT INTO play_events(visitor_id,song_id,played_at) VALUES(?,?,?) ON CONFLICT(visitor_id,song_id) DO UPDATE SET played_at=excluded.played_at WHERE play_events.played_at<?",
      [req.visitor, s.id, time(), time() - 30 * 60000],
    );
    if (changed) await run("UPDATE songs SET plays=plays+1 WHERE id=?", [s.id]);
  });
  res.json({ ok: true });
});
app.post("/api/songs/:id/:action", async (req, res, next) => {
  if (!["like", "favorite"].includes(req.params.action)) return next();
  const u = ensure(req),
    s = await playable(req.params.id),
    t = req.params.action === "like" ? "likes" : "favorites";
  const active = await tx(async () => {
    if (
      await run(`DELETE FROM ${t} WHERE user_id=? AND song_id=?`, [u.id, s.id])
    )
      return false;
    await run(
      `INSERT INTO ${t}(user_id,song_id) VALUES(?,?) ON CONFLICT DO NOTHING`,
      [u.id, s.id],
    );
    return true;
  });
  res.json({ active });
});
app.post("/api/artists/:id/follow", async (req, res) => {
  const u = ensure(req),
    id = req.params.id;
  if (id === u.id) err(400, "لا يمكنك متابعة حسابك.");
  if (!(await one("SELECT id FROM users WHERE id=? AND banned=0", [id])))
    err(404, "هذا الحساب غير متاح.");
  const active = await tx(async () => {
    if (
      await run("DELETE FROM follows WHERE user_id=? AND artist_id=?", [
        u.id,
        id,
      ])
    )
      return false;
    await run(
      "INSERT INTO follows(user_id,artist_id) VALUES(?,?) ON CONFLICT DO NOTHING",
      [u.id, id],
    );
    return true;
  });
  res.json({ active });
});
app.post("/api/songs/:id/report", async (req, res) => {
  const u = ensure(req),
    id = req.params.id,
    reason = text(req.body.reason, 90),
    note = text(req.body.note, 350);
  if (
    ![
      "محتوى غير مناسب",
      "انتهاك حقوق النشر",
      "مشكلة في الصوت",
      "سبب آخر",
    ].includes(reason)
  )
    err(400, "اختر سبب الإبلاغ.");
  await tx(async () => {
    const s = await playable(id);
    if (s.user_id === u.id) err(400, "لا يمكنك الإبلاغ عن أغنيتك.");
    const n = await run(
      "INSERT INTO reports(id,user_id,song_id,reason,note,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,song_id) DO NOTHING",
      [randomUUID(), u.id, id, reason, note, time()],
    );
    if (!n) err(409, "سبق أن أبلغت عن هذه الأغنية.");
    await run("UPDATE songs SET reports_count=reports_count+1 WHERE id=?", [
      id,
    ]);
    const updated = await one("SELECT reports_count FROM songs WHERE id=?", [
      id,
    ]);
    await notify(
      "admins",
      "report",
      "إبلاغ جديد",
      "بلاغ عن «" + s.title + "»: " + reason,
      id,
    );
    if (updated.reports_count >= 5) {
      await run("UPDATE songs SET flagged=1,status='pending' WHERE id=?", [id]);
      await notify(
        s.user_id,
        "review",
        "أغنيتك قيد المراجعة",
        "أُخفيت «" + s.title + "» مؤقتًا بعد وصول خمسة بلاغات.",
        id,
      );
    }
  });
  res.json({ ok: true });
});
app.get("/api/notifications", async (req, res) => {
  const u = req.user,
    a = [
      "all",
      ...(u ? [u.id] : []),
      ...(u?.role === "admin" ? ["admins"] : []),
    ];
  const items = await all(
    "SELECT id,kind,title,body,song_id,created_at FROM notifications WHERE audience IN (" +
      a.map(() => "?").join(",") +
      ") ORDER BY created_at DESC LIMIT 60",
    a,
  );
  res.json({ items, seen_at: u?.notification_seen_at || 0 });
});
app.post("/api/notifications/read", async (req, res) => {
  const u = ensure(req);
  await run("UPDATE users SET notification_seen_at=? WHERE id=?", [
    time(),
    u.id,
  ]);
  res.json({ ok: true });
});
// File content is checked before storage. Audio is served only after a visibility check.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024, files: 2, fields: 7, fieldSize: 4096 },
});
function sniff(b) {
  if (b.length < 12) return "";
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return "image/png";
  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WAVE"
  )
    return "audio/wav";
  if (b.toString("ascii", 0, 4) === "OggS") return "audio/ogg";
  if (
    b.toString("ascii", 0, 3) === "ID3" ||
    (b[0] === 255 && (b[1] & 224) === 224)
  )
    return "audio/mpeg";
  if (b.toString("ascii", 4, 8) === "ftyp") return "audio/mp4";
  return "";
}
function checkFile(f, kind) {
  if (!f)
    err(400, kind === "audio" ? "اختر ملف الأغنية الصوتي." : "اختر صورة.");
  const mime = sniff(f.buffer);
  if (
    !(kind === "audio" ? mime.startsWith("audio/") : mime.startsWith("image/"))
  )
    err(400, "صيغة الملف غير مدعومة. اختر ملفًا صوتيًا أو صورة بصيغة صحيحة.");
  if (kind !== "audio" && f.size > 5 * 1024 * 1024)
    err(400, "يجب ألا يتجاوز حجم الصورة 5 ميجابايت.");
  return mime;
}
async function saveFile(f, uid, kind) {
  const mime = checkFile(f, kind),
    id = randomUUID(),
    key =
      uid +
      "/" +
      id +
      "." +
      ({ "audio/mpeg": "mp3", "audio/mp4": "m4a" }[mime] || mime.split("/")[1]);
  if (storage) {
    const r = await storage.upload(key, f.buffer, {
      contentType: mime,
      upsert: false,
    });
    if (r.error)
      err(502, "تعذر حفظ الملف في التخزين. تحقق من إعدادات الحاوية الخاصة.");
  } else {
    fs.mkdirSync(path.resolve(mediaRoot, uid), { recursive: true });
    fs.writeFileSync(path.resolve(mediaRoot, key), f.buffer);
  }
  await run(
    "INSERT INTO media(id,owner_id,kind,mime,storage_key,created_at) VALUES(?,?,?,?,?,?)",
    [id, uid, kind, mime, key, time()],
  );
  return "/api/media/" + id;
}
app.get("/api/media/:id", async (req, res) => {
  const m = await one("SELECT * FROM media WHERE id=?", [req.params.id]);
  if (!m) err(404, "الملف غير موجود.");
  if (
    m.kind === "audio" &&
    req.user?.id !== m.owner_id &&
    req.user?.role !== "admin"
  ) {
    if (
      !(await one(
        "SELECT s.id FROM songs s JOIN users u ON u.id=s.user_id WHERE s.audio_url=? AND s.status='approved' AND s.flagged=0 AND u.banned=0",
        ["/api/media/" + m.id],
      ))
    )
      err(404, "الملف غير متاح.");
  }
  res.set("Content-Type", m.mime);
  if (storage) {
    const { data, error } = await storage.createSignedUrl(m.storage_key, 120);
    if (error) err(502, "تعذر تحميل الملف.");
    return res.redirect(data.signedUrl);
  }
  res.sendFile(path.resolve(mediaRoot, m.storage_key));
});
const requireUser = (req, res, next) => {
    ensure(req);
    next();
  },
  requireAdmin = (req, res, next) => {
    staff(req);
    next();
  };
app.post(
  "/api/songs",
  requireUser,
  (req, res, next) => {
    limit("upload:" + req.user.id, 24, DAY);
    next();
  },
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  async (req, res) => {
    const title = text(req.body.title, 100),
      category = text(req.body.category, 20);
    if (title.length < 2) err(400, "عنوان الأغنية قصير جدًا.");
    if (!cats.includes(category)) err(400, "اختر تصنيفًا صحيحًا.");
    checkFile(req.files?.audio?.[0], "audio");
    if (req.files?.cover?.[0]) checkFile(req.files.cover[0], "cover");
    const id = randomUUID(),
      duration = Math.max(
        0,
        Math.min(14400, Math.floor(Number(req.body.duration) || 0)),
      );
    await tx(async () => {
      const audio = await saveFile(req.files.audio[0], req.user.id, "audio"),
        cover = req.files.cover?.[0]
          ? await saveFile(req.files.cover[0], req.user.id, "cover")
          : "/art/record.svg";
      await run(
        "INSERT INTO songs(id,title,artist,category,audio_url,cover,user_id,duration,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
        [
          id,
          title,
          req.user.username,
          category,
          audio,
          cover,
          req.user.id,
          duration,
          time(),
        ],
      );
      await notify(
        "admins",
        "pending",
        "أغنية تنتظر المراجعة",
        "أضاف " + req.user.username + " أغنية «" + title + "».",
        id,
      );
    });
    res.status(201).json({ id, status: "pending" });
  },
);
app.patch(
  "/api/profile",
  requireUser,
  upload.single("avatar"),
  async (req, res) => {
    const u = req.user,
      name = text(req.body.username ?? u.username, 40),
      about = text(req.body.about ?? u.about, 220);
    validateName(name);
    await tx(async () => {
      if (name !== u.username) {
        const changed = await run(
          "UPDATE users SET username=?,username_changed_at=? WHERE id=? AND username_changed_at<=?",
          [name, time(), u.id, time() - 30 * DAY],
        );
        if (!changed)
          err(400, "يمكن تغيير اسم المستخدم مرة واحدة كل 30 يومًا.");
        await run("UPDATE songs SET artist=? WHERE user_id=?", [name, u.id]);
      }
      const avatar = req.file
        ? await saveFile(req.file, u.id, "avatar")
        : u.avatar;
      await run("UPDATE users SET avatar=?,about=? WHERE id=?", [
        avatar,
        about,
        u.id,
      ]);
    });
    res.json({
      user: expose(await one("SELECT * FROM users WHERE id=?", [u.id])),
    });
  },
);
app.use("/api/admin", requireAdmin);
app.get("/api/admin/overview", async (req, res) => {
  const [users, songs, reports, visitors, banners] = await Promise.all([
    all(
      "SELECT id,username,email,avatar,role,verified,banned,created_at FROM users ORDER BY created_at DESC",
    ),
    all(songSelect + " ORDER BY s.created_at DESC"),
    all(
      "SELECT r.*,u.username AS reporter FROM reports r JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC",
    ),
    one("SELECT COUNT(*) AS n FROM visitors"),
    all("SELECT * FROM banners ORDER BY id"),
  ]);
  res.json({ users, songs, reports, visitors: Number(visitors.n), banners });
});
app.post("/api/admin/users/:id", async (req, res) => {
  const id = req.params.id,
    act = req.body.action,
    u = await one("SELECT id,role,username FROM users WHERE id=?", [id]);
  if (!u) err(404, "الحساب غير موجود.");
  if (!["verify", "unverify", "ban", "unban"].includes(act))
    err(400, "إجراء غير صالح.");
  if (u.role === "admin" && ["ban", "unban"].includes(act))
    err(400, "لا يمكن حظر حساب إدارة.");
  if (act.includes("verify")) {
    await run("UPDATE users SET verified=? WHERE id=?", [
      act === "verify" ? 1 : 0,
      id,
    ]);
    await notify(
      id,
      "account",
      "تحديث توثيق الحساب",
      act === "verify"
        ? "تم توثيق حسابك بالعلامة الزرقاء."
        : "تم إلغاء توثيق الحساب.",
    );
  } else {
    await run("UPDATE users SET banned=? WHERE id=?", [
      act === "ban" ? 1 : 0,
      id,
    ]);
  }
  res.json({ ok: true });
});
app.post("/api/admin/songs/:id", async (req, res) => {
  const id = req.params.id,
    act = req.body.action,
    note = text(req.body.note, 300);
  if (!["approve", "reject", "dismiss"].includes(act))
    err(400, "إجراء غير صالح.");
  await tx(async () => {
    const s = await one("SELECT * FROM songs WHERE id=?", [id]);
    if (!s) err(404, "الأغنية غير موجودة.");
    if (act === "dismiss" && s.reports_count === 0) err(400, "لا توجد بلاغات.");
    const status =
      act === "reject"
        ? "rejected"
        : act === "approve" || s.flagged
          ? "approved"
          : s.status;
    await run(
      "UPDATE songs SET status=?,flagged=0,reports_count=0,review_note=?,published_at=? WHERE id=?",
      [
        status,
        note,
        status === "approved" && s.status !== "approved"
          ? time()
          : s.published_at,
        id,
      ],
    );
    await run("DELETE FROM reports WHERE song_id=?", [id]);
    await notify(
      s.user_id,
      "review",
      status === "approved" ? "تم قبول أغنيتك" : "تمت مراجعة أغنيتك",
      "«" +
        s.title +
        "» " +
        (status === "approved" ? "متاحة الآن للاستماع." : "لم تُقبل للنشر.") +
        (note ? " السبب: " + note : ""),
      id,
    );
    if (status === "approved" && s.status !== "approved")
      await notify(
        "all",
        "release",
        "إصدار جديد على Oly",
        "استمع إلى «" + s.title + "» من " + s.artist + ".",
        id,
      );
  });
  res.json({ ok: true });
});
app.put("/api/admin/banners/:id", upload.single("image"), async (req, res) => {
  const id = Number(req.params.id),
    title = text(req.body.title, 50),
    subtitle = text(req.body.subtitle, 130),
    label = text(req.body.label, 32),
    sid = text(req.body.song_id, 100) || null;
  if (![1, 2, 3].includes(id) || !title || !label)
    err(400, "أكمل عنوان البنر وشاراته.");
  if (sid) await playable(sid);
  const b = await one("SELECT image FROM banners WHERE id=?", [id]);
  const img = req.file
    ? await saveFile(req.file, req.user.id, "banner")
    : b.image;
  await run(
    "UPDATE banners SET title=?,subtitle=?,image=?,label=?,song_id=? WHERE id=?",
    [title, subtitle, img, label, sid, id],
  );
  res.json({ ok: true });
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "المسار غير موجود." }),
);
app.use((e, req, res, next) => {
  if (res.headersSent) return next(e);
  const unique = e.code === "23505" || /UNIQUE constraint/.test(e.message);
  if (!e.expected && !unique && !(e instanceof multer.MulterError))
    console.error("API error:", e.code || e.name);
  res
    .status(
      unique ? 409 : e instanceof multer.MulterError ? 400 : e.status || 500,
    )
    .json({
      error: unique
        ? "اسم المستخدم أو البيانات مسجّلة بالفعل."
        : e instanceof multer.MulterError
          ? "الملف أكبر من الحد المسموح أو غير صالح."
          : e.expected
            ? e.message
            : "حدث خطأ أثناء تنفيذ الطلب. حاول مجددًا.",
    });
});
// Serve only the compiled client, never database files, .env, or server source.
if (process.env.NODE_ENV === "test") {
  app.use(express.static("public"));
} else {
  if (!fs.existsSync("dist/index.html")) {
    const { build } = await import("vite");
    await build();
  }
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    next();
  });
  app.use(
    express.static("dist", {
      dotfiles: "deny",
      setHeaders: (res, file) => {
        if (file.includes(path.sep + "assets" + path.sep))
          res.set("Cache-Control", "public,max-age=31536000,immutable");
      },
    }),
  );
  app.get("/{*path}", (req, res) => {
    if (path.extname(req.path)) return res.status(404).end();
    res.sendFile(path.resolve("dist/index.html"));
  });
}
const host = process.env.BIND_ADDRESS || "0.0.0.0";
const srv = app.listen(port, host, () =>
  console.log(
    `Oly Music ready on ${host}:${srv.address().port} • ${cloud ? "Supabase PostgreSQL" : "local SQLite"}${demo ? " • preview catalogue" : ""}`,
  ),
);
