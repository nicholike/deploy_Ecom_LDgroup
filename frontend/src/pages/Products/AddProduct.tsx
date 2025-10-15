import { type FormEvent, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import {
  ArrowRightIcon,
  PlusIcon,
  TrashBinIcon as TrashIcon,
} from "../../icons";
import { ProductService } from "../../services/product.service";
import { CategoryService } from "../../services/category.service";
import ProductImageUpload from "../../components/products/ProductImageUpload";
import type {
  CreateProductRequest,
  PriceTier,
  PriceTierRequest,
  ProductResponse,
  ProductVariant,
  ProductStatus,
} from "../../types/product.types";

const cardClasses =
  "rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-xl shadow-sm dark:border-gray-800 dark:bg-gray-900/60";
const labelClasses = "block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5";
const inputClasses =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-xs font-medium text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100";

const DEFAULT_TIER_TEMPLATE: PriceTier[] = [
  {
    minQuantity: 10,
    maxQuantity: null,
    price: 0,
    label: undefined,
    order: 1,
  },
  {
    minQuantity: 100,
    maxQuantity: null,
    price: 0,
    label: undefined,
    order: 2,
  },
];

const createVariantTemplate = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  size: "",
  sku: "",
  price: 0,
  stock: 999999,
  lowStockThreshold: 10,
  isDefault: false,
  order: 0,
  active: true,
  priceTiers: DEFAULT_TIER_TEMPLATE.map((tier) => ({ ...tier })),
  ...overrides,
});

const buildDefaultVariants = (): ProductVariant[] => [
  createVariantTemplate({
    size: "5ml",
    isDefault: true,
    order: 1,
  }),
  createVariantTemplate({
    size: "20ml",
    order: 2,
  }),
  createVariantTemplate({
    size: "50ml",
    order: 3,
  }),
];

const sanitizeVariantForRequest = (variant: ProductVariant) => ({
  size: variant.size.trim(),
  sku: variant.sku.trim(),
  price: variant.price,
  stock: variant.stock,
  lowStockThreshold: variant.lowStockThreshold,
  isDefault: variant.isDefault,
  order: variant.order,
  active: variant.active,
});

const extractTierPrices = (variant: ProductVariant): PriceTierRequest[] => {
  if (!Array.isArray(variant.priceTiers)) {
    return [];
  }

  return variant.priceTiers
    .filter((tier) => Number(tier.price) > 0)
    .map((tier, index) => ({
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity ?? null,
      price: Number(tier.price),
      label: tier.label?.trim() || undefined,
      order: tier.order ?? index,
    }));
};

