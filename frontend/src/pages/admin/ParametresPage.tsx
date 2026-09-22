import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Settings, Save, Plus, X } from 'lucide-react';
import api from '../../utils/api';
import { ParametresAdmin, JOURS_SEMAINE } from '../../types';

const TOUS_LES_JOURS = JOURS_SEMAINE.map((j) => j.valeur);

interface ChampsNumeriques {
  delaiMinJours: number;
  joursCalendrierVisibles: number;
  limiteHebdomadaireClient: number;
  limiteHebdomadairePersonnel: number;
}

function JoursOuvertsSelector({
  jours,
  onChange,
}: {
  jours: number[];
  onChange: (jours: number[]) => void;
}) {
  const toggleJour = (v: number) => {
    if (jours.includes(v)) {
      if (jours.length === 1) return; // au moins un jour ouvert
      onChange(jours.filter((j) => j !== v));
    } else {
      onChange([...jours, v].sort());
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {JOURS_SEMAINE.map((j) => {
          const actif = jours.includes(j.valeur);
          return (
            <button
              type="button"
              key={j.valeur}
              onClick={() => toggleJour(j.valeur)}
              className={actif ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
              style={{ padding: '6px 10px', minWidth: 44 }}
            >
              {j.court}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => onChange(TOUS_LES_JOURS)}
      >
        7/7
      </button>
    </div>
  );
}

function PlageHoraireSelector({
  heureOuverture,
  heureFermeture,
  onChangeOuverture,
  onChangeFermeture,
}: {
  heureOuverture: string;
  heureFermeture: string;
  onChangeOuverture: (v: string) => void;
  onChangeFermeture: (v: string) => void;
}) {
  const est24h = heureOuverture === '00:00' && heureFermeture === '23:59';

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label" style={{ fontWeight: 500, fontSize: '.8rem' }}>De</label>
          <input
            type="time"
            className="form-input"
            value={heureOuverture}
            onChange={(e) => onChangeOuverture(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label" style={{ fontWeight: 500, fontSize: '.8rem' }}>À</label>
          <input
            type="time"
            className="form-input"
            value={heureFermeture}
            onChange={(e) => onChangeFermeture(e.target.value)}
          />
        </div>
      </div>
      <button
        type="button"
        className={est24h ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
        onClick={() => { onChangeOuverture('00:00'); onChangeFermeture('23:59'); }}
      >
        24/24
      </button>
    </div>
  );
}

function EmailsResponsableInput({
  emails,
  onChange,
}: {
  emails: string[];
  onChange: (emails: string[]) => void;
}) {
  const [nouveau, setNouveau] = useState('');

  const ajouter = () => {
    const email = nouveau.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Adresse email invalide');
      return;
    }
    if (emails.includes(email)) {
      setNouveau('');
      return;
    }
    onChange([...emails, email]);
    setNouveau('');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          type="email"
          className="form-input"
          placeholder="responsable@exemple.com"
          value={nouveau}
          onChange={(e) => setNouveau(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouter(); } }}
        />
        <button type="button" className="btn btn-secondary" onClick={ajouter}>
          <Plus size={15} />
        </button>
      </div>
      {emails.length === 0 ? (
        <p className="form-hint">Aucun email configuré — aucune notification ne sera envoyée.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {emails.map((email) => (
            <span key={email} className="badge badge-gray" style={{ padding: '5px 10px', fontSize: '.8rem' }}>
              {email}
              <button
                type="button"
                onClick={() => onChange(emails.filter((e) => e !== email))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', padding: 0, marginLeft: 2 }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParametresPage() {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ChampsNumeriques>();

  const [chargement, setChargement] = useState(true);

  const [joursOuvertsClient, setJoursOuvertsClient] = useState<number[]>(TOUS_LES_JOURS);
  const [joursOuvertsPersonnel, setJoursOuvertsPersonnel] = useState<number[]>(TOUS_LES_JOURS);
  const [heureOuvertureClient, setHeureOuvertureClient] = useState('00:00');
  const [heureFermetureClient, setHeureFermetureClient] = useState('23:59');
  const [heureOuverturePersonnel, setHeureOuverturePersonnel] = useState('00:00');
  const [heureFermeturePersonnel, setHeureFermeturePersonnel] = useState('23:59');
  const [emailsResponsableClient, setEmailsResponsableClient] = useState<string[]>([]);
  const [emailsResponsablePersonnel, setEmailsResponsablePersonnel] = useState<string[]>([]);

  useEffect(() => {
    api.get<ParametresAdmin>('/parametres').then((r) => {
      const d = r.data;
      reset({
        delaiMinJours: d.delaiMinJours,
        joursCalendrierVisibles: d.joursCalendrierVisibles,
        limiteHebdomadaireClient: d.limiteHebdomadaireClient,
        limiteHebdomadairePersonnel: d.limiteHebdomadairePersonnel,
      });
      setJoursOuvertsClient(d.joursOuvertsClient);
      setJoursOuvertsPersonnel(d.joursOuvertsPersonnel);
      setHeureOuvertureClient(d.heureOuvertureClient);
      setHeureFermetureClient(d.heureFermetureClient);
      setHeureOuverturePersonnel(d.heureOuverturePersonnel);
      setHeureFermeturePersonnel(d.heureFermeturePersonnel);
      setEmailsResponsableClient(d.emailsResponsableClient);
      setEmailsResponsablePersonnel(d.emailsResponsablePersonnel);
    }).finally(() => setChargement(false));
  }, [reset]);

  const onSubmit = async (data: ChampsNumeriques) => {
    try {
      const payload: ParametresAdmin = {
        ...data,
        joursOuvertsClient,
        joursOuvertsPersonnel,
        heureOuvertureClient,
        heureFermetureClient,
        heureOuverturePersonnel,
        heureFermeturePersonnel,
        emailsResponsableClient,
        emailsResponsablePersonnel,
      };
      await api.put('/parametres', payload);
      toast.success('Paramètres enregistrés');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement");
    }
  };

  if (chargement) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement…</div>;
  }

  return (
    <div>
      <h1 className="page-title">
        <Settings size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Paramètres
      </h1>
      <p className="page-subtitle">
        Réglages généraux de la réservation en ligne (valeurs par défaut modifiables ici).
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 4, fontSize: '1.05rem' }}>Fenêtre de réservation</h3>
          <p className="form-hint" style={{ display: 'block', marginBottom: 16 }}>
            Contrôle quelles dates sont proposées dans le calendrier du formulaire d'inscription.
          </p>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Délai minimum avant réservation (jours)</label>
              <input
                type="number"
                min={0}
                className="form-input"
                {...register('delaiMinJours', { required: true, min: 0, valueAsNumber: true })}
              />
              <span className="form-hint">
                Ex : 7 jours — si on est lundi, la première date réservable est le lundi suivant.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Jours affichés dans le calendrier</label>
              <input
                type="number"
                min={1}
                className="form-input"
                {...register('joursCalendrierVisibles', { required: true, min: 1, valueAsNumber: true })}
              />
              <span className="form-hint">
                Ex : 15 jours — au-delà, les dates sont désactivées dans le calendrier.
              </span>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 4, fontSize: '1.05rem' }}>Limite hebdomadaire de réservations</h3>
          <p className="form-hint" style={{ display: 'block', marginBottom: 16 }}>
            Nombre maximum d'équipes pouvant réserver par semaine (lundi à dimanche), par type d'inscrit.
          </p>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">🧑 Clients — créneaux / semaine</label>
              <input
                type="number"
                min={0}
                className="form-input"
                {...register('limiteHebdomadaireClient', { required: true, min: 0, valueAsNumber: true })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">👷 Personnel — créneaux / semaine</label>
              <input
                type="number"
                min={0}
                className="form-input"
                {...register('limiteHebdomadairePersonnel', { required: true, min: 0, valueAsNumber: true })}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 4, fontSize: '1.05rem' }}>Jours et horaires d'ouverture</h3>
          <p className="form-hint" style={{ display: 'block', marginBottom: 16 }}>
            Les jours décochés et les horaires en dehors de la plage choisie désactivent automatiquement
            les créneaux correspondants dans le calendrier, séparément pour les clients et le personnel.
          </p>

          <div className="form-grid-2">
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>🧑 Clients — jours ouverts</label>
              <JoursOuvertsSelector jours={joursOuvertsClient} onChange={setJoursOuvertsClient} />
              <label className="form-label" style={{ display: 'block', marginTop: 16, marginBottom: 8 }}>Plage horaire</label>
              <PlageHoraireSelector
                heureOuverture={heureOuvertureClient}
                heureFermeture={heureFermetureClient}
                onChangeOuverture={setHeureOuvertureClient}
                onChangeFermeture={setHeureFermetureClient}
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>👷 Personnel — jours ouverts</label>
              <JoursOuvertsSelector jours={joursOuvertsPersonnel} onChange={setJoursOuvertsPersonnel} />
              <label className="form-label" style={{ display: 'block', marginTop: 16, marginBottom: 8 }}>Plage horaire</label>
              <PlageHoraireSelector
                heureOuverture={heureOuverturePersonnel}
                heureFermeture={heureFermeturePersonnel}
                onChangeOuverture={setHeureOuverturePersonnel}
                onChangeFermeture={setHeureFermeturePersonnel}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 4, fontSize: '1.05rem' }}>Emails des responsables</h3>
          <p className="form-hint" style={{ display: 'block', marginBottom: 16 }}>
            Ces adresses reçoivent un email dès qu'une nouvelle inscription attend confirmation, et
            lorsqu'un participant annule lui-même sa réservation.
          </p>

          <div className="form-grid-2">
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>🧑 Responsable(s) Clients</label>
              <EmailsResponsableInput emails={emailsResponsableClient} onChange={setEmailsResponsableClient} />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>👷 Responsable(s) Personnel</label>
              <EmailsResponsableInput emails={emailsResponsablePersonnel} onChange={setEmailsResponsablePersonnel} />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          <Save size={16} style={{ marginRight: 6 }} />
          {isSubmitting ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </button>
      </form>
    </div>
  );
}
