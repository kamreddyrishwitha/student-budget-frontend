
import { NavLink, useNavigate } from "react-router-dom";
import {
  Wallet,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Tags,
  PiggyBank,
  Users,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Bell,
  UserRound,
  Settings,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const mainLinks = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Income",
    path: "/income",
    icon: TrendingUp,
  },
  {
    label: "Expenses",
    path: "/expenses",
    icon: TrendingDown,
  },
  {
    label: "Categories",
    path: "/categories",
    icon: Tags,
  },
  {
    label: "Budgets",
    path: "/budgets",
    icon: PiggyBank,
  },
  {
    label: "Groups",
    path: "/groups",
    icon: Users,
  },
  {
    label: "Transactions",
    path: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: ChartNoAxesCombined,
  },
];

const accountLinks = [
  {
    label: "Notifications",
    path: "/notifications",
    icon: Bell,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: UserRound,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

export default function Sidebar({
  isOpen = false,
  onClose = () => {},
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    onClose();
    navigate("/login", { replace: true });
  };

  const renderLinks = (links) =>
    links.map(({ label, path, icon: Icon }) => (
      <NavLink
        key={path}
        to={path}
        end={path === "/dashboard"}
        onClick={onClose}
        className={({ isActive }) =>
          `sidebar-link ${isActive ? "active" : ""}`
        }
      >
        <Icon size={19} strokeWidth={1.9} />
        <span>{label}</span>
        <ChevronRight
          size={15}
          className="sidebar-link-arrow"
        />
      </NavLink>
    ));

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar ${isOpen ? "sidebar-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Wallet size={24} />
            </div>

            <div className="sidebar-brand-text">
              <strong>StudentBudget</strong>
              <span>SMART FINANCE</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={21} />
          </button>
        </div>

        <div className="sidebar-scroll">
          <div className="sidebar-section">
            <p className="sidebar-section-title">
              MAIN MENU
            </p>

            <nav className="sidebar-nav">
              {renderLinks(mainLinks)}
            </nav>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">
              ACCOUNT
            </p>

            <nav className="sidebar-nav">
              {renderLinks(accountLinks)}
            </nav>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="sidebar-tip-icon">
              <PiggyBank size={21} />
            </div>

            <strong>Build better habits</strong>
            <p>
              Small savings today create bigger
              opportunities tomorrow.
            </p>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
