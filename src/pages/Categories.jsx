
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  FolderOpen,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Tags,
  Trash2,
  X,
} from "lucide-react";

import api from "../services/api";
import "../styles/Categories.css";

const emptyForm = () => ({
  name: "",
  description: "",
});

const categoryIcons = [
  "🍔",
  "🚌",
  "📚",
  "🛍️",
  "🏠",
  "🎮",
  "💊",
  "☕",
];

const categoryColors = [
  "purple",
  "green",
  "orange",
  "blue",
  "pink",
  "cyan",
];

const getCategoryIcon = (name) => {
  const value = String(name || "").toLowerCase();

  if (value.includes("food") || value.includes("meal")) return "🍔";
  if (value.includes("transport") || value.includes("travel")) return "🚌";
  if (value.includes("education") || value.includes("book")) return "📚";
  if (value.includes("shopping")) return "🛍️";
  if (value.includes("rent") || value.includes("housing")) return "🏠";
  if (value.includes("game") || value.includes("entertainment")) return "🎮";
  if (value.includes("health") || value.includes("medical")) return "💊";
  if (value.includes("coffee") || value.includes("snack")) return "☕";

  const sum = [...value].reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );

  return categoryIcons[sum % categoryIcons.length];
};

const getCategoryColor = (name) => {
  const value = String(name || "");

  const sum = [...value].reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );

  return categoryColors[sum % categoryColors.length];
};

