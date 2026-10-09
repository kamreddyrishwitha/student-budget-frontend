
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import api from "../services/api";
import "../styles/Groups.css";

const emptyForm = {
  name: "",
  description: "",
};

const getErrorMessage = (error, fallback) => {
  const data = error.response?.data;

  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  return fallback;
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function Groups() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [memberModalGroup, setMemberModalGroup] = useState(null);
  const [memberEmail, setMemberEmail] = useState("");

  const loadGroups = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/groups");
      setGroups(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load groups. Check your backend.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    return groups.filter((group) =>
      [group.name, group.description, group.createdByName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [groups, search]);

  const totalMembers = groups.reduce(
    (sum, group) => sum + (Number(group.memberCount) || 0),
    0
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEdit = (group) => {
    setEditingId(group.id);
    setForm({
      name: group.name || "",
      description: group.description || "",
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setError("Group name is required.");
      return;
    }

    if (name.length > 150) {
      setError("Group name cannot exceed 150 characters.");
      return;
    }

    if (description.length > 500) {
      setError("Description cannot exceed 500 characters.");
      return;
    }

    const wasEditing = editingId !== null;

    setSaving(true);
    setError("");

    try {
      if (wasEditing) {
        await api.put(`/groups/${editingId}`, {
          name,
          description,
        });
      } else {
        await api.post("/groups", {
          name,
          description,
        });
      }

      setModalOpen(false);
      setEditingId(null);

      await loadGroups();

      setSuccess(
        wasEditing
          ? "Group updated successfully."
          : "Group created successfully."
      );
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save group."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (group) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${group.name}"?`
    );

    if (!confirmed) return;

    setDeletingId(group.id);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/groups/${group.id}`);
      await loadGroups();
      setSuccess("Group deleted successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete group."));
    } finally {
      setDeletingId(null);
    }
  };

  const openAddMember = (group) => {
    setMemberModalGroup(group);
    setMemberEmail("");
    setError("");
    setSuccess("");
  };

  const handleAddMember = async (event) => {
    event.preventDefault();

    if (!memberModalGroup) return;

    const email = memberEmail.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid member email address.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.post(`/groups/${memberModalGroup.id}/members`, {
        email,
      });

      setMemberModalGroup(null);
      setMemberEmail("");

      await loadGroups();

      setSuccess("Member added successfully.");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to add member. Check that the email belongs to a registered user."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="groups-page">
      <section className="groups-heading">
        <div>
          <span className="groups-eyebrow">SHARED FINANCES</span>
          <h2>Groups Management</h2>
          <p>
            Organize shared expenses with roommates, classmates,
            friends, and travel groups.
          </p>
        </div>

        <button
          type="button"
          className="groups-primary-button"
          onClick={openCreate}
        >
          <Plus size={18} />
          Create Group
        </button>
      </section>

      {error && !modalOpen && !memberModalGroup && (
        <div className="groups-alert groups-alert-error" role="alert">
          <AlertCircle size={19} />
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
        <div className="groups-alert groups-alert-success" role="status">
          <CheckCircle2 size={19} />
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section className="groups-stats">
        <article className="groups-stat-card">
          <div className="groups-stat-icon groups-icon-purple">
            <Users size={23} />
          </div>
          <p>Total Groups</p>
          <h3>{groups.length}</h3>
          <span>Groups you're part of</span>
        </article>

        <article className="groups-stat-card">
          <div className="groups-stat-icon groups-icon-green">
            <UserPlus size={23} />
          </div>
          <p>Group Memberships</p>
          <h3>{totalMembers}</h3>
          <span>Members across your groups</span>
        </article>
      </section>

      <section className="groups-content-panel">
        <div className="groups-panel-heading">
          <div>
            <h3>My Groups</h3>
            <p>View and manage your shared expense groups.</p>
          </div>

          <button
            type="button"
            className="groups-outline-button"
            onClick={loadGroups}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <label className="groups-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search groups..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        {loading ? (
          <div className="groups-empty-state">
            <LoaderCircle size={34} className="groups-spin" />
            <h4>Loading groups...</h4>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="groups-empty-state">
            <div className="groups-empty-icon">
              <Users size={32} />
            </div>
            <h4>{search ? "No matching groups" : "No groups yet"}</h4>
            <p>
              {search
                ? "Try searching with a different group name."
                : "Create your first group to manage shared finances."}
            </p>

            {!search && (
              <button
                type="button"
                className="groups-primary-button"
                onClick={openCreate}
              >
                <Plus size={18} />
                Create First Group
              </button>
            )}
          </div>
        ) : (
          <div className="groups-grid">
            {filteredGroups.map((group) => (
              <article className="groups-group-card" key={group.id}>
                <div className="groups-card-top">
                  <div className="groups-card-icon">
                    <Users size={24} />
                  </div>

                  <div className="groups-card-actions">
                    <button
                      type="button"
                      className="groups-icon-button groups-edit"
                      onClick={() => openEdit(group)}
                      aria-label={`Edit ${group.name}`}
                      title="Edit group"
                    >
                      <Edit3 size={16} />
                    </button>

                    <button
                      type="button"
                      className="groups-icon-button groups-delete"
                      onClick={() => handleDelete(group)}
                      disabled={deletingId === group.id}
                      aria-label={`Delete ${group.name}`}
                      title="Delete group"
                    >
                      {deletingId === group.id ? (
                        <LoaderCircle
                          size={16}
                          className="groups-spin"
                        />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <h4>{group.name}</h4>

                <p className="groups-description">
                  {group.description || "No description provided."}
                </p>

                <div className="groups-card-info">
                  <span>
                    <Users size={15} />
                    {Number(group.memberCount) || 0} members
                  </span>

                  <span>
                    <CalendarDays size={15} />
                    {formatDate(group.createdAt)}
                  </span>
                </div>

                <div className="groups-card-creator">
                  Created by{" "}
                  <strong>{group.createdByName || "Unknown"}</strong>
                </div>

                <div className="groups-card-footer">
                  <button
                    type="button"
                    className="groups-outline-button"
                    onClick={() => openAddMember(group)}
                  >
                    <UserPlus size={16} />
                    Add Member
                  </button>

                  <button
                    type="button"
                    className="groups-view-button"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    View Details
                    <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="groups-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="groups-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="groups-modal-title"
          >
            <div className="groups-modal-heading">
              <div>
                <span className="groups-eyebrow">GROUP DETAILS</span>
                <h3 id="groups-modal-title">
                  {editingId !== null ? "Edit Group" : "Create New Group"}
                </h3>
                <p>Organize your shared finances.</p>
              </div>

              <button
                type="button"
                className="groups-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="groups-alert groups-alert-error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form className="groups-form" onSubmit={handleSave}>
              <label>
                <span className="groups-field-label">
                  Group Name <span>*</span>
                </span>

                <input
                  type="text"
                  placeholder="e.g. College Friends"
                  maxLength={150}
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                <span className="groups-field-label">
                  Description
                </span>

                <textarea
                  placeholder="What is this group for?"
                  rows={4}
                  maxLength={500}
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="groups-modal-footer">
                <button
                  type="button"
                  className="groups-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="groups-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle
                      size={18}
                      className="groups-spin"
                    />
                  ) : (
                    <Plus size={18} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Update Group"
                    : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {memberModalGroup && (
        <div
          className="groups-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setMemberModalGroup(null);
              setError("");
            }
          }}
        >
          <div
            className="groups-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="groups-member-title"
          >
            <div className="groups-modal-heading">
              <div>
                <span className="groups-eyebrow">GROUP MEMBERS</span>
                <h3 id="groups-member-title">Add Group Member</h3>
                <p>
                  Add someone to <strong>{memberModalGroup.name}</strong>.
                </p>
              </div>

              <button
                type="button"
                className="groups-modal-close"
                onClick={() => {
                  setMemberModalGroup(null);
                  setError("");
                }}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="groups-alert groups-alert-error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form className="groups-form" onSubmit={handleAddMember}>
              <label>
                <span className="groups-field-label">
                  Member Email <span>*</span>
                </span>

                <div className="groups-email-field">
                  <Mail size={18} />

                  <input
                    type="email"
                    placeholder="friend@example.com"
                    value={memberEmail}
                    onChange={(event) =>
                      setMemberEmail(event.target.value)
                    }
                    required
                  />
                </div>
              </label>

              <p className="groups-form-hint">
                Enter the email address associated with the member's
                StudentBudget account.
              </p>

              <div className="groups-modal-footer">
                <button
                  type="button"
                  className="groups-cancel-button"
                  onClick={() => {
                    setMemberModalGroup(null);
                    setError("");
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="groups-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle
                      size={18}
                      className="groups-spin"
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
