
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  IndianRupee,
  LoaderCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Users,
  Wallet,
  X,
} from "lucide-react";

import api from "../services/api";
import "../styles/SharedExpenses.css";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const createEmptyForm = () => ({
  title: "",
  amount: "",
  description: "",
  expenseDate: today(),
  paidByUserId: "",
  splitType: "equal",
  participants: {},
});

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const dateLabel = (value) => {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getError = (error, fallback) => {
  const data = error.response?.data;

  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  return fallback;
};

export default function SharedExpenses() {
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm);

  const [selectedExpense, setSelectedExpense] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [groupResponse, expenseResponse] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/groups/${groupId}/expenses`),
      ]);

      setGroup(groupResponse.data);
      setExpenses(
        Array.isArray(expenseResponse.data) ? expenseResponse.data : []
      );
      setError("");
    } catch (err) {
      setError(getError(err, "Unable to load shared expenses."));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const members = useMemo(
    () => (Array.isArray(group?.members) ? group.members : []),
    [group]
  );

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) =>
      [
        expense.title,
        expense.description,
        expense.paidByName,
        expense.splitType,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [expenses, search]);

  const totalAmount = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const pendingAmount = expenses.reduce(
    (sum, expense) =>
      sum +
      (Array.isArray(expense.splits)
        ? expense.splits.reduce(
            (subtotal, split) =>
              subtotal + Number(split.pendingAmount || 0),
            0
          )
        : 0),
    0
  );

  const openCreate = () => {
    const participants = {};

    members.forEach((member) => {
      participants[String(member.userId)] = "";
    });

    setForm({
      ...createEmptyForm(),
      paidByUserId: members[0]?.userId
        ? String(members[0].userId)
        : "",
      participants,
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeCreate = () => {
    if (saving) return;

    setModalOpen(false);
    setError("");
  };

  const updateParticipant = (userId, value) => {
    setForm((previous) => ({
      ...previous,
      participants: {
        ...previous.participants,
        [String(userId)]: value,
      },
    }));
  };

  const participantEntries = members
    .filter((member) => {
      const raw = form.participants[String(member.userId)];
      return raw !== "" && raw !== undefined && Number(raw) > 0;
    })
    .map((member) => ({
      userId: member.userId,
      value: Number(form.participants[String(member.userId)]),
    }));

  const participantTotal = participantEntries.reduce(
    (sum, participant) => sum + participant.value,
    0
  );

  const handleCreate = async (event) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.title.trim()) {
      setError("Expense title is required.");
      return;
    }

    if (form.title.trim().length > 150) {
      setError("Title cannot exceed 150 characters.");
      return;
    }

    if (form.description.trim().length > 500) {
      setError("Description cannot exceed 500 characters.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (!form.paidByUserId) {
      setError("Select who paid for this expense.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      amount,
      description: form.description.trim(),
      expenseDate: form.expenseDate,
      paidByUserId: Number(form.paidByUserId),
    };

    let endpoint = "equal";

    if (form.splitType !== "equal") {
      if (participantEntries.length === 0) {
        setError("Enter a positive split value for at least one member.");
        return;
      }

      if (form.splitType === "custom") {
        endpoint = "custom";

        const amountInPaise = Math.round(amount * 100);
        const totalInPaise = participantEntries.reduce(
          (sum, participant) =>
            sum + Math.round(participant.value * 100),
          0
        );

        if (amountInPaise !== totalInPaise) {
          setError("Custom split amounts must add up to the total expense.");
          return;
        }
      } else {
        endpoint = "percentage";

        if (Math.abs(participantTotal - 100) > 0.000001) {
          setError("Percentage splits must add up to exactly 100%.");
          return;
        }
      }

      payload.participants = participantEntries;
    }

    setSaving(true);
    setError("");

    try {
      await api.post(`/groups/${groupId}/expenses/${endpoint}`, payload);

      setModalOpen(false);
      setForm(createEmptyForm);

      await loadData();

      setSuccess("Shared expense created successfully.");
    } catch (err) {
      setError(getError(err, "Unable to create shared expense."));
    } finally {
      setSaving(false);
    }
  };

  const openExpenseDetails = async (expense) => {
    setError("");

    try {
      const response = await api.get(
        `/groups/${groupId}/expenses/${expense.id}`
      );

      setSelectedExpense(response.data);
    } catch (err) {
      setError(getError(err, "Unable to load expense details."));
    }
  };

  const splitLabel = (splitType) => {
    const normalized = String(splitType || "").toLowerCase();

    if (normalized.includes("equal")) return "Equal Split";
    if (normalized.includes("custom")) return "Custom Split";
    if (normalized.includes("percentage")) return "Percentage Split";

    return splitType || "Shared Split";
  };

  return (
    <div className="shared-expenses-page">
      <Link to={`/groups/${groupId}`} className="shared-expenses-back">
        <ArrowLeft size={17} />
        Back to Group Details
      </Link>

      <section className="shared-expenses-heading">
        <div>
          <span className="shared-expenses-eyebrow">
            SHARED FINANCES
          </span>
          <h2>Shared Expenses</h2>
          <p>
            {group?.name
              ? `Manage shared expenses for ${group.name}.`
              : "Track and split expenses with your group."}
          </p>
        </div>

        <button
          type="button"
          className="shared-expenses-primary"
          onClick={openCreate}
          disabled={!group || members.length === 0}
        >
          <Plus size={18} />
          Add Shared Expense
        </button>
      </section>

      {error && !modalOpen && (
        <div className="shared-expenses-alert shared-expenses-error">
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
        <div className="shared-expenses-alert shared-expenses-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section className="shared-expenses-stats">
        <article className="shared-expenses-stat">
          <div className="shared-expenses-stat-icon purple">
            <ReceiptText size={22} />
          </div>
          <p>Total Shared Expenses</p>
          <h3>{expenses.length}</h3>
          <span>Recorded group expenses</span>
        </article>

        <article className="shared-expenses-stat">
          <div className="shared-expenses-stat-icon green">
            <IndianRupee size={22} />
          </div>
          <p>Total Expense Amount</p>
          <h3>{money(totalAmount)}</h3>
          <span>Combined expense value</span>
        </article>

        <article className="shared-expenses-stat">
          <div className="shared-expenses-stat-icon amber">
            <Wallet size={22} />
          </div>
          <p>Pending Split Amount</p>
          <h3>{money(pendingAmount)}</h3>
          <span>Sum of unsettled shares</span>
        </article>
      </section>

      <section className="shared-expenses-panel">
        <div className="shared-expenses-panel-heading">
          <div>
            <h3>Group Expense History</h3>
            <p>Review your group's shared expenses and splits.</p>
          </div>

          <button
            type="button"
            className="shared-expenses-outline"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <label className="shared-expenses-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search shared expenses..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        {loading ? (
          <div className="shared-expenses-empty">
            <LoaderCircle
              size={32}
              className="shared-expenses-spin"
            />
            <h4>Loading shared expenses...</h4>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="shared-expenses-empty">
            <div className="shared-expenses-empty-icon">
              <ReceiptText size={32} />
            </div>

            <h4>
              {search
                ? "No matching expenses"
                : "No shared expenses yet"}
            </h4>

            <p>
              {search
                ? "Try a different search term."
                : "Add an expense to start splitting group costs."}
            </p>

            {!search && members.length > 0 && (
              <button
                type="button"
                className="shared-expenses-primary"
                onClick={openCreate}
              >
                <Plus size={18} />
                Add First Expense
              </button>
            )}
          </div>
        ) : (
          <div className="shared-expenses-list">
            {filteredExpenses.map((expense) => (
              <article
                className="shared-expenses-item"
                key={expense.id}
              >
                <div className="shared-expenses-item-icon">
                  <CircleDollarSign size={22} />
                </div>

                <div className="shared-expenses-item-main">
                  <h4>{expense.title}</h4>

                  <p>
                    Paid by{" "}
                    <strong>{expense.paidByName || "Unknown"}</strong>
                  </p>

                  <div className="shared-expenses-item-meta">
                    <span>
                      <CalendarDays size={14} />
                      {dateLabel(expense.expenseDate)}
                    </span>

                    <span className="shared-expenses-split-badge">
                      {splitLabel(expense.splitType)}
                    </span>
                  </div>
                </div>

                <div className="shared-expenses-item-right">
                  <strong>{money(expense.amount)}</strong>

                  <button
                    type="button"
                    className="shared-expenses-view"
                    onClick={() => openExpenseDetails(expense)}
                  >
                    View Splits
                    <ChevronDown size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="shared-expenses-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreate();
          }}
        >
          <div
            className="shared-expenses-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shared-expenses-modal-title"
          >
            <div className="shared-expenses-modal-heading">
              <div>
                <span className="shared-expenses-eyebrow">
                  NEW GROUP EXPENSE
                </span>
                <h3 id="shared-expenses-modal-title">
                  Add Shared Expense
                </h3>
                <p>Record an expense and choose how to split it.</p>
              </div>

              <button
                type="button"
                className="shared-expenses-close"
                onClick={closeCreate}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="shared-expenses-alert shared-expenses-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form
              className="shared-expenses-form"
              onSubmit={handleCreate}
            >
              <label>
                <span>Expense Title *</span>
                <input
                  type="text"
                  maxLength={150}
                  placeholder="e.g. College Lunch"
                  value={form.title}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <div className="shared-expenses-form-row">
                <label>
                  <span>Total Amount (₹) *</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="900.00"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        amount: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Expense Date *</span>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        expenseDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>

              <label>
                <span>Description</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Optional details..."
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Paid By *</span>
                <select
                  value={form.paidByUserId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      paidByUserId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select a member</option>

                  {members.map((member) => (
                    <option
                      key={member.userId}
                      value={member.userId}
                    >
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Split Method *</span>
                <select
                  value={form.splitType}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      splitType: event.target.value,
                    }))
                  }
                >
                  <option value="equal">
                    Equal Split — Divide evenly
                  </option>
                  <option value="custom">
                    Custom Split — Set amounts
                  </option>
                  <option value="percentage">
                    Percentage Split — Set percentages
                  </option>
                </select>
              </label>

              {form.splitType === "equal" ? (
                <div className="shared-expenses-split-preview">
                  <Users size={19} />
                  <div>
                    <strong>Equal split among all members</strong>
                    <p>
                      {members.length} members · Approximately{" "}
                      {money(
                        members.length
                          ? Number(form.amount || 0) / members.length
                          : 0
                      )}{" "}
                      per person
                    </p>
                  </div>
                </div>
              ) : (
                <div className="shared-expenses-participants">
                  <div className="shared-expenses-participants-heading">
                    <h4>
                      {form.splitType === "custom"
                        ? "Member Share Amounts"
                        : "Member Percentages"}
                    </h4>

                    <span>
                      {form.splitType === "custom"
                        ? `${money(participantTotal)} / ${money(form.amount)}`
                        : `${participantTotal.toFixed(2)}% / 100%`}
                    </span>
                  </div>

                  <p className="shared-expenses-participants-hint">
                    Enter a positive value for each participating member.
                    Leave other members blank.
                  </p>

                  {members.map((member) => (
                    <label
                      className="shared-expenses-participant-row"
                      key={member.userId}
                    >
                      <span>{member.name}</span>

                      <div className="shared-expenses-participant-input">
                        <span>
                          {form.splitType === "custom" ? "₹" : "%"}
                        </span>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          value={
                            form.participants[String(member.userId)] ?? ""
                          }
                          onChange={(event) =>
                            updateParticipant(
                              member.userId,
                              event.target.value
                            )
                          }
                        />
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="shared-expenses-modal-footer">
                <button
                  type="button"
                  className="shared-expenses-cancel"
                  onClick={closeCreate}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="shared-expenses-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle
                      size={18}
                      className="shared-expenses-spin"
                    />
                  ) : (
                    <Plus size={18} />
                  )}
                  {saving ? "Saving..." : "Create Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedExpense && (
        <div
          className="shared-expenses-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedExpense(null);
            }
          }}
        >
          <div
            className="shared-expenses-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shared-expenses-details-title"
          >
            <div className="shared-expenses-modal-heading">
              <div>
                <span className="shared-expenses-eyebrow">
                  EXPENSE BREAKDOWN
                </span>
                <h3 id="shared-expenses-details-title">
                  {selectedExpense.title}
                </h3>
                <p>
                  {money(selectedExpense.amount)} ·{" "}
                  {splitLabel(selectedExpense.splitType)}
                </p>
              </div>

              <button
                type="button"
                className="shared-expenses-close"
                onClick={() => setSelectedExpense(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="shared-expenses-detail-summary">
              <span>
                Paid by{" "}
                <strong>{selectedExpense.paidByName}</strong>
              </span>
              <span>
                {dateLabel(selectedExpense.expenseDate)}
              </span>
            </div>

            <h4 className="shared-expenses-detail-subheading">
              Member Splits
            </h4>

            <div className="shared-expenses-detail-list">
              {(selectedExpense.splits || []).map((split) => (
                <div
                  className="shared-expenses-detail-member"
                  key={split.userId}
                >
                  <div>
                    <strong>{split.name}</strong>
                    <span>{split.email}</span>
                  </div>

                  <div className="shared-expenses-detail-values">
                    <strong>{money(split.shareAmount)}</strong>
                    <span>
                      Pending: {money(split.pendingAmount)}
                    </span>
                    <small>
                      Settled: {money(split.settledAmount)}
                    </small>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="shared-expenses-outline shared-expenses-done"
              onClick={() => setSelectedExpense(null)}
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
