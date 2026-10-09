
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ChartNoAxesCombined,
  Users,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = err.response?.data?.message;

      setError(
        typeof message === "string"
          ? message
          : "Unable to sign in. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-showcase">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Wallet size={27} />
          </div>
          <span>StudentBudget</span>
        </div>

        <div className="auth-showcase-content">
          <div className="auth-eyebrow">
            SMART STUDENT FINANCE
          </div>

          <h1>
            Your money.
            <br />
            Your goals.
            <br />
            <span>Your future.</span>
          </h1>

          <p>
            Manage daily spending, plan budgets, and split
            shared expenses with friends — all in one place.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <ChartNoAxesCombined size={21} />
              <span>Track income and expenses</span>
            </div>

            <div className="auth-feature">
              <Users size={21} />
              <span>Split bills with roommates</span>
            </div>

            <div className="auth-feature">
              <ShieldCheck size={21} />
              <span>Manage your budget securely</span>
            </div>
          </div>
        </div>

        <p className="auth-showcase-footer">
          Spend smarter. Save better. Live easier.
        </p>
      </section>

      <main className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-mobile-brand">
            <Wallet size={25} />
            <span>StudentBudget</span>
          </div>

          <div className="auth-heading">
            <div className="auth-welcome-label">
              WELCOME BACK
            </div>

            <h2>Sign in to your account</h2>

            <p>
              Enter your details to access your financial
              dashboard.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="login-email">
                Email address
              </label>

              <div className="auth-input-wrap">
                <Mail size={19} />

                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">
                Password
              </label>

              <div className="auth-input-wrap">
                <LockKeyhole size={19} />

                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              <span>
                {loading ? "Signing in..." : "Sign In"}
              </span>

              {!loading && <ArrowRight size={19} />}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/register">
              Create an account
            </Link>
          </p>

          <div className="auth-security-note">
            <ShieldCheck size={16} />
            <span>
              Your financial information stays protected.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
