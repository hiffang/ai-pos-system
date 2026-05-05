import { useState } from "react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "../store/apiClient";

export default function CategoryManager({ categories, onCategoriesChange }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setError("Category name cannot be empty");
      return;
    }

    setLoading(true);
    try {
      await createCategory(newCategoryName);
      setNewCategoryName("");
      setIsAdding(false);
      setError("");
      // Refresh categories
      onCategoriesChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (id) => {
    if (!editingName.trim()) {
      setError("Category name cannot be empty");
      return;
    }

    setLoading(true);
    try {
      await updateCategory(id, editingName);
      setEditingId(null);
      setEditingName("");
      setError("");
      // Refresh categories
      onCategoriesChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;

    setLoading(true);
    try {
      await deleteCategory(id);
      setError("");
      // Refresh categories
      onCategoriesChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-outline-variant p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-h2 font-bold">Product Categories</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          New Category
        </button>
      </div>

      {error && (
        <div className="bg-danger/15 border border-danger/30 text-danger px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {isAdding && (
        <div className="bg-surface-container-low p-4 rounded-lg mb-6 flex gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Enter category name..."
            className="flex-1 px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
          />
          <button
            onClick={handleAddCategory}
            disabled={loading}
            className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-caps hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Add
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="border border-outline-variant px-6 py-2 rounded-lg font-label-caps hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-text-muted text-center py-8">
            No categories yet. Create one to get started.
          </p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors group"
            >
              {editingId === category.id ? (
                <div className="flex-1 flex gap-3">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateCategory(category.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button
                    onClick={() => handleUpdateCategory(category.id)}
                    disabled={loading}
                    className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-label-caps hover:opacity-90 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="border border-outline-variant px-4 py-2 rounded-lg text-sm font-label-caps hover:bg-surface-container"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="font-h3 text-on-surface">{category.name}</h4>
                    <p className="text-text-muted text-sm">
                      {category._count?.products || 0} product(s)
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                      className="material-symbols-outlined text-primary hover:bg-surface-container p-2 rounded-lg transition-colors"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={loading || (category._count?.products || 0) > 0}
                      className="material-symbols-outlined text-danger hover:bg-surface-container p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        (category._count?.products || 0) > 0
                          ? "Cannot delete category with products"
                          : "Delete"
                      }
                    >
                      delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
