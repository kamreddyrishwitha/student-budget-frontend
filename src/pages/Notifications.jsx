
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Info,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";

import api from "../services/api";
import "../styles/Notifications.css";

const getErrorMessage = (error, fallback) => {
  const data = error.response?.data;

  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;

  return fallback;
};

const notifyHeader = () => {
  window.dispatchEvent(
    new Event("studentbudget:notifications-updated")
  );
};

const getNotificationAppearance = (type) => {
  const normalized = String(type || "").toUpperCase();

  if (
    normalized.includes("BUDGET") ||
    normalized.includes("WARNING") ||
    normalized.includes("ALERT")
  ) {
    return {
      icon: ShieldAlert,
      tone: "warning",
      label: "Budget Alert",
    };
  }

  if (
    normalized.includes("SETTLEMENT") ||
    normalized.includes("PAYMENT")
  ) {
    return {
      icon: Wallet,
      tone: "success",
      label: "Payment",
    };
  }

  if (
    normalized.includes("EXPENSE") ||
    normalized.includes("GROUP")
  ) {
    return {
      icon: Bell,
      tone: "purple",
      label: "Group Activity",
    };
  }

  if (
    normalized.includes("SUCCESS") ||
    normalized.includes("COMPLETED")
  ) {
    return {
      icon: CheckCircle2,
      tone: "success",
      label: "Success",
    };
  }

  return {
    icon: Info,
    tone: "info",
    label: normalized
      ? normalized.replaceAll("_", " ")
      : "General",
  };
};

