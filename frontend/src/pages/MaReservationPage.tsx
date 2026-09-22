import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, XCircle, Loader, CalendarClock, Users, Building2 } from 'lucide-react';
import api from '../utils/api';
import { MaReservation } from '../types';
import DateSelector from '../components/forms/DateSelector';
import CreneauSelector from '../components/forms/CreneauSelector';

const statutInfo: Record<string, { label: string; className: string }> = {
  en_attente: { label: '⏳ En attente de confirmation', className: 'badge-yellow' },
  confirme: { label: '✓ Confirmée', className: 'badge-green' },
  re_reserve: { label: '📅 Nouveau créneau à choisir', className: 'badge-blue' },
  annule: { label: '✕ Annulée', className: 'badge-red' },
};

export default function MaReservationPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<MaReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');

  // Annulation
  const [annulEnCours, setAnnulEnCours] = useState(false);
  const [confirmationAnnul, setConfirmationAnnul] = useState(false);
  const [messageAnnul, setMessageAnnul] = useState('');

  // Re-réservation
  const [date, setDate] = useState('');
  const [creneauId, setCreneauId] = useState('');
  const [reReservationEnCours, setReReservationEnCours] = useState(false);
  const [erreurReReservation, setErreurReReservation] = useState('');
  const [reReservationOk, setReReservationOk] = useState(false);

  const charger = () => {
    if (!token) {
      setErreurChargement('Lien invalide');
      setLoading(false);
      return;
    }
    api
      .get<MaReservation>(`/mes-reservations/${token}`)
      .then((r) => setInfo(r.data))
      .catch((err) => setErreurChargement(err.response?.data?.message || 'Lien invalide ou expiré'))
      .finally(() => setLoading(false));
  };

  useEffect(charger, [token]);

  const handleAnnuler = async () => {
    setAnnulEnCours(true);
    try {
      const { data } = await api.post(`/mes-reservations/${token}/annuler`);
      setMessageAnnul(data.message);
      charger();
    } catch (err: any) {
      setMessageAnnul(err.response?.data?.message || "Erreur lors de l'annulation");
    } finally {
      setAnnulEnCours(false);
      setConfirmationAnnul(false);
    }
  };

  const handleReReserver = async () => {
    if (!date || !creneauId) {
      setErreurReReservation('Merci de choisir une date et un créneau.');
      return;
    }
    setErreurReReservation('');
    setReReservationEnCours(true);
    try {
      await api.post(`/mes-reservations/${token}/re-reserver`, { date, creneauId });
      setReReservationOk(true);
      charger();
    } catch (err: any) {
      setErreurReReservation(err.response?.data?.message || 'Erreur lors de la re-réservation');
    } finally {
      setReReservationEnCours(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--green-900)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <Loader size={32} className="spin" style={{ color: '#fff' }} />
      </div>
    );
  }

  if (erreurChargement && !info) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--green-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="success-card">
          <div className="success-icon" style={{ background: '#fff0f0', color: 'var(--alert-red)' }}>
            <XCircle size={40} />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>Lien invalide</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{erreurChargement}</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  const statut = statutInfo[info.statut] || { label: info.statut, className: 'badge-gray' };

  return (
    <div
      className="success-page"
      style={{
        minHeight: '100vh',
        background: "url('/assets/padel.jpg') no-repeat center center / cover",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div className="success-card" style={{ maxWidth: 520, textAlign: 'left' }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 4, textAlign: 'center' }}>Ma réservation</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 18, textAlign: 'center' }}>
          Bonjour <strong>{info.nomComplet}</strong>
        </p>

        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <span className={`badge ${statut.className}`} style={{ fontSize: '.85rem', padding: '6px 14px' }}>
            {statut.label}
          </span>
        </div>

        <div
          style={{
            background: 'var(--surface-3)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: 20,
            fontSize: '.9rem',
            lineHeight: 1.8,
          }}
        >
          {info.societe && (
            <p><Building2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{info.societe}</p>
          )}
          <p>
            <CalendarClock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {format(new Date(info.date), 'EEEE d MMMM yyyy', { locale: fr })}
            {info.creneau ? ` · ${info.creneau.heureDebut} – ${info.creneau.heureFin}` : ''}
          </p>
          <p style={{ marginTop: 6 }}>
            <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Équipe : {info.nomComplet}
            {(info.invites || []).map((inv, i) => `, ${inv.nom}`).join('')}
          </p>
        </div>

        {/* Annulation */}
        {info.statut !== 'annule' && info.statut !== 're_reserve' && (
          <div style={{ marginBottom: 12 }}>
            {info.peutAnnuler ? (
              messageAnnul ? (
                <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>{messageAnnul}</p>
              ) : !confirmationAnnul ? (
                <button className="btn btn-danger btn-full" onClick={() => setConfirmationAnnul(true)}>
                  Annuler ma réservation
                </button>
              ) : (
                <div>
                  <p style={{ fontSize: '.85rem', marginBottom: 10, color: 'var(--text-secondary)' }}>
                    Confirmez-vous l'annulation de cette réservation ? Cette action est définitive.
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmationAnnul(false)} disabled={annulEnCours}>
                      Retour
                    </button>
                    <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleAnnuler} disabled={annulEnCours}>
                      {annulEnCours ? 'Annulation…' : "Oui, annuler"}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                L'annulation en ligne n'est plus possible (moins de 48h avant le créneau).
              </p>
            )}
          </div>
        )}

        {/* Re-réservation */}
        {info.doitReReserver && (
          reReservationOk ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={32} style={{ color: 'var(--green-600)', marginBottom: 8 }} />
              <p style={{ color: 'var(--text-secondary)' }}>
                Votre nouveau créneau a bien été enregistré. Il est en attente de confirmation.
              </p>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>Choisissez un nouveau créneau</h3>
              <div style={{ marginBottom: 14 }}>
                <DateSelector value={date} onChange={(d) => { setDate(d); setCreneauId(''); }} typeInscrit={info.typeInscrit} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <CreneauSelector date={date} value={creneauId} onChange={setCreneauId} typeInscrit={info.typeInscrit} />
              </div>
              {erreurReReservation && <p className="form-error" style={{ marginBottom: 12 }}>⚠ {erreurReReservation}</p>}
              <button className="btn btn-primary btn-full" onClick={handleReReserver} disabled={reReservationEnCours}>
                {reReservationEnCours ? 'Enregistrement…' : 'Valider ce nouveau créneau'}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
