import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { OrderService, type Order } from "../../services/order.service";
import { useToast } from "../../context/ToastContext";
import { Modal } from "../../components/ui/modal";

const BRANCH_TABS = [
  { label: "Tất cả", value: "ALL" },
  { label: "F1", value: "F1" },
  { label: "F2", value: "F2" },
  { label: "F3", value: "F3" },
  { label: "F4", value: "F4" },
  { label: "F5", value: "F5" },
  { label: "F6", value: "F6" },
] as const;

// ✅ SIMPLIFIED: Only 5 main statuses for admin
const ORDER_STATUS_OPTIONS = [
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "SHIPPED", label: "Đã gửi hàng" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
] as const;

const PAYMENT_STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-purple-100 text-purple-700",
};

// ✅ SIMPLIFIED: Badge colors for 5 main statuses
const ORDER_STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

type BranchLevel = (typeof BRANCH_TABS)[number]["value"];

type OrderGroup = {
  userId: string;
  userLabel: string;
  branchLabel: string;
  sponsorId?: string | null;
  sponsorUsername?: string | null;
  orders: Order[];
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString("vi-VN", {
    hour12: false,
  });

export default function OrdersManagement() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [activeBranch, setActiveBranch] = useState<BranchLevel>("ALL");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        setLoading(true);
        const result = await OrderService.getAllOrders({
          page,
          limit: 20,
          status: statusFilter || undefined,
        });

        if (!isMounted) {
          return;
        }

        setOrders(result.data ?? []);
        setTotalPages(result.pagination?.totalPages ?? 1);
      } catch (error: unknown) {
        if (!isMounted) {
          return;
        }
        console.error("Failed to load orders:", error);
        const message = error instanceof Error ? error.message : "Vui lòng thử lại sau";
        showToast({
          tone: "error",
          title: "Không thể tải danh sách đơn hàng",
          description: message,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [page, statusFilter, showToast]);

  const filteredOrders = useMemo(() => {
    if (activeBranch === "ALL") {
      return orders;
    }
    return orders.filter((order) => order.user?.role === activeBranch);
  }, [orders, activeBranch]);

  const groupedOrders = useMemo<OrderGroup[]>(() => {
    const groups = new Map<string, OrderGroup>();

    filteredOrders.forEach((order) => {
      const user = order.user;
      const userId = user?.id ?? "unknown";
      const branchLabel = user?.role ?? "Chưa xác định";
      const userLabel =
        user?.firstName || user?.lastName
          ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
          : user?.username ?? user?.email ?? "Không xác định";

      if (!groups.has(userId)) {
        const sponsorUsername = user?.sponsor?.username || null;
        groups.set(userId, {
          userId,
          userLabel,
          branchLabel,
          sponsorId: user?.sponsorId,
          sponsorUsername,
          orders: [],
        });
      }

      groups.get(userId)!.orders.push(order);
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.userLabel.localeCompare(b.userLabel, "vi"),
    );
  }, [filteredOrders]);

  useEffect(() => {
    if (groupedOrders.length === 0) {
      return;
    }
    setExpandedGroups((prev) => {
      const next: Record<string, boolean> = { ...prev };
      groupedOrders.forEach((group) => {
        if (typeof next[group.userId] === "undefined") {
          next[group.userId] = true; // default expanded
        }
      });
      // remove orphan keys no longer present
      Object.keys(next).forEach((key) => {
        if (!groupedOrders.find((g) => g.userId === key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [groupedOrders]);

  const toggleGroup = (userId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const expandAll = () => {
    setExpandedGroups((prev) => {
      const next: Record<string, boolean> = { ...prev };
      groupedOrders.forEach((g) => {
        next[g.userId] = true;
      });
      return next;
    });
  };

  const collapseAll = () => {
    setExpandedGroups((prev) => {
      const next: Record<string, boolean> = { ...prev };
      groupedOrders.forEach((g) => {
        next[g.userId] = false;
      });
      return next;
    });
  };

  const handleStatusUpdate = async (orderId: string, nextStatus: string) => {
    const currentOrder = orders.find((order) => order.id === orderId);
    if (!currentOrder) {
      showToast({
        tone: "error",
        title: "Không tìm thấy đơn hàng",
      });
      return;
    }

    if (currentOrder.status === nextStatus) {
      return;
    }

    // REMOVED: Flow validation - Admin có thể chuyển từ status nào sang status nào
    // const allowedStatuses = new Set([
    //   currentOrder.status,
    //   ...(STATUS_TRANSITIONS[currentOrder.status] ?? []),
    // ]);
    //
    // if (!allowedStatuses.has(nextStatus)) {
    //   showToast({
    //     tone: "error",
    //     title: "Trạng thái không hợp lệ",
    //     description: `Không thể chuyển từ ${currentOrder.status} sang ${nextStatus}.`,
    //   });
    //   return;
    // }

    try {
      setUpdatingOrderId(orderId);
      const updatedOrder = await OrderService.updateOrderStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updatedOrder : order)));
      showToast({
        tone: "success",
        title: "Cập nhật trạng thái thành công",
      });
    } catch (error: unknown) {
      console.error("Failed to update order status:", error);
      const message = error instanceof Error ? error.message : "Vui lòng thử lại sau";
      showToast({
        tone: "error",
        title: "Cập nhật trạng thái thất bại",
        description: message,
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId: string, isAdmin: boolean = true) => {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) {
      return;
    }

    try {
      setUpdatingOrderId(orderId);
      const result = isAdmin
        ? await OrderService.adminCancelOrder(orderId)
        : await OrderService.cancelOrder(orderId);

      setOrders((prev) => prev.map((order) => (order.id === orderId ? result.order : order)));

      showToast({
        tone: "success",
        title: "Hủy đơn hàng thành công",
        description: `${result.message}. ${result.refunded ? `Đã hoàn ${formatCurrency(result.refundAmount)}` : ''}`,
      });
    } catch (error: unknown) {
      console.error("Failed to cancel order:", error);
      const message = error instanceof Error ? error.message : "Vui lòng thử lại sau";
      showToast({
        tone: "error",
        title: "Hủy đơn hàng thất bại",
        description: message,
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <>
      <PageMeta title="Quản lý đơn hàng | Admin" description="Quản lý đơn hàng đa cấp" />

      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý đơn hàng</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Theo dõi, lọc theo nhánh và cập nhật trạng thái đơn hàng của toàn hệ thống.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {BRANCH_TABS.map((tab) => {
              const isActive = activeBranch === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setActiveBranch(tab.value);
                    setPage(1);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    isActive
                      ? "border-[#8B5E1E] bg-[#8B5E1E] text-white shadow"
                      : "border-gray-200 bg-white text-gray-700 hover:border-[#8B5E1E] hover:text-[#8B5E1E]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {loading
              ? "Đang tải danh sách đơn hàng…"
              : `Có ${filteredOrders.length} đơn hàng trong trang hiện tại`}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Lọc trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tất cả</option>
              {ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            <button
              type="button"
              onClick={expandAll}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Mở tất cả"
            >
              Mở tất cả
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Thu tất cả"
            >
              Thu tất cả
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Đang tải dữ liệu đơn hàng...
            </div>
          ) : groupedOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Không tìm thấy đơn hàng nào cho nhánh đã chọn.
            </div>
          ) : (
            groupedOrders.map((group) => (
              <section
                key={group.userId}
                className="rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-[#8B5E1E]/60 dark:border-gray-700 dark:bg-gray-800"
              >
                <header
                  className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-gray-700 cursor-pointer hover:bg-gray-50/60 dark:hover:bg-gray-900/20"
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedGroups[group.userId] ? "true" : "false"}
                  aria-controls={`orders-group-${group.userId}`}
                  onClick={() => toggleGroup(group.userId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleGroup(group.userId);
                    }
                  }}
                >
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {group.userLabel}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center rounded-full bg-[#8B5E1E]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#8B5E1E]">
                        {group.branchLabel}
                      </span>
                      {group.sponsorUsername && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Người giới thiệu: {group.sponsorUsername}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {group.orders.length} đơn hàng
                    </div>
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 rounded pointer-events-none"
                      aria-hidden="true"
                    >
                      <svg
                        className={`w-4 h-4 text-gray-600 transition-transform dark:text-gray-300 ${expandedGroups[group.userId] ? "rotate-180" : "rotate-0"}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                </header>

                {expandedGroups[group.userId] && (
                <div id={`orders-group-${group.userId}`} className="max-h-[400px] overflow-y-auto overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                      <tr>
                        <th className="w-[15%] px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Mã đơn hàng
                        </th>
                        <th className="w-[13%] px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Thành tiền
                        </th>
                        <th className="w-[13%] px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Trạng thái
                        </th>
                        <th className="w-[13%] px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Thanh toán
                        </th>
                        <th className="w-[16%] px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Ngày tạo
                        </th>
                        <th className="w-[20%] px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Cập nhật trạng thái
                        </th>
                        <th className="w-[10%] px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Chi tiết
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-700">
                      {group.orders.map((order) => {
                        return (
                          <tr key={order.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                            <td className="w-[15%] px-6 py-4 align-top font-medium text-gray-900 dark:text-gray-100">
                              <div>{order.orderNumber}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {order.items.length} sản phẩm
                              </div>
                            </td>
                            <td className="w-[13%] px-6 py-4 align-top text-gray-700 dark:text-gray-200">
                              <div className="font-semibold text-[#8B5E1E]">
                                {formatCurrency(order.totalAmount)}
                              </div>
                              {order.shippingFee ? (
                                <div className="text-xs text-gray-500">
                                  Phí ship: {formatCurrency(order.shippingFee)}
                                </div>
                              ) : null}
                            </td>
                            <td className="w-[13%] px-6 py-4 align-top">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  ORDER_STATUS_BADGES[order.status] ?? "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {ORDER_STATUS_OPTIONS.find((option) => option.value === order.status)?.label ??
                                  order.status}
                              </span>
                            </td>
                            <td className="w-[13%] px-6 py-4 align-top">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  PAYMENT_STATUS_BADGES[order.paymentStatus] ??
                                  "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {order.paymentStatus === "PENDING" && "Chưa thanh toán"}
                                {order.paymentStatus === "PROCESSING" && "Đang xử lý"}
                                {order.paymentStatus === "COMPLETED" && "Đã thanh toán"}
                                {order.paymentStatus === "FAILED" && "Thất bại"}
                                {order.paymentStatus === "REFUNDED" && "Đã hoàn tiền"}
                              </span>
                            </td>
                            <td className="w-[16%] px-6 py-4 align-top text-gray-600 dark:text-gray-300">
                              <div>{formatDateTime(order.createdAt)}</div>
                              {order.updatedAt && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Cập nhật: {formatDateTime(order.updatedAt)}
                                </div>
                              )}
                            </td>
                            <td className="w-[20%] px-6 py-4 align-top">
                              <div className="flex items-center gap-2">
                                <select
                                  value={selectedStatuses[order.id] ?? order.status}
                                  onChange={(event) =>
                                    setSelectedStatuses((prev) => ({ ...prev, [order.id]: event.target.value }))
                                  }
                                  disabled={updatingOrderId === order.id}
                                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {ORDER_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStatusUpdate(order.id, selectedStatuses[order.id] ?? order.status)
                                  }
                                  disabled={updatingOrderId === order.id}
                                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                  title="Áp dụng trạng thái"
                                >
                                  Áp dụng
                                </button>
                              </div>
                              {updatingOrderId === order.id && (
                                <p className="mt-2 text-xs text-[#8B5E1E]">Đang cập nhật…</p>
                              )}
                            </td>
                            <td className="w-[10%] px-6 py-4 align-top text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(order)}
                                className="rounded-md bg-[#8B5E1E] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#6f4715] dark:bg-[#8B5E1E] dark:hover:bg-[#6f4715]"
                                title="Xem chi tiết"
                              >
                                Chi tiết
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
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Trang trước
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Trang {page} / {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Trang sau
            </button>
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </>
  );
}

// Order Detail Modal Component
const OrderDetailModal: React.FC<{ order: Order; onClose: () => void }> = ({ order: initialOrder, onClose }) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const loadFullOrderDetails = async () => {
      try {
        setLoading(true);
        const fullOrder = await OrderService.getOrder(initialOrder.id);
        console.log('Full order details:', fullOrder);
        console.log('Shipping address:', fullOrder.shippingAddress);
        setOrder(fullOrder);
      } catch (error) {
        console.error('Failed to load full order details:', error);
        showToast({
          tone: 'error',
          title: 'Không thể tải chi tiết đơn hàng',
          description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        });
      } finally {
        setLoading(false);
      }
    };

    loadFullOrderDetails();
  }, [initialOrder.id, showToast]);

  return (
    <Modal isOpen onClose={onClose} showCloseButton={false} className="max-w-4xl w-[95%] mx-auto">
      <div className="bg-white rounded-xl border-2 border-[#8B5E1E] shadow-lg relative p-5 sm:p-6 max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-[#8B5E1E]">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 hover:opacity-70 transition z-10 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Đóng"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-20 rounded-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5E1E] mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Đang tải...</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-4 sm:mb-5 pr-8">
          <h3 className="font-bold text-[15px] sm:text-[18px] leading-tight text-gray-900 dark:text-white uppercase mb-1">
            Chi tiết đơn hàng
          </h3>
          <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">
            Mã đơn: <span className="font-semibold text-[#8B5E1E]">{order.orderNumber}</span>
          </p>
        </div>

        {/* Thông tin khách hàng & Giao hàng */}
        <div className="mb-4 sm:mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Thông tin khách hàng */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
            <h4 className="font-bold text-[13px] sm:text-sm uppercase text-gray-800 dark:text-gray-200 mb-2 sm:mb-3">
              Thông tin khách hàng
            </h4>
            <div className="space-y-1.5 text-[11px] sm:text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Họ tên:</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {order.user?.firstName || order.user?.lastName
                    ? `${order.user?.firstName ?? ""} ${order.user?.lastName ?? ""}`.trim()
                    : order.user?.username ?? "Không xác định"}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <p className="font-semibold text-gray-900 dark:text-white">{order.user?.email ?? "—"}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Cấp độ:</span>
                <span className="ml-2 inline-flex items-center rounded px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-[#8B5E1E]/10 text-[#8B5E1E]">
                  {order.user?.role ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Thông tin giao hàng */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
            <h4 className="font-bold text-[13px] sm:text-sm uppercase text-gray-800 dark:text-gray-200 mb-2 sm:mb-3">
              Địa chỉ giao hàng
            </h4>
            {!order.shippingAddress || Object.keys(order.shippingAddress).length === 0 ? (
              <div className="text-[11px] sm:text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                ⚠️ Chưa có thông tin địa chỉ giao hàng
              </div>
            ) : (
              <div className="space-y-1.5 text-[11px] sm:text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Người nhận:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {order.shippingAddress?.fullName || order.shippingAddress?.name || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Số điện thoại:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {order.shippingAddress?.phone || order.shippingAddress?.phoneNumber || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Địa chỉ:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {order.shippingAddress?.addressLine1 || order.shippingAddress?.address || "—"}
                    {order.shippingAddress?.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Khu vực:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {[
                      order.shippingAddress?.ward,
                      order.shippingAddress?.district,
                      order.shippingAddress?.city || order.shippingAddress?.province,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trạng thái & Thanh toán */}
        <div className="mb-4 sm:mb-5 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] sm:text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Trạng thái đơn:</span>
              <div className="mt-1">
                <span
                  className={`inline-flex rounded px-2 py-1 text-[10px] sm:text-xs font-medium ${
                    ORDER_STATUS_BADGES[order.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {ORDER_STATUS_OPTIONS.find((option) => option.value === order.status)?.label ?? order.status}
                </span>
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Thanh toán:</span>
              <div className="mt-1">
                <span
                  className={`inline-flex rounded px-2 py-1 text-[10px] sm:text-xs font-medium ${
                    PAYMENT_STATUS_BADGES[order.paymentStatus] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {order.paymentStatus === "PENDING" && "Chưa thanh toán"}
                  {order.paymentStatus === "PROCESSING" && "Đang xử lý"}
                  {order.paymentStatus === "COMPLETED" && "Đã thanh toán"}
                  {order.paymentStatus === "FAILED" && "Thất bại"}
                  {order.paymentStatus === "REFUNDED" && "Đã hoàn tiền"}
                </span>
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Ngày tạo:</span>
              <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Danh sách sản phẩm */}
        <div className="mb-4 sm:mb-5">
          <h4 className="font-bold text-[13px] sm:text-sm uppercase text-gray-800 dark:text-gray-200 mb-2 sm:mb-3">
            Sản phẩm ({order.items.length})
          </h4>
          
          {/* Mobile: Card view */}
          <div className="space-y-3 sm:hidden">
            {order.items.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="font-semibold text-[11px] text-gray-900 dark:text-white mb-2">
                  {item.product.name}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Phân loại:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{item.productVariant?.size || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Số lượng:</span>
                    <p className="font-medium text-gray-900 dark:text-white">×{item.quantity}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Đơn giá:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(Number(item.price ?? 0))}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Thành tiền:</span>
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
                <tr className="text-white" style={{ backgroundColor: '#8B5E1E' }}>
                  <th className="px-3 py-2 font-semibold text-xs">Sản phẩm</th>
                  <th className="px-3 py-2 font-semibold text-center text-xs">Phân loại</th>
                  <th className="px-3 py-2 font-semibold text-center text-xs">SL</th>
                  <th className="px-3 py-2 font-semibold text-right text-xs">Đơn giá</th>
                  <th className="px-3 py-2 font-semibold text-right text-xs">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`${index % 2 === 1 ? "bg-[#fdf8f2] dark:bg-gray-900/50" : ""} border-b border-gray-100 dark:border-gray-700`}
                  >
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{item.product.name}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300">
                      {item.productVariant?.size || "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300">×{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-700 dark:text-gray-300">
                      {formatCurrency(Number(item.price ?? 0))}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-xs text-[#8B5E1E]">
                      {formatCurrency(Number(item.subtotal ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tổng tiền */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
          <div className="flex flex-col items-end space-y-1 text-sm">
            {order.shippingFee ? (
              <div className="flex justify-between w-full sm:w-auto sm:min-w-[300px]">
                <span className="text-gray-600 dark:text-gray-400">Phí vận chuyển:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(order.shippingFee)}</span>
              </div>
            ) : null}
            <div className="flex justify-between w-full sm:w-auto sm:min-w-[300px] pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">Tổng cộng:</span>
              <span className="font-bold text-lg text-[#8B5E1E]">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
