import Layout from "./components/Layout.jsx";
import { useStore } from "./store.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { ClientesPage, ClienteDetail } from "./pages/Clientes.jsx";
import { EventosPage, EventoDetail } from "./pages/Eventos.jsx";
import MenusPage from "./pages/Menus.jsx";
import InventarioPage from "./pages/Inventario.jsx";
import PersonalPage from "./pages/Personal.jsx";
import DocumentosPage from "./pages/Documentos.jsx";
import PagosPage from "./pages/Pagos.jsx";

function CurrentView() {
  const { nav } = useStore();
  switch (nav.page) {
    case "dashboard":
      return <Dashboard />;
    case "clientes":
      return <ClientesPage />;
    case "cliente":
      return <ClienteDetail id={nav.params.id} />;
    case "eventos":
      return <EventosPage />;
    case "evento":
      return <EventoDetail id={nav.params.id} />;
    case "menus":
      return <MenusPage />;
    case "inventario":
      return <InventarioPage />;
    case "personal":
      return <PersonalPage />;
    case "documentos":
      return <DocumentosPage />;
    case "pagos":
      return <PagosPage />;
    default:
      return <Dashboard />;
  }
}

export default function App() {
  return (
    <Layout>
      <CurrentView />
    </Layout>
  );
}