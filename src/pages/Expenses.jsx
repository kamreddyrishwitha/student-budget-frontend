
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CircleAlert,
  Edit3,
  IndianRupee,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  TrendingDown,
  Wallet,
  X,
} from "lucide-react";

import api from "../services/api";
import "../styles/Expenses.css";

const getToday = () => {
  const date = new Date();
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return local.toISOString().slice(0, 10);
};

const createEmptyForm = () => ({
  title: "",
  amount: "",
  description: "",
  expenseDate: getToday(),
  categoryId: "",
});

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const extractList = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const expenseDate = (expense) =>
  expense.expenseDate || expense.date || "";

const expenseCategoryId = (expense) =>
  expense.categoryId ?? expense.category?.id ?? "";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    getToday().slice(0, 7)
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [expenseResponse, categoryResponse] =
        await Promise.all([
          api.get("/expenses"),
          api.get("/categories"),
        ]);

      setExpenses(extractList(expenseResponse.data, "expenses"));
      setCategories(
        extractList(categoryResponse.data, "categories")
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load expenses or categories. Check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryMap = useMemo(() => {
    const map = new Map();

    categories.forEach((category) => {
      map.set(String(category.id), category.name);
    });

    return map;
  }, [categories]);

  const getCategoryName = (expense) => {
    if (expense.category?.name) {
      return expense.category.name;
    }

    if (expense.categoryName) {
      return expense.categoryName;
    }

    return (
      categoryMap.get(String(expenseCategoryId(expense))) ||
      "Uncategorized"
    );
  };

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses
      .filter((expense) => {
        const matchesMonth =
          !selectedMonth ||
          String(expenseDate(expense)).startsWith(
            selectedMonth
          );

        const categoryName = (
          expense.category?.name ||
          expense.categoryName ||
          categoryMap.get(
            String(expenseCategoryId(expense))
          ) ||
          ""
        ).toLowerCase();

        const matchesSearch =
          !query ||
          String(expense.title || "")
            .toLowerCase()
            .includes(query) ||
          String(expense.description || "")
            .toLowerCase()
            .includes(query) ||
          categoryName.includes(query);

        return matchesMonth && matchesSearch;
      })
      .sort((a, b) =>
        String(expenseDate(b)).localeCompare(
          String(expenseDate(a))
        )
      );
  }, [expenses, selectedMonth, search, categoryMap]);

  const monthlyExpenses = useMemo(
    () =>
      expenses
        .filter((expense) =>
          String(expenseDate(expense)).startsWith(
            selectedMonth
          )
        )
        .reduce(
          (sum, expense) =>
            sum + (Number(expense.amount) || 0),
          0
        ),
    [expenses, selectedMonth]
  );

  const allTimeExpenses = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) =>
          sum + (Number(expense.amount) || 0),
        0
      ),
    [expenses]
  );

  const openAddModal = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (expense) => {
    setEditingId(expense.id);

    setForm({
      title: expense.title || "",
      amount: String(expense.amount ?? ""),
      description: expense.description || "",
      expenseDate: String(
        expenseDate(expense) || getToday()
      ).slice(0, 10),
      categoryId: String(expenseCategoryId(expense)),
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm(createEmptyForm());
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

    const title = form.title.trim();
    const description = form.description.trim();
    const amount = Number(form.amount);
    const categoryId = Number(form.categoryId);

    if (!title || title.length > 150) {
      setError("Enter a title of 1 to 150 characters.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (description.length > 500) {
      setError("Description cannot exceed 500 characters.");
      return;
    }

    if (!form.expenseDate) {
      setError("Please select an expense date.");
      return;
    }

    if (
      !Number.isSafeInteger(categoryId) ||
      categoryId <= 0 ||
      !categories.some(
        (category) => Number(category.id) === categoryId
      )
    ) {
      setError("Please select a valid category.");
      return;
    }

    // Exact field names from ExpenseRequest.java
    const payload = {
      title,
      amount,
      description,
      expenseDate: form.expenseDate,
      categoryId,
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingId !== null) {
        await api.put(
          `/expenses/${editingId}`,
          payload
        );
      } else {
        await api.post("/expenses", payload);
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(createEmptyForm());

      await loadData();

      setSuccess(
        editingId !== null
          ? "Expense updated successfully."
          : "Expense added successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save expense. Please check the details and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense) => {
    const confirmed = window.confirm(
      `Delete the expense "${expense.title}"?`
    );

    if (!confirmed) return;

    setDeletingId(expense.id);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/expenses/${expense.id}`);
      await loadData();
      setSuccess("Expense deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete this expense."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="expenses-page">
      <section className="expenses-top">
        <div>
          <span className="expenses-eyebrow">
            SPENDING MANAGEMENT
          </span>

          <h2>Expenses Management</h2>

          <p>
            Keep track of your daily spending and
            manage expenses by category.
          </p>
        </div>

        <button
          type="button"
          className="expenses-primary-button"
          onClick={openAddModal}
        >
          <Plus size={19} />
          Add Expense
        </button>
      </section>

      {error && !modalOpen && (
        <div
          className="expenses-alert expenses-alert-error"
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
          className="expenses-alert expenses-alert-success"
          role="status"
        >
          <TrendingDown size={19} />
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

      <section className="expenses-stats">
        <article className="expenses-stat-card">
          <div className="expenses-stat-icon expenses-icon-rose">
            <Wallet size={23} />
          </div>

          <p>Total Expenses (All Time)</p>
          <h3>{currency(allTimeExpenses)}</h3>
          <span>Across all recorded expenses</span>
        </article>

        <article className="expenses-stat-card">
          <div className="expenses-stat-icon expenses-icon-orange">
            <TrendingDown size={23} />
          </div>

          <p>Selected Month Expenses</p>
          <h3>{currency(monthlyExpenses)}</h3>
          <span>Expenses for {selectedMonth}</span>
        </article>

        <article className="expenses-stat-card">
          <div className="expenses-stat-icon expenses-icon-indigo">
            <IndianRupee size={23} />
          </div>

          <p>Expense Records</p>
          <h3>{expenses.length}</h3>
          <span>Total recorded entries</span>
        </article>
      </section>

      <section className="expenses-panel">
        <div className="expenses-panel-header">
          <div>
            <h3>Expense History</h3>
            <p>View, edit, and manage your spending</p>
          </div>

          <button
            type="button"
            className="expenses-refresh-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <div className="expenses-filters">
          <label className="expenses-search">
            <Search size={19} />

            <input
              type="search"
              placeholder="Search expenses..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <label className="expenses-month-filter">
            <CalendarDays size={18} />

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(event.target.value)
              }
              aria-label="Filter expenses by month"
            />
          </label>
        </div>

        {loading ? (
          <div className="expenses-empty">
            <LoaderCircle
              size={32}
              className="expenses-spin"
            />
            <h4>Loading expenses...</h4>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="expenses-empty">
            <div className="expenses-empty-icon">
              <TrendingDown size={29} />
            </div>

            <h4>No expenses found</h4>

            <p>
              {expenses.length === 0
                ? "Add your first expense to start tracking your spending."
                : "Try changing your search or selected month."}
            </p>

            {expenses.length === 0 && (
              <button
                type="button"
                className="expenses-primary-button"
                onClick={openAddModal}
              >
                <Plus size={18} />
                Add First Expense
              </button>
            )}
          </div>
        ) : (
          <div className="expenses-table-scroll">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <div className="expenses-title-cell">
                        <span className="expenses-row-icon">
                          <TrendingDown size={18} />
                        </span>

                        <strong>{expense.title}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="expenses-category-badge">
                        {getCategoryName(expense)}
                      </span>
                    </td>

                    <td className="expenses-description">
                      {expense.description || "—"}
                    </td>

                    <td>
                      {formatDate(expenseDate(expense))}
                    </td>

                    <td>
                      <strong className="expenses-amount">
                        -{currency(expense.amount)}
                      </strong>
                    </td>

                    <td>
                      <div className="expenses-row-actions">
                        <button
                          type="button"
                          className="expenses-edit-button"
                          onClick={() =>
                            openEditModal(expense)
                          }
                          aria-label={`Edit ${expense.title}`}
                          title="Edit"
                        >
                          <Edit3 size={17} />
                        </button>

                        <button
                          type="button"
                          className="expenses-delete-button"
                          onClick={() =>
                            handleDelete(expense)
                          }
                          disabled={
                            deletingId === expense.id
                          }
                          aria-label={`Delete ${expense.title}`}
                          title="Delete"
                        >
                          {deletingId === expense.id ? (
                            <LoaderCircle
                              size={17}
                              className="expenses-spin"
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
          className="expenses-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="expenses-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expenses-modal-title"
          >
            <div className="expenses-modal-header">
              <div>
                <span className="expenses-eyebrow">
                  EXPENSE DETAILS
                </span>

                <h3 id="expenses-modal-title">
                  {editingId !== null
                    ? "Edit Expense"
                    : "Add New Expense"}
                </h3>

                <p>
                  {editingId !== null
                    ? "Update your expense information."
                    : "Record your latest spending."}
                </p>
              </div>

              <button
                type="button"
                className="expenses-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div
                className="expenses-alert expenses-alert-error"
                role="alert"
              >
                <CircleAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            {categories.length === 0 && (
              <div className="expenses-category-notice">
                <Tags size={19} />
                <span>
                  No categories are available.
                  Create a category before adding an expense.
                </span>
              </div>
            )}

            <form
              className="expenses-form"
              onSubmit={handleSubmit}
            >
              <label>
                <span className="expenses-field-label">
                  Expense Title
                  <span className="expenses-required">*</span>
                </span>

                <input
                  type="text"
                  name="title"
                  maxLength={150}
                  placeholder="e.g. Lunch at college"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                <span className="expenses-field-label">
                  Amount (₹)
                  <span className="expenses-required">*</span>
                </span>

                <input
                  type="number"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 250"
                  value={form.amount}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                <span className="expenses-field-label">
                  Category
                  <span className="expenses-required">*</span>
                </span>

                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select a category
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="expenses-field-label">
                  Expense Date
                  <span className="expenses-required">*</span>
                </span>

                <input
                  type="date"
                  name="expenseDate"
                  value={form.expenseDate}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                <span className="expenses-field-label">
                  Description
                </span>

                <textarea
                  name="description"
                  rows={3}
                  maxLength={500}
                  placeholder="Optional notes..."
                  value={form.description}
                  onChange={handleChange}
                />
              </label>

              <div className="expenses-modal-footer">
                <button
                  type="button"
                  className="expenses-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="expenses-primary-button"
                  disabled={
                    saving || categories.length === 0
                  }
                >
                  {saving ? (
                    <LoaderCircle
                      size={18}
                      className="expenses-spin"
                    />
                  ) : (
                    <Plus size={18} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Update Expense"
                    : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
