import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { ProductService } from "../../services/product.service";
import type { ProductResponse, ProductVariant } from "../../types/product.types";

const cardClasses =
  "rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-xl shadow-sm dark:border-gray-800 dark:bg-gray-900/60";

const badgeStyles: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  OUT_OF_STOCK: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  DISCONTINUED: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

const formatCurrency = (value?: number | null) => {
  if (!value && value !== 0) return "-";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value}₫`;
  }
};

const formatDateTime = (value?: string | Date) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [variantsWithTiers, setVariantsWithTiers] = useState<ProductVariant[]>([]);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setError("Product not found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await ProductService.getProduct(id);
        setProduct(result);
        
        // Load price tiers for each variant
        if (result.variants && result.variants.length > 0) {
          const variantsWithPriceTiers = await Promise.all(
            result.variants.map(async (variant) => {
              if (variant.id) {
                try {
                  const response = await ProductService.getPriceTiers(variant.id);
                  const fetchedTiers = (response as any)?.data || response;
                  return {
                    ...variant,
                    priceTiers: Array.isArray(fetchedTiers) && fetchedTiers.length > 0 ? fetchedTiers : [],
                  };
                } catch (error) {
                  console.error(`Failed to fetch price tiers for variant ${variant.id}:`, error);
                  return { ...variant, priceTiers: [] };
                }
              }
              return { ...variant, priceTiers: [] };
            })
          );
          setVariantsWithTiers(variantsWithPriceTiers);
        }
        
        setError(null);
      } catch (err: any) {
        console.error("Failed to load product:", err);
        setError(err?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  const sortedVariants = useMemo(() => {
    if (variantsWithTiers.length === 0) return [];
    const variants = [...variantsWithTiers];
    return variants.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [variantsWithTiers]);

  return (
    <>
      <PageMeta
        title="Product Details | E-commerce Admin"
        description="View detailed information about a product"
      />
      <PageBreadcrumb pageTitle="Product Details" />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading product...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : product ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/70 px-6 py-5 shadow-sm backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {product.name}
              </h1>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                SKU: {product.sku || "—"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/admin/products/list"
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10"
              >
                Back to Products
              </Link>
              <Link
                to={`/admin/products/${product.id}/edit`}
                className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-600"
              >
                Edit Product
              </Link>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <section className={cardClasses}>
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Overview
                  </h2>
                </div>
                <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
                  <DetailItem label="Status">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[product.status] || badgeStyles.DRAFT}`}
                    >
                      {product.status}
                    </span>
                  </DetailItem>
                  <DetailItem label="Category">
                    {product.category?.name || "—"}
                  </DetailItem>
                  <DetailItem label="Base SKU">
                    {deriveBaseSku(product.variants) || product.sku || "—"}
                  </DetailItem>
                  <DetailItem label="Stock">
                    {product.stock ?? "—"}
                  </DetailItem>
                  <DetailItem label="Created">
                    {formatDateTime(product.createdAt)}
                  </DetailItem>
                  <DetailItem label="Last Updated">
                    {formatDateTime(product.updatedAt)}
                  </DetailItem>
                </div>
              </section>

              <section className={cardClasses}>
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Description
                  </h2>
                </div>
                <div className="px-6 py-6">
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {product.description || "No description provided."}
                  </p>
                </div>
              </section>

              <section className={cardClasses}>
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      Variants
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Prices are shown in VND. Default variant is highlighted.
                    </p>
                  </div>
                </div>

                {sortedVariants.length === 0 ? (
                  <div className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                    This product has no variants.
                  </div>
                ) : (
                  <div className="px-6 py-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                              Size
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                              SKU
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                              Qty ≥ 10 (₫)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                              Qty ≥ 100 (₫)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                              Default
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900/40">
                          {sortedVariants.map((variant) => {
                            const tier10 = variant.priceTiers?.find((tier) => tier.minQuantity === 10);
                            const tier100 = variant.priceTiers?.find((tier) => tier.minQuantity === 100);
                            
                            return (
                              <tr
                                key={variant.id ?? variant.sku}
                                className={variant.isDefault ? "bg-brand-50/50 dark:bg-brand-900/10" : ""}
                              >
                                <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                  {variant.size || "—"}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                  {variant.sku || "—"}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                  {tier10 ? formatCurrency(tier10.price) : "—"}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                  {tier100 ? formatCurrency(tier100.price) : "—"}
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
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>

              <section className={cardClasses}>
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Metadata
                  </h2>
                </div>
                <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
                  <DetailItem label="Meta Title">
                    {product.metaTitle || "—"}
                  </DetailItem>
                  <DetailItem label="Meta Description">
                    {product.metaDescription || "—"}
                  </DetailItem>
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              {product.thumbnail && (
                <section className={cardClasses}>
                  <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      Thumbnail
                    </h2>
                  </div>
                  <div className="px-6 py-6">
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      className="w-full rounded-xl border border-gray-200 object-cover dark:border-gray-700"
                    />
                    <a
                      href={product.thumbnail}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                    >
                      Open full size
                    </a>
                  </div>
                </section>
              )}

              {Array.isArray(product.images) && product.images.length > 0 && (
                <section className={cardClasses}>
                  <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      Gallery
                    </h2>
                  </div>
                  <div className="grid gap-3 px-6 py-6">
                    {product.images.map((image, index) => (
                      <div key={`${image}-${index}`} className="space-y-2">
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full rounded-xl border border-gray-200 object-cover dark:border-gray-700"
                        />
                        <a
                          href={image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                        >
                          {image}
                        </a>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{children}</div>
    </div>
  );
}

function deriveBaseSku(variants?: ProductVariant[] | null) {
  if (!variants || variants.length === 0) return "";
  const candidate = variants.find((variant) => variant.isDefault) ?? variants[0];
  if (!candidate?.sku) return "";
  const parts = candidate.sku.split("-");
  return parts.length > 1 ? parts.slice(0, -1).join("-") : candidate.sku;
}
