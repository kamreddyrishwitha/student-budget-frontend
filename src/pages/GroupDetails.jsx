
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Crown,
  HandCoins,
  LoaderCircle,
  Mail,
  ReceiptText,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import api from "../services/api";
import "../styles/GroupDetails.css";

function getErrorMessage(error, fallback) {
  const data = error.response?.data;

  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;

  return fallback;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function GroupDetails() {
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadGroup = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get(`/groups/${groupId}`);
      setGroup(response.data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load group details."));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const members = Array.isArray(group?.members) ? group.members : [];

  const addMember = async (event) => {
    event.preventDefault();

    const email = memberEmail.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.post(`/groups/${groupId}/members`, { email });
      setMemberModalOpen(false);
      setMemberEmail("");
      await loadGroup();
      setSuccess("Member added successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to add member."));
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (member) => {
    if (member.userId == null) {
      setError("Member ID is missing.");
      return;
    }

    if (!window.confirm(`Remove ${member.name} from this group?`)) {
      return;
    }

    setRemovingId(member.userId);
    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/groups/${groupId}/members/${member.userId}`
      );

      await loadGroup();
      setSuccess("Member removed successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to remove member."));
    } finally {
      setRemovingId(null);
    }
  };

  if (loading && !group) {
    return (
      <div className="group-details-loading">
        <LoaderCircle
          size={30}
          className="group-details-spin"
        />
        <p>Loading group details...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="group-details-page">
        <Link to="/groups" className="group-details-back">
          <ArrowLeft size={17} />
          Back to Groups
        </Link>

        <div className="group-details-empty">
          <AlertCircle size={34} />
          <h3>Group unavailable</h3>
          <p>{error || "The group could not be found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group-details-page">
      <Link to="/groups" className="group-details-back">
        <ArrowLeft size={17} />
        Back to Groups
      </Link>

      <section className="group-details-heading">
        <div>
          <span className="group-details-eyebrow">
            GROUP OVERVIEW
          </span>
          <h2>{group.name}</h2>
          <p>
            {group.description ||
              "Manage your shared expense group."}
          </p>
        </div>

        <button
          type="button"
          className="group-details-primary-button"
          onClick={() => {
            setMemberEmail("");
            setError("");
            setSuccess("");
            setMemberModalOpen(true);
          }}
        >
          <UserPlus size={18} />
          Add Member
        </button>
      </section>

      {error && !memberModalOpen && (
        <div className="group-details-alert group-details-alert-error">
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
        <div className="group-details-alert group-details-alert-success">
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

      <section className="group-details-stats">
        <article className="group-details-stat">
          <div className="group-details-stat-icon purple">
            <Users size={23} />
          </div>
          <p>Total Members</p>
          <h3>{group.memberCount ?? members.length}</h3>
          <span>People in this group</span>
        </article>

        <article className="group-details-stat">
          <div className="group-details-stat-icon green">
            <Crown size={23} />
          </div>
          <p>Group Creator</p>
          <h3 className="group-details-creator-name">
            {group.createdByName || "Unknown"}
          </h3>
          <span>Group administrator</span>
        </article>

        <article className="group-details-stat">
          <div className="group-details-stat-icon amber">
            <CalendarDays size={23} />
          </div>
          <p>Created On</p>
          <h3 className="group-details-date">
            {formatDate(group.createdAt)}
          </h3>
          <span>Group creation date</span>
        </article>
      </section>

      <section className="group-details-navigation">
        <Link
          to={`/groups/${groupId}/expenses`}
          className="group-details-navigation-card"
        >
          <div className="group-details-navigation-icon">
            <ReceiptText size={23} />
          </div>
          <div>
            <h3>Shared Expenses</h3>
            <p>
              Record expenses and manage equal, custom,
              and percentage splits.
            </p>
          </div>
          <ArrowRight size={19} />
        </Link>

        <Link
          to={`/groups/${groupId}/settlements`}
          className="group-details-navigation-card"
        >
          <div className="group-details-navigation-icon green">
            <HandCoins size={23} />
          </div>
          <div>
            <h3>Balances & Settlements</h3>
            <p>
              See who owes whom and record repayments.
            </p>
          </div>
          <ArrowRight size={19} />
        </Link>
      </section>

      <section className="group-details-members-panel">
        <div className="group-details-panel-heading">
          <div>
            <h3>Group Members</h3>
            <p>View and manage the people in this group.</p>
          </div>

          <button
            type="button"
            className="group-details-outline-button"
            onClick={loadGroup}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {members.length === 0 ? (
          <div className="group-details-empty">
            <Users size={34} />
            <h4>No members to display</h4>
            <p>Add a registered StudentBudget user.</p>
          </div>
        ) : (
          <div className="group-details-member-list">
            {members.map((member) => {
              const isCreator =
                String(member.userId) ===
                String(group.createdByUserId);

              return (
                <article
                  className="group-details-member"
                  key={member.userId}
                >
                  <div className="group-details-avatar">
                    {(member.name || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="group-details-member-info">
                    <strong>
                      {member.name || "Unknown"}

                      {isCreator && (
                        <span className="group-details-owner-badge">
                          Creator
                        </span>
                      )}
                    </strong>

                    <span>
                      <Mail size={13} />
                      {member.email}
                    </span>
                  </div>

                  {!isCreator && (
                    <button
                      type="button"
                      className="group-details-remove-button"
                      onClick={() => removeMember(member)}
                      disabled={removingId === member.userId}
                      title="Remove member"
                      aria-label={`Remove ${member.name}`}
                    >
                      {removingId === member.userId ? (
                        <LoaderCircle
                          size={17}
                          className="group-details-spin"
                        />
                      ) : (
                        <Trash2 size={17} />
                      )}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {memberModalOpen && (
        <div
          className="group-details-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setMemberModalOpen(false);
              setError("");
            }
          }}
        >
          <div
            className="group-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-details-modal-title"
          >
            <div className="group-details-modal-heading">
              <div>
                <span className="group-details-eyebrow">
                  GROUP MEMBERS
                </span>
                <h3 id="group-details-modal-title">
                  Add Member
                </h3>
                <p>Invite a registered user to {group.name}.</p>
              </div>

              <button
                type="button"
                className="group-details-modal-close"
                onClick={() => {
                  if (!saving) {
                    setMemberModalOpen(false);
                    setError("");
                  }
                }}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="group-details-alert group-details-alert-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form
              className="group-details-form"
              onSubmit={addMember}
            >
              <label>
                Member Email *
                <input
                  type="email"
                  placeholder="friend@example.com"
                  value={memberEmail}
                  onChange={(event) =>
                    setMemberEmail(event.target.value)
                  }
                  required
                />
              </label>

              <p className="group-details-hint">
                The member must have a StudentBudget account.
              </p>

              <div className="group-details-modal-footer">
                <button
                  type="button"
                  className="group-details-cancel-button"
                  onClick={() => {
                    setMemberModalOpen(false);
                    setError("");
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="group-details-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle
                      size={18}
                      className="group-details-spin"
                    />
                  ) : (
                    <UserPlus size={18} />
                  )}
                  {saving ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
