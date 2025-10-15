import { useState, useEffect } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { CategoryService } from "../../services/category.service";
import type { Category } from "../../types/product.types";
import { PlusIcon, TrashBinIcon, PencilIcon } from "../../icons";

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const result = await CategoryService.getCategories({ page: 1, limit: 100 });
      setCategories(result.data);
    } catch (error: any) {
      console.error("Failed to load categories:", error);
      alert(error.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "", active: true });
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      active: category.active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        // Update existing category
        await CategoryService.updateCategory(editingCategory.id, formData);
        alert("Category updated successfully!");
      } else {
        // Create new category
        await CategoryService.createCategory(formData);
        alert("Category created successfully!");
      }

      setShowModal(false);
      loadCategories();
    } catch (error: any) {
      console.error("Failed to save category:", error);
      alert(error.message || "Failed to save category");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) {
      return;
    }

    try {
      await CategoryService.deleteCategory(id);
      alert("Category deleted successfully!");
      loadCategories();
    } catch (error: any) {
      console.error("Failed to delete category:", error);
      alert(error.message || "Failed to delete category");
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await CategoryService.updateCategory(category.id, {
        active: !category.active,
      });
      loadCategories();
    } catch (error: any) {
      console.error("Failed to update category:", error);
      alert(error.message || "Failed to update category status");
    }
  };

  return (
    <>
      <PageMeta
        title="Category List | LD Perfume Admin"
        description="Manage the product categories available in the store."
      />
      <PageBreadcrumb pageTitle="Category List" />

      <ComponentCard
        title="Categories"
        headerAction={
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            <PlusIcon className="h-4 w-4" />
            Add Category
          </button>
        }
      >
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              No categories found. Create your first category to get started.
            </p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/20 dark:text-brand-200"
            >
              <PlusIcon className="h-4 w-4" />
              Create Category
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3 text-sm transition hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {category.name}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        category.active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {category.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {category.description && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {category.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Slug: {category.slug}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(category)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {category.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleEdit(category)}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-300"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.name)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-300"
                  >
                    <TrashBinIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ComponentCard>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingCategory ? "Edit Category" : "Create Category"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="e.g., Men's Fragrances"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="Brief description of the category"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  {editingCategory ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
