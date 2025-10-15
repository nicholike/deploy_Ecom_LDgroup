import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import { OrderService, type Order as OrderType } from "../services/order.service";
import { CartService } from "../services/cart.service";
import { walletService } from "../services/wallet.service";
import type { WithdrawalRequest } from "../types/wallet.types";
import { commissionService } from "../services/commission.service";
import { quotaService, type QuotaResponse } from "../services/quota.service";
import { Modal } from "../components/ui/modal";

const WALLET_COLOR = "#8B5E1E";
const MIN_WITHDRAW_AMOUNT = 500_000;

const DOWNLINE_FILTER_OPTIONS = [
  { label: "Tất cả", value: "ALL" },
  { label: "F2", value: "F2" },
  { label: "F3", value: "F3" },
  { label: "F4", value: "F4" },
  { label: "F5", value: "F5" },
  { label: "F6", value: "F6" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
};

const formatDateOnly = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
};

type DownlineOrder = {
  id: string;
  orderNumber?: string;
  buyerName?: string;
  total: number;
  commission: number;
  level: number | null;
  status: string;
  createdAt?: string;
};

type QuotaSummary = {
  periodRange: string;
  resetLabel: string;
  daysRemaining: number | null;
  nextResetText: string;
};

type WithdrawFormState = {
  amount: string;
  rawAmount: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch: string;
};

const DEFAULT_WITHDRAW_FORM: WithdrawFormState = {
  amount: "",
  rawAmount: "",
  bankName: "",
  accountNumber: "",
  accountName: "",
  branch: "",
};

const Account: React.FC = () => {
  const { logout, accessToken } = useAuth();
  const navigate = useNavigate();

  const [isHeaderShrunk, setIsHeaderShrunk] = useState(false);

  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);

  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);

  const [downlineOrders, setDownlineOrders] = useState<DownlineOrder[]>([]);
  const [downlineFilter, setDownlineFilter] = useState("ALL");
  const [downlinePage, setDownlinePage] = useState(1);
  const [totalDownlinePages, setTotalDownlinePages] = useState(1);
  const [loadingDownline, setLoadingDownline] = useState(true);

  const [cartItemCount, setCartItemCount] = useState(0);

  const [quotaInfo, setQuotaInfo] = useState<QuotaResponse | null>(null);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState<WithdrawFormState>(DEFAULT_WITHDRAW_FORM);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);
  const [selectedDownlineOrder, setSelectedDownlineOrder] = useState<DownlineOrder | null>(null);
  const [selectedWithdrawalDetail, setSelectedWithdrawalDetail] = useState<WithdrawalRequest | null>(null);

  const DOWNLINE_ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const handleScroll = () => setIsHeaderShrunk(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const result = await OrderService.getMyOrders({ page: 1, limit: 100 });
      setOrders(result.data);
    } catch (error: any) {
      console.error("Failed to load orders:", error);
      if (error.message?.includes("Session")) {
        navigate("/login");
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const cart = await CartService.getCart();
      setCartItemCount(cart?.items?.length || 0);
    } catch (error) {
      setCartItemCount(0);
    }
  };

  const loadQuotaInfo = async () => {
    try {
      let token: string | null = null;
      const authData = localStorage.getItem("ldgroup_admin_auth");
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          token = typeof parsed?.accessToken === "string" ? parsed.accessToken : null;
        } catch (error) {
          console.error("Failed to parse auth data:", error);
        }
      }
      if (!token) {
        token = localStorage.getItem("accessToken");
      }
      if (!token) return;

      const quota = await quotaService.getMyQuota(token);
      setQuotaInfo(quota);
    } catch (error) {
      console.error("Failed to load quota info:", error);
    }
  };

  const loadWithdrawals = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoadingWithdrawals(true);
      const result = await walletService.getWithdrawalHistory({ page: 1, limit: 5 }, accessToken);
      setWithdrawalHistory(result.data);
    } catch (error) {
      console.error("Failed to load withdrawal history:", error);
    } finally {
      setLoadingWithdrawals(false);
    }
  }, [accessToken]);

  const loadWalletBalance = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoadingWallet(true);
      const result = await walletService.getBalance(accessToken);
      setWalletBalance(result.balance ?? 0);
    } catch (error) {
      console.error("Failed to load wallet balance:", error);
    } finally {
      setLoadingWallet(false);
    }
  }, [accessToken]);

