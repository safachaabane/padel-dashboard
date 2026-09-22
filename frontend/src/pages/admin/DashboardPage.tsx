import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, Users, CheckCircle, Clock, UserX, UserCheck } from 'lucide-react';
import api from '../../utils/api';
import { DashboardStats, Inscription, Creneau } from '../../types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
      Chargement…
    </div>
  );

  if (!stats) return null;

  const statCards = [
    { label: 'Créneaux actifs',    value: stats.creneaux.actifs,              icon: <CalendarDays size={20} />, color: '#d8f3dc', iconColor: 'var(--green-600)' },
    { label: 'Total inscriptions', value: stats.inscriptions.total,            icon: <Users size={20} />,        color: '#eff6ff', iconColor: '#2563eb' },
    { label: 'Confirmées',         value: stats.inscriptions.confirmees,       icon: <CheckCircle size={20} />,  color: '#f0fdf4', iconColor: '#16a34a' },
    { label: 'En attente',         value: stats.inscriptions.enAttente,        icon: <Clock size={20} />,        color: '#fffbeb', iconColor: '#d97706' },
    { label: 'Clients inscrits',   value: stats.inscriptions.clients,          icon: <UserCheck size={20} />,    color: '#faf5ff', iconColor: '#7c3aed' },
    { label: 'Personnel inscrits', value: stats.inscriptions.personnel,        icon: <UserX size={20} />,        color: '#fef2f2', iconColor: '#dc2626' },
  ];

  const statutBadge = (s: string) => {
    if (s === 'confirme')   return <span className="badge badge-green">Confirmée</span>;
    if (s === 'en_attente') return <span className="badge badge-yellow">En attente</span>;
    return <span className="badge badge-red">Annulée</span>;
  };

  return (
    <div>
      <h1 className="page-title">Tableau de bord</h1>
      <p className="page-subtitle">Vue d'ensemble de votre activité padel</p>

      {/* Stats grid */}
      <div className="stats-grid">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.color, color: s.iconColor }}>
              {s.icon}
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Inscriptions récentes */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Inscriptions récentes</span>
            <a href="/admin/inscriptions" className="btn btn-secondary btn-sm">Tout voir</a>
          </div>
          {stats.inscriptionsRecentes.length === 0 ? (
            <div className="empty-state">
              <p>Aucune inscription récente</p>
            </div>
          ) : (
            <div>
              {stats.inscriptionsRecentes.map((ins: Inscription) => (
                <div key={ins._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{ins.nomComplet}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                      {ins.typeInscrit === 'client' ? '🧑 Client' : '👷 Personnel'} •{' '}
                      {format(new Date(ins.createdAt), 'd MMM', { locale: fr })}
                    </div>
                  </div>
                  {statutBadge(ins.statut)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prochaines réservations */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Prochaines réservations</span>
            <a href="/admin/creneaux" className="btn btn-secondary btn-sm">Gérer les créneaux</a>
          </div>
          {stats.prochainsCreneaux.length === 0 ? (
            <div className="empty-state">
              <p>Aucune réservation à venir</p>
            </div>
          ) : (
            <div>
              {stats.prochainsCreneaux.map((ins) => {
                const cr = ins.creneau as Creneau;
                return (
                  <div key={ins._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.875rem' }}>
                          {format(new Date(ins.date), 'EEE d MMM', { locale: fr })}
                          {cr && typeof cr === 'object' ? ` • ${cr.heureDebut}–${cr.heureFin}` : ''}
                        </div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                          {ins.nomComplet} • {ins.typeInscrit === 'client' ? '🧑 Client' : '👷 Personnel'}
                        </div>
                      </div>
                      {statutBadge(ins.statut)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
