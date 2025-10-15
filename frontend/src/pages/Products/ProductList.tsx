import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { ProductService } from "../../services/product.service";
import { CategoryService } from "../../services/category.service";
import type { ProductResponse } from "../../types/product.types";

export default function ProductList() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Load products and categories
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [currentPage, selectedCategory, selectedStatus]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;

      const response = await ProductService.getProducts(params);
      console.log("API Response:", response);

      const productsData = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];

      setProducts(productsData);

      const totalPagesValue =
        !Array.isArray(response) && response?.pagination?.totalPages
          ? response.pagination.totalPages
          : 1;

      setTotalPages(totalPagesValue);
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await CategoryService.getCategories({ page: 1, limit: 100, active: true });
      setCategories(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      setDeleting(id);
      await ProductService.deleteProduct(id);
      alert("Product deleted successfully!");
      loadProducts();
    } catch (error: any) {
      console.error("Failed to delete product:", error);
      alert(error.message || "Failed to delete product");
    } finally {
      setDeleting(null);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadProducts();
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
      OUT_OF_STOCK: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      DISCONTINUED: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    };

    return (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[status as keyof typeof colors] || colors.DRAFT}`}>
        {status}
      </span>
    );
  };

  const filteredProducts = Array.isArray(products)
    ? products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  return (
    <>
      <PageMeta
        title="Product List | E-commerce Admin"
        description="Manage all products in your store"
      />
      <PageBreadcrumb pageTitle="Product List" />

      {/* Filters & Actions */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-xl p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Search Products
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name or SKU..."
                className="flex-1 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-xs font-medium text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
              >
                Search
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Category
            </label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-xs font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Categories</option>
              {Array.isArray(categories) && categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Status
            </label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-xs font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="DISCONTINUED">Discontinued</option>
            </select>
          </div>
        </div>

        {/* Add Product Button */}
        <div className="mt-4 flex justify-end">
          <Link
            to="/admin/products/add"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Product
          </Link>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-xl shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Products ({filteredProducts.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Loading products...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No products found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Variants
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900/40">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.thumbnail && (
                            <img
                              src={product.thumbnail}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </p>
                            {product.sku && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                SKU: {product.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {product.variants && product.variants.length > 0 ? (
                          <div className="space-y-1">
                            {product.variants.map((variant) => (
                              <div key={variant.id} className="text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {variant.size}:
                                </span>
                                <span className="ml-1 text-gray-500 dark:text-gray-400">
                                  {variant.price.toLocaleString()}₫ (Stock: {variant.stock})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {product.price && `${product.price.toLocaleString()}₫`}
                            {product.stock !== undefined && ` (Stock: ${product.stock})`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                        {product.category?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(product.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/admin/products/${product.id}`}
                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                          >
                            View
                          </Link>
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-600 transition hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            disabled={deleting === product.id}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                          >
                            {deleting === product.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
