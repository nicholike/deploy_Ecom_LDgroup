import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { ArrowRightIcon, TrashBinIcon as TrashIcon } from "../../icons";
import { ProductService } from "../../services/product.service";
import { CategoryService } from "../../services/category.service";
import ProductImageUpload from "../../components/products/ProductImageUpload";
import PriceTiers from "../../components/products/PriceTiers";
import type {
  CreateProductRequest,
  ProductResponse,
  ProductVariant,
  ProductStatus,
  UpdateProductRequest,
} from "../../types/product.types";

const cardClasses =
  "rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-xl shadow-sm dark:border-gray-800 dark:bg-gray-900/60";
const labelClasses = "block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5";
const inputClasses =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-xs font-medium text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100";

const DEFAULT_VARIANTS: ProductVariant[] = [
  {
    size: "5ml",
    sku: "",
    price: 0,
    salePrice: undefined,
    stock: 0,
    lowStockThreshold: 10,
    isDefault: true,
    order: 1,
    active: true,
  },
  {
    size: "20ml",
    sku: "",
    price: 0,
    salePrice: undefined,
    stock: 0,
    lowStockThreshold: 10,
    isDefault: false,
    order: 2,
    active: true,
  },
  {
    size: "50ml",
    sku: "",
    price: 0,
    salePrice: undefined,
    stock: 0,
    lowStockThreshold: 10,
    isDefault: false,
    order: 3,
    active: true,
  },
];

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [variants, setVariants] = useState<ProductVariant[]>(DEFAULT_VARIANTS);
  const [categories, setCategories] = useState<any[]>([]);
  const [baseSKU, setBaseSKU] = useState("");
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: "",
    description: "",
    price: undefined,
    costPrice: undefined,
    salePrice: undefined,
    sku: "",
    stock: undefined,
    lowStockThreshold: 10,
    images: [],
    thumbnail: "",
    categoryId: "",
    status: "DRAFT" as ProductStatus,
    metaTitle: "",
    metaDescription: "",
    variants: [],
    isCommissionEligible: true,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setError("Product not found");
        setFetching(false);
        return;
      }

      try {
        setFetching(true);
        const [productResult, categoriesResult] = await Promise.all([
          ProductService.getProduct(id),
          CategoryService.getCategories({ page: 1, limit: 100, active: true }),
        ]);

        setCategories(Array.isArray(categoriesResult.data) ? categoriesResult.data : []);

        initializeForm(productResult);
        setError(null);
      } catch (err: any) {
        console.error("Failed to load product:", err);
        setError(err?.message || "Failed to load product");
      } finally {
        setFetching(false);
      }
    };

    loadData();
  }, [id]);

  const initializeForm = (product: ProductResponse) => {
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      sku: product.sku,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      images: product.images || [],
      thumbnail: product.thumbnail || "",
      categoryId: product.categoryId || "",
      status: product.status,
      metaTitle: product.metaTitle || "",
      metaDescription: product.metaDescription || "",
      variants: product.variants || [],
      isCommissionEligible: product.isCommissionEligible,
    });

    const existingVariants =
      product.variants && product.variants.length > 0
        ? [...product.variants]
        : DEFAULT_VARIANTS.map((variant) => ({ ...variant }));

    existingVariants.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });

    setVariants(existingVariants);
    setBaseSKU(deriveBaseSku(existingVariants) || product.sku || "");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value ? Number(value) : undefined) : value,
    }));
  };

  const handleThumbnailChange = (value?: string) => {
    setFormData((prev) => ({
      ...prev,
      thumbnail: value ?? "",
    }));
  };

  const handleImagesChange = (urls: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images: urls,
    }));
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa biến thể này? (Sẽ hiển thị mờ ở trang sản phẩm)")) {
      return;
    }

    try {
      await ProductService.deleteVariant(variantId);
      alert("Đã xóa biến thể thành công!");

      // Reload product data
      if (id) {
        const productResult = await ProductService.getProduct(id);
        initializeForm(productResult);
      }
    } catch (error: any) {
      console.error("Failed to delete variant:", error);
      alert(error?.message || "Không thể xóa biến thể");
    }
  };

  const handleRestoreVariant = async (variantId: string) => {
    try {
      await ProductService.restoreVariant(variantId);
      alert("Đã khôi phục biến thể thành công!");

      // Reload product data
      if (id) {
        const productResult = await ProductService.getProduct(id);
        initializeForm(productResult);
      }
    } catch (error: any) {
      console.error("Failed to restore variant:", error);
      alert(error?.message || "Không thể khôi phục biến thể");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>, saveAsDraft = false) => {
    event.preventDefault();

    if (!id) {
      alert("Missing product ID");
      return;
    }

    let token: string | null = null;
    const authData = localStorage.getItem("ldgroup_admin_auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        token = parsed.accessToken;
      } catch (e) {
        console.error("Failed to parse auth data:", e);
      }
    }

    if (!token) {
      token = localStorage.getItem("accessToken");
    }

    if (!token) {
      alert("You must be logged in to update products. Please login first.");
      window.location.href = "/login";
      return;
    }

    const sanitizeString = (value?: string | null) => {
      if (value === undefined || value === null) return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    const productData: UpdateProductRequest = {
      name: sanitizeString(formData.name) ?? formData.name,
      description: sanitizeString(formData.description),
      thumbnail: sanitizeString(formData.thumbnail),
      categoryId: sanitizeString(formData.categoryId),
      status: saveAsDraft ? ("DRAFT" as ProductStatus) : formData.status,
      metaTitle: sanitizeString(formData.metaTitle),
      metaDescription: sanitizeString(formData.metaDescription),
      images: formData.images && formData.images.length > 0 ? formData.images : undefined,
    };

    if (typeof formData.price === "number") {
      productData.price = formData.price;
    }
    if (typeof formData.costPrice === "number") {
      productData.costPrice = formData.costPrice;
    }
    if (typeof formData.salePrice === "number") {
      productData.salePrice = formData.salePrice;
    }
    if (typeof formData.stock === "number") {
      productData.stock = formData.stock;
    }
    if (typeof formData.lowStockThreshold === "number") {
      productData.lowStockThreshold = formData.lowStockThreshold;
    }
    if (typeof formData.isCommissionEligible === "boolean") {
      productData.isCommissionEligible = formData.isCommissionEligible;
    }

    setSaving(true);
    try {
      await ProductService.updateProduct(id, productData);
      alert("Product updated successfully!");
      navigate(`/admin/products/${id}`);
    } catch (updateError: any) {
      console.error("Failed to update product:", updateError);
      alert(updateError?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <>
        <PageMeta
          title="Edit Product | E-commerce Admin"
          description="Update existing product details."
        />
        <PageBreadcrumb pageTitle="Edit Product" />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading product...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageMeta
          title="Edit Product | E-commerce Admin"
          description="Update existing product details."
        />
        <PageBreadcrumb pageTitle="Edit Product" />
        <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Edit Product | E-commerce Admin"
        description="Update existing product details."
      />
      <PageBreadcrumb pageTitle="Edit Product" />
      <form className="space-y-6" onSubmit={(e) => handleSubmit(e)}>
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50 px-6 py-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Update product
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Adjust product variants, media and meta information as needed.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <section className={cardClasses}>
              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Product Information
                </h2>
              </div>
              <div className="space-y-5 px-6 py-6">
                <div>
                  <label htmlFor="product-name" className={labelClasses}>
                    Product Name *
                  </label>
                  <input
                    id="product-name"
                    name="name"
                    type="text"
                    placeholder="e.g., Dior Sauvage Perfume Oil"
                    className={inputClasses}
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="product-description" className={labelClasses}>
                    Description
                  </label>
                  <textarea
                    id="product-description"
                    name="description"
                    rows={6}
                    placeholder="Describe your product..."
                    className={inputClasses + " resize-none"}
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </section>

            <section className={cardClasses}>
              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Product Media
                </h2>
              </div>
              <div className="px-6 py-6">
                <ProductImageUpload
                  thumbnail={formData.thumbnail || undefined}
                  images={formData.images ?? []}
                  onThumbnailChange={handleThumbnailChange}
                  onImagesChange={handleImagesChange}
                  disabled={saving}
                />
              </div>
            </section>

            <section className={cardClasses}>
              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      Product Variants
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Xóa biến thể sẽ ẩn nó khỏi trang sản phẩm (hiển thị mờ). Bạn có thể khôi phục lại sau.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Size
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          SKU
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Price (₫)
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Sale (₫)
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Stock
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Default
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900/40">
                      {variants.map((variant, index) => (
                        <tr
                          key={variant.id ?? `${variant.sku}-${index}`}
                          className={variant.isDefault ? "bg-brand-50/50 dark:bg-brand-900/10" : ""}
                          style={{ opacity: variant.active === false ? 0.5 : 1 }}
                        >
                          <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                            {variant.size || "—"}
                            {variant.active === false && (
                              <span className="ml-2 text-xs text-red-500">(Đã xóa)</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                            {variant.sku || "—"}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                            {variant.price?.toLocaleString() ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                            {variant.salePrice?.toLocaleString() ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                            {variant.stock ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                            {variant.isDefault ? (
                              <span className="inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-900/30 dark:text-brand-200">
                                Default
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {variant.id && (
                              variant.active === false ? (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreVariant(variant.id!)}
                                  className="text-green-600 hover:text-green-700 text-xs font-medium"
                                  title="Khôi phục biến thể"
                                >
                                  Khôi phục
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVariant(variant.id!)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Xóa biến thể (soft delete)"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {variants.some((variant) => Boolean(variant.id)) && (
              <>
                <section className={cardClasses}>
                  <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      Quantity Pricing
                    </h2>
                  </div>
                  <div className="px-6 py-6 text-xs text-gray-500 dark:text-gray-400">
                    Configure price tiers for each variant to reward customers who purchase in bulk.
                  </div>
                </section>
                <div className="space-y-4">
                  {variants
                    .filter((variant) => Boolean(variant.id))
                    .map((variant) => (
                      <PriceTiers
                        key={variant.id}
                        variantId={variant.id as string}
                        variantLabel={variant.size}
                        sku={variant.sku}
                        basePrice={variant.price ?? null}
                      />
                    ))}
                </div>
              </>
            )}

            <section className={cardClasses}>
              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  SEO Metadata
                </h2>
              </div>
              <div className="space-y-4 px-6 py-6">
                <div>
                  <label htmlFor="metaTitle" className={labelClasses}>
                    Meta Title
                  </label>
                  <input
                    id="metaTitle"
                    name="metaTitle"
                    type="text"
                    placeholder="Meta title"
                    className={inputClasses}
                    value={formData.metaTitle}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="metaDescription" className={labelClasses}>
                    Meta Description
                  </label>
                  <textarea
                    id="metaDescription"
                    name="metaDescription"
                    rows={3}
                    placeholder="Meta description"
                    className={inputClasses + " resize-none"}
                    value={formData.metaDescription}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className={cardClasses}>
              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Product SKU
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Base SKU used when variants were generated. Variant updates are currently read-only.
                </p>
              </div>
              <div className="space-y-4 px-6 py-6">
                <div>
                  <label className={labelClasses}>Base SKU</label>
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                    {baseSKU || "—"}
                  </div>
                </div>
              </div>
            </section>

            <section className={cardClasses}>
              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Organize
                </h2>
              </div>
              <div className="space-y-4 px-6 py-6">
                <div>
                  <label htmlFor="category" className={labelClasses}>
                    Category
                  </label>
                  <select
                    id="category"
                    name="categoryId"
                    className={inputClasses}
                    value={formData.categoryId}
                    onChange={handleInputChange}
                  >
                    <option value="">Select category</option>
                    {Array.isArray(categories) &&
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="product-status" className={labelClasses}>
                    Status
                  </label>
                  <select
                    id="product-status"
                    name="status"
                    className={inputClasses}
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                    <option value="DISCONTINUED">Discontinued</option>
                  </select>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e: any) => handleSubmit(e, true)}
            disabled={saving}
            className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/20 dark:text-brand-200 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save as draft"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-theme-sm transition hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </>
  );
}

function deriveBaseSku(variants?: ProductVariant[] | null) {
  if (!variants || variants.length === 0) return "";
  const candidate = variants.find((variant) => variant.isDefault) ?? variants[0];
  if (!candidate?.sku) return "";
  const parts = candidate.sku.split("-");
  return parts.length > 1 ? parts.slice(0, -1).join("-") : candidate.sku;
}
