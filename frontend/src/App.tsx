import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import RoleGuard from "./components/shared/RoleGuard";

// Public pages
import FormClientPage from "./pages/FormClientPage";
import FormPersonnelPage from "./pages/FormPersonnelPage";
import SuccessPage from "./pages/SuccessPage";
import SatisfactionPage from "./pages/SatisfactionPage";
import MaReservationPage from "./pages/MaReservationPage";

// Admin pages
import LoginPage from "./pages/admin/LoginPage";
import DashboardPage from "./pages/admin/DashboardPage";
import CreneauxPage from "./pages/admin/CreneauxPage";
import ParametresPage from "./pages/admin/ParametresPage";
import InscriptionsPage from "./pages/admin/InscriptionsPage";
import DetailsInscriptionsPage from "./pages/admin/DetailsInscriptionsPage";
import AdminsPage from "./pages/admin/AdminsPage";

// Redirige vers la page d'accueil admin adaptée au rôle de l'utilisateur connecté
function AdminIndexRedirect() {
  const { admin } = useAuth();
  const cible =
    admin?.role === "super_admin" ? "/admin/dashboard" : "/admin/inscriptions";
  return <Navigate to={cible} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route
          path="/"
          element={<Navigate to="/inscription/client" replace />}
        />
        <Route path="/inscription/client" element={<FormClientPage />} />
        <Route path="/inscription/personnel" element={<FormPersonnelPage />} />
        <Route path="/inscription/succes" element={<SuccessPage />} />
        <Route path="/satisfaction/:token" element={<SatisfactionPage />} />
        <Route path="/ma-reservation/:token" element={<MaReservationPage />} />

        {/* Admin */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route index element={<AdminIndexRedirect />} />
          <Route
            path="dashboard"
            element={
              <RoleGuard roles={["super_admin"]}>
                <DashboardPage />
              </RoleGuard>
            }
          />
          <Route
            path="creneaux"
            element={
              <RoleGuard roles={["super_admin"]}>
                <CreneauxPage />
              </RoleGuard>
            }
          />
          <Route
            path="parametres"
            element={
              <RoleGuard roles={["super_admin"]}>
                <ParametresPage />
              </RoleGuard>
            }
          />
          <Route path="inscriptions" element={<InscriptionsPage />} />
          <Route path="details" element={<DetailsInscriptionsPage />} />
          <Route
            path="administrateurs"
            element={
              <RoleGuard roles={["super_admin"]}>
                <AdminsPage />
              </RoleGuard>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