const loadDownlineOrders = useCallback(async () => {
  if (!accessToken) return;
  try {
    setLoadingDownline(true);
      const result = await commissionService.getCommissions(
        { page: downlinePage, limit: DOWNLINE_ITEMS_PER_PAGE },
        accessToken,
      );

      const transformed: DownlineOrder[] = result.data.map((commission: any) => ({
        id: commission.id,
        orderNumber: commission.order?.orderNumber,
        buyerName: commission.fromUser?.username || commission.fromUser?.email,
        total: Number(commission.order?.totalAmount ?? 0),
        commission: Number(commission.commissionAmount ?? commission.amount ?? 0),
        level: typeof commission.level === "number" ? commission.level : null,
        status: commission.status ?? "APPROVED",
        createdAt: commission.createdAt,
      }));

      setDownlineOrders(transformed);
      setTotalDownlinePages(result.pagination?.totalPages ?? 1);
    } catch (error) {
      console.error("Failed to load downline orders:", error);
    } finally {
      setLoadingDownline(false);
    }
  }, [accessToken, downlinePage]);

  useEffect(() => {
    loadOrders();
    loadCartCount();
    loadQuotaInfo();
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    loadWithdrawals();
    loadWalletBalance();
  }, [accessToken, loadWithdrawals, loadWalletBalance]);

  useEffect(() => {
    loadDownlineOrders();
  }, [loadDownlineOrders]);

  const availableDownline = useMemo(() => {
    if (!downlineOrders.length) return [];
    if (downlineFilter === "ALL") return downlineOrders;

    const parsedLevel = Number.parseInt(downlineFilter.replace("F", ""), 10);
    if (Number.isNaN(parsedLevel)) return downlineOrders;
    const targetLevel = Math.max(0, parsedLevel - 1);
    return downlineOrders.filter((order) => order.level === targetLevel);
  }, [downlineOrders, downlineFilter]);

  const quotaSummary = useMemo<QuotaSummary | null>(() => {
    if (!quotaInfo) return null;

    const startDate = quotaInfo.quotaPeriodStart ? new Date(quotaInfo.quotaPeriodStart) : null;
    const endDate = quotaInfo.quotaPeriodEnd ? new Date(quotaInfo.quotaPeriodEnd) : null;

    const periodRange = startDate || endDate
      ? `${formatDateOnly(startDate)} → ${formatDateOnly(endDate)}`
      : "Chưa kích hoạt";

    let daysRemaining: number | null = null;
    if (endDate && !Number.isNaN(endDate.getTime())) {
      const diffMs = endDate.getTime() - Date.now();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      daysRemaining = diffDays > 0 ? diffDays : 0;
    }

    const resetLabel = quotaInfo.isPeriodExpired ? "Chu kỳ mới sẽ mở khi đặt đơn" : formatDateOnly(endDate);
    const nextResetText = quotaInfo.isPeriodExpired
      ? "Chu kỳ hiện tại đã hết hạn. Đơn hàng tiếp theo sẽ mở lại hạn mức 30 ngày."
      : endDate
      ? `Hạn mức sẽ được làm mới vào ${formatDateOnly(endDate)}${daysRemaining !== null ? ` (${daysRemaining} ngày nữa)` : ""}.`
      : "Đơn hàng đầu tiên sẽ mở hạn mức 30 ngày.";

    return {
      periodRange,
      resetLabel,
      daysRemaining,
      nextResetText,
    };
  }, [quotaInfo]);

  const handleWithdrawChange = (field: keyof WithdrawFormState) => (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    if (field === "amount") {
      const digits = value.replace(/[^\d]/g, "");
      const formatted = digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";
      setWithdrawForm((prev) => ({ ...prev, rawAmount: digits, amount: formatted }));
    } else {
      setWithdrawForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleWithdrawSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken) {
      alert("Vui lòng đăng nhập lại");
      return;
    }

    const amount = Number(withdrawForm.rawAmount);
    if (!Number.isFinite(amount) || amount < MIN_WITHDRAW_AMOUNT) {
      alert(`Số tiền rút tối thiểu là ${formatCurrency(MIN_WITHDRAW_AMOUNT)}`);
      return;
    }

    if (amount > walletBalance) {
      alert("Số dư không đủ");
      return;
    }

    if (!withdrawForm.bankName || !withdrawForm.accountNumber || !withdrawForm.accountName) {
      alert("Vui lòng điền đầy đủ thông tin ngân hàng");
      return;
    }

    try {
      setWithdrawSubmitting(true);
      await walletService.requestWithdrawal(
        amount,
        {
          bankName: withdrawForm.bankName,
          accountNumber: withdrawForm.accountNumber,
          accountName: withdrawForm.accountName,
          branch: withdrawForm.branch || undefined,
        },
        undefined,
        accessToken,
      );

      alert("Yêu cầu rút tiền đã được gửi thành công");
      setWithdrawForm(DEFAULT_WITHDRAW_FORM);
      setIsWithdrawOpen(false);
      await Promise.all([loadWalletBalance(), loadWithdrawals()]);
    } catch (error: any) {
      alert(error?.message || "Không thể gửi yêu cầu rút tiền. Vui lòng thử lại sau.");
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Ví hoa hồng | LD Perfume Oil Luxury"
        description="Quản lý ví hoa hồng, đơn hàng và hạn mức mua hàng của bạn."
      />

      <QuotaModal
        quotaInfo={quotaInfo}
        summary={quotaSummary}
        open={isQuotaModalOpen}
        onClose={() => setIsQuotaModalOpen(false)}
      />

      <WithdrawModal
        open={isWithdrawOpen}
        submitting={withdrawSubmitting}
        form={withdrawForm}
        onChange={handleWithdrawChange}
        onSubmit={handleWithdrawSubmit}
        onClose={() => setIsWithdrawOpen(false)}
      />

      <ChangePasswordModal open={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />

      <div className="min-h-screen bg-white pb-12 text-black">
        <Header isShrunk={isHeaderShrunk} cartItemCount={cartItemCount} />

        <Breadcrumb />

        <main className="mt-6 flex justify-center mx-4 md:mx-0">
          <div className="w-[95%] space-y-8 text-[11px] md:w-[65%] md:text-[13px]">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-bold uppercase md:text-[16px]">Ví hoa hồng của bạn</h2>
                {quotaInfo && quotaSummary && (
                  <QuotaButton onClick={() => setIsQuotaModalOpen(true)} />
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-md border px-6 py-2 text-[12px] font-extrabold text-black sm:w-auto md:py-3 md:text-[14px]"
                  style={{ borderColor: WALLET_COLOR }}
                >
                  <img src="/wallet 1.svg" alt="Số dư ví hoa hồng" className="h-6 w-6 object-contain" />
                  {loadingWallet ? "Đang tải..." : formatCurrency(walletBalance)}
                </button>

                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-md px-6 py-2 text-[12px] font-extrabold uppercase tracking-wide text-white transition hover:opacity-90 sm:w-auto md:min-w-[150px] md:py-3 md:text-[14px]"
                  style={{ backgroundColor: WALLET_COLOR }}
                  onClick={() => setIsWithdrawOpen(true)}
                >
                  Rút tiền
                </button>
              </div>
            </section>

            <WithdrawHistorySection
              loading={loadingWithdrawals}
              history={withdrawalHistory}
              onOpenDetail={setSelectedWithdrawalDetail}
            />

            <OrdersSection
              loading={loadingOrders}
              orders={orders}
              onViewDetail={setSelectedOrder}
            />

            <DownlineSection
              loading={loadingDownline}
              orders={availableDownline}
              filter={downlineFilter}
              page={downlinePage}
              totalPages={totalDownlinePages}
              onFilterChange={(next) => {
                setDownlineFilter(next);
                setDownlinePage(1);
              }}
              onPageChange={setDownlinePage}
              onOpenDetail={setSelectedDownlineOrder}
            />

            <footer className="mb-10 flex gap-4">
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                className="flex flex-1 items-center justify-center rounded-md px-6 py-3 text-[12px] font-extrabold uppercase tracking-wide text-white transition hover:opacity-90 md:text-[14px]"
                style={{ backgroundColor: WALLET_COLOR }}
              >
                Đổi mật khẩu
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login", { replace: true });
                }}
                className="flex flex-1 items-center justify-center rounded-md bg-black px-6 py-3 text-[12px] font-extrabold uppercase tracking-wide text-white transition hover:bg-gray-800 md:text-[14px]"
              >
                Đăng xuất
              </button>
            </footer>
          </div>
        </main>
      </div>

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      {selectedDownlineOrder && (
        <DownlineDetailModal order={selectedDownlineOrder} onClose={() => setSelectedDownlineOrder(null)} />
      )}

      {selectedWithdrawalDetail && (
        <WithdrawalDetailModal withdrawal={selectedWithdrawalDetail} onClose={() => setSelectedWithdrawalDetail(null)} />
      )}
    </>
  );
};

export default Account;

// -- UI helper components ----------------------------------------------------

interface HeaderProps {
  isShrunk: boolean;
  cartItemCount: number;
}

const Header: React.FC<HeaderProps> = ({ isShrunk, cartItemCount }) => (
  <header
    className={`sticky top-0 z-20 flex w-full justify-center bg-white/95 backdrop-blur-sm transition-all duration-300 ${
      isShrunk ? "shadow-sm" : ""
    }`}
  >
    <div
      className={`flex w-[95%] items-center justify-between transition-all duration-300 md:w-[65%] ${
        isShrunk ? "origin-top scale-90 py-1 md:py-1" : "origin-top scale-100 py-2 md:py-2.5"
      }`}
    >
      <Link to="/" className="block">
        <img
          src="/LOGO_LD%20PERFUME%20OIL%20LUXURY%20(4)_NA%CC%82U%201.svg"
          alt="LD Perfume Oil Luxury logo"
          className={`h-auto object-contain transition-all duration-300 ${
            isShrunk ? "w-24 md:w-40" : "w-32 md:w-48"
          }`}
        />
      </Link>
      <div className="flex items-center space-x-3 text-black md:space-x-4">
        <Link to="/cart" aria-label="Xem giỏ hàng" className="relative block">
          <img src="/shopping-cart 1.svg" alt="Giỏ hàng" className="h-5 w-5 object-contain" />
          {cartItemCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {cartItemCount}
            </span>
          )}
        </Link>
        <Link
          to="/account"
          className="flex items-center space-x-2 text-[11px] font-semibold transition hover:text-[#5f3d10] md:text-[12px]"
        >
          <img src="/user 1.svg" alt="Trang tài khoản" className="h-5 w-5 object-contain" />
          <span className="hidden md:inline">Tài khoản</span>
        </Link>
      </div>
    </div>
  </header>
);

