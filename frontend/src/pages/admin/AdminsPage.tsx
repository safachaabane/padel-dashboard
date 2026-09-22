import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import api from '../../utils/api';
import { Admin, AdminRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface AdminFormData {
  nom: string;
  email: string;
  password: string;
  role: AdminRole;
}

const roleLabel: Record<AdminRole, string> = {
  super_admin: '👑 Super administrateur',
  admin_clients: '🧑 Admin Clients',
  admin_personnel: '👷 Admin Personnel',
};

export default function AdminsPage() {
  const { admin: moi } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdminFormData>();

  const load = () => {
    api.get('/admin/admins')
      .then(r => setAdmins(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: AdminFormData) => {
    try {
      await api.post('/admin/admins', data);
      toast.success('Administrateur créé');
      reset();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet administrateur ?')) return;
    try {
      await api.delete(`/admin/admins/${id}`);
      toast.success('Administrateur supprimé');
      setAdmins(prev => prev.filter(a => a._id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  return (
    <div>
      <h1 className="page-title">Administrateurs</h1>
      <p className="page-subtitle">Gérer les comptes administrateurs et leurs accès</p>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>
          <UserPlus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Nouvel administrateur
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nom affiché <span className="required">*</span></label>
              <input
                className={`form-input${errors.nom ? ' error' : ''}`}
                placeholder="Ex: Admin Clients"
                {...register('nom', { required: 'Le nom est requis' })}
              />
              {errors.nom && <span className="form-error">⚠ {errors.nom.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Email <span className="required">*</span></label>
              <input
                className={`form-input${errors.email ? ' error' : ''}`}
                type="email"
                placeholder="email@exemple.com"
                {...register('email', { required: "L'email est requis" })}
              />
              {errors.email && <span className="form-error">⚠ {errors.email.message}</span>}
            </div>
          </div>

          <div className="form-grid-2 mt-4">
            <div className="form-group">
              <label className="form-label">Mot de passe <span className="required">*</span></label>
              <input
                className={`form-input${errors.password ? ' error' : ''}`}
                type="password"
                placeholder="6 caractères minimum"
                {...register('password', {
                  required: 'Le mot de passe est requis',
                  minLength: { value: 6, message: '6 caractères minimum' },
                })}
              />
              {errors.password && <span className="form-error">⚠ {errors.password.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Rôle / accès <span className="required">*</span></label>
              <select className="form-select" defaultValue="admin_clients" {...register('role', { required: true })}>
                <option value="admin_clients">🧑 Admin Clients — accès liste des clients inscrits</option>
                <option value="admin_personnel">👷 Admin Personnel — accès liste du personnel inscrit</option>
                <option value="super_admin">👑 Super administrateur — accès complet</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary mt-4">
            Créer l'administrateur
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement…</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 600 }}>{a.nom}</td>
                    <td>{a.email}</td>
                    <td>
                      <Shield size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {roleLabel[a.role as AdminRole] || a.role}
                    </td>
                    <td>
                      {a._id !== moi?.id && (
                        <button
                          onClick={() => handleDelete(a._id)}
                          title="Supprimer"
                          style={{ color: 'var(--alert-red)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
