import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState, useRef } from "react";
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
import { authService, type AuthUser } from "../services/authService";
import { apiClient } from "../services/apiClient";
import { Header } from "../components/layouts/Header";
import { useUserName } from "../hooks/useUserName";

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
  const userName = useUserName();

  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);

  const [downlineOrders, setDownlineOrders] = useState<DownlineOrder[]>([]);
  const [downlineFilter, setDownlineFilter] = useState("ALL");
  const [loadingDownline, setLoadingDownline] = useState(true);

  const [cartItemCount, setCartItemCount] = useState(0);

  const [quotaInfo, setQuotaInfo] = useState<QuotaResponse | null>(null);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);

  const [userProfile, setUserProfile] = useState<AuthUser | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState<WithdrawFormState>(DEFAULT_WITHDRAW_FORM);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);
  const [selectedDownlineOrder, setSelectedDownlineOrder] = useState<DownlineOrder | null>(null);

  const DOWNLINE_ITEMS_PER_PAGE = 100;


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

  const loadUserProfile = async () => {
    if (!accessToken) return;
    try {
      const profile = await authService.getProfile(accessToken);
      setUserProfile(profile);
    } catch (error) {
      console.error("Failed to load user profile:", error);
    }
  };

  const handleCopyReferralCode = async () => {
    if (!userProfile?.referralCode) return;
    try {
      await navigator.clipboard.writeText(userProfile.referralCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy referral code:", error);
    }
  };


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
        { page: 1, limit: DOWNLINE_ITEMS_PER_PAGE },
        accessToken,
      );

      // DEBUG: Log the raw data from API
      console.log('=== DEBUG: Commission API Response ===');
      console.log('Total commissions:', result.data.length);
      if (result.data.length > 0) {
        console.log('First commission raw data:', JSON.stringify(result.data[0], null, 2));
      }

      const transformed: DownlineOrder[] = result.data.map((commission: any) => {
        // DEBUG: Log each commission's fromUser data
        console.log('Processing commission:', {
          id: commission.id,
          fromUser: commission.fromUser,
          fromUserId: commission.fromUserId,
        });

        // Create full name from firstName and lastName, fallback to username or email
        let buyerName = '';
        if (commission.fromUser?.firstName && commission.fromUser?.lastName) {
          buyerName = `${commission.fromUser.firstName} ${commission.fromUser.lastName}`;
        } else if (commission.fromUser?.firstName) {
          buyerName = commission.fromUser.firstName;
        } else if (commission.fromUser?.lastName) {
          buyerName = commission.fromUser.lastName;
        } else {
          buyerName = commission.fromUser?.username || commission.fromUser?.email || 'Ẩn danh';
        }

        return {
          id: commission.id,
          orderNumber: commission.order?.orderNumber,
          buyerName,
          total: Number(commission.order?.totalAmount ?? 0),
          commission: Number(commission.commissionAmount ?? commission.amount ?? 0),
          level: typeof commission.level === "number" ? commission.level : null,
          status: commission.status ?? "APPROVED",
          createdAt: commission.calculatedAt || commission.createdAt,
        };
      });

      setDownlineOrders(transformed);
    } catch (error) {
      console.error("Failed to load downline orders:", error);
    } finally {
      setLoadingDownline(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadOrders();
    loadCartCount();
    loadQuotaInfo();
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    loadWalletBalance();
    loadUserProfile();
  }, [accessToken, loadWalletBalance]);

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
      await loadWalletBalance();
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
        <Header
          cartItemCount={cartItemCount}
          userName={userName}
        />

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
                  className="flex w-full items-center justify-start gap-3 rounded-md px-6 py-4 text-[14px] font-extrabold text-white sm:w-auto md:py-6 md:text-[16px] md:min-w-[250px] shadow-lg"
                  style={{
                    background: 'linear-gradient(90deg, rgba(139,94,30,1) 0%, rgba(161,109,36,1) 50%, rgba(233,201,156,1) 100%)',
                  }}
                >
                  <img src="/wallet 1.svg" alt="Số dư ví hoa hồng" className="h-8 w-8 object-contain flex-shrink-0" />
                  <span className="truncate">
                    {loadingWallet ? "Đang tải..." : formatCurrency(walletBalance)}
                  </span>
                </button>

                <div className="flex flex-col gap-2 w-full sm:w-auto md:min-w-[150px]">
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-md px-6 py-2 text-[12px] font-extrabold uppercase tracking-wide text-white transition hover:opacity-90 md:py-3 md:text-[14px]"
                    style={{ backgroundColor: WALLET_COLOR }}
                    onClick={() => setIsWithdrawOpen(true)}
                  >
                    Rút tiền
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-md border px-6 py-2 text-[12px] font-extrabold uppercase tracking-wide transition hover:bg-gray-50 md:py-3 md:text-[14px]"
                    style={{ borderColor: WALLET_COLOR, color: WALLET_COLOR }}
                    onClick={() => navigate('/account/withdrawal-history')}
                  >
                    Lịch sử
                  </button>
                </div>
              </div>
            </section>

            {/* Referral Code Section */}
            {userProfile?.referralCode && (
              <section className="space-y-3">
                <h2 className="text-[14px] font-bold uppercase md:text-[16px]">Mã giới thiệu của bạn</h2>
                <div className="rounded-md border p-4" style={{ borderColor: WALLET_COLOR }}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <p className="mb-1 text-[11px] text-gray-600 md:text-[12px]">
                        Chia sẻ mã này để giới thiệu người dùng mới
                      </p>
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span
                          className="inline-block rounded-md px-4 py-2 font-mono text-[16px] font-bold md:text-[20px]"
                          style={{ backgroundColor: '#FDF8F2', color: WALLET_COLOR }}
                        >
                          {userProfile.referralCode}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyReferralCode}
                      className="flex items-center justify-center gap-2 rounded-md px-6 py-2 text-[12px] font-extrabold uppercase tracking-wide text-white transition hover:opacity-90 md:min-w-[120px] md:py-3 md:text-[14px]"
                      style={{ backgroundColor: copySuccess ? '#10B981' : WALLET_COLOR }}
                    >
                      {copySuccess ? (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Đã sao chép
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Sao chép
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            )}

            <OrdersSection
              loading={loadingOrders}
              orders={orders}
              onViewDetail={setSelectedOrder}
            />

            <DownlineSection
              loading={loadingDownline}
              orders={availableDownline}
              filter={downlineFilter}
              onFilterChange={setDownlineFilter}
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
    </>
  );
};

