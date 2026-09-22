import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  User,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  Users,
  Building2,
} from "lucide-react";
import CreneauSelector from "../components/forms/CreneauSelector";
import DateSelector from "../components/forms/DateSelector";
import RegistrationPoster from "../components/forms/RegistrationPoster";
import Stepper from "../components/forms/Stepper";
import api from "../utils/api";
import { FormClientData } from "../types";

const STEPS = [
  { id: 1, label: "Créneau" },
  { id: 2, label: "Vos informations" },
  { id: 3, label: "Votre équipe" },
];

export default function FormClientPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [date, setDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [creneauId, setCreneauId] = useState("");
  const [creneauError, setCreneauError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<FormClientData>();

  const goNext = async () => {
    if (step === 1) {
      if (!date) {
        setDateError("Veuillez sélectionner une date");
        return;
      }
      if (!creneauId) {
        setCreneauError("Veuillez sélectionner un créneau");
        return;
      }
      setDateError("");
      setCreneauError("");
      setStep(2);
      return;
    }
    if (step === 2) {
      const valid = await trigger([
        "nomComplet",
        "email",
        "telephone",
        "societe",
      ]);
      if (valid) setStep(3);
    }
  };

  const goBack = () => setStep((s) => (s === 3 ? 2 : 1));

  const onSubmit = async (data: FormClientData) => {
    if (!date) {
      setStep(1);
      setDateError("Veuillez sélectionner une date");
      return;
    }
    if (!creneauId) {
      setStep(1);
      setCreneauError("Veuillez sélectionner un créneau");
      return;
    }
    setSubmitting(true);

    try {
      await api.post("/inscriptions", {
        ...data,
        date,
        creneauId,
        typeInscrit: "client",
      });
      navigate("/inscription/succes?type=client");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Une erreur est survenue";
      if (err.response?.data?.blocage) {
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-page">
      <RegistrationPoster typeInscrit="client" />

      <div className="public-form-container has-poster">
        <div className="public-form-card">
          <Stepper steps={STEPS} current={step} />

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* ÉTAPE 1 — Créneau */}
            {step === 1 && (
              <div>
                <h2 style={{ marginBottom: 16, fontSize: "1.4rem" }}>
                  Choisir une date et un créneau
                </h2>
                <DateSelector
                  value={date}
                  onChange={(d) => {
                    setDate(d);
                    setDateError("");
                    setCreneauId("");
                  }}
                  error={dateError}
                  typeInscrit="client"
                />
                <div className="mt-4">
                  <CreneauSelector
                    date={date}
                    value={creneauId}
                    onChange={(id) => {
                      setCreneauId(id);
                      setCreneauError("");
                    }}
                    typeInscrit="client"
                    error={creneauError}
                  />
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    className="btn btn-form btn-full btn-lg"
                    onClick={goNext}
                  >
                    Suivant <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 — Informations personnelles */}
            {step === 2 && (
              <div>
                <h2 style={{ marginBottom: 24, fontSize: "1.4rem" }}>
                  Vos informations
                </h2>

                <div className="form-group">
                  <label className="form-label">
                    <User size={13} style={{ marginRight: 4 }} />
                    Nom complet <span className="required">*</span>
                  </label>
                  <input
                    className={`form-input${errors.nomComplet ? " error" : ""}`}
                    placeholder="Votre nom et prénom"
                    {...register("nomComplet", {
                      required: "Le nom complet est requis",
                    })}
                  />
                  {errors.nomComplet && (
                    <span className="form-error">
                      ⚠ {errors.nomComplet.message}
                    </span>
                  )}
                </div>

                <div className="form-group mt-4">
                  <label className="form-label">
                    <Building2 size={13} style={{ marginRight: 4 }} />
                    Société <span className="required">*</span>
                  </label>
                  <input
                    className={`form-input${errors.societe ? " error" : ""}`}
                    placeholder="Nom de votre société"
                    {...register("societe", {
                      required: "Le nom de la société est requis",
                    })}
                  />
                  {errors.societe && (
                    <span className="form-error">
                      ⚠ {errors.societe.message}
                    </span>
                  )}
                </div>

                <div className="form-group mt-4">
                  <label className="form-label">
                    <Mail size={13} style={{ marginRight: 4 }} />
                    Adresse email <span className="required">*</span>
                  </label>
                  <input
                    className={`form-input${errors.email ? " error" : ""}`}
                    placeholder="votre@email.com"
                    type="email"
                    {...register("email", {
                      required: "L'email est requis",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Email invalide",
                      },
                    })}
                  />
                  {errors.email && (
                    <span className="form-error">⚠ {errors.email.message}</span>
                  )}
                </div>

                <div className="form-group mt-4">
                  <label className="form-label">
                    <Phone size={13} style={{ marginRight: 4 }} />
                    Numéro de téléphone <span className="required">*</span>
                  </label>
                  <input
                    className={`form-input${errors.telephone ? " error" : ""}`}
                    placeholder="+216 XX XXX XXX"
                    type="tel"
                    {...register("telephone", {
                      required: "Le numéro de téléphone est requis",
                      pattern: {
                        value: /^[+\d\s\-()]{8,}$/,
                        message: "Numéro invalide",
                      },
                    })}
                  />
                  {errors.telephone && (
                    <span className="form-error">
                      ⚠ {errors.telephone.message}
                    </span>
                  )}
                </div>

                <div className="mt-6" style={{ display: "flex", gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={goBack}
                  >
                    <ChevronLeft size={18} /> Précédent
                  </button>
                  <button
                    type="button"
                    className="btn btn-form btn-full btn-lg"
                    onClick={goNext}
                  >
                    Suivant <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 — Équipe (3 coéquipiers) */}
            {step === 3 && (
              <div>
                <h2 style={{ marginBottom: 8, fontSize: "1.4rem" }}>
                  <Users
                    size={18}
                    style={{ marginRight: 6, verticalAlign: "middle" }}
                  />
                  Votre équipe
                </h2>
                <p
                  className="form-hint"
                  style={{ marginBottom: 20, display: "block" }}
                >
                  Le padel se joue en équipe de 4. Merci d'indiquer les 3 autres
                  joueurs qui vous accompagnent (nom complet obligatoire, email
                  optionnel).
                </p>

                {[0, 1, 2].map((idx) => (
                  <div className="form-grid-2 mt-4" key={idx}>
                    <div className="form-group">
                      <label className="form-label">
                        <User size={13} style={{ marginRight: 4 }} />
                        Joueur {idx + 2} — Nom complet{" "}
                        <span className="required">*</span>
                      </label>
                      <input
                        className={`form-input${
                          errors.invites?.[idx]?.nom ? " error" : ""
                        }`}
                        placeholder="Nom et prénom"
                        {...register(`invites.${idx}.nom` as any, {
                          required: "Le nom complet est requis",
                        })}
                      />
                      {errors.invites?.[idx]?.nom && (
                        <span className="form-error">
                          ⚠ {errors.invites[idx]?.nom?.message}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <Mail size={13} style={{ marginRight: 4 }} />
                        Joueur {idx + 2} — Email{" "}
                        <span
                          className="form-hint"
                          style={{ display: "inline" }}
                        >
                          (optionnel)
                        </span>
                      </label>
                      <input
                        className={`form-input${
                          errors.invites?.[idx]?.email ? " error" : ""
                        }`}
                        placeholder="email@exemple.com"
                        type="email"
                        {...register(`invites.${idx}.email` as any, {
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: "Email invalide",
                          },
                        })}
                      />
                      {errors.invites?.[idx]?.email && (
                        <span className="form-error">
                          ⚠ {errors.invites[idx]?.email?.message}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <div className="mt-6" style={{ display: "flex", gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={goBack}
                  >
                    <ChevronLeft size={18} /> Précédent
                  </button>
                  <button
                    type="submit"
                    className="btn btn-form btn-full btn-lg"
                    disabled={submitting}
                  >
                    {submitting ? (
                      "Envoi en cours…"
                    ) : (
                      <>
                        Confirmer l'inscription <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* <p
          className="text-center text-sm mt-4"
          style={{ color: "var(--text-secondary)" }}
        >
          Vous êtes du personnel ?{" "}
          <a href="/inscription/personnel">Formulaire personnel →</a>
        </p> */}
      </div>
    </div>
  );
}
