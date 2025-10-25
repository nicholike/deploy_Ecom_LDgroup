import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CartService } from "../services/cart.service";
import { walletService } from "../services/wallet.service";
import type { WithdrawalRequest } from "../types/wallet.types";
import { Modal } from "../components/ui/modal";
import { Header } from "../components/layouts/Header";
import PageMeta from "../components/common/PageMeta";

const WALLET_COLOR = "#8B5E1E";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
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

const WithdrawalHistory: React.FC = () => {
  const { accessToken } = useAuth();
  const [cartItemCount, setCartItemCount] = useState(0);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);

  useEffect(() => {
    loadCartCount();
    loadWithdrawals();
  }, []);

  const loadCartCount = async () => {
    try {
      const cart = await CartService.getCart();
      setCartItemCount(cart?.items?.length || 0);
    } catch (error) {
      setCartItemCount(0);
    }
  };

  const loadWithdrawals = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const result = await walletService.getWithdrawalHistory({ page: 1, limit: 100 }, accessToken);
      setWithdrawalHistory(result.data);
    } catch (error) {
      console.error("Failed to load withdrawal history:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Lịch sử rút tiền | LD Perfume Oil Luxury"
        description="Xem lịch sử yêu cầu rút tiền của bạn"
      />

      <div className="min-h-screen bg-white pb-12 text-black">
        <Header cartItemCount={cartItemCount} />

        <div className="mt-2 flex justify-center mx-4 md:mx-0">
          <nav className="w-full md:w-[65%] text-[13px] md:text-[14px] flex items-center gap-1 text-[#9b6a2a] font-medium">
            <Link to="/" className="hover:underline">Trang chủ</Link>
            <span className="text-black/50">/</span>
            <Link to="/account" className="hover:underline">Tài khoản</Link>
            <span className="text-black/50">/</span>
            <span className="text-black">Lịch sử rút tiền</span>
          </nav>
        </div>

        <main className="mt-6 flex justify-center mx-4 md:mx-0">
          <div className="w-[95%] space-y-6 md:w-[65%]">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-bold uppercase md:text-[16px]">Lịch sử yêu cầu rút tiền</h2>
              </div>

              {loading ? (
                <div className="py-8 text-center text-gray-600">Đang tải...</div>
              ) : withdrawalHistory.length === 0 ? (
                <div className="py-8 text-center text-gray-600">Bạn chưa có yêu cầu rút tiền nào</div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-gray-200 rounded-md">
                  <table className="w-full border-collapse text-left text-[11px] md:text-[13px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="text-white" style={{ backgroundColor: WALLET_COLOR }}>
                        <th className="px-2 py-2 font-normal md:px-4 w-[22%] md:w-[35%]">Số tiền</th>
                        <th className="px-2 py-2 text-center font-normal md:px-4 w-[22%] md:w-[25%]">Ngày tạo</th>
                        <th className="px-2 py-2 text-center font-normal md:px-4 w-[42%] md:w-[25%]">Trạng thái</th>
                        <th className="px-0.5 py-2 text-center font-normal md:px-4 w-[14%] md:w-[15%]">
                          <span className="hidden md:inline">Xem chi tiết</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalHistory.map((withdrawal) => (
                        <tr key={withdrawal.id} className="even:bg-[#fdf8f2]">
                          <td className="px-2 py-2 font-semibold text-[11px] md:text-sm md:px-4 md:py-3 w-[22%] md:w-[35%]" style={{ color: WALLET_COLOR }}>
                            {formatCurrency(withdrawal.amount)}
                          </td>
                          <td className="px-2 py-2 text-center text-[11px] md:text-sm md:px-4 md:py-3 w-[22%] md:w-[25%]">
                            {formatDateTime(withdrawal.requestedAt)}
                          </td>
                          <td className="px-2 py-2 text-center md:px-4 md:py-3 w-[42%] md:w-[25%]">
                            <span className={`inline-flex justify-center items-center rounded px-2 py-1 text-[11px] md:text-xs font-medium capitalize w-[110px] md:w-[130px] ${renderWithdrawalStatusBadge(withdrawal.status)}`}>
                              {renderWithdrawalStatusText(withdrawal.status)}
                            </span>
                          </td>
                          <td className="px-0.5 py-2 text-center md:px-4 md:py-3 w-[14%] md:w-[15%]">
                            {/* Mobile: Icon only */}
                            <button
                              type="button"
                              onClick={() => setSelectedWithdrawal(withdrawal)}
                              className="inline-flex md:hidden items-center justify-center transition hover:opacity-70"
                              aria-label="Xem chi tiết"
                            >
                              <img src="/eye.svg" alt="Xem chi tiết" className="h-4 w-4" />
                            </button>
                            {/* Desktop: Button text */}
                            <button
                              type="button"
                              onClick={() => setSelectedWithdrawal(withdrawal)}
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
          </div>
        </main>
      </div>

      {selectedWithdrawal && (
        <WithdrawalDetailModal withdrawal={selectedWithdrawal} onClose={() => setSelectedWithdrawal(null)} />
      )}
    </>
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
            {isRejected && withdrawal.note && (
              <div className="pt-3 mt-2 border-t border-red-200">
                <div className="flex items-start gap-2 bg-red-100 border border-red-300 rounded-md p-2 sm:p-3">
                  <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-red-700 mb-1">Lý do từ chối:</p>
                    <p className="text-red-600">{withdrawal.note}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-md px-6 py-3 text-[12px] font-extrabold uppercase tracking-wide text-white transition hover:opacity-90 md:text-[14px]"
          style={{ backgroundColor: WALLET_COLOR }}
        >
          Đóng
        </button>
      </div>
    </Modal>
  );
};

export default WithdrawalHistory;
