import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CartService, type Cart as CartType } from "../services/cart.service";
import { OrderService } from "../services/order.service";
import { ProductService } from "../services/product.service";
import { quotaService, type QuotaResponse } from "../services/quota.service";
import { SettingsService } from "../services/settings.service";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import type { PriceTier } from "../types/product.types";
import { TrashIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

type SizeKey = "5ml" | "20ml";

type GlobalPricingConfig = {
  '5ml': {
    range1to9: number;
    range10to99: number;
    range100plus: number;
  };
  '20ml': {
    range1to9: number;
    range10to99: number;
    range100plus: number;
  };
};

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

// Extended to support any variant size (including "Standard" for special products)
type ProductVariantMap = Record<string, VariantInfo | null>;

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

// Price info tooltip component
type PriceTooltipProps = {
  size: '5ml' | '20ml';
  currentQuantity: number;
  config: {
    range1to9: number;
    range10to99: number;
    range100plus: number;
  } | null;
};

const PriceTooltip: React.FC<PriceTooltipProps> = ({ size, currentQuantity, config }) => {
  const [show, setShow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (!config) return null;

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as any);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [show]);

  // Determine which tier applies to current quantity
  const getCurrentTier = () => {
    if (currentQuantity >= 100) {
      return { range: '100+', price: config.range100plus };
    } else if (currentQuantity >= 10) {
      return { range: '10-99', price: config.range10to99 };
    } else {
      return { range: '1-9', price: config.range1to9 };
    }
  };

  const currentTier = getCurrentTier();
  const totalPrice = currentQuantity * currentTier.price;

  return (
    <div className="relative inline-block ml-1" ref={tooltipRef}>
      <button
        type="button"
        onMouseEnter={() => {
          // Only hover on desktop
          if (window.innerWidth >= 768) {
            setShow(true);
          }
        }}
        onMouseLeave={() => {
          // Only hover on desktop
          if (window.innerWidth >= 768) {
            setShow(false);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
        className="text-[#9b6a2a] hover:text-[#7a531f] transition-colors"
        aria-label="Xem bảng giá"
      >
        <InformationCircleIcon className="h-4 w-4 inline-block" />
      </button>
      
      {show && (
        <div className="absolute left-0 bottom-full mb-2 z-50 w-56 md:w-64 bg-white border-2 border-[#9b6a2a] rounded-lg shadow-xl p-2 md:p-3 text-[10px] md:text-xs">
          <div className="font-bold text-[#9b6a2a] mb-1.5 md:mb-2 text-center text-[11px] md:text-xs">
            Bảng giá {size}
          </div>
          <div className="space-y-1 md:space-y-1.5">
            <div className="flex justify-between items-center py-0.5 md:py-1 border-b border-gray-200">
              <span className="text-gray-700 text-[9px] md:text-xs">1-9 chai:</span>
              <span className="font-semibold text-[#9b6a2a] text-[9px] md:text-xs">{formatCurrency(config.range1to9)}/chai</span>
            </div>
            <div className="flex justify-between items-center py-0.5 md:py-1 border-b border-gray-200">
              <span className="text-gray-700 text-[9px] md:text-xs">10-99 chai:</span>
              <span className="font-semibold text-[#9b6a2a] text-[9px] md:text-xs">{formatCurrency(config.range10to99)}/chai</span>
            </div>
            <div className="flex justify-between items-center py-0.5 md:py-1 border-b border-gray-200">
              <span className="text-gray-700 text-[9px] md:text-xs">100+ chai:</span>
              <span className="font-semibold text-[#9b6a2a] text-[9px] md:text-xs">{formatCurrency(config.range100plus)}/chai</span>
            </div>
          </div>
          
          {/* Current quantity calculation */}
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t-2 border-[#9b6a2a] bg-[#fdf8f2] -mx-2 md:-mx-3 px-2 md:px-3 py-1.5 md:py-2 rounded-b-lg">
            <div className="font-bold text-gray-800 mb-0.5 md:mb-1 text-center text-[10px] md:text-[11px]">
              Giỏ hàng của bạn
            </div>
            <div className="text-center text-[9px] md:text-[10px] text-gray-600 mb-0.5 md:mb-1">
              {currentQuantity} chai × {formatCurrency(currentTier.price)}
            </div>
            <div className="text-center">
              <span className="text-[9px] md:text-[10px] text-gray-700">Tổng: </span>
              <span className="font-bold text-[#9b6a2a] text-[11px] md:text-[13px]">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="text-center text-[8px] md:text-[9px] text-gray-500 mt-0.5 md:mt-1">
              (Áp dụng giá: {currentTier.range} chai)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Total breakdown tooltip component
type TotalBreakdownTooltipProps = {
  qty5ml: number;
  qty20ml: number;
  qtyKit: number;
  pricingConfig: GlobalPricingConfig | null;
  displayItems: CartItemDisplay[];
};

const TotalBreakdownTooltip: React.FC<TotalBreakdownTooltipProps> = ({ 
  qty5ml, 
  qty20ml, 
  qtyKit,
  pricingConfig,
  displayItems
}) => {
  const [show, setShow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as any);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [show]);

  // Calculate tier and price for each size
  const get5mlTier = () => {
    if (!pricingConfig) return { range: '1-9', price: 139000 };
    const config = pricingConfig['5ml'];
    if (qty5ml >= 100) return { range: '100+', price: config.range100plus };
    if (qty5ml >= 10) return { range: '10-99', price: config.range10to99 };
    return { range: '1-9', price: config.range1to9 };
  };

  const get20mlTier = () => {
    if (!pricingConfig) return { range: '1-9', price: 450000 };
    const config = pricingConfig['20ml'];
    if (qty20ml >= 100) return { range: '100+', price: config.range100plus };
    if (qty20ml >= 10) return { range: '10-99', price: config.range10to99 };
    return { range: '1-9', price: config.range1to9 };
  };

  const tier5ml = get5mlTier();
  const tier20ml = get20mlTier();
  
  const total5ml = qty5ml * tier5ml.price;
  const total20ml = qty20ml * tier20ml.price;
  
  // Calculate kit total from displayItems
  const totalKit = displayItems
    .filter(item => item.isSpecial)
    .reduce((sum, item) => sum + item.price, 0);

  const grandTotal = total5ml + total20ml + totalKit;

  return (
    <div className="relative inline-block ml-1" ref={tooltipRef}>
      <button
        type="button"
        onMouseEnter={() => {
          // Only hover on desktop
          if (window.innerWidth >= 768) {
            setShow(true);
          }
        }}
        onMouseLeave={() => {
          // Only hover on desktop
          if (window.innerWidth >= 768) {
            setShow(false);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
        className="text-[#9b6a2a] hover:text-[#7a531f] transition-colors"
        aria-label="Xem chi tiết"
      >
        <InformationCircleIcon className="h-4 w-4 inline-block" />
      </button>
      
      {show && (
        <div className="absolute left-0 bottom-full mb-2 z-50 w-56 md:w-72 bg-white border-2 border-[#9b6a2a] rounded-lg shadow-xl p-2 md:p-3 text-[10px] md:text-xs">
          <div className="font-bold text-[#9b6a2a] mb-1.5 md:mb-2 text-center text-[11px] md:text-xs">
            Chi tiết
          </div>
          
          <div className="space-y-1.5 md:space-y-2">
            {qty5ml > 0 && (
              <div className="pb-1.5 md:pb-2 border-b border-gray-200">
                <div className="flex justify-between items-center mb-0.5 md:mb-1">
                  <span className="text-gray-700 font-semibold text-[10px] md:text-xs">SP 5ml:</span>
                  <span className="text-[#9b6a2a] font-semibold text-[10px] md:text-xs">{formatCurrency(total5ml)}</span>
                </div>
                <div className="text-[9px] md:text-[10px] text-gray-600 text-right">
                  {qty5ml} chai × {formatCurrency(tier5ml.price)} ({tier5ml.range} chai)
                </div>
              </div>
            )}
            
            {qty20ml > 0 && (
              <div className="pb-1.5 md:pb-2 border-b border-gray-200">
                <div className="flex justify-between items-center mb-0.5 md:mb-1">
                  <span className="text-gray-700 font-semibold text-[10px] md:text-xs">SP 20ml:</span>
                  <span className="text-[#9b6a2a] font-semibold text-[10px] md:text-xs">{formatCurrency(total20ml)}</span>
                </div>
                <div className="text-[9px] md:text-[10px] text-gray-600 text-right">
                  {qty20ml} chai × {formatCurrency(tier20ml.price)} ({tier20ml.range} chai)
                </div>
              </div>
            )}
            
            {qtyKit > 0 && (
              <div className="pb-1.5 md:pb-2 border-b border-gray-200">
                <div className="flex justify-between items-center mb-0.5 md:mb-1">
                  <span className="text-gray-700 font-semibold text-[10px] md:text-xs">SP Kit:</span>
                  <span className="text-[#9b6a2a] font-semibold text-[10px] md:text-xs">{formatCurrency(totalKit)}</span>
                </div>
                <div className="text-[9px] md:text-[10px] text-gray-600 text-right">
                  {qtyKit} bộ
                </div>
              </div>
            )}
          </div>
          
          {/* Grand total */}
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t-2 border-[#9b6a2a] bg-[#fdf8f2] -mx-2 md:-mx-3 px-2 md:px-3 py-1.5 md:py-2 rounded-b-lg">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800 text-[10px] md:text-[11px]">TỔNG:</span>
              <span className="font-bold text-[#9b6a2a] text-[12px] md:text-[14px]">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Separate component for special product quantity to maintain local state
type SpecialProductQuantityProps = {
  itemId: string | null | undefined;
  quantity: number;
  onQuantityChange: (itemId: string | null | undefined, currentQty: number, newQty: number, shouldRemoveIfZero?: boolean) => void;
  onRemovalRequest?: (itemId: string | null | undefined, currentQty: number) => void;
};

const SpecialProductQuantity: React.FC<SpecialProductQuantityProps> = ({
  itemId,
  quantity,
  onQuantityChange,
  onRemovalRequest,
}) => {
  const [localValue, setLocalValue] = useState(quantity.toString());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Sync local value when prop changes from parent
  useEffect(() => {
    setLocalValue(quantity === 0 ? '' : quantity.toString());
  }, [quantity]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow empty string or valid numbers
    if (value === '' || /^\d+$/.test(value)) {
      setLocalValue(value);
      
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Set new timeout for API call (only for spinner changes, not manual typing)
      if (!isTypingRef.current) {
        debounceTimeoutRef.current = setTimeout(() => {
          const newQty = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
          
          if (newQty === 0) {
            // Request removal confirmation from parent
            if (onRemovalRequest) {
              onRemovalRequest(itemId, quantity);
            }
          } else if (newQty !== quantity) {
            onQuantityChange(itemId, quantity, newQty, false);
          }
        }, 500); // 500ms delay for spinner
      }
    }
  };

  const handleInputBlur = () => {
    // Clear timeout on blur and call immediately
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    const newQty = localValue === '' ? 0 : Math.max(0, parseInt(localValue) || 0);

    // If value is 0/empty, keep it empty for user to continue typing next time
    if (newQty === 0) {
      setLocalValue('');
    } else {
      setLocalValue(newQty.toString());
    }

    // Apply change immediately on blur
    if (newQty === 0) {
      // Request removal confirmation from parent
      if (onRemovalRequest) {
        onRemovalRequest(itemId, quantity);
      }
    } else if (newQty !== quantity) {
      onQuantityChange(itemId, quantity, newQty, false);
    }
    
    // Reset typing flag
    isTypingRef.current = false;
  };

  const handleKeyDown = () => {
    // Mark as typing when user presses keyboard
    isTypingRef.current = true;
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      value={localValue}
      onChange={handleInputChange}
      onBlur={handleInputBlur}
      onKeyDown={handleKeyDown}
      className="h-7 w-full border border-black rounded-md text-center text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-[#895B1A] md:h-8 md:text-[12px] md:leading-[2rem] py-0 px-1 [&::-webkit-outer-spin-button]:scale-75 [&::-webkit-inner-spin-button]:scale-75 md:[&::-webkit-outer-spin-button]:appearance-none md:[&::-webkit-inner-spin-button]:appearance-none"
      placeholder="0"
      min="0"
    />
  );
};

// Component for normal product quantity input
type NormalProductQuantityProps = {
  productId: string;
  size: SizeKey;
  sizeData: { quantity: number; itemId: string | null; variantId: string | null };
  isActive: boolean;
  isDisabled: boolean;
  onUpdate: (finalQuantity: number, originalQuantity: number) => Promise<void>;
  onRequestRemoval: (productId: string, size: SizeKey, sizeData: { quantity: number; itemId: string | null; variantId: string | null }) => void;
};

const NormalProductQuantity: React.FC<NormalProductQuantityProps> = ({
  productId,
  size,
  sizeData,
  isActive,
  isDisabled,
  onUpdate,
  onRequestRemoval,
}) => {
  const [localValue, setLocalValue] = useState(sizeData.quantity === 0 ? '' : String(sizeData.quantity));
  const originalQuantityRef = useRef(sizeData.quantity);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Sync local value when sizeData.quantity changes from parent (after API reload)
  useEffect(() => {
    setLocalValue(sizeData.quantity === 0 ? '' : String(sizeData.quantity));
    originalQuantityRef.current = sizeData.quantity;
  }, [sizeData.quantity]);

  const handleFocus = () => {
    // Store original value when user starts editing
    originalQuantityRef.current = sizeData.quantity;
    console.log(`[CartCheckout] onFocus - storing original quantity: ${sizeData.quantity}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or numbers only - ONLY UPDATE LOCAL STATE
    if (value === '' || /^\d+$/.test(value)) {
      setLocalValue(value);
      
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Set new timeout for API call (only for spinner changes, not manual typing)
      if (!isTypingRef.current) {
        debounceTimeoutRef.current = setTimeout(async () => {
          const finalQuantity = value === '' ? 0 : parseInt(value) || 0;
          const originalQuantity = originalQuantityRef.current;
          
          if (finalQuantity !== originalQuantity && (sizeData.itemId || sizeData.variantId)) {
            await onUpdate(finalQuantity, originalQuantity);
          }
        }, 500); // 500ms delay for spinner
      }
    }
  };

  const handleBlur = async () => {
    // Clear timeout on blur and call immediately
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    const finalQuantity = localValue === '' ? 0 : parseInt(localValue) || 0;
    const originalQuantity = originalQuantityRef.current;

    console.log(`[CartCheckout] onBlur - productId: ${productId}, size: ${size}, finalQuantity: ${finalQuantity}, originalQuantity: ${originalQuantity}, itemId: ${sizeData.itemId}, variantId: ${sizeData.variantId}`);

    // Allow update if quantity changed AND (itemId exists OR variantId exists for adding new item)
    if (finalQuantity !== originalQuantity && (sizeData.itemId || sizeData.variantId)) {
      // Delegate to parent for update/add logic
      await onUpdate(finalQuantity, originalQuantity);
    } else if (finalQuantity === originalQuantity) {
      console.log(`[CartCheckout] No change - skipping update`);
      // Restore formatted value even if no change
      setLocalValue(finalQuantity === 0 ? '' : String(finalQuantity));
    } else {
      console.log(`[CartCheckout] Cannot update - missing itemId and variantId`);
      setLocalValue(originalQuantity === 0 ? '' : String(originalQuantity));
    }
    
    // Reset typing flag
    isTypingRef.current = false;
  };

  const handleKeyDown = () => {
    // Mark as typing when user presses keyboard
    isTypingRef.current = true;
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      value={localValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
      style={{ opacity: !isActive ? 0.5 : 1 }}
      className="h-7 w-full border border-black rounded-md text-center text-[11px] bg-white px-1 py-0 leading-[1.7rem] focus:outline-none focus:ring-1 focus:ring-[#895B1A] md:h-8 md:text-[12px] disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-outer-spin-button]:scale-75 [&::-webkit-inner-spin-button]:scale-75 md:[&::-webkit-outer-spin-button]:appearance-none md:[&::-webkit-inner-spin-button]:appearance-none"
      placeholder="0"
      min="0"
    />
  );
};

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
  const [pricingConfig, setPricingConfig] = useState<GlobalPricingConfig | null>(null);

  // Confirmation modal state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<{
    type: 'normal' | 'special' | 'delete-product';
    productId: string;
    productName?: string;
    size?: SizeKey;
    sizeData?: { quantity: number; itemId: string | null; variantId: string | null };
    specialItemId?: string;
    specialQuantity?: number;
  } | null>(null);

  // Debounce API sync (800ms delay)
  const apiSyncTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

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
    loadPricingConfig();

    // Cleanup: Clear all pending API syncs on unmount
    return () => {
      apiSyncTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      apiSyncTimeouts.current.clear();
    };
  }, []);

  // Load pricing config
  const loadPricingConfig = async () => {
    try {
      const config = await SettingsService.getGlobalPricing();
      setPricingConfig(config);
    } catch (error) {
      console.error('Failed to load pricing config:', error);
      // Use default if failed
      setPricingConfig({
        '5ml': {
          range1to9: 139000,
          range10to99: 109000,
          range100plus: 99000
        },
        '20ml': {
          range1to9: 450000,
          range10to99: 360000,
          range100plus: 330000
        }
      });
    }
  };

  // Auto-sync cart item count when cart changes
  useEffect(() => {
    setCartItemCount(cart?.items?.length || 0);
  }, [cart]);

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

  const loadProductVariants = useCallback(async (cartData: CartType | null) => {
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

              // For special products, accept any size (including "Standard")
              // For normal products, only accept 5ml and 20ml
              const shouldLoadVariant = product.isSpecial || sizes.includes(size);

              if (shouldLoadVariant && variant.id) {
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
  }, []);

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

  const loadCart = useCallback(async () => {
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
  }, [navigate, loadProductVariants]);

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

        // Use priceBreakdown from API if available (for normal products with global pricing)
        let itemPrice = 0;
        if (item.priceBreakdown) {
          itemPrice = item.priceBreakdown.totalPrice;
        } else {
          // Fallback to old logic for special products or if priceBreakdown not available
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
          itemPrice = pricePerUnit * item.quantity;
        }

        displayItem.quantities[size] = {
          quantity: item.quantity,
          itemId: item.id,
          variantId: item.productVariantId ?? variantData?.variantId ?? null,
        };
        displayItem.price += itemPrice;
      } else if (item.product.isSpecial) {
        // Handle special products - use specialPrice from API if available
        displayItem.specialItemId = item.id;
        displayItem.specialQuantity = item.quantity;

        let itemPrice = 0;
        if (item.specialPrice !== undefined) {
          // Use specialPrice from API (already calculated by backend)
          itemPrice = item.specialPrice;
        } else {
          // Fallback: Try to get price from multiple sources
          let pricePerUnit = 0;

          if (item.productVariant) {
            pricePerUnit = Number(item.productVariant.salePrice ?? item.productVariant.price ?? 0);
          } else {
            const variants = variantMap;
            const variantKeys = Object.keys(variants);
            const firstVariant = variantKeys.find(key => variants[key] !== null);

            if (firstVariant && variants[firstVariant]) {
              pricePerUnit = variants[firstVariant]!.basePrice;
            } else {
              pricePerUnit = Number(item.product.salePrice ?? item.product.price ?? 0);
            }
          }

          if (Number.isFinite(pricePerUnit) && pricePerUnit > 0) {
            itemPrice = pricePerUnit * item.quantity;
          }
        }

        displayItem.price += itemPrice;
      }
    });

    return Array.from(grouped.values());
  }, [cart, productVariantsMap]);

  const totalAmount = useMemo(() => {
    // Use totalPrice from API if available (more accurate, calculated by backend)
    if (cart?.totalPrice !== undefined) {
      console.log('[CartCheckout] Using cart.totalPrice from API:', cart.totalPrice);
      return cart.totalPrice;
    }
    // Fallback: calculate from displayItems
    const fallbackTotal = displayItems.reduce((sum, item) => sum + item.price, 0);
    console.warn('[CartCheckout] cart.totalPrice is undefined, using fallback calculation:', fallbackTotal);
    console.log('[CartCheckout] cart object:', cart);
    console.log('[CartCheckout] displayItems:', displayItems);
    return fallbackTotal;
  }, [cart, displayItems]);

  // Calculate total quantity of products in cart
  const totalCartQuantity = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Calculate total quantity by size
  const totalQuantity5ml = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items
      .filter(item => item.productVariant?.size === '5ml')
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const totalQuantity20ml = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items
      .filter(item => item.productVariant?.size === '20ml')
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Calculate total quantity for special products (Kit)
  const totalQuantityKit = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items
      .filter(item => item.product.isSpecial)
      .reduce((sum, item) => sum + item.quantity, 0);
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

  const debouncedApiSync = useCallback((itemId: string, apiCall: () => Promise<void>) => {
    // Clear previous timeout for this item
    const existingTimeout = apiSyncTimeouts.current.get(itemId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeoutId = setTimeout(async () => {
      try {
        await apiCall();
        apiSyncTimeouts.current.delete(itemId);

        // Reload cart to get updated pricing from backend
        await loadCart();
      } catch (error: any) {
        console.error("Failed to sync cart:", error);
        showToast({
          tone: "error",
          title: "Đồng bộ giỏ hàng thất bại",
          description: error.message || "Vui lòng thử lại.",
        });
        // Revert on error by reloading cart
        await loadCart();
      }
    }, 800);

    apiSyncTimeouts.current.set(itemId, timeoutId);
  }, [showToast, loadCart]);

  const handleQuantityChange = (
    productId: string,
    size: SizeKey,
    sizeData: { quantity: number; itemId: string | null; variantId: string | null },
    newQuantity: number,
    shouldRemoveIfZero: boolean = false
  ) => {
    if (newQuantity === sizeData.quantity) {
      return;
    }

    try {
      if (sizeData.itemId) {
        if (newQuantity === 0 && shouldRemoveIfZero) {
          // Only remove when explicitly confirmed (onBlur)
          setCart(prevCart => {
            if (!prevCart) return prevCart;
            return {
              ...prevCart,
              items: prevCart.items.filter(item => item.id !== sizeData.itemId)
            };
          });

          // Debounced API sync
          debouncedApiSync(sizeData.itemId, async () => {
            await CartService.removeCartItem(sizeData.itemId!);
          });
        } else if (newQuantity > 0) {
          // Update quantity in UI immediately
          setCart(prevCart => {
            if (!prevCart) return prevCart;
            return {
              ...prevCart,
              items: prevCart.items.map(item =>
                item.id === sizeData.itemId
                  ? { ...item, quantity: newQuantity }
                  : item
              )
            };
          });

          // Debounced API sync
          debouncedApiSync(sizeData.itemId, async () => {
            await CartService.updateCartItem(sizeData.itemId!, newQuantity);
          });
        } else {
          // newQuantity === 0 but shouldRemoveIfZero === false
          // Just update UI, don't remove (user is typing)
          setCart(prevCart => {
            if (!prevCart) return prevCart;
            return {
              ...prevCart,
              items: prevCart.items.map(item =>
                item.id === sizeData.itemId
                  ? { ...item, quantity: 0 }
                  : item
              )
            };
          });
        }
      } else if (sizeData.variantId) {
        if (newQuantity === 0) {
          return;
        }

        // For adding new items, call API immediately (no debounce)
        (async () => {
          try {
            await CartService.addToCart({
              productId,
              productVariantId: sizeData.variantId!,
              quantity: newQuantity,
            });
            // After adding new item, refresh cart to get the new item with ID
            const updatedCart = await CartService.getCart();
            setCart(updatedCart);
            setCartItemCount(updatedCart?.items?.length || 0);
          } catch (error: any) {
            console.error("Failed to add to cart:", error);
            showToast({
              tone: "error",
              title: "Thêm vào giỏ hàng thất bại",
              description: error.message || "Vui lòng thử lại.",
            });
          }
        })();
      } else {
        console.warn(`Missing cart item and variant information for product ${productId} (${size})`);
        return;
      }
    } catch (error: any) {
      console.error("Failed to update cart:", error);
    }
  };

  // Handler for normal product quantity update
  const handleNormalProductUpdate = useCallback(async (
    productId: string,
    size: SizeKey,
    sizeData: { quantity: number; itemId: string | null; variantId: string | null },
    finalQuantity: number,
    originalQuantity: number,
  ) => {
    // Check if setting this to 0 would make ALL columns = 0
    if (finalQuantity === 0) {
      // Get current product's other column quantity
      const displayItem = displayItems.find(item => item.productId === productId);
      const otherSize = size === '5ml' ? '20ml' : '5ml';
      const otherQuantity = displayItem?.quantities[otherSize]?.quantity || 0;

      console.log(`[CartCheckout] Checking both columns - ${size}: ${finalQuantity}, ${otherSize}: ${otherQuantity}`);

      // If both columns would be 0, show confirmation modal
      if (otherQuantity === 0) {
        console.log(`[CartCheckout] Both columns = 0, showing modal`);
        setPendingRemoval({ type: 'normal', productId, size, sizeData });
        setShowRemoveModal(true);
        return; // Don't update yet, wait for confirmation
      }
    }

    // Handle update/add
    try {
      // If itemId is null, this is a new item - ADD to cart
      if (!sizeData.itemId && finalQuantity > 0) {
        if (!sizeData.variantId) {
          console.error('[CartCheckout] Missing variantId for new item');
          showToast({
            tone: 'error',
            title: 'Lỗi',
            description: 'Không tìm thấy thông tin sản phẩm. Vui lòng thử lại.'
          });
          return;
        }

        console.log(`[CartCheckout] Adding new item to cart - variantId: ${sizeData.variantId}, quantity: ${finalQuantity}`);
        await CartService.addToCart({
          productId,
          productVariantId: sizeData.variantId,
          quantity: finalQuantity,
        });
        console.log(`[CartCheckout] addToCart success, calling loadCart()`);
        await loadCart();
        console.log(`[CartCheckout] loadCart() completed`);
        
        showToast({
          tone: 'success',
          title: 'Đã thêm vào giỏ hàng',
          description: `Đã thêm ${finalQuantity} sản phẩm size ${size}`
        });
      } 
      // If itemId exists, UPDATE existing item
      else if (sizeData.itemId && finalQuantity > 0) {
        console.log(`[CartCheckout] Updating cart item - itemId: ${sizeData.itemId}, quantity: ${finalQuantity}`);
        await CartService.updateCartItem(sizeData.itemId, finalQuantity);
        console.log(`[CartCheckout] updateCartItem success, calling loadCart()`);
        await loadCart(); // Reload to get new price from backend
        console.log(`[CartCheckout] loadCart() completed`);
      }
      // If itemId exists and finalQuantity = 0, REMOVE item
      else if (sizeData.itemId && finalQuantity === 0) {
        console.log(`[CartCheckout] Removing cart item - itemId: ${sizeData.itemId}`);
        await CartService.removeCartItem(sizeData.itemId);
        await loadCart();
        
        showToast({
          tone: 'success',
          title: 'Đã xóa',
          description: `Đã xóa sản phẩm size ${size}`
        });
      }
    } catch (error: any) {
      console.error('Failed to update quantity:', error);
      showToast({
        tone: 'error',
        title: 'Cập nhật thất bại',
        description: error.message || 'Vui lòng thử lại.'
      });
      await loadCart(); // Reload to restore original
    }
  }, [displayItems, showToast, loadCart]);

  // Handler to remove entire product (all variants)
  const handleRemoveProduct = useCallback(async (productId: string) => {
    try {
      const displayItem = displayItems.find(item => item.productId === productId);
      if (!displayItem) return;

      // Remove all cart items for this product
      const itemsToRemove: string[] = [];

      if (displayItem.isSpecial && displayItem.specialItemId) {
        // Special product - remove the single item
        itemsToRemove.push(displayItem.specialItemId);
      } else {
        // Normal product - remove all size variants
        sizes.forEach(size => {
          const itemId = displayItem.quantities[size]?.itemId;
          if (itemId) {
            itemsToRemove.push(itemId);
          }
        });
      }

      // Remove all items
      for (const itemId of itemsToRemove) {
        await CartService.removeCartItem(itemId);
      }

      // Reload cart
      await loadCart();

      showToast({
        tone: 'success',
        title: 'Đã xóa sản phẩm',
        description: `${displayItem.productName} đã được xóa khỏi giỏ hàng.`
      });
    } catch (error: any) {
      console.error('Failed to remove product:', error);
      showToast({
        tone: 'error',
        title: 'Xóa thất bại',
        description: error.message || 'Vui lòng thử lại.'
      });
    }
  }, [displayItems, sizes, loadCart, showToast]);

  // Handle quantity change for special products in cart
  const handleSpecialQuantityChange = async (
    itemId: string | null | undefined,
    currentQuantity: number,
    newQuantity: number,
    shouldRemoveIfZero: boolean = false
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
      if (validQuantity === 0 && shouldRemoveIfZero) {
        // Only remove when explicitly confirmed (onBlur)
        setCart(prevCart => {
          if (!prevCart) return prevCart;
          return {
            ...prevCart,
            items: prevCart.items.filter(item => item.id !== itemId)
          };
        });

        // Debounced API sync
        debouncedApiSync(itemId, async () => {
          await CartService.removeCartItem(itemId);
        });
      } else if (validQuantity > 0) {
        // Call API immediately and reload cart to get new price
        try {
          await CartService.updateCartItem(itemId, validQuantity);
          await loadCart(); // Get new price from backend
        } catch (error: any) {
          console.error('Failed to update special product:', error);
          showToast({
            tone: 'error',
            title: 'Cập nhật thất bại',
            description: error.message || 'Vui lòng thử lại.'
          });
          await loadCart(); // Restore original
        }
      }
    } catch (error: any) {
      console.error("Failed to update special product quantity:", error);
    }
  };

  const handleSpecialProductRemovalRequest = (
    itemId: string | null | undefined,
    currentQuantity: number
  ) => {
    if (!itemId) return;

    setPendingRemoval({
      type: 'special',
      productId: '', // Not needed for special products
      specialItemId: itemId,
      specialQuantity: currentQuantity,
    });
    setShowRemoveModal(true);
  };


  // Flush all pending API syncs
  const flushPendingSyncs = useCallback(async () => {
    const pendingTimeouts = Array.from(apiSyncTimeouts.current.values());

    // Clear all timeouts and trigger them immediately
    apiSyncTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    apiSyncTimeouts.current.clear();

    // Wait a bit for any in-flight API calls to complete
    if (pendingTimeouts.length > 0) {
      console.log(`⏳ Flushing ${pendingTimeouts.length} pending cart syncs...`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, []);

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

      // Flush any pending cart syncs before checkout
      await flushPendingSyncs();

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
                        <th className="w-[35%] px-3 py-2 font-semibold">Sản phẩm</th>
                        {sizes.map((size) => (
                          <th
                            key={size}
                            className="px-1 py-2 md:px-2 md:py-2 text-center font-semibold"
                            style={{ width: "6%", maxWidth: "60px" }}
                          >
                            {size}
                          </th>
                        ))}
                        <th className="w-[25%] px-3 py-2 text-right font-semibold">Thành tiền</th>
                        <th className="w-[8%] px-3 py-2 text-center font-semibold">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayItems.map((item, index) => (
                        <tr key={item.productId} className={index % 2 === 0 ? "bg-[#fdf8f2]" : ""}>
                          <td className="px-3 py-3 text-gray-900 align-middle">{item.productName}</td>
                          {item.isSpecial ? (
                            <td colSpan={sizes.length} className="py-3 text-center align-middle">
                              <div className="flex justify-center items-center px-0.5">
                                <SpecialProductQuantity
                                  itemId={item.specialItemId}
                                  quantity={item.specialQuantity || 0}
                                  onQuantityChange={handleSpecialQuantityChange}
                                  onRemovalRequest={handleSpecialProductRemovalRequest}
                                />
                              </div>
                            </td>
                          ) : (
                            sizes.map((size) => {
                              const variantInfo = productVariantsMap[item.productId]?.[size];
                              const isActive = variantInfo?.active ?? true;
                              const sizeData = item.quantities[size];
                              const isDisabled = (!sizeData.itemId && !sizeData.variantId) || !isActive;

                              return (
                                <td
                                  key={`${item.productId}-${size}`}
                                  className="py-3 text-center align-middle"
                                >
                                  <div className="flex justify-center items-center px-0.5">
                                    <NormalProductQuantity
                                      productId={item.productId}
                                      size={size}
                                      sizeData={sizeData}
                                      isActive={isActive}
                                      isDisabled={isDisabled}
                                      onUpdate={async (finalQty, originalQty) => {
                                        await handleNormalProductUpdate(item.productId, size, sizeData, finalQty, originalQty);
                                      }}
                                      onRequestRemoval={(pid, sz, sd) => {
                                        setPendingRemoval({ type: 'normal', productId: pid, size: sz, sizeData: sd });
                                        setShowRemoveModal(true);
                                      }}
                                    />
                                  </div>
                                </td>
                              );
                            })
                          )}
                          <td className="px-3 py-3 text-right font-semibold text-[#9b6a2a] align-middle">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-3 py-3 text-center align-middle">
                            <button
                              onClick={() => {
                                setPendingRemoval({ 
                                  type: 'delete-product', 
                                  productId: item.productId,
                                  productName: item.productName
                                });
                                setShowRemoveModal(true);
                              }}
                              className="inline-flex items-center justify-center p-1 text-[#9b6a2a] hover:text-[#7a531f] hover:bg-[#fdf8f2] rounded transition"
                              title="Xóa sản phẩm"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
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
                    <div className="py-1 text-right pr-7">Thành tiền</div>
                  </div>

                  {displayItems.map((item) => (
                    <div key={item.productId} className="grid grid-cols-[1.6fr_repeat(2,0.6fr)_1.6fr] gap-x-0.5 items-center text-[11px] md:text-[13px]">
                      <div className="px-2 text-gray-900">
                        <span>{item.productName}</span>
                      </div>
                      {item.isSpecial ? (
                        <div className="col-span-2 flex justify-center items-center px-0.5">
                          <SpecialProductQuantity
                            itemId={item.specialItemId}
                            quantity={item.specialQuantity || 0}
                            onQuantityChange={handleSpecialQuantityChange}
                            onRemovalRequest={handleSpecialProductRemovalRequest}
                          />
                        </div>
                      ) : (
                        sizes.map((size) => {
                          const variantInfo = productVariantsMap[item.productId]?.[size];
                          const isActive = variantInfo?.active ?? true;
                          const sizeData = item.quantities[size];
                          const isDisabled = (!sizeData.itemId && !sizeData.variantId) || !isActive;

                          return (
                            <div
                              key={`${item.productId}-${size}`}
                              className="flex justify-center items-center px-0.5"
                            >
                              <NormalProductQuantity
                                productId={item.productId}
                                size={size}
                                sizeData={sizeData}
                                isActive={isActive}
                                isDisabled={isDisabled}
                                onUpdate={async (finalQty, originalQty) => {
                                  await handleNormalProductUpdate(item.productId, size, sizeData, finalQty, originalQty);
                                }}
                                onRequestRemoval={(pid, sz, sd) => {
                                  setPendingRemoval({ type: 'normal', productId: pid, size: sz, sizeData: sd });
                                  setShowRemoveModal(true);
                                }}
                              />
                            </div>
                          );
                        })
                      )}
                      <div className="pr-2 text-right font-semibold text-[#9b6a2a] flex items-center justify-end gap-1">
                        <span>{formatCurrency(item.price)}</span>
                        <button
                          onClick={() => {
                            setPendingRemoval({ 
                              type: 'delete-product', 
                              productId: item.productId,
                              productName: item.productName
                            });
                            setShowRemoveModal(true);
                          }}
                          className="inline-flex items-center justify-center p-0.5 text-[#9b6a2a] hover:text-[#7a531f] hover:bg-[#fdf8f2] rounded transition flex-shrink-0"
                          title="Xóa sản phẩm"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
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

              <div className="border-t border-black/70 pt-4 space-y-2">
                {totalQuantity5ml > 0 && (
                  <div className="flex justify-between py-1 font-extrabold">
                    <span className="flex items-center">
                      Tổng số lượng 5ml
                      <PriceTooltip 
                        size="5ml" 
                        currentQuantity={totalQuantity5ml}
                        config={pricingConfig?.['5ml'] || null} 
                      />
                    </span>
                    <span className="text-[#9b6a2a]">{totalQuantity5ml} chai</span>
                  </div>
                )}
                {totalQuantity20ml > 0 && (
                  <div className="flex justify-between py-1 font-extrabold">
                    <span className="flex items-center">
                      Tổng số lượng 20ml
                      <PriceTooltip 
                        size="20ml" 
                        currentQuantity={totalQuantity20ml}
                        config={pricingConfig?.['20ml'] || null} 
                      />
                    </span>
                    <span className="text-[#9b6a2a]">{totalQuantity20ml} chai</span>
                  </div>
                )}
                {totalQuantityKit > 0 && (
                  <div className="flex justify-between py-1 font-extrabold">
                    <span>Tổng số lượng Kit</span>
                    <span className="text-[#9b6a2a]">{totalQuantityKit} bộ</span>
                  </div>
                )}
                <div className="flex justify-between py-1 font-extrabold">
                  <span className="flex items-center">
                    Tổng đơn đặt hàng
                    <TotalBreakdownTooltip 
                      qty5ml={totalQuantity5ml}
                      qty20ml={totalQuantity20ml}
                      qtyKit={totalQuantityKit}
                      pricingConfig={pricingConfig}
                      displayItems={displayItems}
                    />
                  </span>
                  <span className="text-[#9b6a2a]">{formatCurrency(totalAmount)}</span>
                </div>
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

        {/* Confirmation Modal */}
        {showRemoveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border-2 border-[#8B5E1E] shadow-lg relative p-5 sm:p-8 max-w-md w-[90%] mx-auto">
              {/* Close button */}
              <button
                type="button"
                onClick={() => {
                  setShowRemoveModal(false);
                  setPendingRemoval(null);
                  loadCart();
                }}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 hover:opacity-70 transition"
                aria-label="Đóng"
              >
                <img src="/circle-xmark 1.svg" alt="Đóng" className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Header */}
              <h3 className="font-bold text-[15px] sm:text-[18px] leading-tight mb-5 sm:mb-8 text-black uppercase">
                Xác nhận xóa sản phẩm
              </h3>

              {/* Content */}
              <p className="text-[11px] md:text-[14px] text-black mb-2">
                Bạn có chắc muốn xóa sản phẩm
              </p>
              {pendingRemoval?.productName && (
                <p className="text-[11px] md:text-[14px] text-[#8B5E1E] font-bold mb-2">
                  "{pendingRemoval.productName}"
                </p>
              )}
              <p className="text-[11px] md:text-[14px] text-black mb-6 sm:mb-8">
                khỏi giỏ hàng?
              </p>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowRemoveModal(false);
                    setPendingRemoval(null);
                    loadCart();
                  }}
                  className="px-4 py-2.5 sm:py-3 text-[12px] md:text-[14px] font-bold border-2 border-[#8B5E1E] text-[#8B5E1E] rounded-md hover:bg-[#8B5E1E] hover:text-white transition uppercase"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (pendingRemoval) {
                      if (pendingRemoval.type === 'delete-product') {
                        // Delete entire product
                        handleRemoveProduct(pendingRemoval.productId);
                      } else if (pendingRemoval.type === 'normal' && pendingRemoval.size && pendingRemoval.sizeData) {
                        handleQuantityChange(
                          pendingRemoval.productId,
                          pendingRemoval.size,
                          pendingRemoval.sizeData,
                          0,
                          true
                        );
                      } else if (pendingRemoval.type === 'special' && pendingRemoval.specialItemId !== undefined) {
                        handleSpecialQuantityChange(
                          pendingRemoval.specialItemId,
                          pendingRemoval.specialQuantity || 0,
                          0,
                          true
                        );
                      }
                    }
                    setShowRemoveModal(false);
                    setPendingRemoval(null);
                  }}
                  className="px-4 py-2.5 sm:py-3 text-[12px] md:text-[14px] font-bold text-white bg-[#8B5E1E] rounded-md hover:bg-[#6f4715] transition uppercase"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CartCheckout;