const formatDateTime = (value) => {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).replace("T", " ");
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [notificationsResponse, countResponse] =
        await Promise.all([
          api.get("/notifications"),
          api.get("/notifications/unread-count"),
        ]);

      setNotifications(
        Array.isArray(notificationsResponse.data)
          ? notificationsResponse.data
          : []
      );

      setUnreadCount(
        Number(countResponse.data?.unreadCount) || 0
      );

      notifyHeader();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to load notifications. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...notifications]
      .filter((notification) => {
        if (filter === "UNREAD" && notification.read) {
          return false;
        }

        if (filter === "READ" && !notification.read) {
          return false;
        }

        if (!query) return true;

        return [
          notification.title,
          notification.message,
          notification.type,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(
          String(a.createdAt || "")
        )
      );
  }, [notifications, filter, search]);

  const readCount = notifications.filter(
    (notification) => notification.read
  ).length;

  const markAsRead = async (notificationId) => {
    setUpdatingId(notificationId);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(
        `/notifications/${notificationId}/read`
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                ...response.data,
                read: true,
              }
            : notification
        )
      );

      setUnreadCount((previous) =>
        Math.max(0, previous - 1)
      );

      setSuccess("Notification marked as read.");

      notifyHeader();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to update notification."
        )
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    setMarkingAll(true);
    setError("");
    setSuccess("");

    try {
      await api.put("/notifications/read-all");

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      setUnreadCount(0);
      setSuccess("All notifications marked as read.");

      notifyHeader();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to mark all as read."
        )
      );
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="notifications-page">
      <section className="notifications-heading">
        <div>
          <span className="notifications-eyebrow">
            ACTIVITY CENTER
          </span>

          <h2>Notifications</h2>

          <p>
            Stay informed about budget alerts, group activity,
            and important updates.
          </p>
        </div>

        <div className="notifications-heading-actions">
          <button
            type="button"
            className="notifications-outline-button"
            onClick={loadNotifications}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            className="notifications-primary-button"
            onClick={markAllAsRead}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? (
              <LoaderCircle
                size={17}
                className="notifications-spin"
              />
            ) : (
              <CheckCheck size={17} />
            )}

            {markingAll ? "Updating..." : "Mark All as Read"}
          </button>
        </div>
      </section>

      {error && (
        <div
          className="notifications-alert notifications-alert-error"
          role="alert"
        >
          <AlertCircle size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div
          className="notifications-alert notifications-alert-success"
          role="status"
        >
          <CheckCircle2 size={18} />
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section className="notifications-stats">
        <article className="notifications-stat-card">
          <div className="notifications-stat-icon purple">
            <Bell size={23} />
          </div>

          <p>Total Notifications</p>
          <h3>{notifications.length}</h3>
          <span>All received notifications</span>
        </article>

        <article className="notifications-stat-card">
          <div className="notifications-stat-icon amber">
            <BellOff size={23} />
          </div>

          <p>Unread Notifications</p>
          <h3>{unreadCount}</h3>
          <span>Updates requiring your attention</span>
        </article>

        <article className="notifications-stat-card">
          <div className="notifications-stat-icon green">
            <CheckCircle2 size={23} />
          </div>

          <p>Read Notifications</p>
          <h3>{readCount}</h3>
          <span>Previously viewed updates</span>
        </article>
      </section>

      <section className="notifications-panel">
        <div className="notifications-panel-heading">
          <div>
            <h3>Notification Center</h3>
            <p>Manage your recent updates and alerts.</p>
          </div>

          <span className="notifications-count-label">
            {filteredNotifications.length} notifications
          </span>
        </div>

        <div className="notifications-toolbar">
          <div className="notifications-tabs">
            {[
              { value: "ALL", label: "All" },
              { value: "UNREAD", label: "Unread" },
              { value: "READ", label: "Read" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={
                  filter === item.value ? "active" : ""
                }
                onClick={() => setFilter(item.value)}
              >
                {item.label}

                {item.value === "UNREAD" &&
                  unreadCount > 0 && (
                    <span className="notifications-tab-count">
                      {unreadCount}
                    </span>
                  )}
              </button>
            ))}
          </div>

          <label className="notifications-search">
            <Search size={17} />

            <input
              type="search"
              placeholder="Search notifications..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>
        </div>

        {loading ? (
          <div className="notifications-empty">
            <LoaderCircle
              size={33}
              className="notifications-spin"
            />
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-empty">
            <div className="notifications-empty-icon">
              <BellOff size={31} />
            </div>

            <h4>
              {filter === "UNREAD"
                ? "You're all caught up!"
                : "No notifications found"}
            </h4>

            <p>
              {filter === "UNREAD"
                ? "You don't have any unread notifications."
                : "New updates will appear here when available."}
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map((notification) => {
              const appearance = getNotificationAppearance(
                notification.type
              );

              const Icon = appearance.icon;

              return (
                <article
                  key={notification.id}
                  className={`notifications-item ${
                    notification.read ? "" : "unread"
                  }`}
                >
                  <div
                    className={`notifications-item-icon ${appearance.tone}`}
                  >
                    <Icon size={22} />
                  </div>

                  <div className="notifications-item-content">
                    <div className="notifications-item-title-row">
                      <h4>
                        {notification.title ||
                          "Notification"}
                      </h4>

                      {!notification.read && (
                        <span className="notifications-unread-dot" />
                      )}
                    </div>

                    <p>
                      {notification.message ||
                        "You have a new update."}
                    </p>

                    <div className="notifications-item-meta">
                      <span
                        className={`notifications-type-badge ${appearance.tone}`}
                      >
                        {appearance.label}
                      </span>

                      <span>
                        <Clock3 size={13} />
                        {formatDateTime(
                          notification.createdAt
                        )}
                      </span>

                      <span
                        className={
                          notification.read
                            ? "notifications-read-label"
                            : "notifications-unread-label"
                        }
                      >
                        {notification.read ? "Read" : "Unread"}
                      </span>
                    </div>
                  </div>

                  {!notification.read && (
                    <button
                      type="button"
                      className="notifications-mark-button"
                      onClick={() =>
                        markAsRead(notification.id)
                      }
                      disabled={
                        updatingId === notification.id
                      }
                      title="Mark as read"
                    >
                      {updatingId === notification.id ? (
                        <LoaderCircle
                          size={17}
                          className="notifications-spin"
                        />
                      ) : (
                        <Check size={17} />
                      )}

                      <span>Mark Read</span>
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
