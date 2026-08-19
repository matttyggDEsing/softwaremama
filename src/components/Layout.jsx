import { useState } from "react";
import { Icon, Btn } from "./ui.jsx";
import { useStore } from "../store.jsx";

const NAV = [
  { id: "dashboard", label: "Panel", icon: "grid" },
  { id: "clientes", label: "Clientes", icon: "users" },
  { id: "eventos", label: "Eventos", icon: "calendar" },
  { id: "menus", label: "Menú y costos", icon: "utensils" },
  { id: "inventario", label: "Inventario y compras", icon: "box" },
  { id: "personal", label: "Personal", icon: "people" },
  { id: "documentos", label: "Documentos", icon: "file" },
  { id: "pagos", label: "Pagos y reportes", icon: "wallet" },
];

function brand() {
  return (
    <div className="brand">
      <span className="brand-mark">J</span>
      <span className="brand-text">
        <strong>JAFET</strong>
        <em>Eventos</em>
      </span>
    </div>
  );
}

function OfflineIndicator() {
  const [open, setOpen] = useState(false);
  return (
    <div className="offline-wrap">
      <button className={`offline-pill ${open ? "active" : ""}`} onClick={() => setOpen(!open)}>
        <Icon name="cloudOff" size={15} />
        <span>Modo offline</span>
      </button>
      {open && (
        <div className="offline-pop">
          <strong>Modo offline (prototipo)</strong>
          <p>
            En la versión final, JAFET funcionará sin conexión: los datos se
            guardan en el dispositivo y se sincronizan cuando hay red. En esta
            etapa los cambios se guardan en el navegador y sobreviven al
            recargar la página.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { nav, navigate } = useStore();
  const [drawer, setDrawer] = useState(false);

  const go = (id) => {
    navigate(id);
    setDrawer(false);
  };

  const navList = (
    <nav className="nav">
      {NAV.map((n) => (
        <button
          key={n.id}
          className={`nav-item ${nav.page === n.id || (nav.page === "cliente" && n.id === "clientes") || (nav.page === "evento" && n.id === "eventos") ? "active" : ""}`}
          onClick={() => go(n.id)}
        >
          <Icon name={n.icon} size={19} />
          <span>{n.label}</span>
        </button>
      ))}
    </nav>
  );

  const current = NAV.find((n) => n.id === nav.page);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">{brand()}</div>
        {navList}
        <div className="sidebar-foot">
          <OfflineIndicator />
          <span className="sidebar-ver">Prototipo v0.1</span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setDrawer(true)} aria-label="Menú">
            <Icon name="menu" size={22} />
          </button>
          <h1 className="topbar-title">{current ? current.label : "JAFET Eventos"}</h1>
          <div className="topbar-right">
            <OfflineIndicator />
            <button className="btn btn-primary btn-sm" onClick={() => navigate("eventos", { nuevo: true })}>
              <Icon name="plus" size={15} /> Nuevo evento
            </button>
          </div>
        </header>

        {drawer && (
          <div className="overlay drawer-overlay" onClick={() => setDrawer(false)}>
            <div className="drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-head">
                {brand()}
                <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Cerrar">
                  <Icon name="close" size={18} />
                </button>
              </div>
              {navList}
            </div>
          </div>
        )}

        <main className="content">{children}</main>
      </div>
    </div>
  );
}