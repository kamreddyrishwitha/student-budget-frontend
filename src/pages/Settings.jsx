
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  LogOut,
  Moon,
  Palette,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sun,
  UserRound,
  Wallet,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "../styles/Settings.css";

const STORAGE_KEY = "studentbudget_preferences";

const DEFAULT_SETTINGS = {
  theme: "light",
  currency: "INR",
  showNotificationBadge: true,
  compactMode: false,
};

function loadSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    );

    return {
      ...DEFAULT_SETTINGS,
      ...saved,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [settings, setSettings] = useState(loadSettings);
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );

    document.documentElement.dataset.sbTheme =
      settings.theme;

    document.documentElement.dataset.sbCompact =
      String(settings.compactMode);

    window.dispatchEvent(
      new CustomEvent("studentbudget:settings-changed", {
        detail: settings,
      })
    );
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setMessage("Preferences saved successfully.");
  };

  const resetSettings = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    setMessage("Default preferences restored.");
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="settings-page">
      <section className="settings-heading">
        <div>
          <span className="settings-eyebrow">
            PERSONALIZE YOUR EXPERIENCE
          </span>
          <h2>Settings</h2>
          <p>
            Customize your StudentBudget experience and
            manage your account preferences.
          </p>
        </div>

        <button
          type="button"
          className="settings-reset-button"
          onClick={resetSettings}
        >
          <RotateCcw size={17} />
          Reset Defaults
        </button>
      </section>

      {message && (
        <div className="settings-success-message" role="status">
          <CheckCircle2 size={18} />
          {message}
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      <section className="settings-grid">
        <article className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon purple">
              <Palette size={22} />
            </span>
            <div>
              <h3>Appearance</h3>
              <p>Adjust how your workspace looks.</p>
            </div>
          </div>

          <div className="settings-field">
            <div className="settings-field-copy">
              <strong>Color Theme</strong>
              <span>Choose your preferred appearance.</span>
            </div>

            <div className="settings-theme-options">
              <button
                type="button"
                className={
                  settings.theme === "light" ? "selected" : ""
                }
                onClick={() => updateSetting("theme", "light")}
                aria-pressed={settings.theme === "light"}
              >
                <Sun size={17} />
                Light
              </button>

              <button
                type="button"
                className={
                  settings.theme === "dark" ? "selected" : ""
                }
                onClick={() => updateSetting("theme", "dark")}
                aria-pressed={settings.theme === "dark"}
              >
                <Moon size={17} />
                Dark
              </button>
            </div>
          </div>

          <div className="settings-field">
            <div className="settings-field-copy">
              <strong>Compact Layout</strong>
              <span>
                Reduce spacing in the Settings workspace.
              </span>
            </div>

            <label className="settings-switch">
              <input
                type="checkbox"
                checked={settings.compactMode}
                onChange={(event) =>
                  updateSetting(
                    "compactMode",
                    event.target.checked
                  )
                }
                aria-label="Compact layout"
              />
              <span className="settings-switch-track" />
            </label>
          </div>
        </article>

        <article className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon green">
              <Wallet size={22} />
            </span>
            <div>
              <h3>Financial Preferences</h3>
              <p>Your preferred currency display.</p>
            </div>
          </div>

          <div className="settings-field">
            <div className="settings-field-copy">
              <strong>Default Currency</strong>
              <span>
                Your current budget data is recorded in INR.
              </span>
            </div>

            <select
              className="settings-select"
              value={settings.currency}
              onChange={(event) =>
                updateSetting("currency", event.target.value)
              }
            >
              <option value="INR">INR — Indian Rupee (₹)</option>
            </select>
          </div>

          <div className="settings-info-box">
            <ShieldCheck size={19} />
            <span>
              Currency conversion is not enabled. All amounts
              continue to use Indian Rupees.
            </span>
          </div>
        </article>

        <article className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon amber">
              <Bell size={22} />
            </span>
            <div>
              <h3>Notification Preferences</h3>
              <p>Manage how alerts appear in the interface.</p>
            </div>
          </div>

          <div className="settings-field">
            <div className="settings-field-copy">
              <strong>Show Unread Badge</strong>
              <span>
                Display the unread count beside the header bell.
              </span>
            </div>

            <label className="settings-switch">
              <input
                type="checkbox"
                checked={settings.showNotificationBadge}
                onChange={(event) =>
                  updateSetting(
                    "showNotificationBadge",
                    event.target.checked
                  )
                }
                aria-label="Show unread notification badge"
              />
              <span className="settings-switch-track" />
            </label>
          </div>

          <button
            type="button"
            className="settings-navigation-row"
            onClick={() => navigate("/notifications")}
          >
            <span>Open Notification Center</span>
            <ChevronRight size={18} />
          </button>

          <p className="settings-card-footnote">
            This preference controls the badge display only.
            It does not disable backend notifications.
          </p>
        </article>

        <article className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon blue">
              <UserRound size={22} />
            </span>
            <div>
              <h3>Account & Security</h3>
              <p>Manage your profile and account access.</p>
            </div>
          </div>

          <button
            type="button"
            className="settings-navigation-row"
            onClick={() => navigate("/profile")}
          >
            <span>
              <UserRound size={17} />
              Edit Profile & Change Password
            </span>
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            className="settings-navigation-row"
            onClick={() => navigate("/dashboard")}
          >
            <span>
              <Settings2 size={17} />
              Return to Dashboard
            </span>
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            className="settings-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Log Out
          </button>
        </article>
      </section>
    </div>
  );
}
