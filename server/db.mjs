import fs from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";
export const cloud = Boolean(process.env.DATABASE_URL);
export const demo =
  !cloud &&
  process.env.NODE_ENV !== "production" &&
  process.env.DEMO_MODE !== "false";
let pool, sqlite;
const ctx = new AsyncLocalStorage();
let queue = Promise.resolve();
if (cloud) {
  pg.types.setTypeParser(20, Number);
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 6,
    ssl:
      process.env.PGSSL === "false"
        ? false
        : {
            rejectUnauthorized: true,
            ...(process.env.PG_CA_CERT
              ? { ca: process.env.PG_CA_CERT.replace(/\\n/g, "\n") }
              : {}),
          },
  });
} else {
  const { DatabaseSync } = await import("node:sqlite");
  fs.mkdirSync("data", { recursive: true });
  sqlite = new DatabaseSync(process.env.SQLITE_PATH || "data/oly.sqlite");
  sqlite.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
}
const pgsql = (s) => {
  let n = 0;
  return s.replace(/\?/g, () => "$" + ++n);
};
const locked = (fn) => {
  const p = queue.then(fn);
  queue = p.catch(() => {});
  return p;
};
export async function all(s, p = []) {
  if (cloud) return (await (ctx.getStore() || pool).query(pgsql(s), p)).rows;
  const f = () => sqlite.prepare(s).all(...p);
  return ctx.getStore() ? f() : locked(f);
}
export async function one(s, p = []) {
  return (await all(s, p))[0];
}
export async function run(s, p = []) {
  if (cloud)
    return (await (ctx.getStore() || pool).query(pgsql(s), p)).rowCount;
  const f = () => sqlite.prepare(s).run(...p).changes;
  return ctx.getStore() ? f() : locked(f);
}
export async function tx(fn) {
  if (ctx.getStore()) return fn();
  if (cloud) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const out = await ctx.run(c, fn);
      await c.query("COMMIT");
      return out;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  return locked(async () => {
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const r = await ctx.run(true, fn);
      sqlite.exec("COMMIT");
      return r;
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  });
}
export function hashPassword(p) {
  const s = randomBytes(16).toString("hex");
  return s + ":" + scryptSync(p, s, 64).toString("hex");
}
export async function notify(audience, kind, title, body, song_id = null) {
  await run(
    "INSERT INTO notifications (id,audience,kind,title,body,song_id,created_at) VALUES(?,?,?,?,?,?,?)",
    [randomUUID(), audience, kind, title, body, song_id, Date.now()],
  );
}
export async function init() {
  const schema = fs.readFileSync(
    cloud ? "supabase/schema.sql" : "server/schema.sql",
    "utf8",
  );
  if (cloud) await pool.query(schema);
  else sqlite.exec(schema);
  const now = Date.now();
  const seeds = demo || process.env.SEED_CATALOG === "true";
  const adminEmail = (
      process.env.ADMIN_EMAIL || (demo ? "admin@oly.local" : "")
    )
      .trim()
      .toLowerCase(),
    pw = process.env.ADMIN_PASSWORD || (demo ? "OlyDemo!2026" : "");
  if (
    adminEmail &&
    pw.length >= 8 &&
    !(await one("SELECT id FROM users WHERE email=?", [adminEmail]))
  )
    await run(
      "INSERT INTO users(id,username,email,password,role,created_at,username_changed_at) VALUES(?,?,?,?,?,?,?)",
      [
        randomUUID(),
        "إدارة Oly",
        adminEmail,
        hashPassword(pw),
        "admin",
        now,
        now,
      ],
    );
  await tx(async () => {
    if (seeds && !(await one("SELECT id FROM users WHERE id='artist-adam'"))) {
      const artists = [
        ["adam", "آدم مروان", "راب مستقل وحكايات من شوارع القاهرة."],
        ["ziad", "زياد النوبي", "إيقاعات المهرجانات بروح جديدة."],
        ["lina", "لينا سامر", "أغاني هادئة وكلمات تشبهنا."],
        ["karim", "كريم فلو", "موسيقى بديلة على موجة مختلفة."],
        ["ali", "علي شاهين", "صوت شعبي من قلب الحارة."],
      ];
      for (const [id, name, about] of artists)
        await run(
          "INSERT INTO users(id,username,email,password,avatar,verified,about,created_at,username_changed_at) VALUES(?,?,?,?,?,?,?,?,?)",
          [
            "artist-" + id,
            name,
            id + "@artists.oly.local",
            hashPassword(randomBytes(30).toString("hex")),
            "/avatars/" + id + ".jpg",
            id === "ziad" ? 0 : 1,
            about,
            now - 60 * 86400000,
            now - 60 * 86400000,
          ],
        );
      const songs = [
        ["night-city", "ليل المدينة", "adam", "راب", 146, 24830],
        ["sidewalk", "على الرصيف", "ziad", "مهرجانات", 174, 18240],
        ["between", "بين السطور", "lina", "حزينة", 202, 21570],
        ["wave", "موج عالي", "karim", "راب", 158, 15890],
        ["last-ride", "آخر مشوار", "ali", "شعبي", 188, 12065],
      ];
      for (let i = 0; i < songs.length; i++) {
        const [id, title, art, cat, d, p] = songs[i];
        await run(
          "INSERT INTO songs(id,title,artist,category,audio_url,cover,status,user_id,duration,plays,created_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            id,
            title,
            artists.find((a) => a[0] === art)[1],
            cat,
            "/audio/" + id + ".mp3",
            "/art/" + id + ".webp",
            "approved",
            "artist-" + art,
            d,
            p,
            now - i * 86400000,
            now - i * 86400000,
          ],
        );
      }
      await notify(
        "all",
        "release",
        "إصدار جديد على Oly",
        "استمع إلى «ليل المدينة» من آدم مروان.",
        "night-city",
      );
    }
    if (!(await one("SELECT id FROM banners LIMIT 1"))) {
      const have = await one("SELECT id FROM songs WHERE id='night-city'");
      const banners = [
        [
          "صوت الشارع",
          "أقوى إيقاعات الراب والمهرجانات، من قلب المدينة.",
          "/art/spotlight.webp",
          "اختيار الأسبوع",
          "night-city",
        ],
        [
          "بعد نص الليل",
          "اهدأ قليلًا مع أغانٍ تحكي اللي جواك.",
          "/art/afterhours.webp",
          "مزاج المساء",
          "between",
        ],
        [
          "نبض الحارة",
          "أصوات قريبة منك، وإيقاع شعبي على أصوله.",
          "/art/downtown.webp",
          "مختارات Oly",
          "last-ride",
        ],
      ];
      for (let i = 0; i < 3; i++)
        await run(
          "INSERT INTO banners(id,title,subtitle,image,label,song_id) VALUES(?,?,?,?,?,?)",
          [i + 1, ...banners[i].slice(0, 4), have ? banners[i][4] : null],
        );
    }
  });
}
