import { useEffect, useState } from "react";
import { Lock, Check } from "lucide-react";
import { CreneauDisponibilite, DisponibilitesReponse } from "../../types";
import api from "../../utils/api";

interface Props {
  date: string; // YYYY-MM-DD — date déjà choisie par l'utilisateur
  value: string;
  onChange: (id: string) => void;
  typeInscrit: "client" | "personnel";
  error?: string;
}

export default function CreneauSelector({
  date,
  value,
  onChange,
  typeInscrit,
  error,
}: Props) {
  const [creneaux, setCreneaux] = useState<CreneauDisponibilite[]>([]);
  const [quotaAtteint, setQuotaAtteint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState("");

  useEffect(() => {
    if (!date) {
      setCreneaux([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErreurChargement("");
    api
      .get<DisponibilitesReponse>("/creneaux/disponibilites", {
        params: { date, type: typeInscrit },
      })
      .then((r) => {
        setCreneaux(r.data.creneaux);
        setQuotaAtteint(r.data.quotaHebdomadaire.atteint);
      })
      .catch((err) => {
        setCreneaux([]);
        setErreurChargement(
          err.response?.data?.message ||
            "Impossible de charger les créneaux pour cette date"
        );
      })
      .finally(() => setLoading(false));
  }, [date, typeInscrit]);

  if (!date) {
    return (
      <div
        style={{
          padding: "16px",
          background: "var(--surface-3)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-muted)",
          textAlign: "center",
          fontSize: ".875rem",
        }}
      >
        Veuillez d'abord choisir une date.
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        Chargement des créneaux…
      </div>
    );
  }

  if (erreurChargement) {
    return (
      <div
        style={{
          padding: "16px",
          background: "#fef2f2",
          borderRadius: "var(--radius-md)",
          color: "var(--alert-red)",
          textAlign: "center",
          fontSize: ".875rem",
        }}
      >
        ⚠ {erreurChargement}
      </div>
    );
  }

  if (quotaAtteint) {
    return (
      <div
        style={{
          padding: "16px",
          background: "#fffbeb",
          borderRadius: "var(--radius-md)",
          color: "#92400e",
          textAlign: "center",
          fontSize: ".875rem",
        }}
      >
        ⚠ Le nombre maximum de réservations pour cette semaine a été atteint.
        Merci de choisir une autre semaine.
      </div>
    );
  }

  if (creneaux.length === 0) {
    return (
      <div
        style={{
          padding: "16px",
          background: "var(--surface-3)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-muted)",
          textAlign: "center",
          fontSize: ".875rem",
        }}
      >
        Aucun créneau disponible pour cette date.
      </div>
    );
  }

  return (
    <div>
      {creneaux.map((cr) => {
        const complet = cr.complet;
        const selected = value === cr._id;

        return (
          <div
            key={cr._id}
            className={`creneau-option${selected ? " selected" : ""}${
              complet ? " disabled" : ""
            }`}
            onClick={() => !complet && onChange(cr._id)}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: ".9rem" }}>
                {cr.heureDebut} – {cr.heureFin}
              </div>
              {/* {cr.type === 'mixte' && (
                <span style={{ marginTop: 4, display: 'inline-block', fontSize: '.7rem', background: 'var(--green-100)', color: 'var(--green-700)', padding: '1px 6px', borderRadius: 4 }}>
                  Mixte
                </span>
              )} */}
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: ".75rem",
                fontWeight: 600,
                color: complet
                  ? "var(--alert-red)"
                  : selected
                  ? "var(--green-700)"
                  : "var(--green-600)",
              }}
            >
              {complet ? (
                <>
                  <Lock size={12} /> Réservé
                </>
              ) : selected ? (
                <>
                  <Check size={13} /> Sélectionné
                </>
              ) : (
                "Disponible"
              )}
            </span>
          </div>
        );
      })}
      {error && (
        <p className="form-error" style={{ marginTop: 6 }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
