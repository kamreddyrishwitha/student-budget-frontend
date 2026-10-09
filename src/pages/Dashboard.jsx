
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  IndianRupee,
  LoaderCircle,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/Dashboard.css";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const numberValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      const result = Number(value);
      if (Number.isFinite(result)) return result;
    }
  }
  return 0;
};

const arrayValue = (...values) =>
  values.find((value) => Array.isArray(value)) || [];

const monthName = (month, year) =>
  new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

const formatDate = (value) => {
  if (!value) return "No date";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

function normalizeDashboard(response, month, year) {
  const data = response?.data ?? response ?? {};
  const summary = data.summary || data.overview || data;

  const totalIncome = numberValue(
    summary.totalIncome,
    summary.monthlyIncome,
    summary.income
  );

  const totalExpenses = numberValue(
    summary.totalExpenses,
    summary.totalExpense,
    summary.monthlyExpenses,
    summary.expenses
  );

  const balance = numberValue(
    summary.balance,
    summary.totalBalance,
    summary.remainingBalance,
    totalIncome - totalExpenses
  );

  const savings = numberValue(
    summary.savings,
    summary.totalSavings,
    summary.netSavings,
    totalIncome - totalExpenses
  );

  // FIX 1: Include "categorySpending" from the Spring Boot API.
  const rawCategories = arrayValue(
    data.categorySpending,
    data.categoryBreakdown,
    data.expensesByCategory,
    data.categoryExpenses,
    data.spendingByCategory,
    data.categories
  );

  const categories = rawCategories
    .map((item, index) => ({
      name:
        item.categoryName ||
        item.category?.name ||
        item.name ||
        (typeof item.category === "string" ? item.category : null) ||
        `Category ${index + 1}`,
      value: numberValue(
        item.amount,
        item.total,
        item.value,
        item.totalAmount
      ),
    }))
    .filter((item) => item.value > 0);

  const rawChart = arrayValue(
    data.monthlyTrend,
    data.monthlyTrends,
    data.incomeExpenseChart,
    data.chartData,
    data.trends,
    data.monthlyData
  );

  let chart = rawChart.map((item, index) => ({
    name:
      item.monthName ||
      item.month ||
      item.label ||
      item.name ||
      `Period ${index + 1}`,
    income: numberValue(
      item.income,
      item.totalIncome,
      item.incomeAmount
    ),
    expenses: numberValue(
      item.expenses,
      item.totalExpenses,
      item.expense,
      item.expenseAmount
    ),
  }));

  // FIX 2: The API currently returns monthly totals, not trend data.
  // Show a single monthly comparison point instead of an empty chart.
  if (chart.length === 0 && (totalIncome > 0 || totalExpenses > 0)) {
    chart = [
      {
        name: monthName(month, year).split(" ")[0],
        income: totalIncome,
        expenses: totalExpenses,
      },
    ];
  }

  const rawTransactions = arrayValue(
    data.recentTransactions,
    data.transactions,
    data.latestTransactions
  );

  const transactions = rawTransactions.slice(0, 6).map((item, index) => {
    const type = String(
      item.type ||
      item.transactionType ||
      (item.incomeId ? "INCOME" : "EXPENSE")
    ).toUpperCase();

    return {
      id: item.id ?? index,
      type,
      title:
        item.title ||
        item.description ||
        item.categoryName ||
        item.category?.name ||
        (type === "INCOME" ? "Income" : "Expense"),
      category:
        item.categoryName ||
        item.category?.name ||
        item.category ||
        type,
      date:
        item.date ||
        item.transactionDate ||
        item.createdAt,
      amount: numberValue(item.amount, item.total),
      isIncome: type.includes("INCOME"),
    };
  });

  return {
    totalIncome,
    totalExpenses,
    balance,
    savings,
    categories,
    chart,
    transactions,
    raw: data,
  };
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  tone,
  description,
}) {
  return (
    <article className={`db-summary-card db-tone-${tone}`}>
      <div className="db-summary-top">
        <span className="db-summary-icon">
          <Icon size={21} />
        </span>
        <span className="db-summary-decoration">
          <ArrowUpRight size={18} />
        </span>
      </div>

      <div className="db-summary-content">
        <p>{title}</p>
        <h3>{money(value)}</h3>
        <span>{description}</span>
      </div>
    </article>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="db-empty">
      <div className="db-empty-icon">
        <Icon size={25} />
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/dashboard", {
          params: { month, year },
        });

        if (active) {
          setDashboard(normalizeDashboard(response.data, month, year));
        }
      } catch (err) {
        if (active) {
          setDashboard(null);
          setError(
            err.response?.data?.message ||
              "Unable to load dashboard data. Check that the Spring Boot backend is running."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDashboard();

    return () => {
      active = false;
    };
  }, [month, year, refreshKey]);

  const chartData = useMemo(
    () => dashboard?.chart || [],
    [dashboard]
  );

  const categoryData = useMemo(
    () => dashboard?.categories || [],
    [dashboard]
  );

  const firstName =
    user?.name?.trim()?.split(/\s+/)[0] || "Student";

  const changeMonth = (event) => {
    const [selectedYear, selectedMonth] =
      event.target.value.split("-").map(Number);

    if (selectedYear && selectedMonth) {
      setYear(selectedYear);
      setMonth(selectedMonth);
    }
  };

  const selectedMonth = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="db-page">
      <section className="db-intro">
        <div>
          <span className="db-eyebrow">
            FINANCIAL OVERVIEW
          </span>
          <h2>Welcome back, {firstName}!</h2>
          <p>
            Here's what's happening with your money in{" "}
            {monthName(month, year)}.
          </p>
        </div>

        <div className="db-intro-actions">
          <label className="db-month-picker">
            <CalendarDays size={18} />
            <input
              type="month"
              value={selectedMonth}
              onChange={changeMonth}
              aria-label="Select dashboard month"
            />
          </label>

          <button
            type="button"
            className="db-refresh-button"
            onClick={() => setRefreshKey((key) => key + 1)}
            aria-label="Refresh dashboard"
            title="Refresh dashboard"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </section>

      {error && (
        <div className="db-error" role="alert">
          <CircleAlert size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="db-loading">
          <LoaderCircle size={32} className="db-spin" />
          <p>Loading your financial dashboard...</p>
        </div>
      ) : dashboard ? (
        <>
          <section className="db-summary-grid">
            <SummaryCard
              title="Total Balance"
              value={dashboard.balance}
              icon={Wallet}
              tone="indigo"
              description="Available balance"
            />

            <SummaryCard
              title="Total Income"
              value={dashboard.totalIncome}
              icon={TrendingUp}
              tone="green"
              description="Income this month"
            />

            <SummaryCard
              title="Total Expenses"
              value={dashboard.totalExpenses}
              icon={TrendingDown}
              tone="rose"
              description="Spent this month"
            />

            <SummaryCard
              title="Net Savings"
              value={dashboard.savings}
              icon={PiggyBank}
              tone="amber"
              description="Income minus expenses"
            />
          </section>

          <section className="db-charts-grid">
            <article className="db-panel">
              <div className="db-panel-heading">
                <div>
                  <h3>Income vs Expenses</h3>
                  <p>Your financial activity for the selected month</p>
                </div>
                <span className="db-panel-tag">
                  Overview
                </span>
              </div>

              {chartData.length > 0 ? (
                <>
                  <div className="db-chart-legend">
                    <span>
                      <i className="db-legend-income" />
                      Income
                    </span>
                    <span>
                      <i className="db-legend-expenses" />
                      Expenses
                    </span>
                  </div>

                  <div className="db-area-chart">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <AreaChart
                        data={chartData}
                        margin={{
                          top: 15,
                          right: 8,
                          left: -12,
                          bottom: 0,
                        }}
                      >
                        <defs>
                          <linearGradient
                            id="incomeGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#6366f1"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#6366f1"
                              stopOpacity={0}
                            />
                          </linearGradient>

                          <linearGradient
                            id="expenseGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#f43f5e"
                              stopOpacity={0.12}
                            />
                            <stop
                              offset="95%"
                              stopColor="#f43f5e"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          stroke="#edf1f7"
                          strokeDasharray="4 4"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tick={{
                            fill: "#94a3b8",
                            fontSize: 11,
                          }}
                        />

                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{
                            fill: "#94a3b8",
                            fontSize: 11,
                          }}
                          tickFormatter={(value) =>
                            value >= 1000
                              ? `${(value / 1000).toFixed(0)}k`
                              : value
                          }
                        />

                        <Tooltip
                          formatter={(value) => money(value)}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e8edf5",
                            boxShadow:
                              "0 12px 30px rgba(15,23,42,.08)",
                          }}
                        />

                        <Area
                          type="monotone"
                          dataKey="income"
                          stroke="#6366f1"
                          strokeWidth={3}
                          fill="url(#incomeGradient)"
                          dot={{
                            r: 5,
                            fill: "#6366f1",
                          }}
                          activeDot={{ r: 7 }}
                        />

                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stroke="#f43f5e"
                          strokeWidth={3}
                          fill="url(#expenseGradient)"
                          dot={{
                            r: 5,
                            fill: "#f43f5e",
                          }}
                          activeDot={{ r: 7 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="No chart data yet"
                  description="Your income and expense trends will appear here when data is available."
                />
              )}
            </article>

            <article className="db-panel">
              <div className="db-panel-heading">
                <div>
                  <h3>Spending Breakdown</h3>
                  <p>Expenses by category</p>
                </div>
              </div>

              {categoryData.length > 0 ? (
                <>
                  <div className="db-donut-chart">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={72}
                          outerRadius={103}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {categoryData.map((item, index) => (
                            <Cell
                              key={`${item.name}-${index}`}
                              fill={
                                COLORS[index % COLORS.length]
                              }
                            />
                          ))}
                        </Pie>

                        <Tooltip
                          formatter={(value) => money(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="db-category-list">
                    {categoryData.slice(0, 5).map(
                      (item, index) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="db-category-item"
                        >
                          <span
                            className="db-category-dot"
                            style={{
                              background:
                                COLORS[index % COLORS.length],
                            }}
                          />

                          <span className="db-category-name">
                            {item.name}
                          </span>

                          <strong>{money(item.value)}</strong>
                        </div>
                      )
                    )}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={PiggyBank}
                  title="No spending data"
                  description="Your spending categories will appear after you record expenses."
                />
              )}
            </article>
          </section>

          <section className="db-bottom-grid">
            <article className="db-panel">
              <div className="db-panel-heading">
                <div>
                  <h3>Recent Transactions</h3>
                  <p>Your latest financial activity</p>
                </div>

                <Link
                  to="/transactions"
                  className="db-view-all"
                >
                  View all
                  <ArrowRight size={16} />
                </Link>
              </div>

              {dashboard.transactions.length > 0 ? (
                <div className="db-transaction-list">
                  {dashboard.transactions.map(
                    (transaction, index) => (
                      <div
                        key={`${transaction.type}-${transaction.id}-${index}`}
                        className="db-transaction"
                      >
                        <span
                          className={`db-transaction-icon ${
                            transaction.isIncome
                              ? "db-transaction-income"
                              : "db-transaction-expense"
                          }`}
                        >
                          {transaction.isIncome ? (
                            <ArrowDownRight size={19} />
                          ) : (
                            <ArrowUpRight size={19} />
                          )}
                        </span>

                        <div className="db-transaction-details">
                          <strong>
                            {transaction.title}
                          </strong>
                          <span>
                            {transaction.category} ·{" "}
                            {formatDate(transaction.date)}
                          </span>
                        </div>

                        <strong
                          className={
                            transaction.isIncome
                              ? "db-amount-income"
                              : "db-amount-expense"
                          }
                        >
                          {transaction.isIncome ? "+" : "-"}
                          {money(transaction.amount)}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={IndianRupee}
                  title="No transactions yet"
                  description="Your latest income and expenses will appear here."
                />
              )}
            </article>

            <article className="db-panel db-quick-panel">
              <div className="db-panel-heading">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Manage your finances faster</p>
                </div>
              </div>

              <Link
                to="/income"
                className="db-quick-action"
              >
                <span className="db-quick-icon db-quick-green">
                  <TrendingUp size={20} />
                </span>

                <span>
                  <strong>Add Income</strong>
                  <small>Record money received</small>
                </span>

                <ArrowRight size={18} />
              </Link>

              <Link
                to="/expenses"
                className="db-quick-action"
              >
                <span className="db-quick-icon db-quick-rose">
                  <TrendingDown size={20} />
                </span>

                <span>
                  <strong>Add Expense</strong>
                  <small>Track your spending</small>
                </span>

                <ArrowRight size={18} />
              </Link>

              <Link
                to="/budgets"
                className="db-quick-action"
              >
                <span className="db-quick-icon db-quick-indigo">
                  <PiggyBank size={20} />
                </span>

                <span>
                  <strong>Manage Budgets</strong>
                  <small>Plan your monthly spending</small>
                </span>

                <ArrowRight size={18} />
              </Link>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
