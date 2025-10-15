import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { DashboardService, type RecentOrder } from "../../services/dashboard.service";

const STATUS_MAP: Record<string, { label: string; color: "success" | "warning" | "error" | "info" }> = {
  PENDING: { label: "Đang xử lý", color: "warning" },
  PROCESSING: { label: "Đang xử lý", color: "info" },
  SHIPPED: { label: "Đang giao", color: "info" },
  DELIVERED: { label: "Đã giao", color: "success" },
  COMPLETED: { label: "Hoàn thành", color: "success" },
  CANCELLED: { label: "Đã hủy", color: "error" },
  REFUNDED: { label: "Đã hoàn tiền", color: "error" },
};

export default function RecentOrders() {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await DashboardService.getRecentOrders();
        setOrders(data);
      } catch (error) {
        console.error('Failed to load recent orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="max-w-full overflow-x-auto">
          <div className="h-[400px] animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Đơn hàng gần đây
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            10 đơn hàng mới nhất kèm hoa hồng
          </p>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Mã đơn hàng
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Khách hàng
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Tổng tiền
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Hoa hồng
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Trạng thái
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Ngày tạo
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {orders.map((order) => {
              const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "info" as const };
              
              return (
                <TableRow key={order.id}>
                  <TableCell className="py-3">
                    <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {order.orderNumber}
                    </p>
                    <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                      {order.items} sản phẩm
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                    {order.customerName}
                  </TableCell>
                  <TableCell className="py-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                  <TableCell className="py-3 font-semibold text-[#8B5E1E] text-theme-sm">
                    {formatCurrency(order.commission)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge size="sm" color={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {formatDate(order.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {orders.length === 0 && (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            Chưa có đơn hàng nào
          </div>
        )}
      </div>
    </div>
  );
}
