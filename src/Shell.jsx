import React, { useEffect } from "react";
import {
  Compass,
  ChartNoAxesColumnIncreasing,
  MicVocal,
  Heart,
  UsersRound,
  Disc3,
  CodeXml,
  ShieldCheck,
  ArrowUpLeft,
  UserRound,
  LogIn,
  ChevronLeft,
  PanelRightClose,
  Search,
  Command,
  Plus,
  Bell,
  Menu,
  X,
  AudioLines,
  CheckCheck,
  Volume2,
  VolumeX,
  Music2,
  Flag,
  UserRoundPlus,
  Info,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat2,
  ListMusic,
  Headphones,
  Ellipsis,
  LogOut,
  Check,
  ArrowLeft,
  Clock3,
  House,
  SquareLibrary,
  Radio,
  Upload,
} from "lucide-react";
import { useApp, duration } from "./core";
import { Logo, IconBtn, Avatar, Verified, Empty } from "./ui";
const browse = [
    ["discover", "اكتشف الموسيقى", Compass],
    ["charts", "الأكثر استماعًا", ChartNoAxesColumnIncreasing],
    ["artists", "الفنانون", MicVocal],
  ],
  library = [
    ["favorites", "المفضلة", Heart],
    ["following", "أتابعهم", UsersRound],
    ["mine", "أغنياتي", Disc3],
  ];
