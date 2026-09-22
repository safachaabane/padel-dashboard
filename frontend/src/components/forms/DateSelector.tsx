import { useEffect, useMemo, useState } from 'react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isBefore, isAfter, format,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../utils/api';
import { ParametresPublicsType, JOURS_SEMAINE } from '../../types';

interface Props {
  value: string; // format YYYY-MM-DD
  onChange: (date: string) => void;
  error?: string;
  typeInscrit?: 'client' | 'personnel';
}

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Semaine affichée du lundi au dimanche (convention FR)
const JOURS_ORDRE = [1, 2, 3, 4, 5, 6, 0];

export default function DateSelector({ value, onChange, error, typeInscrit }: Props) {
  const [parametres, setParametres] = useState<Partial<ParametresPublicsType> | null>(null);
  const [loading, setLoading] = useState(true);
  const [moisAffiche, setMoisAffiche] = useState(new Date());

  useEffect(() => {
    setLoading(true);
    api.get('/parametres/public', { params: typeInscrit ? { type: typeInscrit } : {} })
      .then((r) => setParametres(r.data))
      .catch(() => setParametres({ delaiMinJours: 7, joursCalendrierVisibles: 15 }))
      .finally(() => setLoading(false));
  }, [typeInscrit]);

  const dateMin = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + (parametres?.delaiMinJours ?? 0));
    return d;
  }, [parametres]);

  const dateMax = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + (parametres?.joursCalendrierVisibles ?? 0));
    return d;
  }, [parametres]);

  // Place la vue sur le mois de la date min dès que les paramètres sont connus (une seule fois)
  useEffect(() => {
    if (parametres) setMoisAffiche(dateMin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!parametres]);

  if (loading || !parametres) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Chargement du calendrier…
      </div>
    );
  }

  const joursOuverts = parametres.joursOuverts; // undefined = pas de restriction par jour

  const debutGrille = startOfWeek(startOfMonth(moisAffiche), { weekStartsOn: 1 });
  const finGrille = endOfWeek(endOfMonth(moisAffiche), { weekStartsOn: 1 });
  const jours = eachDayOfInterval({ start: debutGrille, end: finGrille });

  const estDesactive = (d: Date) => {
    if (isBefore(d, dateMin) || isAfter(d, dateMax)) return true;
    if (joursOuverts && !joursOuverts.includes(d.getDay())) return true;
    return false;
  };

  const dateSelectionnee = value ? new Date(value + 'T00:00:00') : null;

  const moisMin = startOfMonth(dateMin);
  const moisMax = startOfMonth(dateMax);
  const peutReculer = isAfter(startOfMonth(moisAffiche), moisMin);
  const peutAvancer = isBefore(startOfMonth(moisAffiche), moisMax);

  return (
    <div>
      <label className="form-label">
        <CalendarDays size={13} style={{ marginRight: 4 }} />
        Choisissez une date <span className="required">*</span>
      </label>

      <div
        className={`form-input${error ? ' error' : ''}`}
        style={{ padding: 12, height: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => setMoisAffiche((m) => subMonths(m, 1))}
            disabled={!peutReculer}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', opacity: peutReculer ? 1 : 0.35 }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontWeight: 600, fontSize: '.9rem', textTransform: 'capitalize' }}>
            {format(moisAffiche, 'MMMM yyyy', { locale: fr })}
          </span>
          <button
            type="button"
            onClick={() => setMoisAffiche((m) => addMonths(m, 1))}
            disabled={!peutAvancer}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', opacity: peutAvancer ? 1 : 0.35 }}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {JOURS_ORDRE.map((v) => (
            <div key={v} style={{ textAlign: 'center', fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {JOURS_SEMAINE.find((j) => j.valeur === v)?.court}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {jours.map((d) => {
            const disabled = estDesactive(d);
            const horsDuMois = !isSameMonth(d, moisAffiche);
            const selectionne = dateSelectionnee && isSameDay(d, dateSelectionnee);
            return (
              <button
                type="button"
                key={d.toISOString()}
                disabled={disabled}
                onClick={() => onChange(toYMD(d))}
                title={disabled ? "Jour indisponible" : undefined}
                style={{
                  aspectRatio: '1',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '.8rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  background: selectionne ? 'var(--green-700, #2d6a4f)' : 'transparent',
                  color: disabled
                    ? 'var(--text-muted)'
                    : selectionne
                    ? '#fff'
                    : horsDuMois
                    ? 'var(--text-muted)'
                    : 'var(--text-primary, inherit)',
                  opacity: disabled ? 0.35 : horsDuMois ? 0.5 : 1,
                  fontWeight: selectionne ? 700 : 400,
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <span className="form-hint">
        Réservation possible entre {parametres.delaiMinJours} et {parametres.joursCalendrierVisibles} jours à l'avance.
        {joursOuverts && joursOuverts.length < 7 && ' Les jours grisés ne sont pas ouverts.'}
      </span>
      {error && <p className="form-error" style={{ marginTop: 6 }}>⚠ {error}</p>}
    </div>
  );
}
