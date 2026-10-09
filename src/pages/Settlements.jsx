
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleCheck,
  HandCoins,
  History,
  IndianRupee,
  LoaderCircle,
  Plus,
  RefreshCw,
  Users,
  Wallet,
  X,
} from "lucide-react";

import api from "../services/api";
import "../styles/Settlements.css";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (error, fallback) => {
  const data = error.response?.data;

  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;

  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors)[0];
    if (typeof first === "string") return first;
  }

  return fallback;
};

const emptyForm = () => ({
  fromUserId: "",
  toUserId: "",
  amount: "",
  settlementDate: today(),
  note: "",
});

export default function Settlements() {
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [balance, setBalance] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [groupResponse, balanceResponse, settlementResponse] =
        await Promise.all([
          api.get(`/groups/${groupId}`),
          api.get(`/groups/${groupId}/balances`),
          api.get(`/groups/${groupId}/settlements`),
        ]);

      setGroup(groupResponse.data);
      setBalance(balanceResponse.data);
      setSettlements(
        Array.isArray(settlementResponse.data)
          ? settlementResponse.data
          : []
      );
      setError("");
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load balances and settlements.")
      );
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

  const debts = useMemo(
    () => (Array.isArray(balance?.debts) ? balance.debts : []),
    [balance]
  );

  const outstandingTotal = debts.reduce(
    (sum, debt) => sum + Number(debt.amount || 0),
    0
  );

  const settledTotal = settlements.reduce(
    (sum, settlement) => sum + Number(settlement.amount || 0),
    0
  );

  const sortedSettlements = useMemo(
    () =>
      [...settlements].sort((a, b) =>
        String(b.settlementDate || "").localeCompare(
          String(a.settlementDate || "")
        )
      ),
    [settlements]
  );

  const openSettlement = (debt = null) => {
    setForm({
      ...emptyForm(),
      fromUserId:
        debt?.fromUserId != null ? String(debt.fromUserId) : "",
      toUserId:
        debt?.toUserId != null ? String(debt.toUserId) : "",
      amount: debt?.amount != null ? String(debt.amount) : "",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeSettlement = () => {
    if (saving) return;
    setModalOpen(false);
    setError("");
  };

  const selectedDebt = debts.find(
    (debt) =>
      String(debt.fromUserId) === form.fromUserId &&
      String(debt.toUserId) === form.toUserId
  );

  const handleSave = async (event) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.fromUserId || !form.toUserId) {
      setError("Select both the sender and receiver.");
      return;
    }

    if (form.fromUserId === form.toUserId) {
      setError("The sender and receiver must be different people.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (Math.round(amount * 100) !== amount * 100) {
      setError("Use no more than two decimal places.");
      return;
    }

    if (!selectedDebt) {
      setError(
        "Select a payer and receiver who have an outstanding debt."
      );
      return;
    }

    if (
      Math.round(amount * 100) >
      Math.round(Number(selectedDebt.amount) * 100)
    ) {
      setError(
        `Settlement cannot exceed the outstanding debt of ${formatMoney(
          selectedDebt.amount
        )}.`
      );
      return;
    }

    if (!form.settlementDate) {
      setError("Settlement date is required.");
      return;
    }

    if (form.note.trim().length > 500) {
      setError("Note cannot exceed 500 characters.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.post(`/groups/${groupId}/settlements`, {
        fromUserId: Number(form.fromUserId),
        toUserId: Number(form.toUserId),
        amount: form.amount,
        settlementDate: form.settlementDate,
        note: form.note.trim(),
      });

      setModalOpen(false);
      setForm(emptyForm());

      await loadData();
      setSuccess("Settlement recorded successfully.");
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to record settlement.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settlements-page">
      <Link to={`/groups/${groupId}`} className="settlements-back">
        <ArrowLeft size={17} />
        Back to Group Details
      </Link>

      <section className="settlements-heading">
        <div>
          <span className="settlements-eyebrow">GROUP FINANCES</span>
          <h2>Balances & Settlements</h2>
          <p>
            {group?.name
              ? `Track outstanding debts and repayments for ${group.name}.`
              : "Track group debts and repayments."}
          </p>
        </div>

        <button
          type="button"
          className="settlements-primary-button"
          onClick={() => openSettlement()}
          disabled={loading || debts.length === 0}
        >
          <Plus size={18} />
          Record Settlement
        </button>
      </section>

      {error && !modalOpen && (
        <div className="settlements-alert settlements-alert-error" role="alert">
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
          className="settlements-alert settlements-alert-success"
          role="status"
        >
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

      <section className="settlements-stats">
        <article className="settlements-stat-card">
          <div className="settlements-stat-icon purple">
            <Wallet size={23} />
          </div>
          <p>Total Outstanding</p>
          <h3>{formatMoney(outstandingTotal)}</h3>
          <span>Remaining group debts</span>
        </article>

        <article className="settlements-stat-card">
          <div className="settlements-stat-icon green">
            <HandCoins size={23} />
          </div>
          <p>Total Recorded Repayments</p>
          <h3>{formatMoney(settledTotal)}</h3>
          <span>Payments recorded in this group</span>
        </article>

        <article className="settlements-stat-card">
          <div className="settlements-stat-icon amber">
            <Users size={23} />
          </div>
          <p>Outstanding Debts</p>
          <h3>{debts.length}</h3>
          <span>Unsettled member-to-member balances</span>
        </article>
      </section>

      <section className="settlements-panel">
        <div className="settlements-panel-heading">
          <div>
            <h3>Who Owes Whom</h3>
            <p>Current outstanding debts calculated by the backend.</p>
          </div>

          <button
            type="button"
            className="settlements-outline-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="settlements-empty">
            <LoaderCircle size={30} className="settlements-spin" />
            <p>Loading group balances...</p>
          </div>
        ) : debts.length === 0 ? (
          <div className="settlements-empty">
            <div className="settlements-empty-icon">
              <CircleCheck size={32} />
            </div>
            <h4>All settled up!</h4>
            <p>There are no outstanding debts in this group.</p>
          </div>
        ) : (
          <div className="settlements-debt-list">
            {debts.map((debt, index) => (
              <article
                className="settlements-debt-item"
                key={`${debt.fromUserId}-${debt.toUserId}-${index}`}
              >
                <div className="settlements-debt-people">
                  <div className="settlements-person">
                    <div className="settlements-avatar">
                      {(debt.fromUserName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{debt.fromUserName || "Unknown"}</strong>
                      <span>Owes money</span>
                    </div>
                  </div>

                  <ArrowRight
                    size={19}
                    className="settlements-debt-arrow"
                  />

                  <div className="settlements-person">
                    <div className="settlements-avatar receiver">
                      {(debt.toUserName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{debt.toUserName || "Unknown"}</strong>
                      <span>Receives money</span>
                    </div>
                  </div>
                </div>

                <div className="settlements-debt-actions">
                  <strong>{formatMoney(debt.amount)}</strong>

                  <button
                    type="button"
                    className="settlements-primary-button settlements-small-button"
                    onClick={() => openSettlement(debt)}
                  >
                    <HandCoins size={16} />
                    Settle Up
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="settlements-panel">
        <div className="settlements-panel-heading">
          <div>
            <h3>Settlement History</h3>
            <p>Previously recorded repayments in this group.</p>
          </div>

          <span className="settlements-history-count">
            <History size={16} />
            {settlements.length} payments
          </span>
        </div>

        {loading ? (
          <div className="settlements-empty">
            <LoaderCircle size={30} className="settlements-spin" />
          </div>
        ) : sortedSettlements.length === 0 ? (
          <div className="settlements-empty">
            <div className="settlements-empty-icon">
              <History size={30} />
            </div>
            <h4>No settlements yet</h4>
            <p>Recorded repayments will appear here.</p>
          </div>
        ) : (
          <div className="settlements-history-list">
            {sortedSettlements.map((settlement) => (
              <article
                className="settlements-history-item"
                key={settlement.id}
              >
                <div className="settlements-history-icon">
                  <CheckCircle2 size={21} />
                </div>

                <div className="settlements-history-main">
                  <h4>
                    {settlement.fromUserName || "Unknown"}
                    <ArrowRight size={15} />
                    {settlement.toUserName || "Unknown"}
                  </h4>

                  <span>
                    <CalendarDays size={14} />
                    {formatDate(settlement.settlementDate)}
                  </span>

                  {settlement.note && (
                    <p>{settlement.note}</p>
                  )}
                </div>

                <div className="settlements-history-amount">
                  <IndianRupee size={15} />
                  {formatMoney(settlement.amount)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="settlements-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSettlement();
            }
          }}
        >
          <div
            className="settlements-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settlements-modal-title"
          >
            <div className="settlements-modal-heading">
              <div>
                <span className="settlements-eyebrow">
                  RECORD PAYMENT
                </span>
                <h3 id="settlements-modal-title">
                  Record Settlement
                </h3>
                <p>Record money paid from one member to another.</p>
              </div>

              <button
                type="button"
                className="settlements-modal-close"
                onClick={closeSettlement}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div
                className="settlements-alert settlements-alert-error"
                role="alert"
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form className="settlements-form" onSubmit={handleSave}>
              <label>
                <span>Paid By *</span>
                <select
                  value={form.fromUserId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      fromUserId: event.target.value,
                      toUserId: "",
                      amount: "",
                    }))
                  }
                  required
                >
                  <option value="">Select person paying</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Paid To *</span>
                <select
                  value={form.toUserId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      toUserId: event.target.value,
                      amount: "",
                    }))
                  }
                  required
                >
                  <option value="">Select person receiving</option>
                  {members
                    .filter(
                      (member) =>
                        String(member.userId) !== form.fromUserId
                    )
                    .map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </label>

              {selectedDebt && (
                <div className="settlements-debt-preview">
                  <Wallet size={19} />
                  <div>
                    <strong>
                      Outstanding: {formatMoney(selectedDebt.amount)}
                    </strong>
                    <p>
                      You can record a full or partial repayment.
                    </p>
                  </div>
                </div>
              )}

              <div className="settlements-form-row">
                <label>
                  <span>Amount (₹) *</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="300.00"
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
                  <span>Settlement Date *</span>
                  <input
                    type="date"
                    value={form.settlementDate}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        settlementDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>

              <label>
                <span>Note</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. College lunch repayment"
                  value={form.note}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      note: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="settlements-modal-footer">
                <button
                  type="button"
                  className="settlements-cancel-button"
                  onClick={closeSettlement}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="settlements-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle
                      size={18}
                      className="settlements-spin"
                    />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  {saving ? "Saving..." : "Record Settlement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
