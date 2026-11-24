import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  LockKeyhole,
  UserRound,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  Plus,
  Check,
  Info,
  Upload,
  ImagePlus,
  Music2,
  Disc3,
  FileAudio,
  LoaderCircle,
  Heart,
  Bookmark,
  Flag,
  Play,
  Pause,
  Headphones,
  Clock3,
  Share2,
  Copy,
  Image,
  CheckCircle2,
  MicVocal,
  AlertCircle,
  X,
  UserRoundPlus,
} from "lucide-react";
import { useApp, api, categories, duration, nfmt } from "./core";
import { Modal, Avatar, Verified, IconBtn } from "./ui";
export function ErrorBox({ text }) {
  return text ? (
    <div className="form-error" role="alert">
      <AlertCircle size={16} />
      {text}
    </div>
  ) : null;
}
function Auth() {
  const a = useApp(),
    [tab, setTab] = useState(a.modal.tab || "login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    reg = tab === "register";
  async function submit(body, admin = false) {
    setError("");
    setBusy(true);
    try {
      const d = await api("/auth/" + (admin ? "login" : tab), "POST", body);
      await a.authed(d.user);
      if (admin) a.go("admin");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={reg ? "انضم إلى Oly Music" : "أهلًا بعودتك"}
      eyebrow="YOUR OLY ACCOUNT"
    >
      <p className="dialog-desc">
        {reg
          ? "حساب واحد لنشر أغانيك وبناء مكتبتك الموسيقية."
          : "سجّل الدخول وكمّل رحلتك مع الموسيقى."}
      </p>
      <div className="segment">
        <button
          className={!reg ? "selected" : ""}
          onClick={() => {
            setTab("login");
            setError("");
          }}
        >
          تسجيل الدخول
        </button>
        <button
          className={reg ? "selected" : ""}
          onClick={() => {
            setTab("register");
            setError("");
          }}
        >
          إنشاء حساب
        </button>
      </div>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          submit(Object.fromEntries(new FormData(e.currentTarget)));
        }}
      >
        {reg && (
          <label>
            اسم المستخدم
            <div className="input-icon">
              <UserRound size={16} />
              <input
                name="username"
                placeholder="اسمك الفريد على Oly"
                required
                minLength={3}
                maxLength={32}
                autoComplete="username"
              />
            </div>
          </label>
        )}
        <label>
          البريد الإلكتروني
          <div className="input-icon">
            <Mail size={16} />
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              dir="ltr"
              maxLength={254}
            />
          </div>
        </label>
        <label>
          كلمة السر
          <div className="input-icon">
            <LockKeyhole size={16} />
            <input
              name="password"
              type={show ? "text" : "password"}
              required
              minLength={reg ? 8 : 1}
              maxLength={128}
              autoComplete={reg ? "new-password" : "current-password"}
              placeholder={reg ? "8 أحرف على الأقل" : "أدخل كلمة السر"}
            />
            <button
              type="button"
              aria-label={show ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>
        <ErrorBox text={error} />
        <button className="primary form-submit" disabled={busy}>
          {busy ? (
            <LoaderCircle size={17} className="spin" />
          ) : reg ? (
            <UserRoundPlus size={16} />
          ) : (
            <ArrowLeft size={16} />
          )}{" "}
          {reg ? "إنشاء حساب" : "تسجيل الدخول"}
        </button>
      </form>
      {a.demo && !reg && (
        <div className="demo-login">
          <span>للنسخة التجريبية</span>
          <button
            disabled={busy}
            onClick={() =>
              submit(
                { email: "admin@oly.local", password: "OlyDemo!2026" },
                true,
              )
            }
          >
            <ShieldCheck size={14} />
            معاينة لوحة الإدارة
            <ArrowLeft size={12} />
          </button>
        </div>
      )}
    </Modal>
  );
}
export function DropFile({
  kind = "image",
  file,
  setFile,
  label,
  subtitle,
  required = false,
}) {
  const [drag, setDrag] = useState(false),
    [preview, setPreview] = useState(""),
    input = useRef(null),
    a = useApp(),
    image = kind === "image";
  useEffect(() => {
    if (file && image) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview("");
  }, [file, image]);
  function choose(f) {
    if (!f) return;
    if (f.size > (image ? 5 : 40) * 1024 * 1024) {
      a.toast("الحد الأقصى " + (image ? "5" : "40") + " ميجابايت.", "error");
      return;
    }
    setFile(f);
  }
  return (
    <div
      className={
        "file-drop " + (drag ? "drag " : "") + (file ? "has-file" : "")
      }
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        choose(e.dataTransfer.files[0]);
      }}
    >
      <button type="button" onClick={() => input.current?.click()}>
        {preview ? (
          <img className="file-preview" src={preview} alt="معاينة الصورة" />
        ) : (
          <span className="file-symbol">
            {image ? <ImagePlus size={23} /> : <FileAudio size={24} />}
          </span>
        )}
        <span>
          <strong>{file ? file.name : label}</strong>
          <small>
            {file
              ? (file.size / 1024 / 1024).toFixed(2) + " MB · اضغط للتغيير"
              : subtitle}
          </small>
        </span>
        <Upload className="file-upload-icon" size={17} />
      </button>
      <input
        ref={input}
        className="hidden-file"
        type="file"
        aria-label={label}
        accept={
          image
            ? "image/jpeg,image/png,image/webp"
            : "audio/mpeg,audio/mp4,audio/ogg,audio/wav,.mp3,.m4a,.wav,.ogg"
        }
        onChange={(e) => choose(e.target.files[0])}
      />
    </div>
  );
}
function fileDuration(f) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(f),
      el = new Audio(),
      done = (n) => {
        clearTimeout(t);
        el.onloadedmetadata = null;
        el.onerror = null;
        el.removeAttribute("src");
        URL.revokeObjectURL(url);
        resolve(n);
      },
      t = setTimeout(() => done(0), 3500);
    el.preload = "metadata";
    el.onloadedmetadata = () =>
      done(Number.isFinite(el.duration) ? Math.round(el.duration) : 0);
    el.onerror = () => done(0);
    el.src = url;
  });
}
function UploadSong() {
  const a = useApp(),
    [audio, setAudio] = useState(null),
    [cover, setCover] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (!audio) {
      setError("اختر الملف الصوتي أولًا.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      fd.set("duration", String(await fileDuration(audio)));
      fd.set("audio", audio);
      if (cover) fd.set("cover", cover);
      await api("/songs", "POST", fd);
      await a.refreshLib();
      a.go("mine");
      a.toast("تم إرسال أغنيتك إلى الإدارة للمراجعة.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="إضافة أغنية جديدة" eyebrow="OLY STUDIO">
      <p className="dialog-desc">
        شارك موسيقاك باسم حسابك <b>{a.user?.username}</b>.
      </p>
      <form className="form" onSubmit={submit}>
        <div className="form-split">
          <label>
            اسم الأغنية
            <input
              required
              name="title"
              placeholder="عنوان الإصدار"
              minLength={2}
              maxLength={100}
            />
          </label>
          <label>
            التصنيف
            <select name="category" defaultValue="" required>
              <option value="" disabled>
                اختر تصنيفًا
              </option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field">
          <span>
            الملف الصوتي <b className="required">*</b>
          </span>
          <DropFile
            kind="audio"
            file={audio}
            setFile={setAudio}
            label="اختر أو اسحب ملف الأغنية"
            subtitle="MP3, M4A, WAV, OGG · حتى 40 MB"
          />
        </div>
        <div className="field">
          <span>
            غلاف الأغنية <small className="muted">(اختياري)</small>
          </span>
          <DropFile
            file={cover}
            setFile={setCover}
            label="أضف صورة الغلاف"
            subtitle="JPG, PNG, WEBP · حتى 5 MB"
          />
        </div>
        <div className="notice">
          <ShieldCheck size={18} />
          <span>
            تُرسل أغنيتك للمراجعة، ولن تظهر للجمهور إلا بعد موافقة الإدارة.
          </span>
        </div>
        <ErrorBox text={error} />
        <button className="primary form-submit" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Upload size={16} />
          )}{" "}
          {busy ? "جارٍ رفع الأغنية…" : "إرسال للمراجعة"}
        </button>
      </form>
    </Modal>
  );
}
export function TrackContent({ song }) {
  const a = useApp(),
    s = a.catalog.songs.find((t) => t.id === song.id) || song,
    liked = a.lib.likes.includes(s.id),
    fav = a.lib.favorites.includes(s.id),
    following = a.lib.follows.includes(s.user_id),
    playing = a.current?.id === s.id && a.playing,
    [link, setLink] = useState("");
  async function share() {
    const url =
      location.origin +
      location.pathname +
      "#track/" +
      encodeURIComponent(s.id);
    try {
      await navigator.clipboard.writeText(url);
      a.toast("تم نسخ رابط الأغنية.");
    } catch {
      setLink(url);
    }
  }
  return (
    <div className="track-detail">
      <div className="detail-top">
        <img src={s.cover} alt={"غلاف " + s.title} />
        <div>
          <span className="pink-badge">{s.category}</span>
          <h2>{s.title}</h2>
          <button
            className="artist-line"
            onClick={() => a.go("artist/" + s.user_id)}
          >
            <Avatar src={s.avatar} name={s.username} size={24} />
            {s.username}
            <Verified show={!!s.verified} />
          </button>
          <div className="track-stats">
            <span>
              <Headphones size={13} />
              <b dir="ltr">{nfmt(s.plays)}</b> تشغيل
            </span>
            <span>
              <Clock3 size={13} />
              <b dir="ltr">{duration(s.duration)}</b>
            </span>
          </div>
        </div>
      </div>
      <div className="detail-play">
        <button className="primary" onClick={() => a.play(s)}>
          {playing ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
          {playing ? "إيقاف مؤقت" : "تشغيل الأغنية"}
        </button>
        {a.user?.id !== s.user_id && (
          <button
            className={"secondary " + (following ? "accent" : "")}
            onClick={() => a.follow(s.user_id)}
          >
            {following ? <Check size={15} /> : <Plus size={15} />}{" "}
            {following ? "تتابع الفنان" : "متابعة الفنان"}
          </button>
        )}
      </div>
      <div className="detail-actions">
        <button
          className={liked ? "on" : ""}
          onClick={() => a.toggleSong(s, "like")}
        >
          <Heart fill={liked ? "currentColor" : "none"} size={20} />
          <span>{liked ? "أعجبني" : "إعجاب"}</span>
          <small>{s.likes_count || 0}</small>
        </button>
        <button
          className={fav ? "on" : ""}
          onClick={() => a.toggleSong(s, "favorite")}
        >
          <Bookmark fill={fav ? "currentColor" : "none"} size={20} />
          <span>{fav ? "في المفضلة" : "حفظ في المفضلة"}</span>
        </button>
        <button onClick={share}>
          <Share2 size={19} />
          <span>مشاركة</span>
        </button>
      </div>
      {link && (
        <label className="share-field">
          رابط الأغنية
          <input
            readOnly
            dir="ltr"
            value={link}
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}
      <button
        className="report-link"
        onClick={() => a.guard(() => a.setModal({ type: "report", song: s }))}
      >
        <Flag size={14} />
        إبلاغ عن الأغنية
      </button>
    </div>
  );
}
function Report() {
  const a = useApp(),
    s = a.modal.song,
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/songs/" + s.id + "/report", "POST", {
        reason,
        note: new FormData(e.currentTarget).get("note"),
      });
      await a.refreshCatalog();
      a.closeModal();
      a.toast("وصل بلاغك إلى الإدارة. شكرًا لمساعدتك.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="إبلاغ عن أغنية" eyebrow="CONTENT REPORT">
      <p className="dialog-desc">ما المشكلة في أغنية «{s.title}»؟</p>
      <form className="form" onSubmit={submit}>
        <div className="radio-list">
          {[
            "محتوى غير مناسب",
            "انتهاك حقوق النشر",
            "مشكلة في الصوت",
            "سبب آخر",
          ].map((r) => (
            <label key={r}>
              <input
                type="radio"
                name="reason"
                required
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              {r}
            </label>
          ))}
        </div>
        <label>
          تفاصيل إضافية <small>(اختياري)</small>
          <textarea
            name="note"
            maxLength={350}
            rows="2"
            placeholder="أخبرنا بالمزيد..."
          />
        </label>
        <p className="form-hint">
          يُقبل بلاغ واحد من كل حساب. عند 5 بلاغات تُخفى الأغنية وتُحال
          للمراجعة.
        </p>
        <ErrorBox text={error} />
        <button className="primary" disabled={busy}>
          <Flag size={15} />
          إرسال الإبلاغ
        </button>
      </form>
    </Modal>
  );
}
function Confirm() {
  const a = useApp(),
    m = a.modal,
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title={m.title} eyebrow="CONFIRM ACTION">
      <p className="dialog-desc">{m.body}</p>
      <ErrorBox text={error} />
      <div className="inline-actions">
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await m.onConfirm();
              a.closeModal();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? (
            <LoaderCircle size={15} className="spin" />
          ) : (
            <Check size={15} />
          )}
          تأكيد
        </button>
        <button className="secondary" onClick={a.closeModal}>
          إلغاء
        </button>
      </div>
    </Modal>
  );
}
function Review() {
  const a = useApp(),
    m = a.modal,
    s = m.song,
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function act(action) {
    setBusy(true);
    setError("");
    try {
      await api("/admin/songs/" + s.id, "POST", { action, note });
      await Promise.all([a.refreshCatalog(), a.refreshLib(), m.onDone?.()]);
      a.closeModal();
      a.toast(
        action === "approve"
          ? "تمت الموافقة ونشر الأغنية."
          : action === "dismiss"
            ? "أُغلقت البلاغات بعد المراجعة."
            : "تم رفض الأغنية.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={m.admin ? "مراجعة الأغنية" : "تفاصيل إصداري"}
      eyebrow="RELEASE REVIEW"
    >
      <div className="review-info">
        <img src={s.cover} alt="غلاف الأغنية" />
        <div>
          <h3>{s.title}</h3>
          <span className="artist-line">
            <Avatar src={s.avatar} name={s.username} size={19} />
            {s.username}
          </span>
          <small className="muted">
            {s.category} ·{" "}
            {s.flagged
              ? "مُبلغ عنها"
              : s.status === "pending"
                ? "قيد المراجعة"
                : s.status === "approved"
                  ? "منشورة"
                  : "مرفوضة"}
          </small>
        </div>
      </div>
      <audio
        className="native-audio"
        controls
        src={s.audio_url}
        preload="metadata"
        onPlay={() => a.audio.pause()}
      />
      {s.review_note && (
        <div className="notice">
          <Info size={16} />
          ملاحظة الإدارة: {s.review_note}
        </div>
      )}
      {m.reports?.length > 0 && (
        <div className="report-summary">
          <h4>تفاصيل البلاغات ({m.reports.length})</h4>
          {m.reports.map((r) => (
            <div key={r.id}>
              <b>{r.reason}</b>
              <small>{r.reporter}</small>
              {r.note && <p>{r.note}</p>}
            </div>
          ))}
        </div>
      )}
      {m.admin && (
        <div className="form">
          <label>
            ملاحظة لصاحب الأغنية <small>(اختياري)</small>
            <textarea
              rows="2"
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="اكتب سبب القرار..."
            />
          </label>
          <ErrorBox text={error} />
          <div className="inline-actions">
            {s.status !== "approved" || s.flagged ? (
              <button
                disabled={busy}
                className="primary"
                onClick={() => act("approve")}
              >
                <Check size={15} />
                موافقة ونشر
              </button>
            ) : (
              s.reports_count > 0 && (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => act("dismiss")}
                >
                  <ShieldCheck size={15} />
                  إغلاق البلاغات
                </button>
              )
            )}
            {s.status !== "rejected" && (
              <button
                disabled={busy}
                className="secondary danger"
                onClick={() => act("reject")}
              >
                <X size={15} />
                رفض الأغنية
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
function BannerEdit() {
  const a = useApp(),
    b = a.modal.banner,
    [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    if (file) fd.set("image", file);
    try {
      await api("/admin/banners/" + b.id, "PUT", fd);
      await Promise.all([a.refreshCatalog(), a.modal.onDone?.()]);
      a.closeModal();
      a.toast("تم تحديث البنر.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={"تعديل البنر " + b.id} eyebrow="BANNER EDITOR">
      <form className="form" onSubmit={submit}>
        <div className="form-split">
          <label>
            العنوان
            <input
              name="title"
              required
              maxLength={50}
              defaultValue={b.title}
            />
          </label>
          <label>
            الشارة
            <input
              name="label"
              required
              maxLength={32}
              defaultValue={b.label}
            />
          </label>
        </div>
        <label>
          الوصف
          <input name="subtitle" maxLength={130} defaultValue={b.subtitle} />
        </label>
        <label>
          الأغنية المرتبطة
          <select name="song_id" defaultValue={b.song_id || ""}>
            <option value="">أحدث أغنية منشورة</option>
            {a.catalog.songs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {s.username}
              </option>
            ))}
          </select>
        </label>
        <DropFile
          file={file}
          setFile={setFile}
          label="تغيير صورة البنر"
          subtitle="اتركها فارغة للاحتفاظ بالصورة الحالية"
        />
        <ErrorBox text={error} />
        <button className="primary" disabled={busy}>
          <Check size={16} />
          حفظ البنر
        </button>
      </form>
    </Modal>
  );
}
export function Dialogs() {
  const a = useApp();
  if (!a.modal) return null;
  switch (a.modal.type) {
    case "auth":
      return <Auth />;
    case "upload":
      return <UploadSong />;
    case "track":
      return (
        <Modal title="عن الأغنية" eyebrow="TRACK DETAILS">
          <TrackContent song={a.modal.song} />
        </Modal>
      );
    case "report":
      return <Report />;
    case "confirm":
      return <Confirm />;
    case "review":
      return <Review />;
    case "banner":
      return <BannerEdit />;
    default:
      return null;
  }
}
