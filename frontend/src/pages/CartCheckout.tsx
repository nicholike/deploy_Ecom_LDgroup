import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartService, type Cart as CartType } from "../services/cart.service";
import { OrderService } from "../services/order.service";
import { ProductService } from "../services/product.service";
import { quotaService, type QuotaResponse } from "../services/quota.service";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import type { PriceTier } from "../types/product.types";

type SizeKey = "5ml" | "20ml";

type CartItemDisplay = {
  productId: string;
  productName: string;
  isSpecial: boolean;
  quantities: Record<SizeKey, { quantity: number; itemId: string | null; variantId: string | null }>;
  price: number;
  // For special products without variants
  specialItemId?: string | null;
  specialQuantity?: number;
};

const sizes: SizeKey[] = ["5ml", "20ml"];

type VariantInfo = {
  variantId: string;
  basePrice: number;
  tiers: PriceTier[];
  active: boolean;
};

type ProductVariantMap = Record<SizeKey, VariantInfo | null>;

const createEmptyVariantMap = (): ProductVariantMap => ({
  "5ml": null,
  "20ml": null,
});

const buildQuantityRecord = (
  variantMap: ProductVariantMap
): CartItemDisplay["quantities"] => ({
  "5ml": { quantity: 0, itemId: null, variantId: variantMap["5ml"]?.variantId ?? null },
  "20ml": { quantity: 0, itemId: null, variantId: variantMap["20ml"]?.variantId ?? null },
});

const quantityOptions = [0, 10, 100];

const resolvePriceForQuantity = (info: VariantInfo | null, quantity: number): number => {
  if (!info) {
    return 0;
  }

  if (Array.isArray(info.tiers) && info.tiers.length > 0) {
    for (const tier of info.tiers) {
      const min = Number(tier.minQuantity);
      const max =
        tier.maxQuantity === undefined || tier.maxQuantity === null
          ? null
          : Number(tier.maxQuantity);
      if (quantity >= min && (max === null || quantity <= max)) {
        const tierPrice = Number(tier.price);
        if (Number.isFinite(tierPrice)) {
          return tierPrice;
        }
      }
    }
  }

  return Number.isFinite(info.basePrice) ? info.basePrice : 0;
};

type ProvinceData = {
  code: number;
  name: string;
  districts: DistrictData[];
};

type DistrictData = {
  code: number;
  name: string;
  wards: WardData[];
};

type WardData = {
  code: number;
  name: string;
};

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  selectedCode: string;
  selectedLabel: string;
  options: DropdownOption[];
  disabled?: boolean;
  required?: boolean;
  onSelect: (option: DropdownOption | null) => void;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");