const extractCategories = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/categories");
      setCategories(extractCategories(response.data));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load categories. Check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return categories.filter((category) => {
      const name = String(category.name || "").toLowerCase();
      const description = String(
        category.description || ""
      ).toLowerCase();

      return (
        !query ||
        name.includes(query) ||
        description.includes(query)
      );
    });
  }, [categories, search]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingId(category.id);
    setForm({
      name: category.name || "",
      description: category.description || "",
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

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setError("Category name is required.");
      return;
    }

    if (name.length > 100) {
      setError("Category name cannot exceed 100 characters.");
      return;
    }

    if (description.length > 255) {
      setError("Description cannot exceed 255 characters.");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        String(category.name || "").trim().toLowerCase() ===
          name.toLowerCase() &&
        String(category.id) !== String(editingId)
    );

    if (duplicate) {
      setError("A category with this name already exists.");
      return;
    }

    const payload = {
      name,
      description,
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingId !== null) {
        await api.put(`/categories/${editingId}`, payload);
      } else {
        await api.post("/categories", payload);
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm());

      await loadCategories();

      setSuccess(
        editingId !== null
          ? "Category updated successfully."
          : "Category added successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save category. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?\n\nCategories used by existing expenses may not be deletable.`
    );

    if (!confirmed) return;

    setDeletingId(category.id);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/categories/${category.id}`);
      await loadCategories();
      setSuccess("Category deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete this category. It may be linked to existing expenses."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="categories-page">
      <section className="categories-top">
        <div>
          <span className="categories-eyebrow">
            ORGANIZE YOUR SPENDING
          </span>

          <h2>Categories Management</h2>

          <p>
            Create and manage categories to organize your
            expenses and understand where your money goes.
          </p>
        </div>

        <button
          type="button"
          className="categories-primary-button"
          onClick={openAddModal}
        >
          <Plus size={19} />
          Add Category
        </button>
      </section>

      {error && !modalOpen && (
        <div
          className="categories-alert categories-alert-error"
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
          className="categories-alert categories-alert-success"
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

      <section className="categories-stats">
        <article className="categories-stat-card">
          <div className="categories-stat-icon categories-stat-purple">
            <Tags size={23} />
          </div>

          <div>
            <p>Total Categories</p>
            <h3>{categories.length}</h3>
            <span>Expense categories created</span>
          </div>
        </article>

        <article className="categories-stat-card">
          <div className="categories-stat-icon categories-stat-green">
            <FolderOpen size={23} />
          </div>

          <div>
            <p>Available Categories</p>
            <h3>{categories.length}</h3>
            <span>Ready for expense tracking</span>
          </div>
        </article>
      </section>

      <section className="categories-panel">
        <div className="categories-panel-header">
          <div>
            <h3>All Categories</h3>
            <p>Manage your spending categories</p>
          </div>

          <button
            type="button"
            className="categories-refresh-button"
            onClick={loadCategories}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <label className="categories-search">
          <Search size={19} />

          <input
            type="search"
            placeholder="Search categories..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </label>

        {loading ? (
          <div className="categories-empty">
            <LoaderCircle
              size={32}
              className="categories-spin"
            />
            <h4>Loading categories...</h4>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="categories-empty">
            <div className="categories-empty-icon">
              <Tags size={30} />
            </div>

            <h4>
              {categories.length === 0
                ? "No categories yet"
                : "No matching categories"}
            </h4>

            <p>
              {categories.length === 0
                ? "Create your first category to start organizing expenses."
                : "Try a different search term."}
            </p>

            {categories.length === 0 && (
              <button
                type="button"
                className="categories-primary-button"
                onClick={openAddModal}
              >
                <Plus size={18} />
                Add First Category
              </button>
            )}
          </div>
        ) : (
          <div className="categories-grid">
            {filteredCategories.map((category) => (
              <article
                className="categories-card"
                key={category.id}
              >
                <div className="categories-card-top">
                  <div
                    className={`categories-card-icon categories-color-${getCategoryColor(
                      category.name
                    )}`}
                    aria-hidden="true"
                  >
                    {getCategoryIcon(category.name)}
                  </div>

                  <div className="categories-card-actions">
                    <button
                      type="button"
                      className="categories-edit-button"
                      onClick={() =>
                        openEditModal(category)
                      }
                      title="Edit category"
                      aria-label={`Edit ${category.name}`}
                    >
                      <Edit3 size={17} />
                    </button>

                    <button
                      type="button"
                      className="categories-delete-button"
                      onClick={() =>
                        handleDelete(category)
                      }
                      disabled={
                        deletingId === category.id
                      }
                      title="Delete category"
                      aria-label={`Delete ${category.name}`}
                    >
                      {deletingId === category.id ? (
                        <LoaderCircle
                          size={17}
                          className="categories-spin"
                        />
                      ) : (
                        <Trash2 size={17} />
                      )}
                    </button>
                  </div>
                </div>

                <h4>{category.name}</h4>

                <p>
                  {category.description ||
                    "No description added."}
                </p>

                <div className="categories-card-footer">
                  <Tag size={14} />
                  Expense Category
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="categories-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="categories-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="categories-modal-title"
          >
            <div className="categories-modal-header">
              <div>
                <span className="categories-eyebrow">
                  CATEGORY DETAILS
                </span>

                <h3 id="categories-modal-title">
                  {editingId !== null
                    ? "Edit Category"
                    : "Add New Category"}
                </h3>

                <p>
                  {editingId !== null
                    ? "Update your category information."
                    : "Create a category for tracking expenses."}
                </p>
              </div>

              <button
                type="button"
                className="categories-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div
                className="categories-alert categories-alert-error"
                role="alert"
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form
              className="categories-form"
              onSubmit={handleSubmit}
            >
              <label>
                <span className="categories-field-label">
                  Category Name
                  <span className="categories-required">
                    *
                  </span>
                </span>

                <input
                  type="text"
                  name="name"
                  maxLength={100}
                  placeholder="e.g. Food"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                <span className="categories-field-label">
                  Description
                </span>

                <textarea
                  name="description"
                  rows={4}
                  maxLength={255}
                  placeholder="e.g. Daily meals, snacks, and groceries"
                  value={form.description}
                  onChange={handleChange}
                />

                <span className="categories-character-count">
                  {form.description.length}/255 characters
                </span>
              </label>

              <div className="categories-modal-footer">
                <button
                  type="button"
                  className="categories-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="categories-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle
                      size={18}
                      className="categories-spin"
                    />
                  ) : (
                    <Plus size={18} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Update Category"
                    : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