const Breadcrumb: React.FC = () => (
  <div className="mt-2 flex justify-center mx-4 md:mx-0">
    <nav className="w-full md:w-[65%] text-[11px] md:text-[12px] flex items-center gap-1 text-[#9b6a2a]">
      <Link to="/" className="hover:underline">
        Trang chủ
      </Link>
      <span className="text-black/50">/</span>
      <span className="text-black">Tài khoản</span>
    </nav>
  </div>
);

const QuotaButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 rounded-full border border-[#8B5E1E]/40 px-2 py-1 text-[10px] font-semibold text-[#8B5E1E] transition hover:bg-[#8B5E1E] hover:text-white md:text-xs"
    aria-label="Xem chi tiết hạn mức mua hàng"
  >
    <span>Hạn mức</span>
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#8B5E1E] text-[10px] font-bold text-white">
      i
    </span>
  </button>
);

const WithdrawHistorySection: React.FC<{
  loading: boolean;
  history: WithdrawalRequest[];
  onOpenDetail: (withdrawal: WithdrawalRequest) => void;
}> = ({ loading, history, onOpenDetail }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-[14px] font-bold uppercase md:text-[16px]">Lịch sử yêu cầu rút tiền</h2>
    </div>

    {loading ? (
      <div className="py-8 text-center text-gray-600">Đang tải...</div>
    ) : history.length === 0 ? (
      <div className="py-8 text-center text-gray-600">Bạn chưa có yêu cầu rút tiền nào</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-white" style={{ backgroundColor: WALLET_COLOR }}>
              <th className="px-2 py-2 font-normal md:px-4 w-[32%] md:w-[35%]">Số tiền</th>
              <th className="px-2 py-2 text-center font-normal md:px-4 w-[22%] md:w-[25%]">Ngày tạo</th>
              <th className="px-2 py-2 text-center font-normal md:px-4 w-[34%] md:w-[25%]">Trạng thái</th>
              <th className="px-0.5 py-2 text-center font-normal md:px-4 w-[12%] md:w-[15%]">
                <span className="hidden md:inline">Xem chi tiết</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((withdrawal) => (
              <tr key={withdrawal.id} className="even:bg-[#fdf8f2]">
                <td className="px-2 py-2 font-semibold text-[11px] md:text-sm md:px-4 md:py-3 w-[32%] md:w-[35%]" style={{ color: WALLET_COLOR }}>
                  {formatCurrency(withdrawal.amount)}
                </td>
                <td className="px-2 py-2 text-center text-[11px] md:text-sm md:px-4 md:py-3 w-[22%] md:w-[25%]">{formatDateTime(withdrawal.requestedAt)}</td>
                <td className="px-2 py-2 text-center md:px-4 md:py-3 w-[34%] md:w-[25%]">
                  <span className={`inline-flex rounded px-2 py-1 text-[11px] md:text-xs font-medium capitalize ${renderWithdrawalStatusBadge(withdrawal.status)}`}>
                    {renderWithdrawalStatusText(withdrawal.status)}
                  </span>
                </td>
                <td className="px-0.5 py-2 text-center md:px-4 md:py-3 w-[12%] md:w-[15%]">
                  {/* Mobile: Icon mắt */}
                  <button
                    type="button"
                    onClick={() => onOpenDetail(withdrawal)}
                    className="inline-flex md:hidden items-center justify-center transition hover:opacity-70"
                    aria-label="Xem chi tiết"
                  >
                    <img src="/eye.svg" alt="Xem chi tiết" className="h-4 w-4" />
                  </button>
                  {/* Desktop: Button text */}
                  <button
                    type="button"
                    onClick={() => onOpenDetail(withdrawal)}
                    className="hidden md:inline-flex items-center gap-1 rounded border border-[#8B5E1E] px-3 py-1 text-xs font-semibold text-[#8B5E1E] transition hover:bg-[#8B5E1E] hover:text-white"
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const OrdersSection: React.FC<{
  loading: boolean;
  orders: OrderType[];
  onViewDetail: (order: OrderType) => void;
}> = ({ loading, orders, onViewDetail }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-[14px] font-bold uppercase md:text-[16px]">Đơn hàng của bạn</h2>
    </div>

    {loading ? (
      <div className="py-8 text-center text-gray-600">Đang tải đơn hàng...</div>
    ) : orders.length === 0 ? (
      <div className="py-8 text-center text-gray-600">
        <p className="mb-4">Bạn chưa có đơn hàng nào</p>
        <Link
          to="/cart"
          className="inline-block rounded-sm bg-[#8B5E1E] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#6f4715]"
        >
          Mua sắm ngay
        </Link>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-white" style={{ backgroundColor: WALLET_COLOR }}>
              <th className="px-2 py-2 font-normal md:px-4 w-[32%] md:w-[35%]">Đơn hàng</th>
              <th className="px-2 py-2 text-center font-normal md:px-4 w-[22%] md:w-[25%]">Thành tiền</th>
              <th className="px-2 py-2 text-center font-normal md:px-4 w-[34%] md:w-[25%]">Trạng thái</th>
              <th className="px-0.5 py-2 text-center font-normal md:px-4 w-[12%] md:w-[15%]">
                <span className="hidden md:inline">Xem chi tiết</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="even:bg-[#fdf8f2]">
                <td className="px-2 py-2 md:px-4 md:py-3 w-[32%] md:w-[35%]">
                  <div className="text-[11px] md:text-sm font-medium text-gray-900">{order.orderNumber}</div>
                </td>
                <td className="px-2 py-2 text-center text-[11px] md:text-sm text-gray-700 md:px-4 md:py-3 w-[22%] md:w-[25%]">
                  {formatCurrency(Number(order.totalAmount ?? 0))}
                </td>
                <td className="px-2 py-2 text-center md:px-4 md:py-3 w-[34%] md:w-[25%]">
                  <span className={`inline-flex rounded px-2 py-1 text-[11px] md:text-xs font-medium capitalize ${renderOrderStatusBadge(order.status)}`}>
                    {renderOrderStatusText(order.status)}
                  </span>
                </td>
                <td className="px-0.5 py-2 text-center md:px-4 md:py-3 w-[12%] md:w-[15%]">
                  {/* Mobile: Icon mắt */}
                  <button
                    type="button"
                    onClick={() => onViewDetail(order)}
                    className="inline-flex md:hidden items-center justify-center transition hover:opacity-70"
                    aria-label="Xem chi tiết"
                  >
                    <img src="/eye.svg" alt="Xem chi tiết" className="h-4 w-4" />
                  </button>
                  {/* Desktop: Button text */}
                  <button
                    type="button"
                    onClick={() => onViewDetail(order)}
                    className="hidden md:inline-flex items-center gap-1 rounded border border-[#8B5E1E] px-3 py-1 text-xs font-semibold text-[#8B5E1E] transition hover:bg-[#8B5E1E] hover:text-white"
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const DownlineSection: React.FC<{
  loading: boolean;
  orders: DownlineOrder[];
  filter: string;
  page: number;
  totalPages: number;
  onFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onOpenDetail: (order: DownlineOrder) => void;
}> = ({ loading, orders, filter, page, totalPages, onFilterChange, onPageChange, onOpenDetail }) => (
  <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-[14px] font-bold uppercase md:text-[16px]">Đơn hàng tuyến dưới</h2>
      <select
        value={filter}
        onChange={(event) => onFilterChange(event.target.value)}
        className="w-20 rounded-md border border-gray-300 px-2 py-0.5 text-[11px] leading-tight md:w-24 md:px-3 md:text-sm md:py-1"
      >
        {DOWNLINE_FILTER_OPTIONS.map(({ label, value }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>

    {loading ? (
      <div className="py-8 text-center text-gray-600">Đang tải...</div>
    ) : orders.length === 0 ? (
      <div className="py-8 text-center text-gray-600">Chưa có hoa hồng từ tuyến dưới</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-white" style={{ backgroundColor: WALLET_COLOR }}>
              <th className="px-2 py-2 font-normal md:px-4 w-[32%] md:w-[35%]">Đơn hàng</th>
              <th className="px-2 py-2 text-center font-normal md:px-4 w-[22%] md:w-[25%]">Thành tiền</th>
              <th className="px-2 py-2 text-center font-normal md:px-4 w-[34%] md:w-[25%]">Hoa hồng</th>
              <th className="px-0.5 py-2 text-center font-normal md:px-4 w-[12%] md:w-[15%]">
                <span className="hidden md:inline">Xem chi tiết</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isCancelled = order.status?.toUpperCase() === "CANCELLED";
              
              return (
              <tr key={order.id} className="even:bg-[#fdf8f2]">
                  <td className="px-2 py-2 md:px-4 md:py-3 w-[32%] md:w-[35%]">
                    <div className={`text-[11px] md:text-sm font-medium ${isCancelled ? "text-red-600" : "text-gray-900"}`}>
                      {order.orderNumber || order.id}
                    </div>
                </td>
                  <td className={`px-2 py-2 text-center md:px-4 md:py-3 text-[11px] md:text-sm w-[22%] md:w-[25%] ${isCancelled ? "text-red-600" : "text-gray-700"}`}>
                  {formatCurrency(order.total)}
                </td>
                  <td className={`px-2 py-2 text-center md:px-4 md:py-3 text-[11px] md:text-sm font-semibold w-[34%] md:w-[25%] ${
                    isCancelled ? "text-red-600" : "text-[#10B981]"
                  }`}>
                  {formatCurrency(order.commission)}
                </td>
                  <td className="px-0.5 py-2 text-center md:px-4 md:py-3 w-[12%] md:w-[15%]">
                    {/* Mobile: Icon mắt */}
                  <button
                    type="button"
                    onClick={() => onOpenDetail(order)}
                      className="inline-flex md:hidden items-center justify-center transition hover:opacity-70"
                      aria-label="Xem chi tiết"
                    >
                      <img src="/eye.svg" alt="Xem chi tiết" className="h-4 w-4" />
                    </button>
                    {/* Desktop: Button text */}
                    <button
                      type="button"
                      onClick={() => onOpenDetail(order)}
                      className="hidden md:inline-flex items-center gap-1 rounded border border-[#8B5E1E] px-3 py-1 text-xs font-semibold text-[#8B5E1E] transition hover:bg-[#8B5E1E] hover:text-white"
                    >
                      Xem chi tiết
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}

    {totalPages > 1 && (
      <div className="flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            disabled={page === 1}
            className="rounded-md border border-[#8B5E1E] px-3 py-1 text-[11px] text-[#8B5E1E] transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#8B5E1E] hover:text-white md:text-sm"
          >
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => onPageChange(number)}
              className={`h-9 w-9 rounded-md border text-[11px] md:text-sm transition ${
                number === page
                  ? "border-[#8B5E1E] bg-[#8B5E1E] text-white"
                  : "border-[#8B5E1E] text-[#8B5E1E] hover:bg-[#8B5E1E] hover:text-white"
              }`}
            >
              {number}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(page + 1, totalPages))}
            disabled={page === totalPages}
            className="rounded-md border border-[#8B5E1E] px-3 py-1 text-[11px] text-[#8B5E1E] transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#8B5E1E] hover:text-white md:text-sm"
          >
            Tiếp
          </button>
        </div>
      </div>
    )}
  </section>
);

// -- Modals -----------------------------------------------------------------

const QuotaModal: React.FC<{ quotaInfo: QuotaResponse | null; summary: QuotaSummary | null; open: boolean; onClose: () => void }> = ({
  quotaInfo,
  summary,
  open,
  onClose,
}) => {
  if (!quotaInfo || !summary) {
    return null;
  }

  return (
    <Modal isOpen={open} onClose={onClose} showCloseButton={false} className="max-w-3xl w-[90%] mx-auto">
      <div className="bg-white rounded-xl border-2 border-[#8B5E1E] shadow-lg relative p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 hover:opacity-70 transition z-10"
          aria-label="Đóng"
        >
          <img src="/circle-xmark 1.svg" alt="Đóng" className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <div className="mb-4 sm:mb-5 pr-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-[15px] sm:text-[18px] leading-tight text-black uppercase mb-1">
                Hạn mức mua hàng
              </h3>
              <p className="text-[11px] sm:text-sm text-gray-600">
                Chu kỳ 30 ngày kể từ đơn hàng đầu tiên
              </p>
          </div>
          <span
              className={`inline-flex items-center self-start rounded px-2 py-1 text-[10px] sm:text-xs font-medium ${
              quotaInfo.isPeriodExpired ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
              {quotaInfo.isPeriodExpired ? "Đã hết hạn" : "Đang hiệu lực"}
          </span>
          </div>
        </div>

        {/* Thống kê hạn mức */}
        <div className="mb-4 sm:mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
          <QuotaStatCard label="Hạn mức 30 ngày" value={`${formatNumber(quotaInfo.quotaLimit)} sp`} accent />
          <QuotaStatCard label="Đã mua trong kỳ" value={`${formatNumber(quotaInfo.quotaUsed)} sp`} />
          <QuotaStatCard
            label="Còn lại"
            value={`${formatNumber(Math.max(0, quotaInfo.quotaRemaining))} sp`}
            emphasize={quotaInfo.quotaRemaining <= 0}
          />
          <QuotaStatCard
            label="Trong giỏ hàng"
            value={
              quotaInfo.cartQuantity !== undefined ? `${formatNumber(quotaInfo.cartQuantity)} sp` : "—"
            }
            hint={
              quotaInfo.remainingAfterCart !== undefined
                ? `Sau đặt hàng: ${formatNumber(quotaInfo.remainingAfterCart)} sp`
                : "Thêm sản phẩm vào giỏ để xem."
            }
            hintEmphasize={quotaInfo.remainingAfterCart !== undefined && quotaInfo.remainingAfterCart < 0}
          />
        </div>

        {/* Thông tin chu kỳ */}
        <div className="mb-4 sm:mb-5 border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="space-y-2 sm:space-y-3 text-[11px] sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            <div>
                <span className="text-gray-600">Chu kỳ hiện tại:</span>
                <p className="font-semibold text-[#8B5E1E] mt-0.5">{summary.periodRange}</p>
            </div>
            <div>
                <span className="text-gray-600">Tự động reset:</span>
                <p className="font-semibold text-[#8B5E1E] mt-0.5">
                {summary.resetLabel}
                {!quotaInfo.isPeriodExpired && summary.daysRemaining !== null
                    ? ` (${summary.daysRemaining} ngày)`
                  : ""}
              </p>
            </div>
          </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-600">{summary.nextResetText}</p>
          {quotaInfo.message && (
                <p className="text-gray-500 italic mt-1">{quotaInfo.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Ghi chú */}
        <div className="border-t border-gray-200 pt-3 sm:pt-4">
          <h4 className="font-bold text-[13px] sm:text-sm uppercase text-gray-800 mb-2">Ghi chú</h4>
          <ul className="list-disc space-y-1.5 pl-5 text-[11px] sm:text-sm text-gray-600">
            <li>Chu kỳ kéo dài 30 ngày từ đơn hàng đầu tiên.</li>
            <li>Chu kỳ mới tự động bắt đầu khi kết thúc hoặc đặt đơn mới sau khi hết hạn.</li>
            <li>"Còn lại" là số sản phẩm bạn có thể đặt trong chu kỳ hiện tại.</li>
            <li>Nếu hết hạn mức, chờ chu kỳ mới hoặc liên hệ quản trị viên.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

const WithdrawModal: React.FC<{
  open: boolean;
  submitting: boolean;
  form: WithdrawFormState;
  onChange: (field: keyof WithdrawFormState) => (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}> = ({ open, submitting, form, onChange, onSubmit, onClose }) => {
  const banks = [
    "Vietcombank",
    "VietinBank", 
    "BIDV",
    "Agribank",
    "Sacombank",
    "Techcombank",
    "MB Bank",
    "ACB",
    "VPBank",
    "TPBank",
    "HDBank",
    "VIB",
    "SHB",
    "SeABank",
  ];

  return (
    <Modal isOpen={open} onClose={onClose} showCloseButton={false} className="max-w-md w-[90%] mx-auto">
      <div className="bg-white rounded-xl border-2 border-[#8B5E1E] shadow-lg relative p-5 sm:p-8">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 hover:opacity-70 transition"
          aria-label="Đóng"
        >
          <img src="/circle-xmark 1.svg" alt="Đóng" className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <h3 className="font-bold text-[15px] sm:text-[18px] leading-tight mb-5 sm:mb-8 text-black uppercase">
          Yêu cầu rút tiền
        </h3>

        {/* Form */}
        <form className="space-y-4 sm:space-y-5 text-black" onSubmit={onSubmit}>
          {/* Số tiền */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="amount" className="font-bold w-20 sm:w-28 flex-shrink-0 text-[11px] md:text-[14px]">
              Số tiền
            </label>
          <input
              id="amount"
            type="text"
              className="border border-black rounded-md py-0.5 sm:py-1 px-2 sm:px-3 min-w-0 flex-1 sm:w-[220px] font-normal text-[11px] md:text-[14px] text-black focus:outline-none focus:ring-1 focus:ring-[#8B5E1E]"
            value={form.amount}
            onChange={onChange("amount")}
              placeholder="500.000 đ"
            required
          />
        </div>

          {/* Ngân hàng */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="bank" className="font-bold w-20 sm:w-28 flex-shrink-0 text-[11px] md:text-[14px]">
              Ngân hàng
            </label>
            <select
              id="bank"
              className="border border-black rounded-md py-0.5 sm:py-1 px-2 sm:px-3 min-w-0 flex-1 sm:w-[220px] font-normal text-[11px] md:text-[14px] text-black focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] bg-white"
              value={form.bankName}
              onChange={(e) => onChange("bankName")(e as any)}
              required
            >
              <option value="">Chọn ngân hàng</option>
              {banks.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          {/* Số tài khoản */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="account" className="font-bold w-20 sm:w-28 flex-shrink-0 text-[11px] md:text-[14px]">
              Số tài khoản
            </label>
            <input
              id="account"
              type="text"
              className="border border-black rounded-md py-0.5 sm:py-1 px-2 sm:px-3 min-w-0 flex-1 sm:w-[220px] font-normal text-[11px] md:text-[14px] text-black focus:outline-none focus:ring-1 focus:ring-[#8B5E1E]"
              value={form.accountNumber}
              onChange={onChange("accountNumber")}
              placeholder="1122334455"
              required
            />
          </div>

          {/* Người nhận */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="recipient" className="font-bold w-20 sm:w-28 flex-shrink-0 text-[11px] md:text-[14px]">
              Người nhận
            </label>
          <input
              id="recipient"
            type="text"
              className="border border-black rounded-md py-0.5 sm:py-1 px-2 sm:px-3 min-w-0 flex-1 sm:w-[220px] font-normal text-[11px] md:text-[14px] text-black focus:outline-none focus:ring-1 focus:ring-[#8B5E1E]"
            value={form.accountName}
            onChange={onChange("accountName")}
              placeholder="Nguyễn Văn A"
            required
          />
        </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#8B5E1E] text-white font-bold text-[12px] md:text-[14px] rounded-md py-2.5 sm:py-3 mt-5 sm:mt-7 uppercase hover:bg-[#6f4715] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Đang xử lý..." : "Gửi yêu cầu"}
          </button>
        </form>
        </div>
    </Modal>
  );
};

const ChangePasswordModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { changePassword } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới và xác nhận không khớp");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await changePassword(currentPassword, newPassword);
      setMessage(response.message || "Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Không thể đổi mật khẩu";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} showCloseButton={false} className="max-w-md w-[90%] mx-auto">
      <div className="bg-white rounded-xl border-2 border-[#8B5E1E] shadow-lg relative p-5 sm:p-8">
        {/* Close button */}
          <button
            type="button"
            onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 hover:opacity-70 transition"
          aria-label="Đóng"
          >
          <img src="/circle-xmark 1.svg" alt="Đóng" className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

        {/* Header */}
        <h3 className="font-bold text-[15px] sm:text-[18px] leading-tight mb-5 sm:mb-8 text-black uppercase">
          Đổi mật khẩu
        </h3>

        {/* Form */}
        <form className="space-y-4 sm:space-y-5 text-black" onSubmit={handleSubmit}>
          {/* Mật khẩu hiện tại */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="current-password" className="font-bold w-24 sm:w-32 flex-shrink-0 text-[11px] md:text-[14px]">
              Mật khẩu cũ
            </label>
            <input
              id="current-password"
              type="password"
              className="border border-black rounded-md py-0.5 sm:py-1 px-2 sm:px-3 min-w-0 flex-1 sm:w-[220px] font-normal text-[11px] md:text-[14px] text-black focus:outline-none focus:ring-1 focus:ring-[#8B5E1E]"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu cũ"
              required
            />
          </div>

          {/* Mật khẩu mới */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="new-password" className="font-bold w-24 sm:w-32 flex-shrink-0 text-[11px] md:text-[14px]">
              Mật khẩu mới
            </label>
            <input
              id="new-password"
              type="password"
              className="border border-black rounded-md py-0.5 sm:py-1 px-2 sm:px-3 min-w-0 flex-1 sm:w-[220px] font-normal text-[11px] md:text-[14px] text-black focus:outline-none focus:ring-1 focus:ring-[#8B5E1E]"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              required
            />
          </div>

          {/* Xác nhận mật khẩu */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="confirm-password" className="font-bold w-24 sm:w-32 flex-shrink-0 text-[11px] md:text-[14px]">
              Xác nhận
            </label>
            <input
              id="confirm-password"
              type="password"
              className="border border-black rounded-md py-0.5 sm:py-1 px-2 sm:px-3 min-w-0 flex-1 sm:w-[220px] font-normal text-[11px] md:text-[14px] text-black focus:outline-none focus:ring-1 focus:ring-[#8B5E1E]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-[11px] sm:text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {/* Success message */}
          {message && (
            <p className="text-[11px] sm:text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {message}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#8B5E1E] text-white font-bold text-[12px] md:text-[14px] rounded-md py-2.5 sm:py-3 mt-5 sm:mt-7 uppercase hover:bg-[#6f4715] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </button>
      </form>
    </div>
  </Modal>
);
};

const OrderDetailModal: React.FC<{ order: OrderType; onClose: () => void }> = ({ order, onClose }) => (
  <Modal isOpen onClose={onClose} showCloseButton={false} className="max-w-2xl w-[90%] mx-auto">
    <div className="bg-white rounded-xl border-2 border-[#8B5E1E] shadow-lg relative p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-5 sm:right-5 hover:opacity-70 transition z-10"
        aria-label="Đóng"
      >
        <img src="/circle-xmark 1.svg" alt="Đóng" className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Header */}
      <div className="mb-4 sm:mb-5 pr-8">
        <h3 className="font-bold text-[15px] sm:text-[18px] leading-tight text-black uppercase mb-1">
          Chi tiết đơn hàng
        </h3>
        <p className="text-[11px] sm:text-sm text-gray-600">
          Mã đơn: <span className="font-semibold text-[#8B5E1E]">{order.orderNumber}</span>
        </p>
    </div>

      {/* Thông tin đơn hàng */}
      <div className="mb-4 sm:mb-5 border border-gray-200 rounded-lg p-3 sm:p-4">
        <div className="space-y-2 sm:space-y-3 text-[11px] sm:text-sm">
          {/* Ngày tạo & Trạng thái - cùng hàng trên mobile */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <span className="text-gray-600">Ngày tạo:</span>
              <p className="font-semibold text-gray-900">
                <span className="sm:hidden">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                <span className="hidden sm:inline">{formatDateTime(order.createdAt)}</span>
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="text-gray-600 block sm:inline mb-1 sm:mb-0">Trạng thái:</span>
              <div className="sm:inline-block sm:ml-2">
                <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium capitalize ${renderOrderStatusBadge(order.status)}`}>
                  {renderOrderStatusText(order.status)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Tổng tiền */}
          <div>
            <span className="text-gray-600">Tổng tiền:</span>
            <p className="font-bold text-[#8B5E1E] text-base sm:text-lg">
            {formatCurrency(Number(order.totalAmount ?? 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Danh sách sản phẩm */}
      <div>
        <h4 className="font-bold text-[13px] sm:text-sm uppercase text-gray-800 mb-2 sm:mb-3">
          Sản phẩm ({order.items.length})
        </h4>
        
        {/* Mobile: Card view */}
        <div className="space-y-3 sm:hidden">
          {order.items.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="font-semibold text-[11px] text-gray-900 mb-2">
                {item.product.name}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-600">Phân loại:</span>
                  <p className="font-medium">{item.productVariant?.size || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-600">Số lượng:</span>
                  <p className="font-medium">×{item.quantity}</p>
                </div>
                <div>
                  <span className="text-gray-600">Đơn giá:</span>
                  <p className="font-medium">{formatCurrency(Number(item.price ?? 0))}</p>
                </div>
                <div>
                  <span className="text-gray-600">Thành tiền:</span>
                  <p className="font-semibold text-[#8B5E1E]">{formatCurrency(Number(item.subtotal ?? 0))}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table view */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="text-white" style={{ backgroundColor: WALLET_COLOR }}>
                <th className="px-2 py-2 font-semibold text-[11px]">Sản phẩm</th>
                <th className="px-2 py-2 font-semibold text-center text-[11px]">Phân loại</th>
                <th className="px-2 py-2 font-semibold text-center text-[11px]">SL</th>
                <th className="px-2 py-2 font-semibold text-right text-[11px]">Đơn giá</th>
                <th className="px-2 py-2 font-semibold text-right text-[11px]">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="even:bg-[#fdf8f2] border-b border-gray-100">
                  <td className="px-2 py-2 text-[11px] text-gray-900">{item.product.name}</td>
                  <td className="px-2 py-2 text-center text-[11px] text-gray-700">{item.productVariant?.size || "—"}</td>
                  <td className="px-2 py-2 text-center text-[11px] text-gray-700">×{item.quantity}</td>
                  <td className="px-2 py-2 text-right text-[11px] text-gray-700">{formatCurrency(Number(item.price ?? 0))}</td>
                  <td className="px-2 py-2 text-right font-semibold text-[11px] text-[#8B5E1E]">
                    {formatCurrency(Number(item.subtotal ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Modal>
);

const DownlineDetailModal: React.FC<{ order: DownlineOrder; onClose: () => void }> = ({ order, onClose }) => {
  const isCancelled = order.status?.toUpperCase() === "CANCELLED";
  const levelLabel = order.level != null ? `F${order.level + 1}` : "F?";
  
  return (
    <Modal isOpen onClose={onClose} showCloseButton={false} className="max-w-xl w-[90%] mx-auto">
      <div className="bg-white rounded-xl border-2 border-[#8B5E1E] shadow-lg relative p-5 sm:p-6">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 hover:opacity-70 transition z-10"
          aria-label="Đóng"
        >
          <img src="/circle-xmark 1.svg" alt="Đóng" className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <div className="mb-4 sm:mb-5 pr-8">
          <h3 className="font-bold text-[15px] sm:text-[18px] leading-tight text-black uppercase mb-1">
            Đơn hàng tuyến dưới
          </h3>
          <p className="text-[11px] sm:text-sm text-gray-600">
            Mã đơn: <span className="font-semibold text-[#8B5E1E]">{order.orderNumber || order.id}</span>
            <span className={`ml-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] sm:text-xs font-medium ${
              isCancelled ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}>
              {isCancelled ? "− Đã hủy" : "+ Hoàn thành"}
            </span>
          </p>
        </div>

        {/* Thông tin đơn hàng */}
        <div className={`mb-4 sm:mb-5 rounded-lg p-3 sm:p-4 ${isCancelled ? "border-2 border-red-300 bg-red-50" : "border border-gray-200"}`}>
          <div className="space-y-2 sm:space-y-3 text-[11px] sm:text-sm">
            {/* Cấp & Khách hàng - cùng hàng */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <span className="text-gray-600">Cấp tuyến dưới:</span>
                <p className={`font-bold text-base sm:text-lg ${isCancelled ? "text-red-600" : "text-[#8B5E1E]"}`}>
                  {levelLabel}
                </p>
              </div>
              <div className="flex-1 text-right">
                <span className="text-gray-600 block">Khách hàng:</span>
                <p className="font-semibold text-gray-900 text-[11px] sm:text-sm">
                  {order.buyerName || "Ẩn danh"}
                </p>
              </div>
            </div>

            {/* Ngày tạo */}
            <div>
              <span className="text-gray-600">Ngày tạo:</span>
              <p className="font-semibold text-gray-900">
                <span className="sm:hidden">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '—'}</span>
                <span className="hidden sm:inline">{order.createdAt ? formatDateTime(order.createdAt) : '—'}</span>
              </p>
            </div>

            {/* Thành tiền */}
            <div>
              <span className="text-gray-600">Thành tiền:</span>
              <p className={`font-bold text-base sm:text-lg ${isCancelled ? "text-red-600" : "text-gray-900"}`}>
          {formatCurrency(order.total)}
              </p>
            </div>

            {/* Hoa hồng */}
            <div className="pt-2 border-t border-gray-200">
              <span className="text-gray-600">Hoa hồng nhận được:</span>
              <p className={`font-bold text-lg sm:text-xl ${isCancelled ? "text-red-600 line-through" : "text-[#10B981]"}`}>
          {formatCurrency(order.commission)}
              </p>
            </div>

            {/* Warning nếu bị hủy */}
            {isCancelled && (
              <div className="pt-3 mt-2 border-t border-red-200">
                <div className="flex items-start gap-2 bg-red-100 border border-red-300 rounded-md p-2 sm:p-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-red-700 text-[11px] sm:text-xs">Đơn hàng đã bị hủy</p>
                    <p className="text-red-600 text-[10px] sm:text-xs mt-0.5">
                      Hoa hồng từ đơn hàng này sẽ không được tính vào ví của bạn.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  </Modal>
);
};

const WithdrawalDetailModal: React.FC<{ withdrawal: WithdrawalRequest; onClose: () => void }> = ({ withdrawal, onClose }) => {
  const statusUpper = withdrawal.status?.toUpperCase();
  const isRejected = statusUpper === "REJECTED";

  return (
    <Modal isOpen onClose={onClose} showCloseButton={false} className="max-w-xl w-[90%] mx-auto">
      <div className="bg-white rounded-xl border-2 border-[#8B5E1E] shadow-lg relative p-5 sm:p-6">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 hover:opacity-70 transition z-10"
          aria-label="Đóng"
        >
          <img src="/circle-xmark 1.svg" alt="Đóng" className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <div className="mb-4 sm:mb-5 pr-8">
          <h3 className="font-bold text-[15px] sm:text-[18px] leading-tight text-black uppercase mb-1">
            Chi tiết yêu cầu rút tiền
          </h3>
          <p className="text-[11px] sm:text-sm text-gray-600">
            Mã yêu cầu: <span className="font-semibold text-[#8B5E1E]">#{withdrawal.id}</span>
          </p>
        </div>

        {/* Thông tin yêu cầu */}
        <div className={`mb-4 sm:mb-5 rounded-lg p-3 sm:p-4 ${
          isRejected ? "border-2 border-red-300 bg-red-50" : "border border-gray-200"
        }`}>
          <div className="space-y-2 sm:space-y-3 text-[11px] sm:text-sm">
            {/* Số tiền */}
            <div>
              <span className="text-gray-600">Số tiền yêu cầu:</span>
              <p className={`font-bold text-lg sm:text-xl ${
                isRejected ? "text-red-600" : "text-[#8B5E1E]"
              }`}>
          {formatCurrency(withdrawal.amount)}
              </p>
            </div>

            {/* Trạng thái */}
            <div>
              <span className="text-gray-600">Trạng thái:</span>
              <div className="mt-1">
                <span className={`inline-flex rounded px-2 py-1 text-[11px] sm:text-xs font-medium capitalize ${renderWithdrawalStatusBadge(withdrawal.status)}`}>
          {renderWithdrawalStatusText(withdrawal.status)}
                </span>
              </div>
            </div>

            {/* Ngày tạo & Ngày xử lý */}
            <div className={`${withdrawal.processedAt ? "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4" : ""}`}>
              <div>
                <span className="text-gray-600">Ngày tạo:</span>
                <p className="font-semibold text-gray-900">
                  <span className="sm:hidden">{new Date(withdrawal.requestedAt).toLocaleDateString('vi-VN')}</span>
                  <span className="hidden sm:inline">{formatDateTime(withdrawal.requestedAt)}</span>
                </p>
              </div>
        {withdrawal.processedAt && (
                <div>
                  <span className="text-gray-600">Ngày xử lý:</span>
                  <p className="font-semibold text-gray-900">
                    <span className="sm:hidden">{new Date(withdrawal.processedAt).toLocaleDateString('vi-VN')}</span>
                    <span className="hidden sm:inline">{formatDateTime(withdrawal.processedAt)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Thông tin ngân hàng */}
            {withdrawal.bankInfo && (
              <div className="pt-2 mt-2 border-t border-gray-200">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-gray-600">Ngân hàng:</span>
                    <p className="font-semibold text-gray-900">{withdrawal.bankInfo.bankName}</p>
                  </div>
                  {withdrawal.bankInfo.accountNumber && (
                    <div>
                      <span className="text-gray-600">Số tài khoản:</span>
                      <p className="font-semibold text-gray-900">{withdrawal.bankInfo.accountNumber}</p>
                    </div>
                  )}
                  {withdrawal.bankInfo.accountName && (
                    <div>
                      <span className="text-gray-600">Chủ tài khoản:</span>
                      <p className="font-semibold text-gray-900">{withdrawal.bankInfo.accountName}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warning box chỉ hiện khi bị từ chối */}
            {isRejected && (
              <div className="pt-3 mt-2 border-t border-red-200">
                <div className="flex items-start gap-2 bg-red-100 border border-red-300 rounded-md p-2 sm:p-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-red-700 text-[11px] sm:text-xs">Yêu cầu đã bị từ chối</p>
                    <p className="text-red-600 text-[10px] sm:text-xs mt-0.5">
                      Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  </Modal>
);
};

const QuotaStatCard: React.FC<{
  label: string;
  value: string;
  accent?: boolean;
  emphasize?: boolean;
  hint?: string;
  hintEmphasize?: boolean;
}> = ({ label, value, accent = false, emphasize = false, hint, hintEmphasize = false }) => (
  <div
    className={`rounded-md border bg-white px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm ${
      accent ? "border-[#8B5E1E] ring-1 ring-[#8B5E1E]/20" : "border-gray-200"
    }`}
  >
    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <p
      className={`mt-1 text-base sm:text-lg font-bold ${
        emphasize ? "text-red-600" : accent ? "text-[#8B5E1E]" : "text-gray-800"
      }`}
    >
      {value}
    </p>
    {hint && (
      <p className={`mt-1 text-[10px] sm:text-[11px] ${hintEmphasize ? "text-red-600" : "text-gray-500"}`}>{hint}</p>
    )}
  </div>
);

const renderOrderStatusBadge = (status?: string) => {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-blue-100 text-blue-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const renderDownlineStatusBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    case "PENDING":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-green-100 text-green-700";
  }
};

const renderDownlineStatusLabel = (status: string) => {
  switch (status?.toUpperCase()) {
    case "CANCELLED":
      return "Đã hủy";
    case "PENDING":
      return "Đang chờ";
    case "APPROVED":
      return "Đã hoàn thành";
    default:
      return status || "Không xác định";
  }
};

const renderWithdrawalStatusBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
};

const renderWithdrawalStatusText = (status: string) => {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "Đã duyệt";
    case "REJECTED":
      return "Đã từ chối";
    case "PENDING":
      return "Đang xử lý";
    default:
      return status || "Không xác định";
  }
};

const renderOrderStatusText = (status?: string) => {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
      return "Hoàn thành";
    case "PENDING":
      return "Đang xử lý";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "Không xác định";
  }
};

const renderQuotaModal = (
  quotaInfo: QuotaResponse | null,
  summary: QuotaSummary | null,
  open: boolean,
  onClose: () => void,
) => <QuotaModal quotaInfo={quotaInfo} summary={summary} open={open} onClose={onClose} />;

const renderWithdrawModal = (
  open: boolean,
  submitting: boolean,
  form: WithdrawFormState,
  onChange: (field: keyof WithdrawFormState) => (event: ChangeEvent<HTMLInputElement>) => void,
  onSubmit: (event: FormEvent<HTMLFormElement>) => void,
  onClose: () => void,
) => (
  <WithdrawModal
    open={open}
    submitting={submitting}
    form={form}
    onChange={onChange}
    onSubmit={onSubmit}
    onClose={onClose}
  />
);

const renderChangePasswordModal = (open: boolean, onClose: () => void) => (
  <ChangePasswordModal open={open} onClose={onClose} />
);
