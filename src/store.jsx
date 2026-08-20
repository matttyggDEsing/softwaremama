import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { makeSeed } from "./data/seed.js";
import { migrate } from "./lib/migrate.js";

const KEY = "jafet-prototipo-v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version) return migrate(parsed) || makeSeed();
    }
  } catch {
    /* ignore */
  }
  return makeSeed();
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [db, setDb] = useState(load);
  const [nav, setNav] = useState({ page: "dashboard", params: {} });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* ignore */
    }
  }, [db]);

  const navigate = (page, params = {}) => {
    setNav({ page, params });
    window.scrollTo(0, 0);
  };

  const value = useMemo(() => {
    const patch = (collection, id, changes) =>
      setDb((d) => ({
        ...d,
        [collection]: d[collection].map((x) =>
          x.id === id ? { ...x, ...changes } : x
        ),
      }));

    const add = (collection, item) =>
      setDb((d) => ({ ...d, [collection]: [...d[collection], item] }));

    const remove = (collection, id) =>
      setDb((d) => ({
        ...d,
        [collection]: d[collection].filter((x) => x.id !== id),
      }));

    const setSettings = (changes) =>
      setDb((d) => ({ ...d, settings: { ...d.settings, ...changes } }));

    const resetDemo = () => setDb(makeSeed());

    return {
      db,
      setDb,
      nav,
      navigate,
      patch,
      add,
      remove,
      setSettings,
      resetDemo,
    };
  }, [db, nav]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  return useContext(Ctx);
}