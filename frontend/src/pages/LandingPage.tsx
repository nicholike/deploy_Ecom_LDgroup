import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProductService } from "../services/product.service";
import type { ProductResponse } from "../types/product.types";
import { CategoryService, type Category } from "../services/category.service";
import { CartService } from "../services/cart.service";
import { useToast } from "../context/ToastContext";

type SizeKey = "5ml" | "20ml";

type ProductDisplay = {
  id: string;
  name: string;
  isSpecial: boolean;
  price?: number;
  variants: Record<SizeKey, { variantId: string | null; price: number; stock: number; active: boolean } | null>;
  selectedQuantities: Record<SizeKey, number>;
  specialQuantity?: number; // For special products without variants
  categoryName?: string;
};

const sizes: SizeKey[] = ["5ml", "20ml"];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const itemsPerPage = 30;
  const { showToast } = useToast();

  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartItemCount, setCartItemCount] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");
  const [isHeaderShrunk, setIsHeaderShrunk] = useState(false);

  // Track selected quantities for each product
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, Record<SizeKey, number>>>({});
  
  // Track quantities for special products (without variants)
  const [specialQuantities, setSpecialQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
    loadCartCount();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsResult, categoriesResult] = await Promise.all([
        ProductService.getProducts({ page: 1, limit: 1000, status: 'PUBLISHED', inStock: true }),
        CategoryService.getCategories({ page: 1, limit: 100, active: true })
      ]);

      setProducts(productsResult.data);
      setCategories(categoriesResult.data);
    } catch (error: any) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const cart = await CartService.getCart();
      setCartItemCount(cart?.items?.length || 0);
    } catch (error) {
      // User might not be logged in
      setCartItemCount(0);
    }
  };

  // Transform products to display format
  const displayProducts: ProductDisplay[] = products.map(product => {
    const variants: ProductDisplay['variants'] = {
      "5ml": null,
      "20ml": null
    };

    // Map variants by size (show ALL variants - active AND inactive)
    product.variants?.forEach(variant => {
      const size = variant.size as SizeKey;
      if (sizes.includes(size)) {
        variants[size] = {
          variantId: variant.id,
          price: Number(variant.salePrice || variant.price),
          stock: 999999, // Unlimited stock
          active: variant.active ?? true // Track active status
        };
      }
    });

    return {
      id: product.id,
      name: product.name,
      isSpecial: product.isSpecial || false,
      price: product.price,
      variants,
      selectedQuantities: selectedQuantities[product.id] || { "5ml": 0, "20ml": 0 },
      specialQuantity: specialQuantities[product.id] || 0,
      categoryName: product.category?.name
    };
  }).sort((a, b) => {
    // Sort special products first
    if (a.isSpecial && !b.isSpecial) return -1;
    if (!a.isSpecial && b.isSpecial) return 1;
    return 0;
  });

  // Filter products
  const filteredProducts = displayProducts.filter((product) => {
    const matchesCategory =
      selectedCategory === "Tất cả" || product.categoryName === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const categoryOptions = ["Tất cả", ...categories.map(c => c.name)];

  const handleQuantityChange = (productId: string, size: SizeKey, quantity: number) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { "5ml": 0, "20ml": 0 }),
        [size]: quantity
      }
    }));
  };

  const handleAddToCart = async (product: ProductDisplay) => {
    const token = localStorage.getItem('accessToken') ||
                  (localStorage.getItem('ldgroup_admin_auth') &&
                   JSON.parse(localStorage.getItem('ldgroup_admin_auth')!).accessToken);

    if (!token) {
      if (confirm('Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng. Đăng nhập ngay?')) {
        navigate('/login');
      }
      return;
    }

    try {
      // Special product - add directly without variants
      if (product.isSpecial) {
        const quantity = product.specialQuantity || 0;
        
        if (quantity <= 0) {
          showToast({
            tone: "info",
            title: "Chưa chọn số lượng",
            description: "Vui lòng nhập số lượng trước khi thêm vào giỏ hàng.",
          });
          return;
        }

        await CartService.addToCart({
          productId: product.id,
          quantity: quantity
        });

        showToast({
          tone: "success",
          title: "Đã thêm vào giỏ hàng",
          description: `${product.name} - Số lượng: ${quantity}`,
        });

        // Reset quantity after adding to cart
        setSpecialQuantities(prev => ({
          ...prev,
          [product.id]: 0
        }));

        await loadCartCount();
        return;
      }

      // Normal product with variants
      const quantities = product.selectedQuantities;
      const itemsToAdd: Array<{ variantId: string; quantity: number; size: string }> = [];

      // Collect all selected sizes (only active variants)
      sizes.forEach(size => {
        const qty = quantities[size];
        const variant = product.variants[size];

        if (qty > 0 && variant && variant.variantId && variant.active) {
          itemsToAdd.push({
            variantId: variant.variantId,
            quantity: qty,
            size
          });
        }
      });

      if (itemsToAdd.length === 0) {
        showToast({
          tone: "info",
          title: "Chưa chọn số lượng",
          description: "Vui lòng chọn số lượng cho ít nhất một size trước khi thêm vào giỏ hàng.",
        });
        return;
      }

      // Add each variant to cart
      for (const item of itemsToAdd) {
        await CartService.addToCart({
          productId: product.id,
          productVariantId: item.variantId,
          quantity: item.quantity
        });
      }

      showToast({
        tone: "success",
        title: "Đã thêm vào giỏ hàng",
        description: `${product.name}\n${itemsToAdd.map((item) => `- ${item.size}: ${item.quantity}`).join("\n")}`,
      });

      // Reset quantities for this product
      setSelectedQuantities(prev => ({
        ...prev,
        [product.id]: { "5ml": 0, "20ml": 0 }
      }));

      // Reload cart count
      await loadCartCount();
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
      showToast({
        tone: "error",
        title: "Không thể thêm vào giỏ hàng",
        description: error.message || "Vui lòng thử lại sau.",
      });
    }
  };

  const renderQuantitySelect = (product: ProductDisplay, size: SizeKey) => {
    const variant = product.variants[size];
    const isAvailable = variant !== null && variant.active;
    const selectedQty = product.selectedQuantities[size];

    return (
      <div className="flex justify-center items-center" style={{ opacity: variant && !variant.active ? 0.5 : 1 }}>
        <div className="relative inline-flex items-center">
          <select
            value={selectedQty.toString()}
            onChange={(e) => handleQuantityChange(product.id, size, parseInt(e.target.value))}
            disabled={!isAvailable}
            className="h-7 w-12 border border-black rounded-md text-center text-[11px] bg-white appearance-none pr-5 pl-2 py-0 leading-[1.7rem] focus:outline-none md:h-8 md:w-14 md:pr-0 md:pl-0 md:text-[12px] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ WebkitAppearance: "none", MozAppearance: "none", backgroundImage: "none" }}
          >
            <option value="0">0</option>
            <option value="10">10</option>
            <option value="100">100</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#895B1A]">
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

  // Handle quantity change for special products
  const handleSpecialQuantityChange = (productId: string, newQuantity: number) => {
    setSpecialQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, newQuantity) // Ensure quantity is not negative
    }));
  };

  // Render quantity input for special products
  const renderSpecialProductQuantity = (product: ProductDisplay) => {
    const quantity = product.specialQuantity || 0;

    return (
      <div className="flex justify-center items-center">
        <input
          type="number"
          value={quantity}
          onChange={(e) => handleSpecialQuantityChange(product.id, parseInt(e.target.value) || 0)}
          className="h-7 w-[104px] border border-black rounded-md text-center text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-[#895B1A] md:h-8 md:w-[128px] md:text-[12px] py-0"
          min="0"
          placeholder="0"
        />
      </div>
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderShrunk(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Đang tải sản phẩm...</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-12 text-[12px]">
      <header
        className={`sticky top-0 z-20 w-full bg-white/95 backdrop-blur-sm flex justify-center transition-all duration-300 ${
          isHeaderShrunk ? "shadow-sm" : ""
        }`}
      >
        <div
          className={`w-[95%] md:w-[65%] flex items-center justify-between transition-all duration-300 origin-top ${
            isHeaderShrunk ? "py-1 md:py-1 scale-90" : "py-2 md:py-2.5 scale-100"
          }`}
        >
          <a href="/">
            <img
              src="/LOGO_LD%20PERFUME%20OIL%20LUXURY%20(4)_NA%CC%82U%201.svg"
              alt="LD Perfume Oil Luxury logo"
              className={`h-auto object-contain transition-all duration-300 cursor-pointer ${
                isHeaderShrunk ? "w-24 md:w-40" : "w-32 md:w-48"
              }`}
            />
          </a>
          <div className="flex items-center space-x-3 md:space-x-4 text-black">
            <a
              href="/cart"
              className="block relative"
              aria-label="Xem giỏ hàng"
            >
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
              className="flex items-center space-x-2 cursor-pointer text-[12px] text-black font-semibold hover:text-[#5f3d10] transition"
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

      <section className="mt-8 flex justify-center px-4">
        <div className="flex w-[95%] flex-row items-center gap-3 md:w-[65%] md:justify-end">
          <div className="min-w-0 flex-1 md:flex-none md:w-1/3">
            <label htmlFor="product-search" className="sr-only">
              Tìm kiếm sản phẩm
            </label>
            <input
              id="product-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full rounded-md border border-[#8B5E1E] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8B5E1E]/40"
            />
          </div>
          <div className="w-28 flex-shrink-0 md:flex-none md:w-40">
            <label htmlFor="product-category" className="sr-only">
              Lọc theo danh mục
            </label>
            <select
              id="product-category"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="w-full rounded-md border border-[#8B5E1E] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8B5E1E]/40"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <main className="mt-4 flex justify-center md:mt-6 mx-4 md:mx-0">
        <table className="w-[95%] md:w-[65%] text-center text-[11px] md:text-[12px]">
          <thead>
            <tr className="bg-[#8B5E1E] text-white font-normal">
              <th
                className="px-3 py-2 md:px-6 md:py-2 align-middle"
                style={{ width: "56%" }}
              >
                Sản phẩm
              </th>
              {sizes.map((size) => (
                <th
                  key={size}
                  className="px-1 py-2 md:px-2 md:py-2 align-middle"
                  style={{ width: "6%" }}
                >
                  {size}
                </th>
              ))}
              <th
                className="px-3 py-2 md:px-6 md:py-2 font-normal leading-tight align-middle"
                style={{ width: "23%" }}
              >
                <span className="hidden md:inline-block whitespace-nowrap">Mua sắm</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.length > 0 ? (
              currentProducts.map((product) => (
                <tr key={product.id} className="even:bg-[#fdf8f2]">
                  <td className="px-3 py-2 text-left text-gray-900 align-middle md:px-6 md:py-3">
                    {product.name}
                  </td>
                  {product.isSpecial ? (
                    <td
                      colSpan={sizes.length}
                      className="px-1 py-2 md:px-2 md:py-3 align-middle text-center"
                    >
                      {renderSpecialProductQuantity(product)}
                    </td>
                  ) : (
                    sizes.map((size) => (
                      <td
                        key={`${product.id}-${size}`}
                        className="px-1 py-2 md:px-2 md:py-3 align-middle"
                        style={{ width: "6%" }}
                      >
                        {renderQuantitySelect(product, size)}
                      </td>
                    ))
                  )}
                  <td
                    className="px-2 py-2 md:px-6 md:py-3 align-middle"
                    style={{ width: "23%" }}
                  >
                    <div className="mx-auto flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center md:hidden hover:opacity-70 transition"
                        aria-label="Thêm vào giỏ hàng"
                      >
                        <img src="/shopping-cart-add 1.svg" alt="Thêm vào giỏ" className="h-4 w-4 object-contain" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className="hidden md:inline-flex rounded-md bg-[#8B5E1E] px-3 py-1.5 text-white transition hover:bg-[#6f4715] text-[12px]"
                      >
                        Thêm vào giỏ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={sizes.length + 2} className="px-3 py-6 text-center text-sm text-gray-500">
                  {loading ? "Đang tải..." : "Không tìm thấy sản phẩm phù hợp."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>

      {totalPages > 1 && (
        <div className="flex justify-center mt-10">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-[#895B1A] rounded-md text-[#895B1A] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#895B1A] hover:text-white transition text-sm"
            >
              Trước
            </button>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, index) => {
              const pageNumber = index + 1;
              const isActive = pageNumber === currentPage;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => handlePageChange(pageNumber)}
                  className={`w-9 h-9 border rounded-md transition text-sm ${
                    isActive
                      ? "bg-[#895B1A] text-white border-[#895B1A]"
                      : "border-[#895B1A] text-[#895B1A] hover:bg-[#895B1A] hover:text-white"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-[#895B1A] rounded-md text-[#895B1A] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#895B1A] hover:text-white transition text-sm"
            >
              Tiếp
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <a
          href="/cart"
          className="mt-6 w-[95%] rounded-sm bg-[#8B5E1E] py-3 text-center text-[12px] font-bold text-white transition hover:bg-[#744b18] md:w-[65%]"
        >
          XEM GIỎ HÀNG {cartItemCount > 0 && `(${cartItemCount})`}
        </a>
      </div>
    </div>
  );
};

export default LandingPage;
