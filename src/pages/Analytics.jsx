
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  LoaderCircle,
  PiggyBank,
  RefreshCw,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../services/api";
import "../styles/Analytics.css";

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

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#f97316",
  "#14b8a6",
];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const compactMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

const percent = (value) =>
  `${(Number(value) || 0).toFixed(1)}%`;

const numberValue = (value) => Number(value) || 0;

const getErrorMessage = (error) => {
  const data = error.response?.data;

  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;

  return "Unable to load analytics. Please try again.";
};

function MetricCard({
  icon: Icon,
  tone,
  label,
  value,
  subtitle,
}) {
  return (
    <article className="analytics-metric-card">
      <div className={`analytics-metric-icon ${tone}`}>
        <Icon size={23} />
      </div>

      <p>{label}</p>
      <h3>{value}</h3>
      <span>{subtitle}</span>
    </article>
  );
}

function ChartEmpty({ message }) {
  return (
    <div className="analytics-chart-empty">
      <div className="analytics-chart-empty-icon">
        <ChartNoAxesCombined size={30} />
      </div>
      <h4>No chart data available</h4>
      <p>{message}</p>
    </div>
  );
}

export default function Analytics() {
  const currentDate = new Date();

  const [month, setMonth] = useState(
    String(currentDate.getMonth() + 1)
  );
  const [year, setYear] = useState(
    String(currentDate.getFullYear())
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/analytics", {
        params: {
          month: Number(month),
          year: Number(year),
        },
      });

      setData(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const income = numberValue(data?.totalIncome);
  const expenses = numberValue(data?.totalExpenses);
  const savings = numberValue(data?.savings);
  const savingsRate = numberValue(data?.savingsRate);

  const budget = numberValue(data?.budgetAmount);
  const remainingBudget = numberValue(data?.remainingBudget);
  const budgetUsage = numberValue(data?.budgetUsagePercentage);

  const categoryData = useMemo(() => {
    if (!Array.isArray(data?.categorySpending)) return [];

    return data.categorySpending
      .map((item) => ({
        id: item.categoryId,
        name: item.categoryName || "Uncategorized",
        value: numberValue(item.amount),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const totalCategorySpending = categoryData.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const trendData = useMemo(() => {
    if (!Array.isArray(data?.monthlyTrend)) return [];

    return [...data.monthlyTrend]
      .map((item) => ({
        month: item.month,
        year: item.year,
        monthName:
          item.monthName ||
          MONTHS[(Number(item.month) || 1) - 1] ||
          "Unknown",
        income: numberValue(item.income),
        expenses: numberValue(item.expenses),
        savings: numberValue(item.savings),
      }))
      .sort(
        (a, b) =>
          Number(a.year) - Number(b.year) ||
          Number(a.month) - Number(b.month)
      );
  }, [data]);

  const incomeExpenseData = [
    { name: "Income", value: income },
    { name: "Expenses", value: expenses },
  ];

  const budgetStatus = String(
    data?.budgetStatus || "NOT_SET"
  ).toUpperCase();

  const budgetProgress = Math.min(
    Math.max(budgetUsage, 0),
    100
  );

  const statusLabel = budgetStatus
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );

  const years = Array.from(
    { length: 8 },
    (_, index) => currentDate.getFullYear() + 1 - index
  );

  return (
    <div className="analytics-page">
      <section className="analytics-heading">
        <div>
          <span className="analytics-eyebrow">
            FINANCIAL INSIGHTS
          </span>

          <h2>Analytics & Insights</h2>

          <p>
            Understand your spending patterns, savings,
            and financial progress.
          </p>
        </div>

        <div className="analytics-heading-actions">
          <label className="analytics-select">
            <CalendarDays size={17} />

            <select
              aria-label="Select month"
              value={month}
              onChange={(event) =>
                setMonth(event.target.value)
              }
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="analytics-select">
            <select
              aria-label="Select year"
              value={year}
              onChange={(event) =>
                setYear(event.target.value)
              }
            >
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="analytics-refresh-button"
            onClick={loadAnalytics}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="analytics-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="analytics-loading">
          <LoaderCircle
            size={34}
            className="analytics-spin"
          />
          <p>Loading your financial analytics...</p>
        </div>
      ) : (
        <>
          <section className="analytics-metrics">
            <MetricCard
              icon={ArrowDownLeft}
              tone="green"
              label="Total Income"
              value={money(income)}
              subtitle="Money received this month"
            />

            <MetricCard
              icon={ArrowUpRight}
              tone="red"
              label="Total Expenses"
              value={money(expenses)}
              subtitle="Money spent this month"
            />

            <MetricCard
              icon={PiggyBank}
              tone="purple"
              label="Total Savings"
              value={money(savings)}
              subtitle="Income minus expenses"
            />

            <MetricCard
              icon={TrendingUp}
              tone="amber"
              label="Savings Rate"
              value={percent(savingsRate)}
              subtitle="Percentage of income saved"
            />
          </section>

          <section className="analytics-chart-grid">
            <article className="analytics-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h3>Income vs Expenses</h3>
                  <p>
                    Your financial activity for{" "}
                    {MONTHS[Number(month) - 1]} {year}.
                  </p>
                </div>

                <Activity size={20} />
              </div>

              {income === 0 && expenses === 0 ? (
                <ChartEmpty message="Add income or expenses to see your comparison." />
              ) : (
                <div className="analytics-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={incomeExpenseData}
                      margin={{
                        top: 15,
                        right: 15,
                        bottom: 5,
                        left: 0,
                      }}
                    >
                      <CartesianGrid
                        stroke="#edf2f7"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        tickFormatter={compactMoney}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        formatter={(value) => money(value)}
                      />

                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Amount"
                        stroke="#6366f1"
                        fill="#c7d2fe"
                        fillOpacity={0.65}
                        strokeWidth={3}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>

            <article className="analytics-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h3>Category Spending</h3>
                  <p>
                    See where your money goes.
                  </p>
                </div>

                <Wallet size={20} />
              </div>

              {categoryData.length === 0 ? (
                <ChartEmpty message="Category spending will appear after you add expenses." />
              ) : (
                <div className="analytics-category-layout">
                  <div className="analytics-pie-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={100}
                          paddingAngle={3}
                        >
                          {categoryData.map((item, index) => (
                            <Cell
                              key={`${item.id}-${index}`}
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

                  <div className="analytics-category-legend">
                    {categoryData.map((item, index) => (
                      <div
                        className="analytics-category-item"
                        key={`${item.id}-${index}`}
                      >
                        <div className="analytics-category-name">
                          <span
                            className="analytics-category-dot"
                            style={{
                              backgroundColor:
                                COLORS[index % COLORS.length],
                            }}
                          />

                          <span>{item.name}</span>
                        </div>

                        <div>
                          <strong>{money(item.value)}</strong>
                          <span>
                            {totalCategorySpending > 0
                              ? percent(
                                  (item.value /
                                    totalCategorySpending) *
                                    100
                                )
                              : "0.0%"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </section>

          <section className="analytics-chart-grid">
            <article className="analytics-panel analytics-trend-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h3>Monthly Financial Trends</h3>
                  <p>
                    Compare income, expenses, and savings
                    over time.
                  </p>
                </div>

                <ChartNoAxesCombined size={20} />
              </div>

              {trendData.length === 0 ? (
                <ChartEmpty message="Monthly trends will appear when financial records are available." />
              ) : (
                <div className="analytics-trend-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={trendData}
                      margin={{
                        top: 15,
                        right: 15,
                        bottom: 5,
                        left: 0,
                      }}
                    >
                      <CartesianGrid
                        stroke="#edf2f7"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="monthName"
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) =>
                          String(value).slice(0, 3)
                        }
                      />

                      <YAxis
                        tickFormatter={compactMoney}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        formatter={(value) => money(value)}
                      />

                      <Legend />

                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#10b981"
                        fill="#d1fae5"
                        fillOpacity={0.55}
                        strokeWidth={2}
                      />

                      <Line
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#f43f5e"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                      />

                      <Line
                        type="monotone"
                        dataKey="savings"
                        name="Savings"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>

            <article className="analytics-panel analytics-budget-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h3>Budget Performance</h3>
                  <p>
                    Track your monthly spending limit.
                  </p>
                </div>

                <Target size={20} />
              </div>

              <div className="analytics-budget-content">
                <div className="analytics-budget-amount">
                  <span>Monthly Budget</span>
                  <h3>{money(budget)}</h3>
                </div>

                <div className="analytics-budget-progress-heading">
                  <span>Budget Used</span>
                  <strong>{percent(budgetUsage)}</strong>
                </div>

                <div
                  className="analytics-budget-progress"
                  role="progressbar"
                  aria-valuenow={budgetProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Budget utilization"
                >
                  <div
                    className={`analytics-budget-progress-fill ${
                      budgetUsage >= 100
                        ? "over"
                        : budgetUsage >= 80
                        ? "warning"
                        : ""
                    }`}
                    style={{
                      width: `${budgetProgress}%`,
                    }}
                  />
                </div>

                <div className="analytics-budget-details">
                  <div>
                    <span>Spent</span>
                    <strong>{money(expenses)}</strong>
                  </div>

                  <div>
                    <span>Remaining</span>
                    <strong>{money(remainingBudget)}</strong>
                  </div>
                </div>

                <div className="analytics-budget-status">
                  <CheckCircle2 size={17} />
                  <span>
                    {budget > 0
                      ? `Budget status: ${statusLabel}`
                      : "No budget set for this month"}
                  </span>
                </div>
              </div>
            </article>
          </section>

          <section className="analytics-insight-strip">
            <div className="analytics-insight-icon">
              <PiggyBank size={23} />
            </div>

            <div>
              <h3>Financial Snapshot</h3>
              <p>
                For {MONTHS[Number(month) - 1]} {year},
                you received <strong>{money(income)}</strong>,
                spent <strong>{money(expenses)}</strong>,
                and saved <strong>{money(savings)}</strong>.
                Your savings rate is{" "}
                <strong>{percent(savingsRate)}</strong>.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
