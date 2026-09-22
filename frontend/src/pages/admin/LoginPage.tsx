import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Lock, Mail } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success("Bienvenue !");
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🎾</div>
          <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>
            PadelClub Admin
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: ".9rem" }}>
            Espace d'administration
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">
              <Mail size={13} style={{ marginRight: 4 }} />
              Email
            </label>
            <input
              className={`form-input${errors.email ? " error" : ""}`}
              type="email"
              placeholder="admin@padel.com"
              autoComplete="email"
              {...register("email", { required: "Email requis" })}
            />
            {errors.email && (
              <span className="form-error">⚠ {errors.email.message}</span>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">
              <Lock size={13} style={{ marginRight: 4 }} />
              Mot de passe
            </label>
            <input
              className={`form-input${errors.password ? " error" : ""}`}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password", { required: "Mot de passe requis" })}
            />
            {errors.password && (
              <span className="form-error">⚠ {errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        {/* <p className="text-center text-sm text-muted mt-4">
          Identifiants par défaut : <code>admin@padel.com</code> / <code>Admin@123</code>
        </p> */}
      </div>
    </div>
  );
}
