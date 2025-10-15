import { useEffect, useMemo, useState } from "react";
import { ArrowRightIcon, PlusIcon, TrashBinIcon as TrashIcon } from "../../icons";
import { ProductService } from "../../services/product.service";
import type { PriceTier, PriceTierRequest } from "../../types/product.types";

type EditablePriceTier = PriceTierRequest & {
  id?: string;
  tempId?: string;
};

interface PriceTiersProps {
  variantId: string;
  variantLabel?: string;
  sku?: string;
  basePrice?: number | null;
  className?: string;
}

const cardClasses =
  "rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-xl shadow-sm dark:border-gray-800 dark:bg-gray-900/60";
const labelClasses = "block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5";
const inputClasses =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-xs font-medium text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100";

const createEditableTier = (tier: PriceTier): EditablePriceTier => ({
  id: tier.id,
  minQuantity: tier.minQuantity,
  maxQuantity: tier.maxQuantity ?? undefined,
  price: tier.price,
  label: tier.label ?? undefined,
  order: tier.order,
});

const toRequestPayload = (tiers: EditablePriceTier[]): PriceTierRequest[] =>
  tiers.map((tier, index) => ({
    minQuantity: tier.minQuantity,
    maxQuantity: tier.maxQuantity,
    price: tier.price,
    label: tier.label,
    order: tier.order ?? index,
  }));

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) {
    return "—";
  }

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

export function PriceTiers({ variantId, variantLabel, sku, basePrice, className }: PriceTiersProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tiers, setTiers] = useState<EditablePriceTier[]>([]);

  const variantTitle = useMemo(() => {
    if (variantLabel && sku) {
      return `${variantLabel} — ${sku}`;
    }
    if (variantLabel) {
      return variantLabel;
    }
    if (sku) {
      return sku;
    }
    return "Variant";
  }, [variantLabel, sku]);

  useEffect(() => {
    let isMounted = true;

    const loadTiers = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const result = await ProductService.getVariantPriceTiers(variantId);
        if (!isMounted) return;
        setTiers(result.map(createEditableTier));
      } catch (err: any) {
        console.error("Failed to load price tiers:", err);
        if (isMounted) {
          setError(err?.message || "Failed to load price tiers");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (variantId) {
      loadTiers();
    }

    return () => {
      isMounted = false;
    };
  }, [variantId]);

  const handleAddTier = () => {
    setTiers((prev) => {
      const nextMinQuantity =
        prev.length > 0
          ? Math.max(...prev.map((tier) => Number(tier.maxQuantity ?? tier.minQuantity))) + 1
          : 1;

      return [
        ...prev,
        {
          minQuantity: nextMinQuantity,
          maxQuantity: undefined,
          price: basePrice ?? 0,
          label: "",
          tempId: `temp-${Date.now()}`,
          order: prev.length,
        },
      ];
    });
    setSuccess(null);
  };

  const handleRemoveTier = (index: number) => {
    setTiers((prev) => prev.filter((_, idx) => idx !== index));
    setSuccess(null);
  };

  const updateTier = <K extends keyof EditablePriceTier>(
    index: number,
    key: K,
    rawValue: EditablePriceTier[K] | string,
  ) => {
    setTiers((prev) =>
      prev.map((tier, idx) => {
        if (idx !== index) {
          return tier;
        }

        if (key === "minQuantity") {
          const numericValue = Number(rawValue);
          return {
            ...tier,
            minQuantity:
              Number.isFinite(numericValue) && numericValue > 0
                ? numericValue
                : tier.minQuantity,
          };
        }

        if (key === "price") {
          const numericValue = Number(rawValue);
          return {
            ...tier,
            price:
              Number.isFinite(numericValue) && numericValue >= 0
                ? numericValue
                : tier.price,
          };
        }

        if (key === "maxQuantity") {
          if (rawValue === "" || rawValue === null || rawValue === undefined) {
            return {
              ...tier,
              maxQuantity: undefined,
            };
          }

          const numericValue = Number(rawValue);
          return {
            ...tier,
            maxQuantity:
              Number.isFinite(numericValue) && numericValue >= tier.minQuantity
                ? numericValue
                : tier.maxQuantity,
          };
        }

        if (key === "label") {
          return {
            ...tier,
            label: typeof rawValue === "string" ? rawValue : tier.label,
          };
        }

        if (key === "order") {
          const numericValue = Number(rawValue);
          return {
            ...tier,
            order: Number.isFinite(numericValue) ? numericValue : tier.order,
          };
        }

        return tier;
      }),
    );
    setSuccess(null);
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await ProductService.getVariantPriceTiers(variantId);
      setTiers(result.map(createEditableTier));
    } catch (err: any) {
      console.error("Failed to reset price tiers:", err);
      setError(err?.message || "Failed to reset price tiers");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = toRequestPayload(tiers);
      const result = await ProductService.setVariantPriceTiers(variantId, payload);
      setTiers(result.map(createEditableTier));
      setSuccess("Price tiers saved successfully.");
    } catch (err: any) {
      console.error("Failed to save price tiers:", err);
      setError(err?.message || "Failed to save price tiers");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`${cardClasses} ${className ?? ""}`}>
      <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Quantity Pricing — {variantTitle}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Base price: <span className="font-medium text-brand-600 dark:text-brand-300">{formatCurrency(basePrice ?? undefined)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddTier}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/20 dark:text-brand-200"
            disabled={loading || saving}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Tier
          </button>
        </div>
      </div>

      <div className="space-y-4 px-6 py-6">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-xs text-green-600 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            Loading price tiers...
          </div>
        ) : tiers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            No price tiers configured. Add a tier to offer quantity-based pricing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Min Qty
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Max Qty
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Tier Price (₫)
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Label
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Order
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900/40">
                {tiers.map((tier, index) => (
                  <tr key={tier.id ?? tier.tempId ?? index}>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        className={`${inputClasses} text-center`}
                        value={tier.minQuantity}
                        onChange={(event) => updateTier(index, "minQuantity", event.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={tier.minQuantity ?? 1}
                        className={`${inputClasses} text-center`}
                        value={tier.maxQuantity ?? ""}
                        onChange={(event) => updateTier(index, "maxQuantity", event.target.value)}
                        placeholder="No max"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="1000"
                        className={`${inputClasses} text-center`}
                        value={tier.price}
                        onChange={(event) => updateTier(index, "price", event.target.value)}
                      />
                      <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                        {formatCurrency(tier.price)}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className={inputClasses}
                        value={tier.label ?? ""}
                        onChange={(event) => updateTier(index, "label", event.target.value)}
                        placeholder="Optional label"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        className={`${inputClasses} text-center`}
                        value={tier.order ?? index}
                        onChange={(event) => updateTier(index, "order", event.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className="rounded-full p-1 text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                        onClick={() => handleRemoveTier(index)}
                        title="Remove tier"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10 disabled:opacity-50"
            disabled={loading || saving}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-theme-sm transition hover:bg-brand-600 disabled:opacity-50"
            disabled={loading || saving}
          >
            {saving ? "Saving..." : "Save tiers"}
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default PriceTiers;
