import React, { useEffect, useRef } from "react";
import {
  AudioLines,
  BadgeCheck,
  X,
  Music2,
  ArrowLeft,
  Play,
  Pause,
  Ellipsis,
  Headphones,
  Heart,
  UserRound,
  Disc3,
  LoaderCircle,
  Check,
  Plus,
  UsersRound,
} from "lucide-react";
import { useApp, duration, nfmt } from "./core";
export function Logo({ small = false }) {
  return (
    <div className={"brand " + (small ? "brand-small" : "")} dir="ltr">
      <span className="brand-word">
        Oly <b>Music</b>
      </span>
      <svg
        width="40"
        height="38"
        viewBox="0 0 40 38"
        fill="none"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round">
          <path d="M3 16v6M11 9v20M19 3v32M27 8v21M35 14v10" />
        </g>
      </svg>
    </div>
  );
}
export function Avatar({ src, name = "", size = 28, cl = "" }) {
  return src ? (
    <img
      className={"avatar " + cl}
      src={src}
      width={size}
      height={size}
      loading="lazy"
      alt={"صورة " + name}
    />
  ) : (
    <span
      className={"avatar avatar-fallback " + cl}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name ? name.trim().slice(0, 1) : <UserRound size={size * 0.47} />}
    </span>
  );
}
export function Verified({ show = true, size = 15 }) {
  return show ? (
    <span className="verified" title="حساب موثّق" aria-label="حساب موثّق">
      <BadgeCheck
        size={size}
        fill="currentColor"
        strokeWidth={2}
        className="verified-badge"
      />
      <Check className="verified-check" size={size * 0.53} strokeWidth={3.2} />
    </span>
  ) : null;
}
export function IconBtn({
  icon: Icon,
  label,
  onClick,
  className = "",
  active = false,
  fill = false,
  children,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={"icon-btn " + className + (active ? " is-active" : "")}
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={18} strokeWidth={1.7} fill={fill ? "currentColor" : "none"} />
      {children}
    </button>
  );
}
export function Modal({ title, eyebrow, children, wide = false, onClose }) {
  const app = useApp(),
    close = onClose || app.closeModal,
    box = useRef(null),
    closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const prev = document.activeElement,
      old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const els = () =>
      Array.from(
        box.current?.querySelectorAll(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ) || [],
      ).filter((el) => el.offsetParent !== null);
    const first = box.current?.querySelector("[data-autofocus]") || box.current;
    first?.focus();
    const key = (e) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const f = els();
        if (!f.length) return;
        if (
          e.shiftKey &&
          (document.activeElement === f[0] ||
            document.activeElement === box.current)
        ) {
          e.preventDefault();
          f.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      prev?.focus?.();
    };
  }, []);
  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        ref={box}
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={"dialog " + (wide ? "dialog-wide" : "")}
      >
        <div className="dialog-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 id="dialog-title">{title}</h2>
          </div>
          <IconBtn icon={X} label="إغلاق" onClick={close} />
        </div>
        {children}
      </section>
    </div>
  );
}
export function Heading({ title, eng, action, onClick, icon: Icon }) {
  return (
    <div className="section-heading">
      <div className="heading-title">
        {Icon && <Icon className="heading-icon" size={21} />}
        <h2>{title}</h2>
        {eng && (
          <span className="heading-eng" dir="ltr">
            {eng}
          </span>
        )}
      </div>
      {action && (
        <button className="text-link" onClick={onClick}>
          {action}
          <ArrowLeft size={14} />
        </button>
      )}
    </div>
  );
}
export function Empty({ icon: Icon = Music2, title, body, action, onClick }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={29} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && (
        <button className="primary" onClick={onClick}>
          {action}
          <ArrowLeft size={16} />
        </button>
      )}
    </div>
  );
}
export function Busy() {
  return (
    <div className="busy">
      <LoaderCircle className="spin" size={22} />
      جارٍ التحميل…
    </div>
  );
}
export function SongCard({ s, list }) {
  const a = useApp(),
    is = a.current?.id === s.id && a.playing;
  return (
    <article className={"song-card" + (is ? " playing" : "")}>
      <button
        className="cover-button"
        aria-label={(is ? "إيقاف " : "تشغيل ") + s.title}
        onClick={() => a.play(s, list)}
      >
        <img
          src={s.cover || "/art/record.svg"}
          alt={"غلاف " + s.title}
          className="cover"
        />
        <span className="cover-shade" />
        <span className="genre-tag">{s.category}</span>
        <span className="cover-time" dir="ltr">
          {duration(s.duration)}
        </span>
        <span className={"cover-play " + (is ? "shown" : "")}>
          {is ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" />
          )}
        </span>
        {is && (
          <span className="tiny-bars">
            <i />
            <i />
            <i />
          </span>
        )}
      </button>
      <div className="song-meta">
        <div className="song-title-row">
          <button
            className="song-title"
            onClick={() => a.setModal({ type: "track", song: s })}
          >
            {s.title}
          </button>
          <IconBtn
            icon={Ellipsis}
            label={"خيارات " + s.title}
            onClick={() => a.setModal({ type: "track", song: s })}
          />
        </div>
        <button
          className="artist-line"
          onClick={() => a.go("artist/" + s.user_id)}
        >
          <Avatar src={s.avatar} name={s.username} size={21} />
          <span>{s.username}</span>
          <Verified show={!!s.verified} size={13} />
        </button>
      </div>
    </article>
  );
}
export function SongGrid({ songs }) {
  return (
    <div className="song-grid">
      {songs.map((s) => (
        <SongCard key={s.id} s={s} list={songs} />
      ))}
    </div>
  );
}
export function TrackRow({ s, i, list, rank = true }) {
  const a = useApp(),
    p = a.current?.id === s.id && a.playing;
  return (
    <div className={"track-row " + (p ? "playing" : "")}>
      {rank && (
        <span className="rank" dir="ltr">
          {String(i + 1).padStart(2, "0")}
        </span>
      )}
      <button
        className="row-cover"
        onClick={() => a.play(s, list)}
        aria-label={"تشغيل " + s.title}
      >
        <img src={s.cover} alt="" />
        <span>
          {p ? (
            <Pause size={14} fill="white" />
          ) : (
            <Play size={14} fill="white" />
          )}
        </span>
      </button>
      <div className="track-text">
        <button onClick={() => a.setModal({ type: "track", song: s })}>
          {s.title}
        </button>
        <button
          className="mini-artist"
          onClick={() => a.go("artist/" + s.user_id)}
        >
          <Avatar src={s.avatar} name={s.username} size={15} />
          {s.username}
          <Verified size={11} show={!!s.verified} />
        </button>
      </div>
      <span className="row-plays">
        <Headphones size={13} />
        <b dir="ltr">{nfmt(s.plays)}</b>
      </span>
      <span className="row-time" dir="ltr">
        {duration(s.duration)}
      </span>
      <IconBtn
        icon={Ellipsis}
        label={"خيارات " + s.title}
        onClick={() => a.setModal({ type: "track", song: s })}
      />
    </div>
  );
}
export function ArtistCard({ artist }) {
  const a = useApp(),
    on = a.lib.follows.includes(artist.id);
  return (
    <article className="artist-card">
      <button
        className="artist-portrait"
        onClick={() => a.go("artist/" + artist.id)}
      >
        <Avatar src={artist.avatar} name={artist.username} size={84} />
      </button>
      <button
        className="artist-name"
        onClick={() => a.go("artist/" + artist.id)}
      >
        {artist.username}
        <Verified show={!!artist.verified} />
      </button>
      <span className="muted small">
        {a.catalog.songs.find((s) => s.user_id === artist.id)?.category ||
          "فنان مستقل"}
      </span>
      <button
        className={"follow-btn " + (on ? "following" : "")}
        disabled={a.user?.id === artist.id}
        onClick={() => a.follow(artist.id)}
      >
        {on ? <Check size={13} /> : <Plus size={13} />}{" "}
        {on ? "تتابعه" : "متابعة"}
      </button>
    </article>
  );
}
