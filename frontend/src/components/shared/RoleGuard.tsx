import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AdminRole } from '../../types';

interface Props {
  roles: AdminRole[];
  children: ReactNode;
}

/**
 * À utiliser à l'intérieur d'une route déjà protégée par <ProtectedRoute /> (donc déjà
 * authentifiée). Redirige vers la liste des inscriptions si le rôle de l'admin connecté
 * ne fait pas partie des rôles autorisés pour cette page (ex: Dashboard et Créneaux
 * réservés au super admin).
 */
export default function RoleGuard({ roles, children }: Props) {
  const { admin } = useAuth();
  if (admin && !roles.includes(admin.role)) {
    return <Navigate to="/admin/inscriptions" replace />;
  }
  return <>{children}</>;
}