const DropdownField: React.FC<DropdownFieldProps> = ({
  id,
  label,
  placeholder,
  selectedCode,
  selectedLabel,
  options,
  disabled = false,
  required = false,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen, selectedLabel]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return options;
    }
    const normalized = normalizeText(searchTerm);
    return options.filter((option) => normalizeText(option.label).includes(normalized));
  }, [options, searchTerm]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleOptionSelect = (option: DropdownOption | null) => {
    onSelect(option);
    setIsOpen(false);
  };

  const buttonLabel = selectedLabel || placeholder;

  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="w-1/3">
        {label}
      </label>
      <div className="relative w-2/3" ref={containerRef}>
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={handleToggle}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleToggle();
            }
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          disabled={disabled}
          className={`w-full rounded border border-gray-300 px-2 py-1 text-left text-[11px] md:text-[13px] focus:outline-none focus:ring-2 focus:ring-[#9b6a2a]/40 disabled:cursor-not-allowed disabled:opacity-60 ${
            selectedLabel ? "text-gray-900" : "text-gray-400"
          }`}
          data-required={required}
        >
          <span>{buttonLabel}</span>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#895B1A]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
            >
              <path d="M6.293 9.293a1 1 0 0 1 1.414 0L12 13.586l4.293-4.293a1 1 0 1 1 1.414 1.414l-5 5a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 0-1.414Z" />
            </svg>
          </span>
        </button>
        {isOpen && !disabled && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded border border-gray-300 bg-white shadow-lg">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filteredOptions.length > 0) {
                  event.preventDefault();
                  handleOptionSelect(filteredOptions[0]);
                }
                if (event.key === "Escape") {
                  event.stopPropagation();
                  setIsOpen(false);
                }
              }}
              aria-hidden
              className="absolute h-0 w-0 opacity-0"
            />
            <ul
              role="listbox"
              className="max-h-60 overflow-y-auto py-1"
              tabIndex={-1}
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-[11px] text-gray-500 md:text-[12px]">
                  Không tìm thấy
                </li>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value === selectedCode;
                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      className={`cursor-pointer px-3 py-2 text-[11px] md:text-[12px] hover:bg-[#fdf3e3] ${
                        isSelected ? "bg-[#fdf3e3] font-semibold" : ""
                      }`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleOptionSelect(option);
                      }}
                    >
                      {option.label}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const CartCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { getToken, loading: authLoading } = useAuth();
  const [isHeaderShrunk, setIsHeaderShrunk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartType | null>(null);
  const [productVariantsMap, setProductVariantsMap] = useState<Record<string, ProductVariantMap>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  // Form state
  const [shippingForm, setShippingForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    ward: "",
  });
  const [locationData, setLocationData] = useState<ProvinceData[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsHeaderShrunk(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    loadCart();
  }, []);

  // Fetch quota when component mounts and when cart changes
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    const fetchQuota = async () => {
      try {
        setQuotaLoading(true);
        const token = getToken();
        const quotaData = await quotaService.getMyQuota(token);
        setQuota(quotaData);
      } catch (error) {
        console.error('Failed to load quota:', error);
        // Don't block the user if quota check fails
      } finally {
        setQuotaLoading(false);
      }
    };

    fetchQuota();
  }, [cart, authLoading, getToken]);

  useEffect(() => {
    let isMounted = true;

    const fetchLocations = async () => {
      try {
        setLocationLoading(true);
        setLocationError(null);
        const response = await fetch("https://provinces.open-api.vn/api/?depth=3");
        if (!response.ok) {
          throw new Error(`Failed to load administrative data (${response.status})`);
        }
        const data = (await response.json()) as ProvinceData[];
        if (isMounted) {
          setLocationData(data);
        }
      } catch (error: any) {
        if (isMounted) {
          console.error("Failed to load administrative data:", error);
          setLocationError(
            error instanceof Error ? error.message : "Không thể tải dữ liệu tỉnh/thành phố.",
          );
        }
      } finally {
        if (isMounted) {
          setLocationLoading(false);
        }
      }
    };

    fetchLocations();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadProductVariants = async (cartData: CartType | null) => {
    if (!cartData?.items?.length) {
      setProductVariantsMap({});
      return;
    }

    const uniqueProductIds = Array.from(new Set(cartData.items.map((item) => item.productId)));

    try {
      const entries = await Promise.all(
        uniqueProductIds.map(async (productId) => {
          try {
            const product = await ProductService.getProduct(productId);
            const variantMap = createEmptyVariantMap();

            const variantLoaders = (product.variants ?? []).map(async (variant) => {
              const size = variant.size as SizeKey;
              if (sizes.includes(size) && variant.id) {
                let tiers: PriceTier[] = [];
                try {
                  const tierResponse = await ProductService.getVariantPriceTiers(variant.id);
                  if (Array.isArray(tierResponse)) {
                    tiers = tierResponse
                      .map((tier) => ({
                        ...tier,
                        minQuantity: Number(tier.minQuantity),
                        maxQuantity:
                          tier.maxQuantity === undefined || tier.maxQuantity === null
                            ? null
                            : Number(tier.maxQuantity),
                        price: Number(tier.price),
                      }))
                      .sort((a, b) => b.minQuantity - a.minQuantity);
                  }
                } catch (tierError) {
                  console.error(`Failed to load price tiers for variant ${variant.id}:`, tierError);
                }

                variantMap[size] = {
                  variantId: variant.id,
                  basePrice: Number(variant.salePrice ?? variant.price ?? 0),
                  tiers,
                  active: variant.active ?? true,
                };
              }
            });

            await Promise.all(variantLoaders);

            return [productId, variantMap] as const;
          } catch (error) {
            console.error(`Failed to load variants for product ${productId}:`, error);
            return [productId, createEmptyVariantMap()] as const;
          }
        })
      );

      setProductVariantsMap(Object.fromEntries(entries));
    } catch (error) {
      console.error("Failed to load product variants:", error);
    }
  };

  const normalizeName = (value: string) => normalizeText(value);

  const selectedProvince = useMemo(() => {
    if (!shippingForm.city) {
      return undefined;
    }
    return locationData.find(
      (province) => normalizeName(province.name) === normalizeName(shippingForm.city),
    );
  }, [locationData, shippingForm.city]);

  const districtOptions = useMemo(() => selectedProvince?.districts ?? [], [selectedProvince]);

  const selectedDistrict = useMemo(() => {
    if (!shippingForm.district) {
      return undefined;
    }
    return districtOptions.find(
      (district) => normalizeName(district.name) === normalizeName(shippingForm.district),
    );
  }, [districtOptions, shippingForm.district]);

  const wardOptions = useMemo(() => selectedDistrict?.wards ?? [], [selectedDistrict]);

  const provinceOptions = useMemo<DropdownOption[]>(
    () => locationData.map((province) => ({ value: String(province.code), label: province.name })),
    [locationData],
  );

  const districtOptionsList = useMemo<DropdownOption[]>(
    () => districtOptions.map((district) => ({ value: String(district.code), label: district.name })),
    [districtOptions],
  );

  const wardOptionsList = useMemo<DropdownOption[]>(
    () => wardOptions.map((ward) => ({ value: String(ward.code), label: ward.name })),
    [wardOptions],
  );

  const selectedProvinceCode = selectedProvince ? String(selectedProvince.code) : "";
  const selectedDistrictCode = selectedDistrict ? String(selectedDistrict.code) : "";
  const selectedWardCode = useMemo(() => {
    if (!shippingForm.ward || !selectedDistrict) {
      return "";
    }
    const matched = selectedDistrict.wards.find(
      (ward) => normalizeName(ward.name) === normalizeName(shippingForm.ward),
    );
    return matched ? String(matched.code) : "";
  }, [selectedDistrict, shippingForm.ward]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await CartService.getCart();
      setCart(cartData);
      setCartItemCount(cartData?.items?.length || 0);
      await loadProductVariants(cartData);
    } catch (error: any) {
      console.error("Failed to load cart:", error);
      if (error.message.includes('Session expired')) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Transform cart items to display format (group by product, show sizes)
  const displayItems: CartItemDisplay[] = useMemo(() => {
    if (!cart || !cart.items) return [];

    const grouped = new Map<string, CartItemDisplay>();

    cart.items.forEach((item) => {
      const productId = item.productId;
      const size = item.productVariant?.size as SizeKey | undefined;
      const variantMap = productVariantsMap[productId] ?? createEmptyVariantMap();

      if (!grouped.has(productId)) {
        grouped.set(productId, {
          productId,
          productName: item.product.name,
          isSpecial: item.product.isSpecial || false,
          quantities: buildQuantityRecord(variantMap),
          price: 0,
          specialItemId: null,
          specialQuantity: 0,
        });
      }

      const displayItem = grouped.get(productId)!;

      if (size && sizes.includes(size)) {
        const variantData = variantMap[size];
        let pricePerUnit = resolvePriceForQuantity(variantData, item.quantity);

        if (pricePerUnit === 0) {
          const rawPrice = item.productVariant?.salePrice ?? item.productVariant?.price;
          if (rawPrice !== undefined) {
            const numericPrice = Number(rawPrice);
            if (Number.isFinite(numericPrice)) {
              pricePerUnit = numericPrice;
            }
          }
        }

        displayItem.quantities[size] = {
          quantity: item.quantity,
          itemId: item.id,
          variantId: item.productVariantId ?? variantData?.variantId ?? null,
        };
        displayItem.price += pricePerUnit * item.quantity;
      } else if (item.product.isSpecial) {
        // Handle special products without variants
        displayItem.specialItemId = item.id;
        displayItem.specialQuantity = item.quantity;

        const productPrice = item.product.salePrice ?? item.product.price;
        if (productPrice !== undefined) {
          const numericPrice = Number(productPrice);
          if (Number.isFinite(numericPrice)) {
            displayItem.price += numericPrice * item.quantity;
          }
        }
      }
    });

    return Array.from(grouped.values());
  }, [cart, productVariantsMap]);

  const totalAmount = useMemo(() => {
    return displayItems.reduce((sum, item) => sum + item.price, 0);
  }, [displayItems]);

  // Calculate total quantity of products in cart
  const totalCartQuantity = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Check if cart exceeds quota
  const quotaExceeded = useMemo(() => {
    if (!quota) return false;
    return totalCartQuantity > quota.quotaRemaining;
  }, [quota, totalCartQuantity]);

  useEffect(() => {
    if (!shippingForm.city) {
      return;
    }
    const match = selectedProvince;
    if (match && shippingForm.city !== match.name) {
      setShippingForm((prev) => ({
        ...prev,
        city: match.name,
      }));
    }
  }, [selectedProvince, shippingForm.city]);

  useEffect(() => {
    if (!shippingForm.district) {
      return;
    }
    const match = selectedDistrict;
    if (match && shippingForm.district !== match.name) {
      setShippingForm((prev) => ({
        ...prev,
        district: match.name,
      }));
    }
  }, [selectedDistrict, shippingForm.district]);

  useEffect(() => {
    if (!shippingForm.ward || !selectedDistrict) {
      return;
    }
    const match = selectedDistrict.wards.find(
      (ward) => normalizeName(ward.name) === normalizeName(shippingForm.ward),
    );
    if (match && shippingForm.ward !== match.name) {
      setShippingForm((prev) => ({
        ...prev,
        ward: match.name,
      }));
    }
  }, [selectedDistrict, shippingForm.ward]);

  const handleProvinceInputChange = (value: string) => {
    setShippingForm((prev) => ({
      ...prev,
      city: value,
      district: "",
      ward: "",
    }));
  };

  const handleDistrictInputChange = (value: string) => {
    setShippingForm((prev) => ({
      ...prev,
      district: value,
      ward: "",
    }));
  };

  const handleWardInputChange = (value: string) => {
    setShippingForm((prev) => ({
      ...prev,
      ward: value,
    }));
  };

  const handleProvinceSelect = (option: DropdownOption | null) => {
    setShippingForm((prev) => ({
      ...prev,
      city: option?.label ?? "",
      district: "",
      ward: "",
    }));
  };

  const handleDistrictSelect = (option: DropdownOption | null) => {
    setShippingForm((prev) => ({
      ...prev,
      district: option?.label ?? "",
      ward: "",
    }));
  };

  const handleWardSelect = (option: DropdownOption | null) => {
    setShippingForm((prev) => ({
      ...prev,
      ward: option?.label ?? "",
    }));
  };

  const handleQuantityChange = async (
    productId: string,
    size: SizeKey,
    sizeData: { quantity: number; itemId: string | null; variantId: string | null },
    newQuantity: number
  ) => {
    if (newQuantity === sizeData.quantity) {
      return;
    }

    try {
      if (sizeData.itemId) {
        if (newQuantity === 0) {
          await CartService.removeCartItem(sizeData.itemId);
        } else {
          await CartService.updateCartItem(sizeData.itemId, newQuantity);
        }
      } else if (sizeData.variantId) {
        if (newQuantity === 0) {
          return;
        }
        await CartService.addToCart({
          productId,
          productVariantId: sizeData.variantId,
          quantity: newQuantity,
        });
      } else {
        console.warn(`Missing cart item and variant information for product ${productId} (${size})`);
        return;
      }
      await loadCart();
    } catch (error: any) {
      console.error("Failed to update cart:", error);
      showToast({
        tone: "error",
        title: "Cập nhật giỏ hàng thất bại",
        description: error.message || "Vui lòng thử lại.",
      });
    }
  };

  const renderQuantitySelect = (
    productId: string,
    size: SizeKey,
    sizeData: { quantity: number; itemId: string | null; variantId: string | null }
  ) => {
    const variantInfo = productVariantsMap[productId]?.[size];
    const isActive = variantInfo?.active ?? true;
    const isDisabled = (!sizeData.itemId && !sizeData.variantId) || !isActive;

    return (
      <div className="flex justify-center items-center" style={{ opacity: !isActive ? 0.5 : 1 }}>
        <div className="relative inline-flex items-center">
          <select
            value={sizeData.quantity.toString()}
            onChange={(e) => {
              handleQuantityChange(
                productId,
                size,
                sizeData,
                parseInt(e.target.value, 10)
              );
            }}
            disabled={isDisabled}
            className="h-6 w-10 border border-black rounded-md text-center text-[11px] bg-white appearance-none pr-[10px] pl-1 py-0 leading-[1.5rem] focus:outline-none !text-center md:h-8 md:w-14 md:pr-0 md:pl-0 md:text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ WebkitAppearance: "none", MozAppearance: "none", backgroundImage: "none" }}
          >
            {quantityOptions.map((option) => (
              <option key={option} value={option.toString()}>
                {option}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-[65%] text-[#895B1A]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3 h-3"
            >
              <path d="M6.293 9.293a1 1 0 0 1 1.414 0L12 13.586l4.293-4.293a1 1 0 1 1 1.414 1.414l-5 5a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 0-1.414Z" />
            </svg>
          </span>
        </div>
      </div>
    );
  };

  // Handle quantity change for special products in cart
  const handleSpecialQuantityChange = async (
    itemId: string | null | undefined,
    currentQuantity: number,
    newQuantity: number
  ) => {
    if (!itemId) {
      console.warn('Missing itemId for special product');
      return;
    }

    // Ensure quantity is not negative
    const validQuantity = Math.max(0, newQuantity);

    if (validQuantity === currentQuantity) {
      return;
    }

    try {
      if (validQuantity === 0) {
        await CartService.removeCartItem(itemId);
      } else {
        await CartService.updateCartItem(itemId, validQuantity);
      }
      await loadCart();
    } catch (error: any) {
      console.error("Failed to update special product quantity:", error);
      showToast({
        tone: "error",
        title: "Cập nhật giỏ hàng thất bại",
        description: error.message || "Vui lòng thử lại.",
      });
    }
  };

  // Render quantity input for special products in cart
  const renderSpecialProductQuantity = (
    itemId: string | null | undefined,
    quantity: number
  ) => {
    return (
      <div className="flex justify-center items-center">
        <input
          type="number"
          value={quantity}
          onChange={(e) => {
            const newQty = parseInt(e.target.value) || 0;
            handleSpecialQuantityChange(itemId, quantity, newQty);
          }}
          className="h-6 w-[88px] border border-black rounded-md text-center text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-[#895B1A] md:h-8 md:w-[120px] md:text-[12px] py-0"
          style={{ fontSize: '17px' }}
          min="0"
          placeholder="0"
        />
      </div>
    );
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) {
      showToast({
        tone: "info",
        title: "Giỏ hàng trống",
        description: "Vui lòng chọn sản phẩm trước khi thanh toán.",
      });
      return;
    }

    // Validate quota before checkout
    if (quota && quotaExceeded) {
      showToast({
        tone: "error",
        title: "Vượt quá hạn mức mua hàng",
        description: `Bạn chỉ có thể mua thêm ${quota.quotaRemaining} sản phẩm trong kỳ này. Giỏ hàng hiện có ${totalCartQuantity} sản phẩm.`,
      });
      return;
    }

    if (
      !shippingForm.name ||
      !shippingForm.phone ||
      !shippingForm.address ||
      !shippingForm.city ||
      !shippingForm.district ||
      !shippingForm.ward
    ) {
      showToast({
        tone: "error",
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ thông tin nhận hàng (bao gồm Tỉnh/Quận/Phường).",
      });
      return;
    }

    try {
      setSubmitting(true);

      const order = await OrderService.createOrder({
        shippingAddress: {
          name: shippingForm.name,
          phone: shippingForm.phone,
          address: shippingForm.address,
          city: shippingForm.city,
          district: shippingForm.district,
          ward: shippingForm.ward,
        },
        shippingMethod: "STANDARD",
        paymentMethod: "BANK_TRANSFER",
        customerNote: "",
      });

      // ✅ NEW: Navigate to payment page with PENDING order number
      // Order will only be created AFTER payment is confirmed
      navigate(`/payment/${order.pendingNumber}`);
    } catch (error: any) {
      console.error("Failed to create order:", error);
      showToast({
        tone: "error",
        title: "Đặt hàng thất bại",
        description: error.message || "Vui lòng thử lại.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Đang tải giỏ hàng...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-12 text-black">
      <header
        className={`sticky top-0 z-20 w-full bg-white/95 backdrop-blur-sm flex justify-center transition-all duration-300 ${
          isHeaderShrunk ? "shadow-sm" : ""
        }`}
      >
        <div
          className={`w-full md:w-[65%] flex items-center justify-between transition-all duration-300 origin-top ${
            isHeaderShrunk ? "py-1 md:py-1 scale-90" : "py-2 md:py-2.5 scale-100"
          }`}
        >
          <a href="/" className="block">
            <img
              src="/LOGO_LD%20PERFUME%20OIL%20LUXURY%20(4)_NA%CC%82U%201.svg"
              alt="LD Perfume Oil Luxury logo"
              className={`h-auto object-contain transition-all duration-300 ${
                isHeaderShrunk ? "w-24 md:w-40" : "w-32 md:w-48"
              }`}
            />
          </a>
          <div className="flex items-center space-x-3 md:space-x-4 text-black">
            <a href="/cart" aria-label="Xem giỏ hàng" className="block relative">
              <img
                src="/shopping-cart 1.svg"
                alt="Giỏ hàng"
                className="h-5 w-5 object-contain"
              />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </a>
            <a
              href="/account"
              className="flex items-center space-x-2 cursor-pointer text-[11px] md:text-[12px] text-black font-semibold hover:text-[#5f3d10] transition"
            >
              <img
                src="/user 1.svg"
                alt="Tài khoản"
                className="h-5 w-5 object-contain"
              />
              <span className="hidden md:inline">Tài khoản</span>
            </a>
          </div>
        </div>
      </header>

      <div className="w-full border-b border-[rgba(0,0,0,0.12)]" />

      <div className="mt-2 flex justify-center mx-4 md:mx-0">
        <nav className="w-full md:w-[65%] text-[11px] md:text-[12px] flex items-center gap-1 text-[#9b6a2a]">
          <a href="/" className="hover:underline">Trang chủ</a>
          <span className="text-black/50">/</span>
          <span className="text-black">Giỏ hàng</span>
        </nav>
      </div>

      <main className="mt-6 flex justify-center mx-4 md:mx-0">
        <div className="w-full space-y-6 md:w-[65%]">
          <section className="space-y-4">
            <h2 className="text-[14px] font-extrabold md:text-[16px]">GIỎ HÀNG</h2>

            {displayItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Giỏ hàng trống</p>
                <a
                  href="/"
                  className="inline-block bg-[#9b6a2a] text-white px-6 py-2 rounded-sm hover:bg-[#7a531f] transition"
                >
                  Tiếp tục mua sắm
                </a>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full border-collapse text-[11px] md:text-[13px] text-left">
                    <thead>
                      <tr className="bg-[#9b6a2a] text-white">
                        <th className="w-[40%] px-3 py-2 font-semibold">Sản phẩm</th>
                        {sizes.map((size) => (
                          <th
                            key={size}
                            className="w-[8%] px-0.5 py-2 text-center font-semibold"
                          >
                            {size}
                          </th>
                        ))}
                        <th className="w-[28%] px-3 py-2 text-right font-semibold">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayItems.map((item, index) => (
                        <tr key={item.productId} className={index % 2 === 0 ? "bg-[#fdf8f2]" : ""}>
                          <td className="px-3 py-3 text-gray-900">{item.productName}</td>
                          {item.isSpecial ? (
                            <td colSpan={sizes.length} className="px-0.5 py-3 text-center">
                              {renderSpecialProductQuantity(item.specialItemId, item.specialQuantity || 0)}
                            </td>
                          ) : (
                            sizes.map((size) => (
                              <td
                                key={`${item.productId}-${size}`}
                                className="px-0.5 py-3 text-center"
                              >
                                {renderQuantitySelect(item.productId, size, item.quantities[size])}
                              </td>
                            ))
                          )}
                          <td className="px-3 py-3 text-right font-semibold text-[#9b6a2a]">
                            {formatCurrency(item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view */}
                <div className="space-y-3 md:hidden">
                  <div className="grid grid-cols-[1.6fr_repeat(2,0.6fr)_1.6fr] gap-x-0.5 rounded-sm bg-[#9b6a2a] text-[11px] md:text-[13px] font-semibold text-white">
                    <div className="px-2 py-1 text-left">Sản phẩm</div>
                    {sizes.map((size) => (
                      <div key={size} className="py-1 text-center">
                        {size}
                      </div>
                    ))}
                    <div className="py-1 text-right pr-2">Thành tiền</div>
                  </div>

                  {displayItems.map((item) => (
                    <div key={item.productId} className="grid grid-cols-[1.6fr_repeat(2,0.6fr)_1.6fr] gap-x-0.5 items-center text-[11px] md:text-[13px]">
                      <div className="px-2 text-gray-900">{item.productName}</div>
                      {item.isSpecial ? (
                        <div className="col-span-2 text-center">
                          {renderSpecialProductQuantity(item.specialItemId, item.specialQuantity || 0)}
                        </div>
                      ) : (
                        sizes.map((size) => (
                          <div
                            key={`${item.productId}-${size}`}
                            className="flex justify-center"
                          >
                            {renderQuantitySelect(item.productId, size, item.quantities[size])}
                          </div>
                        ))
                      )}
                      <div className="pr-2 text-right font-semibold text-[#9b6a2a]">
                        {formatCurrency(item.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {displayItems.length > 0 && (
            <section className="space-y-3 text-[11px] md:text-[13px]">
              {/* Quota Info - Hiển thị giới hạn mua hàng */}
              {cart?.quotaInfo && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 space-y-2">
                  <h3 className="font-extrabold text-yellow-800">Thông tin hạn mức mua hàng</h3>
                  <div className="text-[10px] md:text-[12px] text-yellow-900 space-y-1">
                    <div className="flex justify-between">
                      <span>Hạn mức tối đa:</span>
                      <span className="font-semibold">{cart.quotaInfo.quotaLimit} sản phẩm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Đã sử dụng:</span>
                      <span className="font-semibold">{cart.quotaInfo.quotaUsed} sản phẩm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Còn lại:</span>
                      <span className="font-semibold">{cart.quotaInfo.quotaRemaining} sản phẩm</span>
                    </div>
                    {cart.quotaInfo.cartQuantity !== undefined && (
                      <>
                        <div className="flex justify-between text-orange-700">
                          <span>Số lượng trong giỏ:</span>
                          <span className="font-bold">{cart.quotaInfo.cartQuantity} sản phẩm</span>
                        </div>
                        <div className="flex justify-between text-red-700">
                          <span>Còn lại sau khi đặt hàng:</span>
                          <span className="font-bold">{cart.quotaInfo.remainingAfterCart} sản phẩm</span>
                        </div>
                      </>
                    )}
                    {cart.quotaInfo.quotaPeriodStart && (
                      <div className="mt-2 pt-2 border-t border-yellow-300 text-[9px] md:text-[11px]">
                        Kỳ hạn: {new Date(cart.quotaInfo.quotaPeriodStart).toLocaleDateString('vi-VN')} - {cart.quotaInfo.quotaPeriodEnd ? new Date(cart.quotaInfo.quotaPeriodEnd).toLocaleDateString('vi-VN') : 'N/A'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between border-t border-black/70 py-1 font-extrabold pt-4">
                <span>Tổng đơn đặt hàng</span>
                <span className="text-[#9b6a2a]">{formatCurrency(totalAmount)}</span>
              </div>
              <hr className="border-black/70" />

              <div className="pt-5">
                <h3 className="font-extrabold">Thông tin nhận hàng</h3>
              </div>
              <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                <div className="flex items-center justify-between">
                  <label htmlFor="name" className="w-1/3">Họ và tên</label>
                  <input
                    id="name"
                    type="text"
                    className="w-2/3 rounded border border-gray-300 px-2 py-1 text-[11px] md:text-[13px]"
                    style={{ fontSize: '17px' }}
                    value={shippingForm.name}
                    onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="phone" className="w-1/3">Số điện thoại</label>
                  <input
                    id="phone"
                    type="text"
                    className="w-2/3 rounded border border-gray-300 px-2 py-1 text-[11px] md:text-[13px]"
                    style={{ fontSize: '17px' }}
                    value={shippingForm.phone}
                    onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="flex items-start justify-between">
                  <label htmlFor="address" className="w-1/3 pt-1">Địa chỉ</label>
                  <textarea
                    id="address"
                    rows={2}
                    className="w-2/3 rounded border border-gray-300 px-2 py-1 text-[11px] md:text-[13px]"
                    value={shippingForm.address}
                    onChange={(e) =>
                      setShippingForm((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    placeholder="Ví dụ: 123 Nguyễn Huệ..."
                    required
                  />
                </div>
                {locationError ? (
                  <>
                    <div className="flex items-center justify-between">
                      <label htmlFor="city" className="w-1/3">Tỉnh / Thành phố</label>
                      <input
                        id="city"
                        type="text"
                        className="w-2/3 rounded border border-gray-300 px-2 py-1 text-[11px] md:text-[13px]"
                        style={{ fontSize: '17px' }}
                        value={shippingForm.city}
                        onChange={(e) => handleProvinceInputChange(e.target.value)}
                        placeholder="Ví dụ: Thành phố Hồ Chí Minh"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="district" className="w-1/3">Quận / Huyện</label>
                      <input
                        id="district"
                        type="text"
                        className="w-2/3 rounded border border-gray-300 px-2 py-1 text-[11px] md:text-[13px]"
                        style={{ fontSize: '17px' }}
                        value={shippingForm.district}
                        onChange={(e) => handleDistrictInputChange(e.target.value)}
                        placeholder="Ví dụ: Quận 1"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between mb-[4%] pb-[4%]">
                      <label htmlFor="ward" className="w-1/3">Phường / Xã</label>
                      <input
                        id="ward"
                        type="text"
                        className="w-2/3 rounded border border-gray-300 px-2 py-1 text-[11px] md:text-[13px]"
                        style={{ fontSize: '17px' }}
                        value={shippingForm.ward}
                        onChange={(e) => handleWardInputChange(e.target.value)}
                        placeholder="Ví dụ: Phường Bến Nghé"
                        required
                      />
                    </div>
                    <p className="-mt-2 text-[10px] text-red-600 md:text-[11px]">{locationError}. Vui lòng nhập tay.</p>
                  </>
                ) : (
                  <>
                    <DropdownField
                      id="city"
                      label="Tỉnh / Thành phố"
                      placeholder="Chọn Tỉnh / Thành phố"
                      selectedCode={selectedProvinceCode}
                      selectedLabel={shippingForm.city}
                      options={provinceOptions}
                      disabled={locationLoading || locationData.length === 0}
                      required
                      onSelect={handleProvinceSelect}
                    />
                    <DropdownField
                      id="district"
                      label="Quận / Huyện"
                      placeholder="Chọn Quận / Huyện"
                      selectedCode={selectedDistrictCode}
                      selectedLabel={shippingForm.district}
                      options={districtOptionsList}
                      disabled={locationLoading || !selectedProvince || districtOptionsList.length === 0}
                      required
                      onSelect={handleDistrictSelect}
                    />
                    <DropdownField
                      id="ward"
                      label="Phường / Xã"
                      placeholder="Chọn Phường / Xã"
                      selectedCode={selectedWardCode}
                      selectedLabel={shippingForm.ward}
                      options={wardOptionsList}
                      disabled={locationLoading || !selectedDistrict || wardOptionsList.length === 0}
                      required
                      onSelect={handleWardSelect}
                    />
                  </>
                )}
              </form>

              <hr className="border-black/70 mt-8" />

              <div className="flex justify-between text-[11px] md:text-[13px] !mt-6">
                <span className="font-extrabold">Vận chuyển</span>
                <span className="text-right leading-[1.8]">
                  Miễn phí
                  <br />
                  Giao hàng từ 2 - 5 ngày
                </span>
              </div>
              <div className="flex justify-between text-[11px] md:text-[13px] pb-[4%]">
                <span className="font-extrabold">Phương thức thanh toán</span>
                <span className="text-right">Thanh toán Internet Banking</span>
              </div>

              {/* Quota Warning */}
              {quota && !quotaLoading && (
                <div className="mt-4">
                  {quotaExceeded ? (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-[11px] md:text-[12px] font-semibold text-red-800 mb-1">
                            Vượt quá hạn mức mua hàng
                          </p>
                          <p className="text-[10px] md:text-[11px] text-red-700">
                            Bạn chỉ có thể mua thêm <strong>{quota.quotaRemaining}</strong> sản phẩm. 
                            Giỏ hàng hiện có <strong>{totalCartQuantity}</strong> sản phẩm.
                          </p>
                          {quota.quotaPeriodEnd && (
                            <p className="text-[10px] md:text-[11px] text-red-600 mt-1">
                              Hạn mức sẽ được làm mới sau: {new Date(quota.quotaPeriodEnd).toLocaleDateString('vi-VN')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-[11px] md:text-[12px] font-semibold text-blue-800 mb-1">
                            Hạn mức mua hàng
                          </p>
                          <p className="text-[10px] md:text-[11px] text-blue-700">
                            Đã sử dụng: <strong>{quota.quotaUsed}</strong> / {quota.quotaLimit} sản phẩm
                            {totalCartQuantity > 0 && (
                              <> · Sau đặt hàng này: <strong>{quota.quotaUsed + totalCartQuantity}</strong> / {quota.quotaLimit}</>
                            )}
                          </p>
                          {quota.quotaPeriodEnd && (
                            <p className="text-[10px] md:text-[11px] text-blue-600 mt-1">
                              Kỳ hiện tại đến: {new Date(quota.quotaPeriodEnd).toLocaleDateString('vi-VN')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={submitting || quotaExceeded}
                className="mt-10 w-full rounded-sm bg-[#9b6a2a] py-3 text-[11px] md:text-[13px] font-semibold uppercase tracking-wide text-white transition hover:bg-[#7a531f] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Đang xử lý..." : quotaExceeded ? "Vượt quá hạn mức" : "Thanh toán"}
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default CartCheckout;
