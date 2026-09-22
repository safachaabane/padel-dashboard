import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Star, CheckCircle, XCircle, Loader } from "lucide-react";
import api from "../utils/api";

interface SatisfactionInfo {
  nom: string;
  email: string;
  dejaRepondu: boolean;
  note?: number;
  commentaire?: string;
  creneau: { date: string; heureDebut: string; heureFin: string } | null;
}

export default function SatisfactionPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<SatisfactionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState("");
  const [erreurEnvoi, setErreurEnvoi] = useState("");
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setErreurChargement("Lien invalide");
      setLoading(false);
      return;
    }

    api
      .get(`/satisfaction/${token}`)
      .then((r) => setInfo(r.data))
      .catch((err) =>
        setErreurChargement(
          err.response?.data?.message || "Lien invalide ou expiré"
        )
      )
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (note < 1) {
      setErreurEnvoi("Merci de choisir une note avant d'envoyer");
      return;
    }
    setErreurEnvoi("");
    setSubmitting(true);
    try {
      await api.post(`/satisfaction/${token}`, { note, commentaire });
      setEnvoye(true);
    } catch (err: any) {
      setErreurEnvoi(err.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--green-900)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <Loader size={32} className="spin" style={{ color: "#fff" }} />
      </div>
    );
  }

  if (erreurChargement && !info) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--green-900)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div className="success-card">
          <div
            className="success-icon"
            style={{ background: "#fff0f0", color: "var(--alert-red)" }}
          >
            <XCircle size={40} />
          </div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: 12 }}>
            Lien invalide
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>{erreurChargement}</p>
        </div>
      </div>
    );
  }

  const dejaRepondu = info?.dejaRepondu || envoye;

  return (
    <div
      className="success-page"
      style={{
        minHeight: "100vh",
        background: "url('/assets/padel.jpg') no-repeat center center / cover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div className="success-card" style={{ maxWidth: 480 }}>
        {dejaRepondu ? (
          <>
            <div className="success-icon">
              <CheckCircle size={40} />
            </div>
            <h1 style={{ fontSize: "1.5rem", marginBottom: 12 }}>Merci !</h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Votre avis a bien été enregistré.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: "1.4rem", marginBottom: 8 }}>
              Notez votre expérience !
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
              Bonjour <strong>{info?.nom}</strong>,
            </p>
            {info?.creneau && (
              <p
                style={{
                  color: "var(--text-secondary)",
                  marginBottom: 20,
                  fontSize: ".9rem",
                }}
              >
                Laissez-nous vos remarques et suggestions concernant votre
                expérience.
              </p>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                margin: "20px 0",
              }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNote(n)}
                  aria-label={`${n} étoile(s)`}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <Star
                    size={32}
                    fill={n <= note ? "#f4c542" : "none"}
                    color={n <= note ? "#f4c542" : "var(--text-muted)"}
                  />
                </button>
              ))}
            </div>

            <textarea
              className="form-input"
              style={{ minHeight: 90, marginBottom: 16, width: "100%" }}
              placeholder="Un commentaire à partager ? (optionnel)"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />

            {erreurEnvoi && (
              <p className="form-error" style={{ marginBottom: 12 }}>
                ⚠ {erreurEnvoi}
              </p>
            )}

            <button
              className="btn btn-form btn-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Envoi…" : "Envoyer mon avis"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
