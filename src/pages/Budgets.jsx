
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  TrendingDown,
  Wallet,
  X,
} from "lucide-react";

import api from "../services/api";
import "../styles/Budgets.css";

const currentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
};

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatMonth = (month, year) =>
  new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

const toList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.budgets)) return data.budgets;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

const emptyForm = (monthValue) => ({
  monthValue,
  amount: "",
});

const getBudgetStatus = (budget) => {
  if (!budget) return "not-set";

  const percentage = Number(budget.usagePercentage) || 0;
  const backendStatus = String(budget.status || "").toUpperCase();

  if (
    percentage >= 100 ||
    backendStatus.includes("EXCEED") ||
    backendStatus.includes("OVER")
  ) {
    return "exceeded";
  }

  if (
    percentage >= 80 ||
    backendStatus.includes("WARN") ||
    backendStatus.includes("NEAR")
  ) {
    return "warning";
  }

  return "healthy";
};

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(
    currentMonth()
  );

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(
    emptyForm(currentMonth())
  );

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/budgets");

      setBudgets(toList(response.data));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load budgets. Check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const selectedBudget = useMemo(() => {
    const [year, month] = selectedMonth
      .split("-")
      .map(Number);

    return (
      budgets.find(
        (budget) =>
          Number(budget.month) === month &&
          Number(budget.year) === year
      ) || null
    );
  }, [budgets, selectedMonth]);

  // These values come directly from BudgetResponse.java.
  const budgetAmount =
    Number(selectedBudget?.budgetAmount) || 0;

  const totalSpent =
    Number(selectedBudget?.amountSpent) || 0;

  const remaining =
    Number(selectedBudget?.remainingAmount) || 0;

  const progress =
    Number(selectedBudget?.usagePercentage) || 0;

  const status = getBudgetStatus(selectedBudget);

  const filteredBudgets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...budgets]
      .filter((budget) =>
        formatMonth(
          Number(budget.month),
          Number(budget.year)
        )
          .toLowerCase()
          .includes(query)
      )
      .sort(
        (a, b) =>
          Number(b.year) * 12 +
          Number(b.month) -
          (Number(a.year) * 12 + Number(a.month))
      );
  }, [budgets, search]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm(selectedMonth));
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (budget) => {
    setEditingId(budget.id);

    setForm({
      monthValue: `${budget.year}-${String(
        budget.month
      ).padStart(2, "0")}`,
      amount: String(budget.budgetAmount ?? ""),
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const [year, month] = form.monthValue
      .split("-")
      .map(Number);

    const amount = Number(form.amount);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      setError(
        "Select a valid month and year (2000 or later)."
      );
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(
        "Enter a budget amount greater than zero."
      );
      return;
    }

    const duplicate = budgets.some(
      (budget) =>
        Number(budget.month) === month &&
        Number(budget.year) === year &&
        String(budget.id) !== String(editingId)
    );

    if (duplicate) {
      setError(
        "A budget already exists for this month. Edit the existing budget instead."
      );
      return;
    }

    // Request matches BudgetRequest.java.
    const payload = {
      month,
      year,
      amount,
    };

    const wasEditing = editingId !== null;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (wasEditing) {
        await api.put(
          `/budgets/${editingId}`,
          payload
        );
      } else {
        await api.post("/budgets", payload);
      }

      setSelectedMonth(form.monthValue);
      setModalOpen(false);
      setEditingId(null);

      await loadBudgets();

      setSuccess(
        wasEditing
          ? "Budget updated successfully."
          : "Monthly budget created successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save budget. Please check your details."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (budget) => {
    const confirmed = window.confirm(
      `Delete your budget for ${formatMonth(
        Number(budget.month),
        Number(budget.year)
      )}?`
    );

    if (!confirmed) return;

    setDeletingId(budget.id);
    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/budgets/${budget.id}`
      );

      await loadBudgets();

      setSuccess(
        "Budget deleted successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete budget."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="budgets-page">
      <section className="budgets-top">
        <div>
          <span className="budgets-eyebrow">
            FINANCIAL PLANNING
          </span>

          <h2>Budgets Management</h2>

          <p>
            Set monthly spending limits, monitor your
            expenses, and stay in control of your finances.
          </p>
        </div>

        <button
          type="button"
          className="budgets-primary-button"
          onClick={openAddModal}
        >
          <Plus size={18} />
          Create Budget
        </button>
      </section>

      {error && !modalOpen && (
        <div
          className="budgets-alert budgets-alert-error"
          role="alert"
        >
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
        <div
          className="budgets-alert budgets-alert-success"
          role="status"
        >
          <CheckCircle2 size={19} />
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

      <section className="budgets-overview">
        <div>
          <span className="budgets-eyebrow">
            MONTHLY OVERVIEW
          </span>

          <h3>
            {formatMonth(
              Number(selectedMonth.slice(5, 7)),
              Number(selectedMonth.slice(0, 4))
            )}
          </h3>
        </div>

        <label className="budgets-month-input">
          <CalendarDays size={18} />

          <input
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(event.target.value)
            }
            aria-label="Select budget month"
          />
        </label>
      </section>

      <section className="budgets-stats">
        <article className="budgets-stat-card">
          <div className="budgets-stat-icon budgets-icon-purple">
            <Target size={23} />
          </div>

          <p>Monthly Budget</p>
          <h3>{formatMoney(budgetAmount)}</h3>
          <span>Planned spending limit</span>
        </article>

        <article className="budgets-stat-card">
          <div className="budgets-stat-icon budgets-icon-red">
            <TrendingDown size={23} />
          </div>

          <p>Total Spent</p>
          <h3>{formatMoney(totalSpent)}</h3>
          <span>Expenses in selected month</span>
        </article>

        <article className="budgets-stat-card">
          <div className="budgets-stat-icon budgets-icon-green">
            <Wallet size={23} />
          </div>

          <p>Remaining Budget</p>

          <h3>
            {selectedBudget
              ? formatMoney(remaining)
              : "—"}
          </h3>

          <span>Budget minus expenses</span>
        </article>
      </section>

      <section className="budgets-progress-card">
        <div className="budgets-progress-header">
          <div>
            <h3>Budget Utilization</h3>

            <p>
              Track how much of your monthly budget
              you've used.
            </p>
          </div>

          {selectedBudget && (
            <button
              type="button"
              className="budgets-outline-button"
              onClick={() =>
                openEditModal(selectedBudget)
              }
            >
              <Edit3 size={16} />
              Edit Budget
            </button>
          )}
        </div>

        {loading ? (
          <div className="budgets-no-budget">
            <LoaderCircle
              size={30}
              className="budgets-spin"
            />
            <h4>Loading budget...</h4>
          </div>
        ) : !selectedBudget ? (
          <div className="budgets-no-budget">
            <div className="budgets-empty-icon">
              <Target size={30} />
            </div>

            <h4>
              No budget set for this month
            </h4>

            <p>
              Create a monthly budget to track your
              spending.
            </p>

            <button
              type="button"
              className="budgets-primary-button"
              onClick={openAddModal}
            >
              <Plus size={18} />
              Set Monthly Budget
            </button>
          </div>
        ) : (
          <>
            <div className="budgets-progress-values">
              <strong>
                {formatMoney(totalSpent)} spent
              </strong>

              <span>
                of {formatMoney(budgetAmount)}
              </span>
            </div>

            <div
              className="budgets-progress-track"
              role="progressbar"
              aria-valuenow={Math.min(
                Math.max(Math.round(progress), 0),
                100
              )}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Monthly budget used"
            >
              <div
                className={`budgets-progress-fill budgets-progress-${status}`}
                style={{
                  width: `${Math.min(
                    Math.max(progress, 0),
                    100
                  )}%`,
                }}
              />
            </div>

            <div className="budgets-progress-meta">
              <strong>
                {progress.toFixed(1)}% used
              </strong>

              <span>
                {formatMoney(
                  Math.max(remaining, 0)
                )}{" "}
                available
              </span>
            </div>

            <div
              className={`budgets-status budgets-status-${status}`}
            >
              {status === "healthy" ? (
                <ShieldCheck size={20} />
              ) : (
                <AlertCircle size={20} />
              )}

              <span>
                {status === "healthy"
                  ? "You're within your monthly budget. Keep it up!"
                  : status === "warning"
                  ? "You've used at least 80% of your monthly budget."
                  : remaining < 0
                  ? `You've exceeded your budget by ${formatMoney(
                      Math.abs(remaining)
                    )}.`
                  : "You've reached your monthly budget limit."}
              </span>
            </div>
          </>
        )}
      </section>

      <section className="budgets-history-panel">
        <div className="budgets-panel-header">
          <div>
            <h3>Budget History</h3>

            <p>
              Manage budgets for different months.
            </p>
          </div>

          <button
            type="button"
            className="budgets-outline-button"
            onClick={loadBudgets}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <label className="budgets-search">
          <Search size={18} />

          <input
            type="search"
            placeholder="Search by month or year..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </label>

        {loading ? (
          <div className="budgets-empty-state">
            <LoaderCircle
              size={30}
              className="budgets-spin"
            />

            <h4>Loading budgets...</h4>
          </div>
        ) : filteredBudgets.length === 0 ? (
          <div className="budgets-empty-state">
            <Target size={34} />

            <h4>No budgets found</h4>

            <p>
              Your monthly budgets will appear here.
            </p>
          </div>
        ) : (
          <div className="budgets-table-scroll">
            <table className="budgets-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Budget Amount</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredBudgets.map((budget) => {
                  const limit =
                    Number(budget.budgetAmount) || 0;

                  const spent =
                    Number(budget.amountSpent) || 0;

                  const balance =
                    Number(budget.remainingAmount) || 0;

                  const used =
                    Number(budget.usagePercentage) || 0;

                  return (
                    <tr key={budget.id}>
                      <td>
                        <strong>
                          {formatMonth(
                            Number(budget.month),
                            Number(budget.year)
                          )}
                        </strong>
                      </td>

                      <td>
                        {formatMoney(limit)}
                      </td>

                      <td className="budgets-spent">
                        {formatMoney(spent)}
                      </td>

                      <td>
                        {formatMoney(balance)}
                      </td>

                      <td>
                        <div className="budgets-table-progress">
                          <div
                            style={{
                              width: `${Math.min(
                                Math.max(used, 0),
                                100
                              )}%`,
                              background:
                                used >= 100
                                  ? "#e11d48"
                                  : used >= 80
                                  ? "#f59e0b"
                                  : "#6366f1",
                            }}
                          />
                        </div>

                        <small>
                          {used.toFixed(1)}%
                        </small>
                      </td>

                      <td>
                        <div className="budgets-row-actions">
                          <button
                            type="button"
                            className="budgets-edit-button"
                            onClick={() =>
                              openEditModal(budget)
                            }
                            aria-label={`Edit budget for ${formatMonth(
                              budget.month,
                              budget.year
                            )}`}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="budgets-delete-button"
                            onClick={() =>
                              handleDelete(budget)
                            }
                            disabled={
                              deletingId === budget.id
                            }
                            aria-label={`Delete budget for ${formatMonth(
                              budget.month,
                              budget.year
                            )}`}
                          >
                            {deletingId === budget.id ? (
                              <LoaderCircle
                                size={16}
                                className="budgets-spin"
                              />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="budgets-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            className="budgets-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="budgets-modal-title"
          >
            <div className="budgets-modal-header">
              <div>
                <span className="budgets-eyebrow">
                  BUDGET DETAILS
                </span>

                <h3 id="budgets-modal-title">
                  {editingId !== null
                    ? "Edit Monthly Budget"
                    : "Create Monthly Budget"}
                </h3>

                <p>
                  Set your monthly spending limit.
                </p>
              </div>

              <button
                type="button"
                className="budgets-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div
                className="budgets-alert budgets-alert-error"
                role="alert"
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form
              className="budgets-form"
              onSubmit={handleSubmit}
            >
              <label>
                <span className="budgets-field-label">
                  Month and Year <span>*</span>
                </span>

                <input
                  type="month"
                  value={form.monthValue}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      monthValue:
                        event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                <span className="budgets-field-label">
                  Budget Amount (₹) <span>*</span>
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 3000"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      amount:
                        event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <div className="budgets-modal-footer">
                <button
                  type="button"
                  className="budgets-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="budgets-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle
                      size={18}
                      className="budgets-spin"
                    />
                  ) : (
                    <Plus size={18} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Update Budget"
                    : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
