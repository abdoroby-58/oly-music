import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  Users,
  Eye,
  Disc3,
  Flag,
  Clock3,
  CheckCircle2,
  XCircle,
  Ban,
  Image,
  Search,
  BadgeCheck,
  Check,
  UserRoundCheck,
  ShieldOff,
  Edit3,
  FileAudio,
  RefreshCw,
  Headphones,
  ChartColumn,
  ArrowLeft,
  LockKeyhole,
  Filter,
} from "lucide-react";
import { useApp, api, arDate } from "./core";
import { PageIntro } from "./Discover";
import { Avatar, Verified, Empty, Busy, Heading } from "./ui";
import { Status } from "./Account";
import { ErrorBox } from "./Dialogs";
const tabs = [
  ["pending", "الأغاني المعلقة", Clock3],
  ["approved", "المقبولة", CheckCircle2],
  ["rejected", "المرفوضة", XCircle],
  ["reports", "الإبلاغات", Flag],
  ["accounts", "الحسابات", Users],
  ["banned", "المحظورون", Ban],
  ["banners", "البنرات", Image],
];
export function Admin() {
  const a = useApp(),
    [data, setData] = useState(null),
    [tab, setTab] = useState("pending"),
    [q, setQ] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api("/admin/overview"));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (a.user?.role === "admin") reload();
  }, [a.user?.role, a.notes[0]?.id, reload]);
  if (a.user?.role !== "admin")
    return (
      <Empty
        icon={LockKeyhole}
        title="مساحة خاصة بالإدارة"
        body="لا تملك صلاحية الاطلاع على لوحة التحكم."
        action="العودة إلى الموسيقى"
        onClick={() => a.go("discover")}
      />
    );
  function accountAction(u, act) {
    const labels = {
      verify: "توثيق الحساب",
      unverify: "إلغاء التوثيق",
      ban: "حظر الحساب",
      unban: "فك الحظر",
    };
    a.setModal({
      type: "confirm",
      title: labels[act],
      body:
        act === "ban"
          ? "سيُمنع «" +
            u.username +
            "» من استخدام الموقع، وستختفي أغانيه إلى أن يُفك الحظر."
          : "هل تريد " + labels[act] + " لـ «" + u.username + "»؟",
      onConfirm: async () => {
        await api("/admin/users/" + u.id, "POST", { action: act });
        await Promise.all([reload(), a.refreshCatalog()]);
        a.toast("تم تحديث حالة الحساب.");
      },
    });
  }
  const accountTab = tab === "accounts" || tab === "banned",
    songTab = !accountTab && tab !== "banners";
  const sFilter = (s, key) =>
    key === "reports"
      ? s.reports_count > 0 || s.flagged
      : s.status === key && (key !== "pending" || !s.flagged);
  const songs =
      data?.songs.filter(
        (s) => sFilter(s, tab) && (s.title + s.username).includes(q),
      ) || [],
    users =
      data?.users.filter(
        (u) =>
          (tab !== "banned" || u.banned) &&
          (u.username + u.email).toLowerCase().includes(q.toLowerCase()),
      ) || [];
  const count = (k) =>
    !data
      ? ""
      : k === "banners"
        ? 3
        : k === "accounts"
          ? data.users.length
          : k === "banned"
            ? data.users.filter((u) => u.banned).length
            : data.songs.filter((s) => sFilter(s, k)).length;
  return (
    <>
      <PageIntro
        title="لوحة التحكم"
        tag="OLY CONTROL ROOM"
        body="إدارة المحتوى والحسابات وتجربة الاستماع."
      >
        <button className="secondary" disabled={loading} onClick={reload}>
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          تحديث
        </button>
      </PageIntro>
      <ErrorBox text={error} />
      {!data ? (
        <Busy />
      ) : (
        <>
          <div className="admin-stats">
            {[
              [Users, "الحسابات المسجلة", data.users.length],
              [Eye, "الزوار الفريدون", data.visitors],
              [Clock3, "تنتظر المراجعة", count("pending")],
              [Flag, "أغانٍ مُبلّغ عنها", count("reports")],
            ].map(([I, l, v]) => (
              <div key={l}>
                <I size={20} />
                <b dir="ltr">{v}</b>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <div className="admin-tabs">
            {tabs.map(([k, l, I]) => (
              <button
                key={k}
                className={tab === k ? "active" : ""}
                onClick={() => {
                  setTab(k);
                  setQ("");
                }}
              >
                <I size={15} />
                {l}
                <span>{count(k)}</span>
              </button>
            ))}
          </div>
          <div className="admin-content content-panel">
            <div className="admin-table-head">
              <h2>{tabs.find((t) => t[0] === tab)[1]}</h2>
              {tab !== "banners" && (
                <div className="mini-search">
                  <Search size={15} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={
                      accountTab ? "بحث في الحسابات..." : "بحث في الأغاني..."
                    }
                    aria-label="بحث داخل لوحة التحكم"
                  />
                </div>
              )}
            </div>
            {accountTab ? (
              users.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>الحساب</th>
                        <th>تاريخ التسجيل</th>
                        <th>الحالة</th>
                        <th>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className="table-account">
                              <Avatar
                                src={u.avatar}
                                name={u.username}
                                size={35}
                              />
                              <div>
                                <b>
                                  {u.username}
                                  <Verified show={!!u.verified} size={13} />
                                </b>
                                <small dir="ltr">{u.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>{arDate(u.created_at)}</td>
                          <td>
                            <span
                              className={
                                "status " +
                                (u.banned
                                  ? "status-rejected"
                                  : "status-approved")
                              }
                            >
                              <i />
                              {u.banned
                                ? "محظور"
                                : u.role === "admin"
                                  ? "أدمن"
                                  : "نشط"}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="mini-btn"
                                onClick={() =>
                                  accountAction(
                                    u,
                                    u.verified ? "unverify" : "verify",
                                  )
                                }
                              >
                                <BadgeCheck size={13} />
                                {u.verified ? "إلغاء التوثيق" : "توثيق"}
                              </button>
                              {u.role !== "admin" && (
                                <button
                                  className={
                                    "mini-btn " + (u.banned ? "" : "danger")
                                  }
                                  onClick={() =>
                                    accountAction(u, u.banned ? "unban" : "ban")
                                  }
                                >
                                  {u.banned ? (
                                    <UserRoundCheck size={13} />
                                  ) : (
                                    <Ban size={13} />
                                  )}{" "}
                                  {u.banned ? "فك الحظر" : "حظر"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  icon={Users}
                  title="لا توجد حسابات مطابقة"
                  body={
                    tab === "banned"
                      ? "لا يوجد أي حساب محظور يطابق بحثك."
                      : "جرّب اسمًا أو بريدًا آخر."
                  }
                />
              )
            ) : songTab ? (
              songs.length ? (
                <div className="admin-songs">
                  {songs.map((s) => (
                    <div className="my-song" key={s.id}>
                      <img src={s.cover} alt={"غلاف " + s.title} />
                      <div>
                        <h3>{s.title}</h3>
                        <span className="artist-line">
                          <Avatar src={s.avatar} name={s.username} size={17} />
                          {s.username}
                          <Verified show={!!s.verified} size={12} />
                        </span>
                      </div>
                      <Status s={s} />
                      {s.reports_count > 0 && (
                        <span className="pink-badge">
                          {s.reports_count} بلاغ
                        </span>
                      )}
                      <button
                        className="secondary"
                        onClick={() =>
                          a.setModal({
                            type: "review",
                            song: s,
                            admin: true,
                            reports: data.reports.filter(
                              (r) => r.song_id === s.id,
                            ),
                            onDone: reload,
                          })
                        }
                      >
                        <Headphones size={14} />
                        مراجعة
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={tab === "reports" ? ShieldCheck : Disc3}
                  title={q ? "لا توجد نتائج مطابقة" : "القائمة فارغة"}
                  body={
                    tab === "pending"
                      ? "ستظهر هنا الأغاني الجديدة قبل نشرها."
                      : tab === "reports"
                        ? "لا توجد بلاغات تحتاج للمراجعة حاليًا."
                        : "لا توجد أغاني بهذه الحالة حاليًا."
                  }
                />
              )
            ) : (
              <div className="admin-banners">
                {data.banners.map((b) => (
                  <div key={b.id} className="admin-banner">
                    <img src={b.image} alt={"صورة البنر " + b.id} />
                    <div>
                      <small>البنر 0{b.id}</small>
                      <h3>{b.title}</h3>
                      <p>{b.subtitle}</p>
                      <button
                        className="secondary"
                        onClick={() =>
                          a.setModal({
                            type: "banner",
                            banner: b,
                            onDone: reload,
                          })
                        }
                      >
                        <Edit3 size={13} />
                        تعديل البنر
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="admin-private">
            <LockKeyhole size={12} />
            إحصاءات الحسابات والزوار خاصة بالإدارة، ولا تظهر للمستمعين.
          </p>
        </>
      )}
    </>
  );
}
