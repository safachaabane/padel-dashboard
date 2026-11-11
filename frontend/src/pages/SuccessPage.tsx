import { useSearchParams } from "react-router-dom";
import { CheckCircle, Mail } from "lucide-react";

export default function SuccessPage() {
  const [params] = useSearchParams();
  const type = params.get("type");

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
      <div className="success-card">
        <div className="success-icon">
          <CheckCircle size={40} />
        </div>
        <h1 style={{ fontSize: "1.6rem", marginBottom: 12 }}>
          Inscription envoyée !
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: 24,
            lineHeight: 1.7,
          }}
        >
          Votre demande d'inscription a bien été reçue.
        </p>

        <div
          style={{
            background: "var(--green-50)",
            border: "1px solid var(--green-200)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            textAlign: "left",
            marginBottom: 28,
          }}
        >
          <Mail
            size={20}
            style={{ color: "var(--green-600)", flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <p
              style={{
                fontWeight: 600,
                color: "var(--green-800)",
                marginBottom: 4,
              }}
            >
              Vérifiez votre boîte mail
            </p>
            <p style={{ fontSize: ".875rem", color: "var(--text-secondary)" }}>
              Votre inscription est en attente de validation par notre équipe.
              Vous recevrez un email avec tous les détails (créneau, lieu,
              Wi-Fi…) dès qu'elle sera confirmée.
            </p>
          </div>
        </div>

        {/* <a
          href={
            type === "client" ? "/inscription/client" : "/inscription/personnel"
          }
          className="btn btn-form btn-full"
        >
          Faire une autre inscription
        </a> */}
      </div>
    </div>
  );
}
