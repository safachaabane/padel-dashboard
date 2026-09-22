import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, CalendarDays } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { Creneau } from '../../types';

interface CreneauForm {
  heureDebut: string;
  heureFin: string;
  nombrePlaces: number;
  type: 'client' | 'personnel' | 'mixte';
  actif: boolean;
}

export default function CreneauxPage() {
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Creneau | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreneauForm>({
    defaultValues: { actif: true, nombrePlaces: 1 },
  });

  const load = () => {
    api.get('/creneaux/all').then(r => setCreneaux(r.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditTarget(null);
    reset({ actif: true, type: 'client', nombrePlaces: 1, heureDebut: '', heureFin: '' });
    setShowModal(true);
  };

  const openEdit = (cr: Creneau) => {
    setEditTarget(cr);
    reset({
      heureDebut: cr.heureDebut,
      heureFin: cr.heureFin,
      nombrePlaces: cr.nombrePlaces,
      type: cr.type,
      actif: cr.actif,
    });
    setShowModal(true);
  };

  const onSubmit = async (data: CreneauForm) => {
    try {
      if (editTarget) {
        await api.put(`/creneaux/${editTarget._id}`, data);
        toast.success('Créneau modifié');
      } else {
        await api.post('/creneaux', data);
        toast.success('Créneau créé');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce créneau ?')) return;
    setDeleting(id);
    try {
      await api.delete(`/creneaux/${id}`);
      toast.success('Créneau supprimé');
      setCreneaux(prev => prev.filter(c => c._id !== id));
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const typeBadge = (t: string) => {
    if (t === 'client')    return <span className="badge badge-blue">🧑 Client</span>;
    if (t === 'personnel') return <span className="badge badge-green">👷 Personnel</span>;
    return <span className="badge badge-gray">🔀 Mixte</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Créneaux</h1>
          <p className="page-subtitle">
            Gérez les horaires disponibles chaque jour (les places restantes et les limites
            de réservation se gèrent par date/semaine, pas ici — voir « Paramètres »).
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Nouveau créneau
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement…</div>
          ) : creneaux.length === 0 ? (
            <div className="empty-state">
              <CalendarDays size={48} />
              <h3>Aucun créneau</h3>
              <p>Créez votre premier créneau avec le bouton ci-dessus.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Horaire</th>
                  <th>Type</th>
                  <th>Places par jour</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {creneaux.map(cr => (
                  <tr key={cr._id}>
                    <td style={{ fontWeight: 600 }}>{cr.heureDebut} – {cr.heureFin}</td>
                    <td>{typeBadge(cr.type)}</td>
                    <td>{cr.nombrePlaces} équipe(s)</td>
                    <td>
                      {cr.actif
                        ? <span className="badge badge-green">Actif</span>
                        : <span className="badge badge-gray">Inactif</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(cr)} title="Modifier">
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => handleDelete(cr._id)}
                          disabled={deleting === cr._id}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem' }}>
                {editTarget ? 'Modifier le créneau' : 'Nouveau créneau'}
              </h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Type <span className="required">*</span></label>
                <select className="form-select" {...register('type', { required: true })}>
                  <option value="client">Client</option>
                  <option value="personnel">Personnel</option>
                  <option value="mixte">Mixte (les deux)</option>
                </select>
              </div>

              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Heure début <span className="required">*</span></label>
                  <input
                    type="time"
                    className={`form-input${errors.heureDebut ? ' error' : ''}`}
                    {...register('heureDebut', { required: 'Requis' })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Heure fin <span className="required">*</span></label>
                  <input
                    type="time"
                    className={`form-input${errors.heureFin ? ' error' : ''}`}
                    {...register('heureFin', { required: 'Requis' })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Nombre de places par jour <span className="required">*</span></label>
                <input
                  type="number"
                  min={1}
                  className={`form-input${errors.nombrePlaces ? ' error' : ''}`}
                  {...register('nombrePlaces', { required: 'Requis', min: 1, valueAsNumber: true })}
                />
                <span className="form-hint">1 place = 1 équipe de 4 joueurs, pour une même date</span>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" {...register('actif')} style={{ width: 16, height: 16 }} />
                  <span className="form-label" style={{ marginBottom: 0 }}>Créneau actif (visible dans les formulaires)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement…' : editTarget ? 'Enregistrer' : 'Créer le créneau'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