export default Account;

// -- UI helper components ----------------------------------------------------

const Breadcrumb: React.FC = () => (
  <div className="mt-2 flex justify-center mx-4 md:mx-0">
    <nav className="w-full md:w-[65%] text-[13px] md:text-[14px] flex items-center gap-1 text-[#9b6a2a] font-medium">
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
          to="/"
          className="inline-block rounded-sm bg-[#8B5E1E] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#6f4715]"
        >
          Mua sắm ngay
        </Link>
      </div>
    ) : (
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-gray-200 rounded-md">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="text-white" style={{ backgroundColor: WALLET_COLOR }}>
              <th className="px-2 py-2 font-normal md:px-4 w-[20%] md:w-[35%]">Đơn hàng</th>
              <th className="px-2 py-2 text-center font-normal md:px-4 w-[20%] md:w-[25%]">Thành tiền</th>
              <th className="px-2 py-2 text-center font-normal md:px-4 w-[46%] md:w-[25%]">Trạng thái</th>
              <th className="px-0.5 py-2 text-center font-normal md:px-4 w-[14%] md:w-[15%]">
                <span className="hidden md:inline">Xem chi tiết</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="even:bg-[#fdf8f2]">
                <td className="px-2 py-2 md:px-4 md:py-3 w-[20%] md:w-[35%]">
                  <div className="text-[11px] md:text-sm font-medium text-gray-900 truncate max-w-[80px] md:max-w-full">{order.orderNumber}</div>
                </td>
                <td className="px-2 py-2 text-center text-[11px] md:text-sm text-gray-700 md:px-4 md:py-3 w-[20%] md:w-[25%]">
                  {formatCurrency(Number(order.totalAmount ?? 0))}
                </td>
                <td className="px-2 py-2 text-center md:px-4 md:py-3 w-[46%] md:w-[25%]">
                  <span className={`inline-flex justify-center items-center rounded px-2 py-1 text-[11px] md:text-xs font-medium capitalize w-[110px] md:w-[130px] ${renderOrderStatusBadge(order.status)}`}>
                    {renderOrderStatusText(order.status)}
                  </span>
                </td>
                <td className="px-0.5 py-2 text-center md:px-4 md:py-3 w-[14%] md:w-[15%]">
                  {/* Mobile: Icon only */}
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
  onFilterChange: (value: string) => void;
  onOpenDetail: (order: DownlineOrder) => void;
}> = ({ loading, orders, filter, onFilterChange, onOpenDetail }) => (
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
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-gray-200 rounded-md">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="text-white" style={{ backgroundColor: WALLET_COLOR }}>
              <th className="px-2 py-2 font-normal md:px-4 w-[22%] md:w-[35%]">Đơn hàng</th>
              <th className="px-2 py-2 text-center font-normal md:px-4 w-[20%] md:w-[25%]">Thành tiền</th>
              <th className="px-2 py-2 text-center font-normal md:px-4 w-[44%] md:w-[25%]">Hoa hồng</th>
              <th className="px-0.5 py-2 text-center font-normal md:px-4 w-[14%] md:w-[15%]">
                <span className="hidden md:inline">Xem chi tiết</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isCancelled = order.status?.toUpperCase() === "CANCELLED";

              return (
              <tr key={order.id} className="even:bg-[#fdf8f2]">
                  <td className="px-2 py-2 md:px-4 md:py-3 w-[22%] md:w-[35%]">
                    <div className={`text-[11px] md:text-sm font-medium truncate max-w-[80px] md:max-w-full ${isCancelled ? "text-red-600" : "text-gray-900"}`}>
                      {order.orderNumber || order.id}
                    </div>
                </td>
                  <td className={`px-2 py-2 text-center md:px-4 md:py-3 text-[11px] md:text-sm w-[20%] md:w-[25%] ${isCancelled ? "text-red-600" : "text-gray-700"}`}>
                  {formatCurrency(order.total)}
                </td>
                  <td className="px-2 py-2 text-center md:px-4 md:py-3 w-[44%] md:w-[25%]">
                    <span className={`inline-flex justify-center items-center rounded px-2 py-1 text-[11px] md:text-xs font-semibold w-[110px] md:w-[130px] ${
                      isCancelled ? "bg-red-100 text-red-600" : "bg-green-100 text-[#10B981]"
                    }`}>
                      {formatCurrency(order.commission)}
                    </span>
                  </td>
                  <td className="px-0.5 py-2 text-center md:px-4 md:py-3 w-[14%] md:w-[15%]">
                    {/* Mobile: Icon only */}
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
    <Modal isOpen={open} onClose={onClose} showCloseButton={false} className="max-w-3xl w-[90%] mx-auto px-4 !bg-transparent !rounded-none !shadow-none">
      <div className="bg-white rounded-xl border-2 border-[#8B5E1E] shadow-lg relative px-4 py-4 sm:px-6 sm:py-5 max-h-[90vh] overflow-y-auto">
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

        {/* Thống kê hạn mức theo size - Dạng bảng */}
        <div className="mb-4 sm:mb-5">
          <div className="overflow-x-auto rounded-lg border-2 border-[#9b6a2a]">
            <table className="w-full text-[11px] sm:text-sm">
              <thead>
                <tr className="bg-[#9b6a2a] text-white">
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-bold">Size</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-center font-bold">Hạn mức</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-center font-bold">Đã mua</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-center font-bold">Còn lại</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-center font-bold">Trong giỏ</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {/* 5ml */}
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-bold text-gray-900">5ml</td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center font-semibold text-[#9b6a2a]">
                    {formatNumber(quotaInfo.quota5ml.limit)}
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center text-gray-700">
                    {formatNumber(quotaInfo.quota5ml.used)}
                  </td>
                  <td className={`px-2 py-2.5 sm:px-3 sm:py-3 text-center font-bold ${
                    quotaInfo.quota5ml.remaining <= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatNumber(quotaInfo.quota5ml.remaining)}
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center font-semibold text-blue-600">
                    {quotaInfo.quota5ml.inCart !== undefined && quotaInfo.quota5ml.inCart > 0 
                      ? formatNumber(quotaInfo.quota5ml.inCart) 
                      : '—'}
                  </td>
                </tr>
                {/* 20ml */}
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-bold text-gray-900">20ml</td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center font-semibold text-[#9b6a2a]">
                    {formatNumber(quotaInfo.quota20ml.limit)}
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center text-gray-700">
                    {formatNumber(quotaInfo.quota20ml.used)}
                  </td>
                  <td className={`px-2 py-2.5 sm:px-3 sm:py-3 text-center font-bold ${
                    quotaInfo.quota20ml.remaining <= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatNumber(quotaInfo.quota20ml.remaining)}
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center font-semibold text-blue-600">
                    {quotaInfo.quota20ml.inCart !== undefined && quotaInfo.quota20ml.inCart > 0 
                      ? formatNumber(quotaInfo.quota20ml.inCart) 
                      : '—'}
                  </td>
                </tr>
                {/* Kit removed - no limit */}
                {/* Tổng cộng */}
                <tr className="bg-[#fdf8f2] border-t-2 border-[#9b6a2a] font-bold">
                  <td className="px-3 py-3 sm:px-4 sm:py-4 text-gray-900 uppercase text-xs sm:text-sm">
                    Tổng cộng
                  </td>
                  <td className="px-2 py-3 sm:px-3 sm:py-4 text-center text-[#9b6a2a]">
                    {formatNumber(quotaInfo.quota5ml.limit + quotaInfo.quota20ml.limit)}
                  </td>
                  <td className="px-2 py-3 sm:px-3 sm:py-4 text-center text-gray-800">
                    {formatNumber(quotaInfo.quota5ml.used + quotaInfo.quota20ml.used)}
                  </td>
                  <td className={`px-2 py-3 sm:px-3 sm:py-4 text-center ${
                    (quotaInfo.quota5ml.remaining + quotaInfo.quota20ml.remaining) <= 0 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {formatNumber(quotaInfo.quota5ml.remaining + quotaInfo.quota20ml.remaining)}
                  </td>
                  <td className="px-2 py-3 sm:px-3 sm:py-4 text-center text-blue-600">
                    {((quotaInfo.quota5ml.inCart || 0) + (quotaInfo.quota20ml.inCart || 0)) > 0
                      ? formatNumber((quotaInfo.quota5ml.inCart || 0) + (quotaInfo.quota20ml.inCart || 0))
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
        <div className="border-t border-gray-200 pt-3 sm:pt-4 -mb-1">
          <h4 className="font-bold text-[13px] sm:text-sm uppercase text-gray-800 mb-2">Ghi chú</h4>
          <ul className="list-disc space-y-1 pl-5 text-[11px] sm:text-sm text-gray-600">
            <li>Chu kỳ kéo dài 30 ngày từ đơn hàng đầu tiên.</li>
            <li>Hạn mức chỉ áp dụng cho chai 5ml và 20ml. Sản phẩm Kit không giới hạn.</li>
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
    <Modal isOpen={open} onClose={onClose} showCloseButton={false} className="max-w-md w-[90%] mx-auto px-4 !bg-transparent !rounded-none !shadow-none">
      <div className="bg-white rounded-xl border-2 border-[#8B5E1E] shadow-lg relative px-4 py-4 sm:px-6 sm:py-5">
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
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('password');
  
  // Profile tab states
  const { user, accessToken } = useAuth();
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
  });
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Password tab states  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { changePassword } = useAuth();

  // Update profile form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    setProfileSubmitting(true);

    try {
      if (!user?.id || !accessToken) {
        throw new Error("Không tìm thấy thông tin người dùng");
      }

      // Use apiClient to call the API
      await apiClient(`/users/${user.id}`, {
        method: 'PUT',
        body: profileForm,
        authToken: accessToken,
      });

      setProfileMessage("Cập nhật thông tin thành công!");
      
      // Reload profile after 1.5s
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Không thể cập nhật thông tin";
      setProfileError(errorMessage);
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
    <Modal isOpen={open} onClose={onClose} showCloseButton={false} className="max-w-md w-[90%] mx-auto px-4 !bg-transparent !rounded-none !shadow-none">
      <div className="bg-white rounded-xl border-2 border-[#8B5E1E] shadow-lg relative px-4 py-4 sm:px-6 sm:py-5">
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
        <h3 className="font-bold text-[15px] sm:text-[18px] leading-tight mb-3 sm:mb-5 text-black uppercase">
          Cài đặt tài khoản
        </h3>

        {/* Tabs */}
        <div className="flex border-b border-gray-300 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 px-4 text-[12px] sm:text-[14px] font-semibold transition ${
              activeTab === 'password'
                ? 'border-b-2 border-[#8B5E1E] text-[#8B5E1E]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Đổi mật khẩu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 px-4 text-[12px] sm:text-[14px] font-semibold transition ${
              activeTab === 'profile'
                ? 'border-b-2 border-[#8B5E1E] text-[#8B5E1E]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Sửa thông tin
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form className="space-y-4 sm:space-y-5 text-black" onSubmit={handleProfileSubmit}>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="firstName" className="font-bold w-24 sm:w-32 flex-shrink-0 text-[11px] md:text-[14px]">
                Họ
              </label>
              <input
                id="firstName"
                type="text"
                className="border border-black rounded-md py-0.5 sm:py-1 px-2 sm:px-3 min-w-0 flex-1 sm:w-[220px] font-normal text-[11px] md:text-[14px] text-black focus:outline-none focus:ring-1 focus:ring-[#8B5E1E]"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Nhập họ"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label htmlFor="lastName" className="font-bold w-24 sm:w-32 flex-shrink-0 text-[11px] md:text-[14px]">
                Tên
              </label>
              <input
                id="lastName"
                type="text"
                className="border border-black rounded-md py-0.5 sm:py-1 px-2 sm:px-3 min-w-0 flex-1 sm:w-[220px] font-normal text-[11px] md:text-[14px] text-black focus:outline-none focus:ring-1 focus:ring-[#8B5E1E]"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Nhập tên"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label htmlFor="phone" className="font-bold w-24 sm:w-32 flex-shrink-0 text-[11px] md:text-[14px]">
                Số điện thoại
              </label>
              <input
                id="phone"
                type="tel"
                className="border border-black rounded-md py-0.5 sm:py-1 px-2 sm:px-3 min-w-0 flex-1 sm:w-[220px] font-normal text-[11px] md:text-[14px] text-black focus:outline-none focus:ring-1 focus:ring-[#8B5E1E]"
                value={profileForm.phone}
                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Nhập số điện thoại"
              />
            </div>

            {profileError && (
              <p className="text-[11px] sm:text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {profileError}
              </p>
            )}

            {profileMessage && (
              <p className="text-[11px] sm:text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                {profileMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={profileSubmitting}
              className="w-full bg-[#8B5E1E] text-white font-bold text-[12px] md:text-[14px] rounded-md py-2.5 sm:py-3 mt-5 sm:mt-7 uppercase hover:bg-[#6f4715] transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {profileSubmitting ? "Đang xử lý..." : "Cập nhật thông tin"}
            </button>
          </form>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <form className="space-y-4 sm:space-y-5 text-black" onSubmit={handlePasswordSubmit}>
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
        )}
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
    case "DELIVERED":
      return "bg-green-100 text-green-700";
    case "PENDING":
    case "PROCESSING":
      return "bg-blue-100 text-blue-700";
    case "CONFIRMED":
      return "bg-teal-100 text-teal-700";
    case "SHIPPED":
      return "bg-purple-100 text-purple-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    case "REFUNDED":
      return "bg-orange-100 text-orange-700";
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
    case "COMPLETED":
      return "bg-green-100 text-green-700";
    case "APPROVED":
      return "bg-teal-100 text-teal-700";
    case "REJECTED":
    case "FAILED":
      return "bg-red-100 text-red-700";
    case "PROCESSING":
      return "bg-yellow-100 text-yellow-700";
    case "PENDING":
    default:
      return "bg-blue-100 text-blue-700";
  }
};

const renderWithdrawalStatusText = (status: string) => {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return "Chờ duyệt";
    case "APPROVED":
      return "Đã duyệt";
    case "REJECTED":
      return "Đã từ chối";
    case "PROCESSING":
      return "Đang xử lý";
    case "COMPLETED":
      return "Hoàn thành";
    case "FAILED":
      return "Thất bại";
    default:
      return status || "Không xác định";
  }
};

const renderOrderStatusText = (status?: string) => {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
      return "Hoàn thành";
    case "PENDING":
      return "Chờ xử lý";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PROCESSING":
      return "Đang xử lý";
    case "SHIPPED":
      return "Đang giao hàng";
    case "DELIVERED":
      return "Đã giao hàng";
    case "CANCELLED":
      return "Đã hủy";
    case "REFUNDED":
      return "Đã hoàn tiền";
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
