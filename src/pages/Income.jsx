
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  CalendarDays,
  CircleAlert,
  Edit3,
  IndianRupee,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

import api from "../services/api";
import "../styles/Income.css";

const today = () => {
  const date = new Date();
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return local.toISOString().slice(0, 10);
};

const emptyForm = () => ({
  amount: "",
  source: "",
  description: "",
  date: today(),
});

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (dateString) => {
  if (!dateString) return "—";

  const date = new Date(
    `${String(dateString).slice(0, 10)}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return String(dateString);
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const normalizeRecords = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.incomes)) return data.incomes;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getIncomeDate = (income) =>
  income.incomeDate || income.date || "";

export default function Income() {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    today().slice(0, 7)
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const loadIncomes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/incomes");
      setIncomes(normalizeRecords(response.data));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load income records. Check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncomes();
  }, [loadIncomes]);

  const filteredIncomes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incomes
      .filter((income) => {
        const date = String(getIncomeDate(income));

        const source = String(
          income.source || ""
        ).toLowerCase();

        const description = String(
          income.description || ""
        ).toLowerCase();

        const matchesMonth =
          !selectedMonth || date.startsWith(selectedMonth);

        const matchesSearch =
          !query ||
          source.includes(query) ||
          description.includes(query);

        return matchesMonth && matchesSearch;
      })
      .sort((a, b) =>
        String(getIncomeDate(b)).localeCompare(
          String(getIncomeDate(a))
        )
      );
  }, [incomes, search, selectedMonth]);

  const monthlyTotal = useMemo(
    () =>
      incomes
        .filter((income) =>
          String(getIncomeDate(income)).startsWith(
            selectedMonth
          )
        )
        .reduce(
          (total, income) =>
            total + (Number(income.amount) || 0),
          0
        ),
    [incomes, selectedMonth]
  );

  const totalAllTime = useMemo(
    () =>
      incomes.reduce(
        (total, income) =>
          total + (Number(income.amount) || 0),
        0
      ),
    [incomes]
  );

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (income) => {
    setEditingId(income.id);
    setForm({
      amount: String(income.amount ?? ""),
      source: income.source || "",
      description: income.description || "",
      date: String(
        getIncomeDate(income) || today()
      ).slice(0, 10),
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const amount = Number(form.amount);
    const source = form.source.trim();
    const description = form.description.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    if (!source) {
      setError("Please enter an income source.");
      return;
    }

    if (!form.date) {
      setError("Please select a date.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    // Matches the Spring Boot IncomeRequest record.
    const payload = {
      amount,
      source,
      description,
      incomeDate: form.date,
    };

    try {
      if (editingId !== null) {
        await api.put(`/incomes/${editingId}`, payload);
      } else {
        await api.post("/incomes", payload);
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm());

      await loadIncomes();

      setSuccess(
        editingId !== null
          ? "Income updated successfully."
          : "Income added successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save income. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (income) => {
    const confirmed = window.confirm(
      `Delete the income record "${income.source || "Income"}"?`
    );

    if (!confirmed) return;

    setDeletingId(income.id);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/incomes/${income.id}`);
      await loadIncomes();
      setSuccess("Income deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete this income record."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="income-page">
      <section className="income-page-top">
        <div>
          <span className="income-eyebrow">
            MONEY MANAGEMENT
          </span>

          <h2>Income Management</h2>

          <p>
            Record and manage your earnings, allowance,
            scholarships, and other income.
          </p>
        </div>

        <button
          type="button"
          className="income-primary-button"
          onClick={openAddModal}
        >
          <Plus size={19} />
          Add Income
        </button>
      </section>

      {error && !modalOpen && (
        <div
          className="income-alert income-alert-error"
          role="alert"
        >
          <CircleAlert size={19} />
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
          className="income-alert income-alert-success"
          role="status"
        >
          <TrendingUp size={19} />
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

      <section className="income-stats">
        <article className="income-stat-card">
          <div className="income-stat-icon income-icon-indigo">
            <Wallet size={23} />
          </div>

          <p>Total Income (All Time)</p>
          <h3>{formatMoney(totalAllTime)}</h3>
          <span>Across all recorded income</span>
        </article>

        <article className="income-stat-card">
          <div className="income-stat-icon income-icon-green">
            <TrendingUp size={23} />
          </div>

          <p>Selected Month Income</p>
          <h3>{formatMoney(monthlyTotal)}</h3>
          <span>Income for {selectedMonth}</span>
        </article>

        <article className="income-stat-card">
          <div className="income-stat-icon income-icon-blue">
            <ArrowDownToLine size={23} />
          </div>

          <p>Income Records</p>
          <h3>{incomes.length}</h3>
          <span>Total recorded entries</span>
        </article>
      </section>

      <section className="income-table-panel">
        <div className="income-table-header">
          <div>
            <h3>Income History</h3>
            <p>View, edit, and manage your records</p>
          </div>

          <button
            type="button"
            className="income-refresh-button"
            onClick={loadIncomes}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <div className="income-filters">
          <label className="income-search">
            <Search size={19} />

            <input
              type="search"
              placeholder="Search income records..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <label className="income-month-filter">
            <CalendarDays size={18} />

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(event.target.value)
              }
              aria-label="Filter income by month"
            />
          </label>
        </div>

        {loading ? (
          <div className="income-empty-state">
            <LoaderCircle
              size={32}
              className="income-loading-icon"
            />
            <h4>Loading income records...</h4>
          </div>
        ) : filteredIncomes.length === 0 ? (
          <div className="income-empty-state">
            <div className="income-empty-icon">
              <IndianRupee size={29} />
            </div>

            <h4>No income records found</h4>

            <p>
              {incomes.length === 0
                ? "Add your first income to start tracking your money."
                : "Try changing the selected month or search."}
            </p>

            {incomes.length === 0 && (
              <button
                type="button"
                className="income-primary-button"
                onClick={openAddModal}
              >
                <Plus size={18} />
                Add First Income
              </button>
            )}
          </div>
        ) : (
          <div className="income-table-scroll">
            <table className="income-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredIncomes.map((income) => (
                  <tr key={income.id}>
                    <td>
                      <div className="income-source-cell">
                        <span className="income-source-icon">
                          <TrendingUp size={18} />
                        </span>

                        <strong>
                          {income.source || "Income"}
                        </strong>
                      </div>
                    </td>

                    <td className="income-description-cell">
                      {income.description || "—"}
                    </td>

                    <td>
                      {formatDate(getIncomeDate(income))}
                    </td>

                    <td>
                      <strong className="income-amount">
                        +{formatMoney(income.amount)}
                      </strong>
                    </td>

                    <td>
                      <div className="income-row-actions">
                        <button
                          type="button"
                          className="income-edit-button"
                          onClick={() => openEditModal(income)}
                          aria-label="Edit income"
                          title="Edit"
                        >
                          <Edit3 size={17} />
                        </button>

                        <button
                          type="button"
                          className="income-delete-button"
                          onClick={() => handleDelete(income)}
                          disabled={deletingId === income.id}
                          aria-label="Delete income"
                          title="Delete"
                        >
                          {deletingId === income.id ? (
                            <LoaderCircle
                              size={17}
                              className="income-loading-icon"
                            />
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="income-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="income-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="income-modal-title"
          >
            <div className="income-modal-header">
              <div>
                <span className="income-eyebrow">
                  INCOME DETAILS
                </span>

                <h3 id="income-modal-title">
                  {editingId !== null
                    ? "Edit Income"
                    : "Add New Income"}
                </h3>

                <p>
                  {editingId !== null
                    ? "Update your income information."
                    : "Record money you've received."}
                </p>
              </div>

              <button
                type="button"
                className="income-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div
                className="income-alert income-alert-error"
                role="alert"
              >
                <CircleAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            <form
              className="income-form"
              onSubmit={handleSubmit}
            >
              <label>
                <span className="income-field-label">
                  Amount (₹)
                  <span className="income-required">*</span>
                </span>

                <input
                  type="number"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={form.amount}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                <span className="income-field-label">
                  Income Source
                  <span className="income-required">*</span>
                </span>

                <input
                  type="text"
                  name="source"
                  placeholder="e.g. Monthly Allowance"
                  maxLength={100}
                  value={form.source}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                <span className="income-field-label">
                  Date
                  <span className="income-required">*</span>
                </span>

                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                <span className="income-field-label">
                  Description
                </span>

                <textarea
                  name="description"
                  placeholder="Optional notes about this income..."
                  rows={3}
                  value={form.description}
                  onChange={handleChange}
                />
              </label>

              <div className="income-modal-footer">
                <button
                  type="button"
                  className="income-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="income-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle
                      size={18}
                      className="income-loading-icon"
                    />
                  ) : (
                    <Plus size={18} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Update Income"
                    : "Save Income"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
