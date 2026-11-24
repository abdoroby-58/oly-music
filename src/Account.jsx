import React, { useRef, useState, useEffect } from "react";
import {
  UserRound,
  Check,
  LogOut,
  Camera,
  Info,
  Clock3,
  Plus,
  Disc3,
  Music2,
  ShieldCheck,
  Eye,
  Instagram,
  Github,
  Facebook,
  CodeXml,
  ArrowUpLeft,
  Radio,
  Headphones,
  MicVocal,
  Heart,
  ArrowLeft,
  ImagePlus,
  LockKeyhole,
} from "lucide-react";
import { useApp, api, arDate, duration } from "./core";
import { PageIntro, Gate } from "./Discover";
import { Avatar, Verified, Empty, Heading, Logo } from "./ui";
import { ErrorBox, DropFile } from "./Dialogs";
export function Profile() {
  const a = useApp(),
    u = a.user,
    [file, setFile] = useState(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    input = useRef(null);
  useEffect(() => {
    if (file) {
      const s = URL.createObjectURL(file);
      setPreview(s);
      return () => URL.revokeObjectURL(s);
    }
    setPreview("");
  }, [file]);
  if (!u) return <Gate title="ملفك الشخصي" icon={UserRound} />;
  const next = u.username_changed_at + 30 * 86400000,
    locked = Date.now() < next;
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    if (file) fd.set("avatar", file);
    try {
      const d = await api("/profile", "PATCH", fd);
      a.setUser(d.user);
      setFile(null);
      await Promise.all([a.refreshCatalog(), a.refreshLib()]);
      a.toast("تم حفظ تغييرات الملف الشخصي.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageIntro
        title="الملف الشخصي"
        tag="YOUR PROFILE"
        body="مساحتك الشخصية على Oly Music."
        icon={UserRound}
      />
      <div className="profile-layout">
        <form className="form profile-form content-panel" onSubmit={submit}>
          <div className="profile-identity">
            <button
              className="avatar-edit"
              type="button"
              onClick={() => input.current?.click()}
              aria-label="تغيير صورة الحساب"
            >
              <Avatar src={preview || u.avatar} name={u.username} size={80} />
              <i>
                <Camera size={14} />
              </i>
            </button>
            <div>
              <h2>
                {u.username}
                <Verified show={u.verified} size={19} />
              </h2>
              <p>{u.role === "admin" ? "مدير المنصّة" : "عضو في Oly Music"}</p>
              <button
                className="text-link"
                type="button"
                onClick={() => input.current?.click()}
              >
                تغيير الصورة
              </button>
            </div>
            <input
              className="hidden-file"
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="صورة الحساب الجديدة"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f?.size > 5 * 1024 * 1024) {
                  setError("أقصى حجم للصورة 5 ميجابايت.");
                  return;
                }
                setFile(f);
              }}
            />
          </div>
          <label>
            اسم المستخدم
            <input
              name="username"
              defaultValue={u.username}
              disabled={locked}
              required
              minLength={3}
              maxLength={32}
            />
          </label>
          <p className="form-hint">
            <Clock3 size={14} />
            {locked
              ? "يمكنك تغيير الاسم اعتبارًا من " + arDate(next) + "."
              : "يمكن تغيير اسم المستخدم مرة واحدة كل 30 يومًا."}
          </p>
          <label>
            البريد الإلكتروني
            <input
              type="email"
              dir="ltr"
              value={u.email}
              readOnly
              className="readonly"
            />
          </label>
          <label>
            نبذة عنك
            <textarea
              name="about"
              maxLength={220}
              defaultValue={u.about}
              rows="3"
              placeholder="عرّف المستمعين بك وبموسيقاك..."
            />
          </label>
          <ErrorBox text={error} />
          <button className="primary" disabled={busy}>
            <Check size={16} />
            {busy ? "جارٍ الحفظ…" : "حفظ التغييرات"}
          </button>
        </form>
        <aside className="account-info content-panel">
          <ShieldCheck size={26} className="accent" />
          <h3>تفاصيل الحساب</h3>
          <div>
            <small>تاريخ الانضمام</small>
            <strong>{arDate(u.created_at)}</strong>
          </div>
          <div>
            <small>حالة التوثيق</small>
            <strong>
              {u.verified ? "حساب موثّق" : "غير موثّق"}
              <Verified show={u.verified} />
            </strong>
          </div>
          <p>تمنح إدارة Oly العلامة الزرقاء للحسابات التي تراجعها.</p>
          {u.role === "admin" && (
            <button className="secondary" onClick={() => a.go("admin")}>
              <ShieldCheck size={15} />
              لوحة التحكم
            </button>
          )}
          <button
            className="secondary danger"
            onClick={() =>
              a.setModal({
                type: "confirm",
                title: "تسجيل الخروج؟",
                body: "يمكنك العودة إلى مكتبتك بتسجيل الدخول من جديد.",
                onConfirm: a.logout,
              })
            }
          >
            <LogOut size={15} />
            تسجيل الخروج
          </button>
        </aside>
      </div>
    </>
  );
}
export function Status({ s }) {
  const st = s.flagged ? "reported" : s.status;
  return (
    <span className={"status status-" + st}>
      <i />
      {
        {
          approved: "منشورة",
          pending: "قيد المراجعة",
          rejected: "مرفوضة",
          reported: "مُبلّغ عنها",
        }[st]
      }
    </span>
  );
}
export function Mine() {
  const a = useApp();
  return (
    <>
      <PageIntro
        title="أغنياتي"
        tag="ARTIST STUDIO"
        body="تابع حالة إصداراتك من المراجعة إلى النشر."
      >
        <button
          className="primary"
          onClick={() => a.guard(() => a.setModal({ type: "upload" }))}
        >
          <Plus size={16} />
          إضافة أغنية
        </button>
      </PageIntro>
      {!a.user ? (
        <Gate
          title="ابدأ رحلتك كفنان"
          body="أنشئ حسابك وشارك أول أغنية مع مستمعي Oly."
          icon={MicVocal}
        />
      ) : a.lib.mine.length ? (
        <div className="list-panel">
          <Heading title="إصداراتي" eng="MY RELEASES" />
          {a.lib.mine.map((s) => (
            <div className="my-song" key={s.id}>
              <img src={s.cover} alt={"غلاف " + s.title} />
              <div>
                <h3>{s.title}</h3>
                <small className="artist-line">
                  <Avatar src={s.avatar} name={s.username} size={17} />
                  {s.username} · {s.category}
                </small>
              </div>
              <Status s={s} />
              <button
                className="secondary"
                onClick={() => a.setModal({ type: "review", song: s })}
              >
                <Eye size={14} />
                التفاصيل
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="أول إصدار يبدأ هنا"
          body="ارفع ملف الأغنية وغلافها، وستراجعها الإدارة قبل النشر."
          icon={Disc3}
          action="إضافة أغنيتي الأولى"
          onClick={() => a.setModal({ type: "upload" })}
        />
      )}
    </>
  );
}
export function Developer() {
  return (
    <>
      <PageIntro
        title="المطوّر"
        tag="BEHIND THE MUSIC"
        body="عن المنصّة والأشخاص خلف التجربة."
        icon={CodeXml}
      />
      <div className="dev-card">
        <div className="dev-logo">
          <Logo />
        </div>
        <span className="eyebrow">BUILT FOR ARABIC SOUND</span>
        <h2>مساحة لكل صوت.</h2>
        <p>
          Oly Music منصّة عربية مستقلة تجمع الموسيقى وصنّاعها في مكان واحد. من
          أول إيقاع لآخر كلمة، نؤمن أن كل أغنية تستحق فرصة لتُسمع.
        </p>
        <div className="dev-tags">
          <span>
            <Headphones size={14} />
            موسيقى عربية
          </span>
          <span>
            <MicVocal size={14} />
            فنانون مستقلون
          </span>
          <span>
            <Heart size={14} />
            صُنع بشغف
          </span>
        </div>
        <div className="dev-vinyl" />
      </div>
      <Heading title="روابط المطوّر" eng="SOCIAL LINKS" />
      <p className="muted sub-note">
        مساحة روابط التواصل الخاصة بالمطوّر. لم تُضف روابط بعد.
      </p>
      <div className="social-links">
        {[
          [Github, "GitHub"],
          [Instagram, "Instagram"],
          [Facebook, "Facebook"],
        ].map(([I, n]) => (
          <div key={n}>
            <I size={23} />
            <strong dir="ltr">{n}</strong>
            <span>غير مضاف</span>
          </div>
        ))}
      </div>
    </>
  );
}
