
import { useEffect, useState } from "react";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
  UserRoundPen,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/Profile.css";

const getErrorMessage = (error, fallback) => {
  const data = error.response?.data;

  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;

  if (data?.errors && typeof data.errors === "object") {
    const messages = Object.values(data.errors);
    if (messages.length) return messages.join(", ");
  }

  return fallback;
};

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getInitials = (name) => {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "U";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const announceProfileUpdate = (profile) => {
  window.dispatchEvent(
    new CustomEvent("studentbudget:profile-updated", {
      detail: profile,
    })
  );
};

export default function Profile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setProfileError("");

    try {
      const response = await api.get("/profile");
      const result = response.data;

      setProfile(result);

      setForm({
        name: result.name || "",
        email: result.email || "",
      });

      announceProfileUpdate(result);
    } catch (error) {
      setProfileError(
        getErrorMessage(
          error,
          "Unable to load your profile."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setProfileError("");
    setProfileMessage("");
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPasswordError("");
    setPasswordMessage("");
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    setProfileError("");
    setProfileMessage("");

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) {
      setProfileError("Name is required.");
      return;
    }

    if (name.length > 100) {
      setProfileError(
        "Name cannot exceed 100 characters."
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setProfileError("Enter a valid email address.");
      return;
    }

    setSavingProfile(true);

    try {
      const response = await api.put("/profile", {
        name,
        email,
      });

      const updatedProfile = response.data;

      setProfile(updatedProfile);

      setForm({
        name: updatedProfile.name || name,
        email: updatedProfile.email || email,
      });

      // Update Header immediately after a successful save.
      announceProfileUpdate(updatedProfile);

      setProfileMessage(
        "Profile updated successfully."
      );
    } catch (error) {
      setProfileError(
        getErrorMessage(
          error,
          "Unable to update your profile."
        )
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    setPasswordError("");
    setPasswordMessage("");

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = passwordForm;

    if (!currentPassword) {
      setPasswordError(
        "Current password is required."
      );
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "New password and confirmation do not match."
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "Choose a different password from your current one."
      );
      return;
    }

    setSavingPassword(true);

    try {
      await api.put("/profile/change-password", {
        currentPassword,
        newPassword,
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordMessage(
        "Password changed successfully."
      );
    } catch (error) {
      setPasswordError(
        getErrorMessage(
          error,
          "Unable to change your password."
        )
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const displayProfile = profile || user || {};

  const profileUnchanged =
    form.name.trim() === (profile?.name || "") &&
    form.email.trim() === (profile?.email || "");

  return (
    <div className="profile-page">
      <section className="profile-heading">
        <div>
          <span className="profile-eyebrow">
            ACCOUNT MANAGEMENT
          </span>

          <h2>My Profile</h2>

          <p>
            Manage your personal information and keep your
            StudentBudget account secure.
          </p>
        </div>

        <button
          type="button"
          className="profile-refresh-button"
          onClick={loadProfile}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </section>

      {loading ? (
        <div className="profile-loading">
          <LoaderCircle
            size={34}
            className="profile-spin"
          />
          <p>Loading your profile...</p>
        </div>
      ) : (
        <>
          <section className="profile-overview-card">
            <div className="profile-overview-main">
              <div className="profile-avatar">
                {getInitials(displayProfile.name)}
              </div>

              <div>
                <span className="profile-overview-label">
                  STUDENTBUDGET ACCOUNT
                </span>

                <h3>
                  {displayProfile.name || "Student"}
                </h3>

                <p>
                  <Mail size={15} />
                  {displayProfile.email ||
                    "Email not available"}
                </p>
              </div>
            </div>

            <div className="profile-overview-meta">
              <span className="profile-role-badge">
                <ShieldCheck size={15} />
                {displayProfile.role || "USER"}
              </span>

              <span className="profile-joined">
                <CalendarDays size={15} />
                Joined {formatDate(profile?.createdAt)}
              </span>
            </div>
          </section>

          <section className="profile-content-grid">
            <article className="profile-panel">
              <div className="profile-panel-heading">
                <div className="profile-panel-icon purple">
                  <UserRoundPen size={21} />
                </div>

                <div>
                  <h3>Personal Information</h3>
                  <p>
                    Update your name and email address.
                  </p>
                </div>
              </div>

              {profileMessage && (
                <div
                  className="profile-alert success"
                  role="status"
                >
                  <CheckCircle2 size={18} />
                  {profileMessage}
                </div>
              )}

              {profileError && (
                <div
                  className="profile-alert error"
                  role="alert"
                >
                  <AlertCircle size={18} />
                  {profileError}
                </div>
              )}

              <form
                className="profile-form"
                onSubmit={handleProfileSubmit}
              >
                <label htmlFor="profile-name">
                  Full Name
                </label>

                <div className="profile-input-wrapper">
                  <UserRound size={18} />

                  <input
                    id="profile-name"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={handleProfileChange}
                    maxLength={100}
                    required
                  />
                </div>

                <label htmlFor="profile-email">
                  Email Address
                </label>

                <div className="profile-input-wrapper">
                  <Mail size={18} />

                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={handleProfileChange}
                    required
                  />
                </div>

                <div className="profile-form-note">
                  <ShieldCheck size={17} />

                  <span>
                    Your account details are protected by
                    authenticated API requests.
                  </span>
                </div>

                <button
                  type="submit"
                  className="profile-primary-button"
                  disabled={
                    savingProfile ||
                    !profile ||
                    profileUnchanged
                  }
                >
                  {savingProfile ? (
                    <LoaderCircle
                      size={17}
                      className="profile-spin"
                    />
                  ) : (
                    <Save size={17} />
                  )}

                  {savingProfile
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </form>
            </article>

            <article className="profile-panel">
              <div className="profile-panel-heading">
                <div className="profile-panel-icon green">
                  <LockKeyhole size={21} />
                </div>

                <div>
                  <h3>Account Security</h3>
                  <p>
                    Change your password to keep your
                    account secure.
                  </p>
                </div>
              </div>

              {passwordMessage && (
                <div
                  className="profile-alert success"
                  role="status"
                >
                  <CheckCircle2 size={18} />
                  {passwordMessage}
                </div>
              )}

              {passwordError && (
                <div
                  className="profile-alert error"
                  role="alert"
                >
                  <AlertCircle size={18} />
                  {passwordError}
                </div>
              )}

              <form
                className="profile-form"
                onSubmit={handlePasswordSubmit}
              >
                <label htmlFor="current-password">
                  Current Password
                </label>

                <div className="profile-input-wrapper">
                  <KeyRound size={18} />

                  <input
                    id="current-password"
                    name="currentPassword"
                    type={
                      showCurrentPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="profile-visibility-button"
                    onClick={() =>
                      setShowCurrentPassword(
                        (value) => !value
                      )
                    }
                    aria-label={
                      showCurrentPassword
                        ? "Hide current password"
                        : "Show current password"
                    }
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <label htmlFor="new-password">
                  New Password
                </label>

                <div className="profile-input-wrapper">
                  <LockKeyhole size={18} />

                  <input
                    id="new-password"
                    name="newPassword"
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="At least 8 characters"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />

                  <button
                    type="button"
                    className="profile-visibility-button"
                    onClick={() =>
                      setShowNewPassword((value) => !value)
                    }
                    aria-label={
                      showNewPassword
                        ? "Hide new password"
                        : "Show new password"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <label htmlFor="confirm-password">
                  Confirm New Password
                </label>

                <div className="profile-input-wrapper">
                  <ShieldCheck size={18} />

                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Re-enter new password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />

                  <button
                    type="button"
                    className="profile-visibility-button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation"
                        : "Show confirmation"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <div className="profile-form-note">
                  <ShieldCheck size={17} />

                  <span>
                    Use a unique password with at least
                    8 characters.
                  </span>
                </div>

                <button
                  type="submit"
                  className="profile-primary-button"
                  disabled={savingPassword}
                >
                  {savingPassword ? (
                    <LoaderCircle
                      size={17}
                      className="profile-spin"
                    />
                  ) : (
                    <KeyRound size={17} />
                  )}

                  {savingPassword
                    ? "Updating..."
                    : "Change Password"}
                </button>
              </form>
            </article>
          </section>

          <section className="profile-account-details">
            <div className="profile-account-details-heading">
              <div className="profile-panel-icon amber">
                <ShieldCheck size={21} />
              </div>

              <div>
                <h3>Account Details</h3>
                <p>
                  Additional information about your account.
                </p>
              </div>
            </div>

            <div className="profile-account-details-grid">
              <div>
                <span>Account ID</span>
                <strong>
                  {profile?.id ?? "Not available"}
                </strong>
              </div>

              <div>
                <span>Account Role</span>
                <strong>
                  {profile?.role || "USER"}
                </strong>
              </div>

              <div>
                <span>Member Since</span>
                <strong>
                  {formatDate(profile?.createdAt)}
                </strong>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
