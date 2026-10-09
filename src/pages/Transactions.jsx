
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  LoaderCircle,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";

import api from "../services/api";
import "../styles/Transactions.css";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PAGE_SIZE = 10;

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const displayDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const errorMessage = (error) => {
  const data = error.response?.data;

  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;

  return "Unable to load transactions. Please try again.";
};

const normalizeType = (type) => String(type || "").toUpperCase();

const escapeCsv = (value) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function Transactions() {
  const now = new Date();

  const [type, setType] = useState("ALL");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [categoryId, setCategoryId] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (type !== "ALL") params.type = type;
      if (month !== "ALL") params.month = Number(month);
      if (year !== "ALL") params.year = Number(year);
      if (categoryId) params.categoryId = Number(categoryId);

      const response = await api.get("/transactions", { params });

      setTransactions(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setError(errorMessage(err));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [type, month, year, categoryId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get("/categories");

        setCategories(
          Array.isArray(response.data) ? response.data : []
        );
      } catch {
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [type, month, year, categoryId, search]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...transactions]
      .filter((transaction) => {
        if (!query) return true;

        return [
          transaction.title,
          transaction.category,
          transaction.description,
          transaction.type,
          transaction.amount,
          transaction.transactionDate,
        ]
          .some((value) =>
            String(value ?? "").toLowerCase().includes(query)
          );
      })
      .sort((a, b) => {
        const dateComparison = String(
          b.transactionDate || ""
        ).localeCompare(String(a.transactionDate || ""));

        if (dateComparison !== 0) return dateComparison;

        return String(b.createdAt || "").localeCompare(
          String(a.createdAt || "")
        );
      });
  }, [transactions, search]);

  const totalIncome = filtered
    .filter((item) => normalizeType(item.type) === "INCOME")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalExpense = filtered
    .filter((item) => normalizeType(item.type) === "EXPENSE")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const netAmount = totalIncome - totalExpense;

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const safePage = Math.min(page, totalPages);

  const visibleTransactions = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const resetFilters = () => {
    const current = new Date();

    setType("ALL");
    setMonth(String(current.getMonth() + 1));
    setYear(String(current.getFullYear()));
    setCategoryId("");
    setSearch("");
    setPage(1);
  };

  const exportCsv = () => {
    if (filtered.length === 0) return;

    const headers = [
      "Date",
      "Type",
      "Title",
      "Category",
      "Description",
      "Amount",
    ];

    const rows = filtered.map((transaction) => [
      transaction.transactionDate,
      transaction.type,
      transaction.title,
      transaction.category,
      transaction.description,
      transaction.amount,
    ]);

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `studentbudget-transactions-${year}-${month}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="transactions-page">
      <section className="transactions-heading">
        <div>
          <span className="transactions-eyebrow">
            FINANCIAL ACTIVITY
          </span>

          <h2>Transactions</h2>

          <p>
            View, search, and track all your income and expenses
            in one place.
          </p>
        </div>

        <button
          type="button"
          className="transactions-export-button"
          onClick={exportCsv}
          disabled={loading || filtered.length === 0}
        >
          <Download size={18} />
          Export CSV
        </button>
      </section>

      {error && (
        <div className="transactions-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={loadTransactions}
            aria-label="Retry loading transactions"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      )}

      <section className="transactions-stats">
        <article className="transactions-stat">
          <div className="transactions-stat-icon purple">
            <Activity size={22} />
          </div>

          <p>Total Transactions</p>
          <h3>{filtered.length}</h3>
          <span>Matching current filters</span>
        </article>

        <article className="transactions-stat">
          <div className="transactions-stat-icon green">
            <ArrowDownLeft size={22} />
          </div>

          <p>Total Income</p>
          <h3>{money(totalIncome)}</h3>
          <span>Money received</span>
        </article>

        <article className="transactions-stat">
          <div className="transactions-stat-icon red">
            <ArrowUpRight size={22} />
          </div>

          <p>Total Expenses</p>
          <h3>{money(totalExpense)}</h3>
          <span>Money spent</span>
        </article>

        <article className="transactions-stat">
          <div className="transactions-stat-icon amber">
            <Wallet size={22} />
          </div>

          <p>Net Cash Flow</p>
          <h3 className={netAmount < 0 ? "negative" : ""}>
            {money(netAmount)}
          </h3>
          <span>Income minus expenses</span>
        </article>
      </section>

      <section className="transactions-panel">
        <div className="transactions-panel-heading">
          <div>
            <h3>Transaction History</h3>
            <p>
              Filter your records by date, type, or category.
            </p>
          </div>

          <button
            type="button"
            className="transactions-refresh-button"
            onClick={loadTransactions}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="transactions-filters">
          <label className="transactions-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Search transactions..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <label className="transactions-filter-field">
            <Filter size={16} />
            <select
              aria-label="Transaction type"
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
            >
              <option value="ALL">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expenses</option>
            </select>
          </label>

          <label className="transactions-filter-field">
            <CalendarDays size={16} />

            <select
              aria-label="Month"
              value={month}
              onChange={(event) =>
                setMonth(event.target.value)
              }
            >
              <option value="ALL">All Months</option>

              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="transactions-filter-field">
            <select
              aria-label="Year"
              value={year}
              onChange={(event) =>
                setYear(event.target.value)
              }
            >
              <option value="ALL">All Years</option>

              {Array.from(
                { length: 8 },
                (_, index) => now.getFullYear() + 1 - index
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="transactions-filter-field">
            <select
              aria-label="Category"
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value)
              }
            >
              <option value="">All Categories</option>

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

          <button
            type="button"
            className="transactions-clear-button"
            onClick={resetFilters}
            title="Reset filters"
          >
            <X size={16} />
            Reset
          </button>
        </div>

        {loading ? (
          <div className="transactions-empty">
            <LoaderCircle
              size={32}
              className="transactions-spin"
            />
            <p>Loading transactions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="transactions-empty">
            <div className="transactions-empty-icon">
              <Activity size={32} />
            </div>

            <h4>No transactions found</h4>

            <p>
              Try adjusting your filters or add a new
              income or expense.
            </p>

            <div className="transactions-empty-links">
              <Link to="/income">Add Income</Link>
              <Link to="/expenses">Add Expense</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="transactions-table-wrapper">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>TRANSACTION</th>
                    <th>CATEGORY</th>
                    <th>DATE</th>
                    <th>TYPE</th>
                    <th>AMOUNT</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleTransactions.map((transaction) => {
                    const isIncome =
                      normalizeType(transaction.type) === "INCOME";

                    return (
                      <tr
                        key={`${transaction.type}-${transaction.id}`}
                      >
                        <td>
                          <div className="transactions-name-cell">
                            <div
                              className={`transactions-item-icon ${
                                isIncome ? "income" : "expense"
                              }`}
                            >
                              {isIncome ? (
                                <ArrowDownLeft size={18} />
                              ) : (
                                <ArrowUpRight size={18} />
                              )}
                            </div>

                            <div>
                              <strong>
                                {transaction.title || "Untitled"}
                              </strong>

                              <span>
                                {transaction.description ||
                                  "No description"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="transactions-category">
                            {transaction.category ||
                              "Uncategorized"}
                          </span>
                        </td>

                        <td className="transactions-date">
                          {displayDate(
                            transaction.transactionDate
                          )}
                        </td>

                        <td>
                          <span
                            className={`transactions-type ${
                              isIncome ? "income" : "expense"
                            }`}
                          >
                            {isIncome ? "Income" : "Expense"}
                          </span>
                        </td>

                        <td>
                          <strong
                            className={`transactions-amount ${
                              isIncome ? "income" : "expense"
                            }`}
                          >
                            {isIncome ? "+" : "−"}
                            {money(transaction.amount)}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="transactions-pagination">
              <span>
                Showing{" "}
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(
                  safePage * PAGE_SIZE,
                  filtered.length
                )}{" "}
                of {filtered.length} transactions
              </span>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setPage((previous) =>
                      Math.max(1, previous - 1)
                    )
                  }
                  disabled={safePage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>

                <span>
                  {safePage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((previous) =>
                      Math.min(totalPages, previous + 1)
                    )
                  }
                  disabled={safePage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
