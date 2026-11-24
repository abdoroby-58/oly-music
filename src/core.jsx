import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
export const A = createContext(null);
export const useApp = () => useContext(A);
export const categories = ["مهرجانات", "حزينة", "راب", "شعبي"];
export const duration = (n) => {
  n = Math.max(0, Math.floor(Number(n) || 0));
  return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0");
};
export const nfmt = (n) =>
  n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(n || 0);
export const arDate = (n) =>
  new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Number(n)));
export async function api(p, method = "GET", body) {
  const form = body instanceof FormData;
  const r = await fetch("/api" + p, {
    method,
    credentials: "same-origin",
    headers: body && !form ? { "Content-Type": "application/json" } : undefined,
    body: body ? (form ? body : JSON.stringify(body)) : undefined,
  });
  let d;
  try {
    d = await r.json();
  } catch {
    throw new Error("تعذّر الاتصال بالخادم. أعد المحاولة.");
  }
  if (!r.ok) {
    const e = new Error(d.error || "تعذر إتمام الطلب.");
    e.status = r.status;
    throw e;
  }
  return d;
}
const emptyLib = { likes: [], favorites: [], follows: [], mine: [] };
export function AppProvider({ children }) {
  const [user, setUser] = useState(null),
    [demo, setDemo] = useState(false),
    [catalog, setCatalog] = useState({ songs: [], artists: [], banners: [] }),
    [lib, setLib] = useState(emptyLib),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [route, setRoute] = useState(
      () => decodeURIComponent(location.hash.slice(1)) || "discover",
    ),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("الكل"),
    [sort, setSort] = useState("new"),
    [verifiedOnly, setVerifiedOnly] = useState(false),
    [modal, setModal] = useState(null),
    [panel, setPanel] = useState(""),
    [mobile, setMobile] = useState(false),
    [toastData, setToastData] = useState(null);
  const [notes, setNotes] = useState([]),
    [seen, setSeen] = useState(0),
    [sound, setSound] = useState(
      () => localStorage.getItem("oly-sound") !== "off",
    );
  const [audio] = useState(() => {
      const el = new Audio();
      el.preload = "none";
      return el;
    }),
    [current, setCurrent] = useState(null),
    [playing, setPlaying] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [total, setTotal] = useState(0),
    [volume, setVol] = useState(() => {
      const v = localStorage.getItem("oly-volume");
      return v === null ? 0.72 : Math.max(0, Math.min(1, Number(v) || 0));
    }),
    [shuffle, setShuffle] = useState(false),
    [repeat, setRepeat] = useState(false),
    [queue, setQueue] = useState([]);
  const toastTimer = useRef(null),
    afterAuth = useRef(null),
    seenIds = useRef(null),
    soundRef = useRef(sound),
    context = useRef(null),
    currentRef = useRef(null),
    searchRef = useRef(null),
    nextRef = useRef(null),
    restoreVol = useRef(0.72),
    actionLock = useRef(new Set());
  const toast = useCallback((message, type = "ok") => {
    setToastData({ message, type, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastData(null), 3800);
  }, []);
  useEffect(() => {
    soundRef.current = sound;
    localStorage.setItem("oly-sound", sound ? "on" : "off");
  }, [sound]);
  useEffect(() => {
    const activate = () => {
      try {
        const C = window.AudioContext || window.webkitAudioContext;
        if (C) {
          context.current = context.current || new C();
          context.current.resume().catch(() => {});
        }
      } catch {}
    };
    window.addEventListener("pointerdown", activate, { once: true });
    return () => window.removeEventListener("pointerdown", activate);
  }, []);
  function chime() {
    const c = context.current;
    if (!soundRef.current || !c || c.state !== "running") return;
    [784, 1046.5].forEach((f, i) => {
      const o = c.createOscillator(),
        g = c.createGain(),
        t = c.currentTime + i * 0.13;
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.33);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.34);
    });
  }
  const refreshCatalog = useCallback(async () => {
    const c = await api("/catalog");
    setCatalog(c);
    return c;
  }, []);
  const refreshLib = useCallback(async () => {
    const d = await api("/library");
    setLib(d);
    return d;
  }, []);
  const refreshNotes = useCallback(
    async (reset = false) => {
      const d = await api("/notifications");
      if (
        !reset &&
        seenIds.current &&
        d.items.some((n) => !seenIds.current.has(n.id))
      ) {
        chime();
        const fresh = d.items.find((n) => !seenIds.current.has(n.id));
        toast(fresh.title + " — " + fresh.body);
        refreshCatalog().catch(() => {});
      }
      seenIds.current = new Set(d.items.map((n) => n.id));
      setNotes(d.items);
      setSeen(d.seen_at || Number(localStorage.getItem("oly-guest-seen") || 0));
    },
    [toast, refreshCatalog],
  );
  const load = useCallback(async () => {
    setError("");
    try {
      const m = await api("/me");
      setUser(m.user);
      setDemo(m.demo);
      if (!m.user?.banned) {
        await Promise.all([
          refreshCatalog(),
          refreshNotes(true),
          m.user ? refreshLib() : Promise.resolve(setLib(emptyLib)),
        ]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [refreshCatalog, refreshLib, refreshNotes]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (user?.banned) {
      audio.pause();
      setPanel("");
      setModal(null);
      setLib(emptyLib);
    }
  }, [user?.banned, audio]);
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        await refreshNotes();
      } catch (e) {
        if (e.status === 403) load();
      }
    }, 7000);
    const cid = setInterval(() => {
      if (!document.hidden && !user?.banned) refreshCatalog().catch(() => {});
    }, 35000);
    return () => {
      clearInterval(id);
      clearInterval(cid);
    };
  }, [user?.id, user?.banned, refreshNotes, refreshCatalog, load]);
  useEffect(() => {
    const cb = () => {
      setRoute(decodeURIComponent(location.hash.slice(1)) || "discover");
      setMobile(false);
      setPanel("");
      setModal(null);
      setQuery("");
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", cb);
    return () => window.removeEventListener("hashchange", cb);
  }, []);
  const go = (r) => {
    setPanel("");
    setModal(null);
    setMobile(false);
    setQuery("");
    if (r !== "all") setCategory("الكل");
    if (r === route) window.scrollTo({ top: 0, behavior: "smooth" });
    else location.hash = r;
  };
  useEffect(() => {
    const kb = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setPanel("");
        setMobile(false);
        if (document.activeElement === searchRef.current) {
          setQuery("");
          searchRef.current?.blur();
        }
      }
    };
    window.addEventListener("keydown", kb);
    return () => window.removeEventListener("keydown", kb);
  }, []);
  useEffect(() => {
    if (!catalog.songs.length) {
      if (currentRef.current) {
        audio.pause();
        currentRef.current = null;
        setCurrent(null);
      }
      return;
    }
    const prev = currentRef.current;
    const s =
      catalog.songs.find(
        (t) => t.id === (prev?.id || localStorage.getItem("oly-current")),
      ) || catalog.songs[0];
    if (!prev || prev.id !== s.id) {
      audio.pause();
      audio.src = s.audio_url;
      setElapsed(0);
      setTotal(s.duration);
    }
    currentRef.current = s;
    setCurrent(s);
  }, [catalog.songs, audio]);
  function setVolume(v) {
    setVol(Math.max(0, Math.min(1, v)));
  }
  useEffect(() => {
    audio.volume = volume;
    localStorage.setItem("oly-volume", String(volume));
    if (volume > 0) restoreVol.current = volume;
  }, [audio, volume]);
  const mute = () => setVolume(volume ? 0 : restoreVol.current || 0.72);
  function play(song, list, force = false) {
    if (!song) return;
    if (list?.length) setQueue(list.map((s) => s.id));
    if (currentRef.current?.id === song.id && !audio.paused && !force) {
      audio.pause();
      return;
    }
    if (currentRef.current?.id !== song.id || !audio.src) {
      audio.src = song.audio_url;
      setElapsed(0);
      setTotal(song.duration);
      setCurrent(song);
      currentRef.current = song;
    }
    localStorage.setItem("oly-current", song.id);
    audio.play().catch((e) => {
      if (e.name !== "AbortError")
        toast("تعذر تشغيل الملف الصوتي. أعد المحاولة.", "error");
    });
  }
  const queueSongs = queue.length
    ? queue.map((id) => catalog.songs.find((s) => s.id === id)).filter(Boolean)
    : catalog.songs;
  function skip(d = 1, ended = false) {
    const l = queueSongs.length ? queueSongs : catalog.songs;
    if (!l.length) return;
    if (ended && repeat) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    const i = l.findIndex((s) => s.id === currentRef.current?.id);
    const n =
      shuffle && l.length > 1
        ? (i + 1 + Math.floor(Math.random() * (l.length - 1))) % l.length
        : (i + d + l.length) % l.length;
    play(l[n], l, true);
  }
  nextRef.current = skip;
  useEffect(() => {
    const onPlay = () => {
        setPlaying(true);
        const id = currentRef.current?.id;
        if (id) api("/songs/" + id + "/play", "POST").catch(() => {});
      },
      onPause = () => setPlaying(false),
      onTime = () => setElapsed(audio.currentTime || 0),
      onMeta = () => {
        if (Number.isFinite(audio.duration)) setTotal(audio.duration);
      },
      onEnd = () => nextRef.current(1, true);
    for (const [evt, fn] of [
      ["playing", onPlay],
      ["pause", onPause],
      ["timeupdate", onTime],
      ["loadedmetadata", onMeta],
      ["ended", onEnd],
    ])
      audio.addEventListener(evt, fn);
    return () => {
      for (const [evt, fn] of [
        ["playing", onPlay],
        ["pause", onPause],
        ["timeupdate", onTime],
        ["loadedmetadata", onMeta],
        ["ended", onEnd],
      ])
        audio.removeEventListener(evt, fn);
    };
  }, [audio]);
  function seek(v) {
    if (audio.readyState > 0 && Number.isFinite(audio.duration)) {
      audio.currentTime = Math.min(v, audio.duration);
      setElapsed(audio.currentTime);
    } else if (current) {
      audio.preload = "metadata";
      audio.addEventListener(
        "loadedmetadata",
        () => {
          audio.currentTime = Math.min(v, audio.duration);
          setElapsed(audio.currentTime);
        },
        { once: true },
      );
      audio.load();
    }
  }
  function guard(fn) {
    setPanel("");
    if (!user) {
      afterAuth.current = fn;
      setModal({ type: "auth", tab: "login" });
      return;
    }
    fn();
  }
  async function authed(u) {
    setUser(u);
    setModal(null);
    setPanel("");
    await Promise.all([refreshLib(), refreshNotes(true)]);
    toast("أهلًا بك، " + u.username);
    const f = afterAuth.current;
    afterAuth.current = null;
    if (f) f();
  }
  function closeModal() {
    setModal(null);
    afterAuth.current = null;
  }
  async function logout() {
    try {
      await api("/auth/logout", "POST");
      audio.pause();
      setUser(null);
      setLib(emptyLib);
      go("discover");
      await refreshNotes(true);
      await refreshCatalog();
      toast("تم تسجيل الخروج.");
    } catch (e) {
      toast(e.message, "error");
    }
  }
  function toggleSong(s, action) {
    guard(async () => {
      const key = action + s.id;
      if (actionLock.current.has(key)) return;
      actionLock.current.add(key);
      try {
        const d = await api("/songs/" + s.id + "/" + action, "POST");
        await refreshLib();
        if (action === "like") await refreshCatalog();
        toast(
          action === "favorite"
            ? d.active
              ? "أُضيفت الأغنية إلى المفضلة."
              : "أُزيلت الأغنية من المفضلة."
            : d.active
              ? "سجّلت إعجابك بالأغنية."
              : "تم إلغاء الإعجاب.",
        );
      } catch (e) {
        toast(e.message, "error");
      } finally {
        actionLock.current.delete(key);
      }
    });
  }
  function follow(id) {
    guard(async () => {
      if (actionLock.current.has(id)) return;
      actionLock.current.add(id);
      try {
        const d = await api("/artists/" + id + "/follow", "POST");
        await refreshLib();
        toast(d.active ? "أصبحت تتابع هذا الفنان." : "تم إلغاء المتابعة.");
      } catch (e) {
        toast(e.message, "error");
      } finally {
        actionLock.current.delete(id);
      }
    });
  }
  async function readNotes() {
    try {
      if (user) await api("/notifications/read", "POST");
      else localStorage.setItem("oly-guest-seen", String(Date.now()));
      setSeen(Date.now());
    } catch (e) {
      toast(e.message, "error");
    }
  }
  const ctx = {
    user,
    setUser,
    demo,
    catalog,
    lib,
    loading,
    error,
    load,
    route,
    go,
    query,
    setQuery,
    category,
    setCategory,
    sort,
    setSort,
    verifiedOnly,
    setVerifiedOnly,
    modal,
    setModal,
    closeModal,
    panel,
    setPanel,
    mobile,
    setMobile,
    toast,
    toastData,
    notes,
    seen,
    readNotes,
    sound,
    setSound,
    searchRef,
    audio,
    current,
    playing,
    play,
    skip,
    seek,
    elapsed,
    total,
    volume,
    setVolume,
    mute,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    queueSongs,
    guard,
    authed,
    logout,
    toggleSong,
    follow,
    refreshCatalog,
    refreshLib,
    refreshNotes,
  };
  return <A.Provider value={ctx}>{children}</A.Provider>;
}
