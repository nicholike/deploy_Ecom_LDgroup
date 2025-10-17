import { type FormEvent, useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { ArrowRightIcon, TrashBinIcon as TrashIcon, PlusIcon } from "../../icons";
import { ProductService } from "../../services/product.service";
import { CategoryService } from "../../services/category.service";
import ProductImageUpload from "../../components/products/ProductImageUpload";
import type {
  CreateProductRequest,
  ProductResponse,
  ProductVariant,
  ProductStatus,
  UpdateProductRequest,
  PriceTier,
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

const DEFAULT_VARIANTS: ProductVariant[] = [
  {
    size: "5ml",
    sku: "",
    price: 0,
    salePrice: undefined,
    lowStockThreshold: 10,
    isDefault: true,
    order: 1,
    active: true,
    priceTiers: DEFAULT_TIER_TEMPLATE.map((tier) => ({ ...tier })),
  },
  {
    size: "20ml",
    sku: "",
    price: 0,
    salePrice: undefined,
    lowStockThreshold: 10,
    isDefault: false,
    order: 2,
    active: true,
    priceTiers: DEFAULT_TIER_TEMPLATE.map((tier) => ({ ...tier })),
  },
  {
    size: "50ml",
    sku: "",
    price: 0,
    salePrice: undefined,
    lowStockThreshold: 10,
    isDefault: false,
    order: 3,
    active: true,
    priceTiers: DEFAULT_TIER_TEMPLATE.map((tier) => ({ ...tier })),
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
    isSpecial: false,
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

  const initializeForm = async (product: ProductResponse) => {
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
      isSpecial: product.isSpecial || false,
    });

    // Load price tiers for existing variants
    const existingVariants =
      product.variants && product.variants.length > 0
        ? await Promise.all(
            product.variants.map(async (variant) => {
              let priceTiers = DEFAULT_TIER_TEMPLATE.map((tier) => ({ ...tier }));
              
              if (variant.id) {
                try {
                  const response = await ProductService.getPriceTiers(variant.id);
                  console.log(`✅ Price tiers response for variant ${variant.size} (${variant.id}):`, response);
                  
                  // Backend returns { data: [...] }
                  const fetchedTiers = (response as any)?.data || response;
                  
                  if (fetchedTiers && Array.isArray(fetchedTiers) && fetchedTiers.length > 0) {
                    priceTiers = fetchedTiers;
                    console.log(`✅ Using fetched price tiers:`, priceTiers);
                  } else {
                    console.warn(`⚠️ No price tiers found for variant ${variant.size}, using default template`);
                  }
                } catch (error) {
                  console.error(`❌ Failed to fetch price tiers for variant ${variant.id}:`, error);
                }
              }
              
              const finalVariant = {
                ...variant,
                priceTiers,
              };
              console.log(`📦 Final variant ${variant.size}:`, finalVariant);
              return finalVariant;
            })
          )
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

  const handleSpecialCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      isSpecial: e.target.checked,
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

  const addNewVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        size: "",
        sku: "",
        price: 0,
        salePrice: undefined,
        lowStockThreshold: 10,
        isDefault: false,
        order: prev.length + 1,
        active: true,
        priceTiers: DEFAULT_TIER_TEMPLATE.map((tier) => ({ ...tier })),
        // No id means it's a new variant
      },
    ]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants((prev) =>
      prev.map((variant, idx) => {
        if (idx !== index) return variant;

        if (field === "price" || field === "lowStockThreshold") {
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

  const removeNewVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveNewVariants = async () => {
    if (!id) return;

    // Get only new variants (those without id)
    const newVariants = variants.filter((v) => !v.id);

    if (newVariants.length === 0) {
      return;
    }

    // Validate
    const invalidVariant = newVariants.find((v) => !v.size || !v.sku);
    if (invalidVariant) {
      alert("Vui lòng nhập đầy đủ Size và SKU cho tất cả variants mới!");
      return;
    }

    try {
      // Save each new variant
      for (const variant of newVariants) {
        const response = await ProductService.addVariant(id, {
          size: variant.size,
          sku: variant.sku,
          price: variant.price ?? 0,
          salePrice: variant.salePrice,
          lowStockThreshold: variant.lowStockThreshold ?? 10,
          isDefault: variant.isDefault ?? false,
          active: true,
        });

        console.log("✅ Created variant response:", response);
        
        // Backend returns { message: "...", data: { id: "...", ... } }
        const createdVariant = (response as any)?.data || response;
        const variantId = createdVariant.id;
        
        console.log("✅ Variant ID:", variantId);

        // If variant has price tiers, save them
        if (variant.priceTiers && variant.priceTiers.length > 0 && variantId) {
          const validTiers = variant.priceTiers
            .filter((tier) => tier.price > 0)
            .map((tier) => ({
              minQuantity: tier.minQuantity,
              maxQuantity: tier.maxQuantity ?? null,
              price: tier.price,
              label: tier.label,
              order: tier.order ?? 0,
            }));
          
          if (validTiers.length > 0) {
            console.log("💾 Saving price tiers for variant:", variantId, validTiers);
            await ProductService.setPriceTiers(variantId, validTiers);
          }
        }
      }

      alert("Đã thêm biến thể thành công!");

      // Reload product data
      const productResult = await ProductService.getProduct(id);
      await initializeForm(productResult);
    } catch (error: any) {
      console.error("❌ Failed to add variants:", error);
      alert(error?.message || "Không thể thêm biến thể");
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
    if (typeof formData.isSpecial === "boolean") {
      productData.isSpecial = formData.isSpecial;
    }

    setSaving(true);
    try {
      // 1. Update product basic info
      await ProductService.updateProduct(id, productData);
      console.log("✅ Product updated successfully");

      // 2. Update price tiers for all existing variants
      const existingVariants = variants.filter((v) => v.id);
      console.log(`💾 Updating price tiers for ${existingVariants.length} variants...`);
      
      for (const variant of existingVariants) {
        if (variant.id && variant.priceTiers && variant.priceTiers.length > 0) {
          const validTiers = variant.priceTiers
            .filter((tier) => tier.price > 0)
            .map((tier) => ({
              minQuantity: tier.minQuantity,
              maxQuantity: tier.maxQuantity ?? null,
              price: tier.price,
              label: tier.label,
              order: tier.order ?? 0,
            }));
          
          console.log(`💾 Saving price tiers for variant ${variant.size} (${variant.id}):`, validTiers);
          await ProductService.setPriceTiers(variant.id, validTiers);
        }
      }

      alert("Product updated successfully!");
      navigate(`/admin/products/${id}`);
    } catch (updateError: any) {
      console.error("Failed to update product:", updateError);
      alert(updateError?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const tierSummary = useMemo(
    () => {
      const summary = variants.map((variant) => {
        // Try to get tier prices, fallback to base price if no tiers exist
        const tier10Value = variant.priceTiers?.find((tier) => tier.minQuantity === 10)?.price;
        const tier100Value = variant.priceTiers?.find((tier) => tier.minQuantity === 100)?.price;
        
        // If no tiers, use base price as default for tier10
        const tier10 = tier10Value ?? (variant.price || "");
        const tier100 = tier100Value ?? "";
        
        console.log(`🔍 Tier summary for ${variant.size}:`, { 
          tier10, 
          tier100, 
          basePrice: variant.price,
          priceTiers: variant.priceTiers 
        });
        return { tier10, tier100 };
      });
      console.log(`📊 Complete tier summary:`, summary);
      return summary;
    },
    [variants],
  );

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
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Product Type
                </h2>
              </div>
              <div className="px-6 py-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isSpecial || false}
                    onChange={handleSpecialCheckbox}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Sản phẩm đặc biệt
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Sản phẩm đặc biệt không có variants, hiển thị đầu tiên phía client
                    </p>
                  </div>
                </label>
              </div>
            </section>

            {formData.isSpecial ? (
              <section className={cardClasses}>
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Special Product Pricing
                  </h2>
                </div>
                <div className="space-y-4 px-6 py-6">
                  <div>
                    <label htmlFor="special-sku" className={labelClasses}>
                      SKU *
                    </label>
                    <input
                      id="special-sku"
                      name="sku"
                      type="text"
                      placeholder="e.g., SPECIAL-GIFT-01"
                      className={inputClasses}
                      value={formData.sku || ""}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="special-price" className={labelClasses}>
                      Price (₫) *
                    </label>
                    <input
                      id="special-price"
                      name="price"
                      type="number"
                      min={0}
                      placeholder="e.g., 100000"
                      className={inputClasses}
                      value={formData.price || ""}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </section>
            ) : (
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
                    onClick={addNewVariant}
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
                        const isNewVariant = !variant.id;
                        const { tier10, tier100 } = tierSummary[index] || { tier10: "", tier100: "" };
                        
                        return (
                          <tr
                            key={variant.id ?? `new-${index}`}
                            className={`${variant.isDefault ? "bg-brand-50/50 dark:bg-brand-900/10" : ""} ${isNewVariant ? "bg-green-50/30 dark:bg-green-900/10" : ""}`}
                            style={{ opacity: variant.active === false ? 0.5 : 1 }}
                          >
                            {/* Size */}
                            <td className="px-3 py-2">
                              {isNewVariant ? (
                                <input
                                  type="text"
                                  placeholder="5ml"
                                  value={variant.size}
                                  onChange={(e) => updateVariant(index, "size", e.target.value)}
                                  className="w-20 rounded border border-gray-200 bg-white/80 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                                />
                              ) : (
                                <span className="text-sm text-gray-700 dark:text-gray-200">
                                  {variant.size || "—"}
                                  {variant.active === false && (
                                    <span className="ml-2 text-xs text-red-500">(Đã xóa)</span>
                                  )}
                                </span>
                              )}
                            </td>

                            {/* SKU */}
                            <td className="px-3 py-2">
                              {isNewVariant ? (
                                <input
                                  type="text"
                                  placeholder="DEMO-5ML"
                                  value={variant.sku}
                                  onChange={(e) => updateVariant(index, "sku", e.target.value)}
                                  className="w-32 rounded border border-gray-200 bg-white/80 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                                />
                              ) : (
                                <span className="text-sm text-gray-700 dark:text-gray-200">
                                  {variant.sku || "—"}
                                </span>
                              )}
                            </td>

                            {/* Qty ≥ 10 */}
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                placeholder="Giá khi mua ≥ 10"
                                value={tier10}
                                onChange={(e) => updateVariantTierPrice(index, 10, e.target.value)}
                                className="w-28 rounded border border-gray-200 bg-white/80 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                                disabled={!isNewVariant && variant.active === false}
                              />
                            </td>

                            {/* Qty ≥ 100 */}
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                placeholder="Giá khi mua ≥ 100"
                                value={tier100}
                                onChange={(e) => updateVariantTierPrice(index, 100, e.target.value)}
                                className="w-28 rounded border border-gray-200 bg-white/80 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                                disabled={!isNewVariant && variant.active === false}
                              />
                            </td>

                            {/* Default */}
                            <td className="px-3 py-2 text-center">
                              <input
                                type="radio"
                                name="defaultVariant"
                                checked={variant.isDefault || false}
                                onChange={() => setDefaultVariant(index)}
                                className="h-3 w-3 text-brand-500 focus:ring-brand-500"
                                disabled={!isNewVariant && variant.active === false}
                              />
                            </td>

                            {/* Action */}
                            <td className="px-3 py-2">
                              {isNewVariant ? (
                                <button
                                  type="button"
                                  onClick={() => removeNewVariant(index)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Remove new variant"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              ) : variant.id && (
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  💡 Điền giá cơ bản và giá ưu đãi khi khách mua từ 10 / 100 sản phẩm. Hệ thống sẽ tự
                  áp dụng chiết khấu theo số lượng khi tạo đơn.
                </p>

                {/* Save New Variants Button */}
                {variants.some((v) => !v.id) && (
                  <div className="flex justify-end gap-3 border-t border-gray-100 mt-4 pt-4 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={handleSaveNewVariants}
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white shadow-theme-sm transition hover:bg-green-700"
                    >
                      Save New Variants
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </section>
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
            {!formData.isSpecial && (
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
            )}

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
