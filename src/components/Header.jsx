
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Bell,
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  UserRound,
  Wallet,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./Header.css";

const SETTINGS_KEY = "studentbudget_preferences";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/income": "Income",
  "/expenses": "Expenses",
  "/categories": "Categories",
  "/budgets": "Budgets",
  "/groups": "Groups",
  "/transactions": "Transactions",
  "/analytics": "Analytics",
  "/notifications": "Notifications",
  "/profile": "My Profile",
  "/settings": "Settings",
};

function getSettings() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || "{}"
    );

    return {
      showNotificationBadge:
        stored.showNotificationBadge !== false,
    };
  } catch {
    return { showNotificationBadge: true };
  }
}

function getInitials(name) {
  return String(name || "Student")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function Header({
  onMenuClick = () => {},
}) {
  const { user, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const profileRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [displayUser, setDisplayUser] = useState(null);

  const [showNotificationBadge, setShowNotificationBadge] =
    useState(() => getSettings().showNotificationBadge);

  const pageTitle =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith("/groups/")
      ? "Group Details"
      : "StudentBudget");

  const userName =
    displayUser?.name || user?.name || "Student";

  const userEmail =
    displayUser?.email || user?.email || "Student account";

  const initials = getInitials(userName);

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Close the dropdown when clicking outside or pressing Escape.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  // Close dropdown after navigating.
  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  // Keep the displayed user synchronized with AuthContext.
  useEffect(() => {
    setDisplayUser(null);
  }, [user?.id, user?.email]);

  // Fetch the latest account details from the backend.
  useEffect(() => {
    if (!user) {
      setDisplayUser(null);
      return;
    }

    let active = true;

    const loadProfile = async () => {
      try {
        const response = await api.get("/profile");

        if (active) {
          setDisplayUser(response.data);
        }
      } catch (error) {
        console.error(
          "Unable to refresh header profile:",
          error
        );
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [user, location.pathname]);

  // Fetch the unread notification count.
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let active = true;

    const loadUnreadCount = async () => {
      try {
        const response = await api.get(
          "/notifications/unread-count"
        );

        if (!active) return;

        const data = response.data;

        const count =
          typeof data === "number"
            ? data
            : data?.unreadCount ?? data?.count ?? 0;

        setUnreadCount(Number(count) || 0);
      } catch (error) {
        if (active) {
          setUnreadCount(0);
        }

        console.error(
          "Unable to load unread count:",
          error
        );
      }
    };

    loadUnreadCount();

    return () => {
      active = false;
    };
  }, [user, location.pathname]);

  // Listen for changes made in Settings.
  useEffect(() => {
    const handleSettingsChange = (event) => {
      const enabled =
        event.detail?.showNotificationBadge !== false;

      setShowNotificationBadge(enabled);
    };

    const handleStorageChange = (event) => {
      if (event.key === SETTINGS_KEY) {
        setShowNotificationBadge(
          getSettings().showNotificationBadge
        );
      }
    };

    window.addEventListener(
      "studentbudget:settings-changed",
      handleSettingsChange
    );

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "studentbudget:settings-changed",
        handleSettingsChange
      );

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  // Refresh profile immediately when Profile.jsx announces an update.
  useEffect(() => {
    const handleProfileUpdated = (event) => {
      if (event.detail) {
        setDisplayUser(event.detail);
      }
    };

    window.addEventListener(
      "studentbudget:profile-updated",
      handleProfileUpdated
    );

    return () => {
      window.removeEventListener(
        "studentbudget:profile-updated",
        handleProfileUpdated
      );
    };
  }, []);

  // Refresh unread count when Notifications.jsx announces a change.
  useEffect(() => {
    const handleNotificationsUpdated = async () => {
      try {
        const response = await api.get(
          "/notifications/unread-count"
        );

        setUnreadCount(
          Number(response.data?.unreadCount ?? 0)
        );
      } catch (error) {
        console.error(
          "Unable to refresh notification count:",
          error
        );
      }
    };

    window.addEventListener(
      "studentbudget:notifications-updated",
      handleNotificationsUpdated
    );

    return () => {
      window.removeEventListener(
        "studentbudget:notifications-updated",
        handleNotificationsUpdated
      );
    };
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    setDisplayUser(null);
    setUnreadCount(0);

    logout();

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button
          type="button"
          className="header-menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu size={23} />
        </button>

        <div className="header-page-info">
          <div className="header-breadcrumb">
            <Wallet size={14} />

            <span>StudentBudget</span>

            <span className="header-breadcrumb-divider">
              /
            </span>

            <span className="header-breadcrumb-current">
              {pageTitle}
            </span>
          </div>

          <h1>{pageTitle}</h1>
        </div>
      </div>

      <div className="header-actions">
        <div className="header-date">
          <CalendarDays size={17} />
          <span>{today}</span>
        </div>

        <button
          type="button"
          className="header-icon-button"
          onClick={() => navigate("/notifications")}
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "View notifications"
          }
          title="Notifications"
        >
          <Bell size={20} />

          {showNotificationBadge &&
            unreadCount > 0 && (
              <span className="header-notification-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
        </button>

        <div
          className="header-profile"
          ref={profileRef}
        >
          <button
            type="button"
            className="header-profile-trigger"
            onClick={() =>
              setProfileOpen((open) => !open)
            }
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="header-avatar">
              {initials}
            </span>

            <span className="header-user-info">
              <strong>{userName}</strong>
              <small>Student Account</small>
            </span>

            <ChevronDown
              size={16}
              className={
                profileOpen
                  ? "header-chevron-open"
                  : ""
              }
            />
          </button>

          {profileOpen && (
            <div
              className="header-dropdown"
              role="menu"
            >
              <div className="header-dropdown-user">
                <strong>{userName}</strong>
                <span>{userEmail}</span>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  navigate("/profile")
                }
              >
                <UserRound size={17} />
                My Profile
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  navigate("/settings")
                }
              >
                <Settings size={17} />
                Settings
              </button>

              <div className="header-dropdown-divider" />

              <button
                type="button"
                role="menuitem"
                className="header-dropdown-logout"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
