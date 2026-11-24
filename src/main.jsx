import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  ShieldOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Disc3,
  Music2,
} from "lucide-react";
import { AppProvider, useApp } from "./core";
import { Sidebar, Topbar, Player } from "./Shell";
import {
  Discover,
  Collection,
  Artists,
  ArtistPage,
  PageIntro,
} from "./Discover";
import { Profile, Mine, Developer } from "./Account";
import { Admin } from "./Admin";
import { Dialogs, TrackContent } from "./Dialogs";
import { Empty, Logo, Busy } from "./ui";
import "./styles.css";
function Content() {
  const a = useApp();
  if (a.loading)
    return (
      <div className="initial-load">
        <Logo />
        <Busy />
      </div>
    );
  if (a.error)
    return (
      <Empty
        title="تعذر تحميل الموسيقى"
        body={a.error}
        icon={RefreshCw}
        action="إعادة المحاولة"
        onClick={a.load}
      />
    );
  if (a.query.trim()) return <Collection />;
  switch (a.route) {
    case "discover":
      return <Discover />;
    case "all":
    case "charts":
    case "favorites":
      return <Collection />;
    case "artists":
    case "following":
      return <Artists />;
    case "profile":
      return <Profile />;
    case "mine":
      return <Mine />;
    case "admin":
      return <Admin />;
    case "developer":
      return <Developer />;
    default:
      if (a.route.startsWith("artist/")) return <ArtistPage />;
      if (a.route.startsWith("track/")) {
        const s = a.catalog.songs.find((s) => s.id === a.route.split("/")[1]);
        return s ? (
          <>
            <PageIntro tag="NOW DISCOVERING" title="تفاصيل الأغنية" />
            <div className="content-panel shared-track">
              <TrackContent song={s} />
            </div>
          </>
        ) : (
          <Empty
            title="الأغنية غير متاحة"
            body="ربما أُخفيت الأغنية أو لم تُنشر بعد."
            action="استكشف الموسيقى"
            onClick={() => a.go("discover")}
          />
        );
      }
      return (
        <Empty
          title="الصفحة غير موجودة"
          body="عد إلى الرئيسية لاكتشاف أحدث الإصدارات."
          action="الصفحة الرئيسية"
          onClick={() => a.go("discover")}
        />
      );
  }
}
function App() {
  const a = useApp();
  useEffect(() => {
    document.title =
      ({
        discover: "اكتشف الموسيقى",
        charts: "الأكثر استماعًا",
        artists: "الفنانون",
        favorites: "المفضلة",
        mine: "أغنياتي",
        admin: "لوحة التحكم",
        profile: "الملف الشخصي",
        developer: "المطوّر",
        all: "جميع الإصدارات",
        following: "أتابعهم",
      }[a.route] || "استمع الآن") + " | Oly Music";
  }, [a.route]);
  if (a.user?.banned)
    return (
      <div className="blocked">
        <Logo />
        <Empty
          icon={ShieldOff}
          title="هذا الحساب محظور"
          body="قيّدت الإدارة وصول هذا الحساب إلى المنصّة."
          action="تسجيل الخروج"
          onClick={a.logout}
        />
      </div>
    );
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.querySelector("main").focus();
        }}
      >
        تخطَّ إلى المحتوى
      </a>
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main id="main-content" tabIndex="-1">
          <Content />
        </main>
        <div className="page-foot">
          <span dir="ltr">OLY MUSIC</span>
          <i />
          صُنع لأصحاب الذوق.
        </div>
      </div>
      <Player />
      <Dialogs />
      {a.toastData && (
        <div
          className={
            "toast " + (a.toastData.type === "error" ? "toast-error" : "")
          }
          role="status"
        >
          {a.toastData.type === "error" ? (
            <AlertCircle size={17} />
          ) : (
            <CheckCircle2 size={17} />
          )}{" "}
          {a.toastData.message}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <AppProvider>
    <App />
  </AppProvider>,
);