export default function AddProduct() {
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>(buildDefaultVariants);
  const [categories, setCategories] = useState<any[]>([]);
  const [baseSKU, setBaseSKU] = useState("");

  const [formData, setFormData] = useState<CreateProductRequest>({
    name: "",
    description: "",
    price: undefined,
    costPrice: undefined,
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
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await CategoryService.getCategories({ page: 1, limit: 100, active: true });
        setCategories(result.data);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };

    loadCategories();
  }, []);

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

  const handleBaseSKUChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBaseSKU = e.target.value.trim().toUpperCase();
    setBaseSKU(newBaseSKU);

    if (!newBaseSKU) {
      return;
    }

    setVariants((prev) =>
      prev.map((variant, index) => {
        const sizeUpper = variant.size.trim().toUpperCase().replace(/\s+/g, "");
        const fallbackSuffix = `-${index + 1}`;
        const suffix = sizeUpper ? `-${sizeUpper}` : fallbackSuffix;
        return {
          ...variant,
          sku: `${newBaseSKU}${suffix}`,
        };
      }),
    );
  };

  const addVariant = () => {
    const suffix = baseSKU ? `${baseSKU}-` : "";
    setVariants((prev) => [
      ...prev,
      createVariantTemplate({
        sku: suffix,
        order: prev.length + 1,
      }),
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => {
      if (index < 3) {
        const defaults = buildDefaultVariants();
        const copy = [...prev];
        copy[index] = defaults[index];
        return copy;
      }

      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((variant, idx) => ({
        ...variant,
        order: idx + 1,
      }));
    });
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants((prev) =>
      prev.map((variant, idx) => {
        if (idx !== index) {
          return variant;
        }

        if (field === "size" && baseSKU) {
          const sizeUpper = (value as string).toUpperCase().replace(/\s+/g, "");
          return {
            ...variant,
            size: value,
            sku: `${baseSKU}-${sizeUpper}`,
          };
        }

        if (field === "price" || field === "stock" || field === "lowStockThreshold") {
          return {
            ...variant,
            [field]: value ? Number(value) : 0,
          };
        }

        return {
          ...variant,
          [field]: value,
        };
      }),
    );
  };

const updateVariantTierPrice = (index: number, minQuantity: number, rawValue: string) => {
  const priceValue = rawValue ? Number(rawValue) : 0;

    setVariants((prev) =>
      prev.map((variant, idx) => {
        if (idx !== index) {
          return variant;
        }

        const tiers =
          variant.priceTiers && variant.priceTiers.length > 0
            ? variant.priceTiers
            : DEFAULT_TIER_TEMPLATE.map((tier) => ({ ...tier }));

        const updatedTiers = tiers.map((tier) =>
          tier.minQuantity === minQuantity
            ? {
                ...tier,
                price: priceValue,
              }
            : tier,
        );

        return {
          ...variant,
          price: minQuantity === 10 ? priceValue : variant.price,
          priceTiers: updatedTiers,
        };
      }),
    );
  };

  const setDefaultVariant = (index: number) => {
    setVariants((prev) =>
      prev.map((variant, idx) => ({
        ...variant,
        isDefault: idx === index,
      })),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>, saveAsDraft = false) => {
    event.preventDefault();

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
      alert("You must be logged in to create products. Please login first.");
      window.location.href = "/login";
      return;
    }

    setLoading(true);

    try {
      if (!baseSKU || baseSKU.trim() === "") {
        alert("Please enter Base SKU");
        setLoading(false);
        return;
      }

      const hydratedVariants = variants.map((variant) => ({
        ...variant,
        size: variant.size.trim(),
        sku: variant.sku.trim(),
      }));

      const validVariants = hydratedVariants.filter((variant) => {
        const tier10 = variant.priceTiers?.find((tier) => tier.minQuantity === 10);
        return variant.sku !== "" && Number(tier10?.price) > 0;
      });

      if (validVariants.length === 0) {
        alert("Please fill in at least one variant with SKU and Price");
        setLoading(false);
        return;
      }

      const hasDefault = validVariants.some((variant) => variant.isDefault);
      const normalisedVariants = hasDefault
        ? validVariants
        : validVariants.map((variant, index) =>
            index === 0 ? { ...variant, isDefault: true } : variant,
          );

      const requestVariants = normalisedVariants.map((variant) => {
        const tier10 = variant.priceTiers?.find((tier) => tier.minQuantity === 10);
        const priceForRequest =
          Number(tier10?.price) > 0 ? Number(tier10?.price) : Number(variant.price) || 0;

        return sanitizeVariantForRequest({
          ...variant,
          price: priceForRequest,
        } as ProductVariant);
      });

      const productData: CreateProductRequest = {
        name: formData.name,
        description: formData.description || undefined,
        thumbnail: formData.thumbnail || undefined,
        images: formData.images && formData.images.length > 0 ? formData.images : undefined,
        categoryId: formData.categoryId || undefined,
        status: saveAsDraft ? ("DRAFT" as ProductStatus) : formData.status,
        metaTitle: formData.metaTitle || undefined,
        metaDescription: formData.metaDescription || undefined,
        variants: requestVariants,
      };

      const result: ProductResponse = await ProductService.createProduct(productData);

      // Save price tiers SEQUENTIALLY to avoid transaction conflicts
      const tierErrors: string[] = [];
      const createdVariants = Array.isArray(result.variants) ? result.variants : [];

      for (const createdVariant of createdVariants) {
        const sourceVariant = normalisedVariants.find(
          (variant) => variant.sku === createdVariant.sku,
        );

        if (!sourceVariant || !createdVariant.id) {
          continue;
        }

        const tiers = extractTierPrices(sourceVariant);
        if (tiers.length === 0) {
          continue;
        }

        try {
          await ProductService.setVariantPriceTiers(createdVariant.id, tiers);
        } catch (error: any) {
          console.error("Failed to save price tiers:", error);
          tierErrors.push(error?.message || "Failed to save price tiers");
        }
      }

      if (tierErrors.length > 0) {
        alert(`Product created but failed to save all price tiers:\n${tierErrors.join("\n")}`);
      } else {
        alert("Product created successfully!");
      }

      setFormData({
        name: "",
        description: "",
        price: undefined,
        costPrice: undefined,
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
      });
      setBaseSKU("");
      setVariants(buildDefaultVariants());
    } catch (error: any) {
      console.error("Error creating product:", error);
      alert(error.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const tierSummary = useMemo(
    () =>
      variants.map((variant) => ({
        tier10: variant.priceTiers?.find((tier) => tier.minQuantity === 10)?.price ?? "",
        tier100: variant.priceTiers?.find((tier) => tier.minQuantity === 100)?.price ?? "",
      })),
    [variants],
  );

  return (
    <>
      <PageMeta
        title="Add Product | E-commerce Admin"
        description="Create a new product entry and manage its details."
      />
      <PageBreadcrumb pageTitle="Add Product" />
      <form className="space-y-6" onSubmit={(e) => handleSubmit(e)}>
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50 px-6 py-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">Add a new Product</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Fill in product variants and tier prices. Base SKU sẽ tự áp dụng cho từng size.
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
                    className={`${inputClasses} resize-none`}
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
                  disabled={loading}
                />
              </div>
            </section>

            <section className={cardClasses}>
              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      Product Variants & Tier Pricing
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Thiết lập giá cơ bản và giá ưu đãi khi mua từ 10 / 100 sản phẩm.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/20 dark:text-brand-200"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Add Size
                  </button>
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
                          Qty ≥ 10 (₫)
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Qty ≥ 100 (₫)
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Default
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900/40">
                      {variants.map((variant, index) => {
                        const { tier10, tier100 } = tierSummary[index] || { tier10: "", tier100: "" };
                        return (
                          <tr key={`${variant.size}-${index}`} className={index < 3 ? "bg-blue-50/30 dark:bg-blue-900/10" : ""}>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                placeholder="5ml"
                                value={variant.size}
                                onChange={(e) => updateVariant(index, "size", e.target.value)}
                                className="w-20 rounded border border-gray-200 bg-white/80 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                                disabled={index < 3}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                placeholder="DIOR-SAU-5ML"
                                value={variant.sku}
                                onChange={(e) => updateVariant(index, "sku", e.target.value)}
                                className="w-32 rounded border border-gray-200 bg-white/80 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                placeholder="Giá khi mua ≥ 10"
                                value={tier10}
                                onChange={(e) => updateVariantTierPrice(index, 10, e.target.value)}
                                className="w-28 rounded border border-gray-200 bg-white/80 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                placeholder="Giá khi mua ≥ 100"
                                value={tier100}
                                onChange={(e) => updateVariantTierPrice(index, 100, e.target.value)}
                                className="w-28 rounded border border-gray-200 bg-white/80 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="radio"
                                name="defaultVariant"
                                checked={variant.isDefault || false}
                                onChange={() => setDefaultVariant(index)}
                                className="h-3 w-3 text-brand-500 focus:ring-brand-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => removeVariant(index)}
                                className="text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title={index < 3 ? "Clear data" : "Remove variant"}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  💡 Điền giá cơ bản và giá ưu đãi khi khách mua từ 10 / 100 sản phẩm. Hệ thống sẽ tự
                  áp dụng chiết khấu theo số lượng khi tạo đơn.
                </p>
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
                  Base SKU for auto-generating variant SKUs
                </p>
              </div>
              <div className="space-y-4 px-6 py-6">
                <div>
                  <label htmlFor="base-sku" className={labelClasses}>
                    Base SKU *
                  </label>
                  <input
                    id="base-sku"
                    name="baseSKU"
                    type="text"
                    placeholder="e.g., DIOR-SAU"
                    className={inputClasses}
                    value={baseSKU}
                    onChange={handleBaseSKUChange}
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    💡 Variants will be auto-generated based on Base SKU và tên size.
                  </p>
                </div>
              </div>
            </section>

            <section className={cardClasses}>
              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Organize</h2>
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
            onClick={() => window.history.back()}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={(e: any) => handleSubmit(e, true)}
            disabled={loading}
            className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/20 dark:text-brand-200 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save draft"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-theme-sm transition hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? "Publishing..." : "Publish product"}
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </>
  );
}
