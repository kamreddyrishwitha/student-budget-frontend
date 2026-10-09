
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ChartNoAxesCombined,
  Users,
} from "lucide-react";

import api from "../../services/api";
import "./Auth.css";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      setSuccess("Account created successfully!");

      navigate("/login", {
        replace: true,
        state: {
          message: "Registration successful. Please sign in.",
        },
      });
    } catch (err) {
      const message = err.response?.data?.message;

      setError(
        typeof message === "string"
          ? message
          : "Registration failed. Please try again."
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
            START YOUR FINANCIAL JOURNEY
          </div>

          <h1>
            Take control.
            <br />
            Build habits.
            <br />
            <span>Save smarter.</span>
          </h1>

          <p>
            Join StudentBudget to organize your finances,
            manage budgets, and share expenses effortlessly.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <ChartNoAxesCombined size={21} />
              <span>Understand your spending habits</span>
            </div>

            <div className="auth-feature">
              <Users size={21} />
              <span>Manage expenses with friends</span>
            </div>

            <div className="auth-feature">
              <ShieldCheck size={21} />
              <span>Keep your finances organized</span>
            </div>
          </div>
        </div>

        <p className="auth-showcase-footer">
          Better money habits start here.
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
              GET STARTED
            </div>

            <h2>Create your account</h2>

            <p>
              Start managing your money with confidence.
            </p>
          </div>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="auth-success" role="status">
                {success}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="register-name">
                Full name
              </label>

              <div className="auth-input-wrap">
                <UserRound size={19} />

                <input
                  id="register-name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="register-email">
                Email address
              </label>

              <div className="auth-input-wrap">
                <Mail size={19} />

                <input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="register-password">
                Password
              </label>

              <div className="auth-input-wrap">
                <LockKeyhole size={19} />

                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={8}
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

            <div className="auth-field">
              <label htmlFor="register-confirm">
                Confirm password
              </label>

              <div className="auth-input-wrap">
                <LockKeyhole size={19} />

                <input
                  id="register-confirm"
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Confirm your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                >
                  {showConfirmPassword ? (
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
              disabled={loading || Boolean(success)}
            >
              <span>
                {loading
                  ? "Creating account..."
                  : "Create Account"}
              </span>

              {!loading && <ArrowRight size={19} />}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login">Sign in</Link>
          </p>

          <div className="auth-security-note">
            <ShieldCheck size={16} />
            <span>
              Manage your finances in one secure place.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