export function Sidebar() {
  const a = useApp();
  function item([id, label, I]) {
    const active =
      !a.query &&
      (a.route === id ||
        (id === "discover" && a.route === "all") ||
        (id === "artists" && a.route.startsWith("artist/")));
    return (
      <button
        key={id}
        className={"nav-item " + (active ? "active" : "")}
        onClick={() => a.go(id)}
        aria-current={active ? "page" : undefined}
      >
        <I size={19} strokeWidth={active ? 2 : 1.65} />
        <span>{label}</span>
        {active && <i />}
      </button>
    );
  }
  return (
    <>
      {a.mobile && (
        <div className="sidebar-shade" onClick={() => a.setMobile(false)} />
      )}
      <aside className={"sidebar " + (a.mobile ? "opened" : "")}>
        <div className="brand-area">
          <button
            onClick={() => a.go("discover")}
            aria-label="Oly Music الرئيسية"
          >
            <Logo />
          </button>
          <button
            className="mobile-close"
            onClick={() => a.setMobile(false)}
            aria-label="إغلاق القائمة"
          >
            <X size={19} />
          </button>
        </div>
        <div className="sidebar-scroll">
          <div className="nav-group">
            <h3>تصفّح</h3>
            {browse.map(item)}
          </div>
          <div className="nav-divider" />
          <div className="nav-group">
            <h3>مكتبتي</h3>
            {library.map(item)}
          </div>
          <div className="nav-divider" />
          <div className="nav-group info-nav">
            <h3>المزيد</h3>
            {item(["developer", "المطوّر", CodeXml])}
            {a.user?.role === "admin" &&
              item(["admin", "لوحة التحكم", ShieldCheck])}
          </div>
          <div className="sidebar-space" />
          <button
            className="studio-promo"
            onClick={() => a.guard(() => a.setModal({ type: "upload" }))}
          >
            <span className="studio-kicker" dir="ltr">
              <i />
              OLY STUDIO
            </span>
            <strong>صوتك يستاهل يتسمع.</strong>
            <span className="studio-link">
              انشر أول أغنية
              <ArrowUpLeft size={13} />
            </span>
            <span className="studio-disc" />
          </button>
        </div>
        <div className="side-account">
          <button
            onClick={() =>
              a.user
                ? a.go("profile")
                : a.setModal({ type: "auth", tab: "login" })
            }
          >
            <Avatar src={a.user?.avatar} name={a.user?.username} size={36} />
            <span>
              <strong>
                {a.user ? a.user.username : "حسابك على Oly"}
                <Verified show={!!a.user?.verified} size={12} />
              </strong>
              <small>{a.user ? "الملف الشخصي" : "تسجيل الدخول"}</small>
            </span>
            <ChevronLeft size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}
function timeAgo(n) {
  const d = Math.max(0, Date.now() - n) / 60000;
  if (d < 1) return "الآن";
  if (d < 60) return "منذ " + Math.floor(d) + " دقيقة";
  if (d < 1440) return "منذ " + Math.floor(d / 60) + " ساعة";
  return new Intl.DateTimeFormat("ar-EG", {
    month: "short",
    day: "numeric",
  }).format(new Date(n));
}
function Notes() {
  const a = useApp();
  return (
    <div className="popover notifications-pop">
      <div className="pop-head">
        <div>
          <span className="eyebrow">ACTIVITY</span>
          <h3>الإشعارات</h3>
        </div>
        <IconBtn
          icon={CheckCheck}
          label="تعليم الكل كمقروء"
          onClick={a.readNotes}
        />
      </div>
      <div className="note-list">
        {a.notes.length ? (
          a.notes.map((n) => {
            const I =
              n.kind === "report"
                ? Flag
                : n.kind === "signup"
                  ? UserRoundPlus
                  : n.kind === "release"
                    ? Disc3
                    : Bell;
            return (
              <div
                key={n.id}
                className={"note " + (n.created_at > a.seen ? "unread" : "")}
              >
                <span className="note-icon">
                  <I size={16} />
                </span>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  <small>{timeAgo(n.created_at)}</small>
                </div>
                {n.created_at > a.seen && <i />}
              </div>
            );
          })
        ) : (
          <div className="note-quiet">
            <Bell size={25} />
            <p>لا توجد إشعارات بعد.</p>
          </div>
        )}
      </div>
      <button className="sound-toggle" onClick={() => a.setSound(!a.sound)}>
        {a.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}صوت الإشعارات
        <span className={"switch " + (a.sound ? "checked" : "")}>
          <i />
        </span>
      </button>
    </div>
  );
}
export function Topbar() {
  const a = useApp(),
    unread = a.notes.some((n) => n.created_at > a.seen);
  useEffect(() => {
    const cb = (e) => {
      if (!e.target.closest("[data-popover]")) a.setPanel("");
    };
    document.addEventListener("pointerdown", cb);
    return () => document.removeEventListener("pointerdown", cb);
  }, []);
  return (
    <header className="topbar">
      <button
        className="mobile-menu icon-btn"
        onClick={() => a.setMobile(true)}
        aria-label="فتح القائمة"
      >
        <Menu size={22} />
      </button>
      <button
        className="mobile-brand"
        onClick={() => a.go("discover")}
        aria-label="Oly Music الرئيسية"
      >
        <Logo small />
      </button>
      <div className="search-box">
        <Search size={18} />
        <input
          ref={a.searchRef}
          type="search"
          aria-label="البحث عن أغنية أو فنان"
          placeholder="ابحث عن أغنية أو فنان..."
          value={a.query}
          onChange={(e) => {
            a.setQuery(e.target.value);
            a.setPanel("");
          }}
        />
        {a.query ? (
          <button
            className="clear-search"
            aria-label="مسح البحث"
            onClick={() => a.setQuery("")}
          >
            <X size={13} />
          </button>
        ) : (
          <kbd dir="ltr">
            <Command size={10} /> K
          </kbd>
        )}
      </div>
      <div className="topbar-spacer" />
      <button
        className="add-song"
        aria-label="إضافة أغنية"
        onClick={() => a.guard(() => a.setModal({ type: "upload" }))}
      >
        <Plus size={17} strokeWidth={2.6} />
        <span>إضافة أغنية</span>
      </button>
      <span className="header-rule" />
      <div className="bell-wrap" data-popover>
        <button
          className={"bell " + (a.panel === "notes" ? "selected" : "")}
          aria-label="الإشعارات"
          aria-expanded={a.panel === "notes"}
          onClick={() => {
            a.setPanel(a.panel === "notes" ? "" : "notes");
            a.refreshNotes().catch(() => {});
          }}
        >
          <Bell size={19} strokeWidth={1.65} />
          {unread && <i />}
        </button>
        {a.panel === "notes" && <Notes />}
      </div>
    </header>
  );
}
export function Player() {
  const a = useApp(),
    s = a.current,
    liked = s && a.lib.likes.includes(s.id);
  return (
    <footer
      className={"player " + (a.playing ? "is-playing" : "")}
      aria-label="مشغّل الموسيقى"
    >
      <div className="now-playing">
        {s ? (
          <>
            <button
              className="now-cover"
              onClick={() => a.setModal({ type: "track", song: s })}
            >
              <img src={s.cover} alt={"غلاف " + s.title} />
              {a.playing && (
                <span className="tiny-bars">
                  <i />
                  <i />
                  <i />
                </span>
              )}
            </button>
            <div className="now-info">
              <button onClick={() => a.setModal({ type: "track", song: s })}>
                {s.title}
              </button>
              <button
                className="now-artist"
                onClick={() => a.go("artist/" + s.user_id)}
              >
                {s.username}
                <Verified show={!!s.verified} size={12} />
              </button>
            </div>
            <IconBtn
              icon={Heart}
              fill={liked}
              active={liked}
              label={liked ? "إلغاء الإعجاب" : "إعجاب بالأغنية"}
              onClick={() => a.toggleSong(s, "like")}
              className="now-heart"
            />
          </>
        ) : (
          <>
            <div className="now-cover blank">
              <Disc3 size={25} />
            </div>
            <div className="now-info">
              <strong>مشغّل Oly</strong>
              <small>اختر أغنية للاستماع</small>
            </div>
          </>
        )}
      </div>
      <div className="player-main" dir="ltr">
        <div className="playback-keys">
          <IconBtn
            icon={Shuffle}
            label={a.shuffle ? "إيقاف الترتيب العشوائي" : "تشغيل عشوائي"}
            active={a.shuffle}
            onClick={() => a.setShuffle(!a.shuffle)}
            className="shuffle"
          />
          <button
            className="skip"
            aria-label="الأغنية السابقة"
            disabled={!s}
            onClick={() => a.skip(-1)}
          >
            <SkipBack size={17} fill="currentColor" />
          </button>
          <button
            className="player-play"
            aria-label={a.playing ? "إيقاف التشغيل مؤقتًا" : "تشغيل الأغنية"}
            disabled={!s}
            onClick={() => a.play(s)}
          >
            {a.playing ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>
          <button
            className="skip"
            aria-label="الأغنية التالية"
            disabled={!s}
            onClick={() => a.skip(1)}
          >
            <SkipForward size={17} fill="currentColor" />
          </button>
          <IconBtn
            icon={Repeat2}
            label={a.repeat ? "إيقاف التكرار" : "تكرار الأغنية"}
            active={a.repeat}
            onClick={() => a.setRepeat(!a.repeat)}
            className="repeat"
          />
        </div>
        <div className="seek-line">
          <span>{duration(a.elapsed)}</span>
          <input
            type="range"
            min="0"
            max={a.total || 1}
            step="0.1"
            value={Math.min(a.elapsed, a.total || 0)}
            onChange={(e) => a.seek(Number(e.target.value))}
            aria-label="موضع التشغيل"
            style={{
              "--pct": (a.total ? (a.elapsed / a.total) * 100 : 0) + "%",
            }}
          />
          <span>{duration(a.total)}</span>
        </div>
      </div>
      <div className="player-tools" data-popover>
        <div className="volume-part" dir="ltr">
          <input
            type="range"
            min="0"
            max="1"
            value={a.volume}
            step="0.01"
            onChange={(e) => a.setVolume(+e.target.value)}
            style={{ "--pct": a.volume * 100 + "%" }}
            aria-label="مستوى الصوت"
          />
          <IconBtn
            icon={a.volume ? Volume2 : VolumeX}
            label={a.volume ? "كتم الصوت" : "تشغيل الصوت"}
            onClick={a.mute}
          />
        </div>
        <span className="tool-rule" />
        <IconBtn
          icon={ListMusic}
          label="قائمة التشغيل"
          active={a.panel === "queue"}
          onClick={() => a.setPanel(a.panel === "queue" ? "" : "queue")}
        />
        {a.panel === "queue" && (
          <div className="popover queue-pop">
            <div className="pop-head">
              <div>
                <span className="eyebrow">UP NEXT</span>
                <h3>قائمة التشغيل</h3>
              </div>
              <IconBtn icon={X} label="إغلاق" onClick={() => a.setPanel("")} />
            </div>
            {a.queueSongs.map((t, i) => (
              <button
                className={"queue-row " + (s?.id === t.id ? "current" : "")}
                key={t.id}
                onClick={() => a.play(t, a.queueSongs)}
              >
                <span className="rank">{i + 1}</span>
                <img src={t.cover} alt="" />
                <span>
                  <strong>{t.title}</strong>
                  <small>{t.username}</small>
                </span>
                {s?.id === t.id ? (
                  <AudioLines size={16} />
                ) : (
                  <span className="q-time" dir="ltr">
                    {duration(t.duration)}
                  </span>
                )}
              </button>
            ))}
            {!a.queueSongs.length && (
              <p className="muted">لا توجد أغانٍ في القائمة.</p>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
