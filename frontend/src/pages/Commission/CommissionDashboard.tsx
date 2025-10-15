import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { commissionService } from '../../services/commission.service';
import type {
  Commission,
  CommissionSummary,
  CommissionStatus,
} from '../../types/commission.types';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import PageMeta from '../../components/common/PageMeta';

export default function CommissionDashboard() {
  const { getToken } = useAuth();
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | ''>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) return;

      // Load summary
      const summaryData = await commissionService.getSummary(token);
      setSummary(summaryData);

      // Load commissions list
      const listData = await commissionService.getCommissions(
        {
          page,
          limit: 10,
          status: statusFilter || undefined,
        },
        token,
      );
      setCommissions(listData.data);
      setTotalPages(listData.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load commission data:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status: CommissionStatus) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: CommissionStatus) => {
    const texts = {
      PENDING: 'Đang chờ',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Từ chối',
      CANCELLED: 'Đã hủy',
    };
    return texts[status] || status;
  };

  return (
    <>
      <PageMeta title="Quản lý Hoa hồng | MLM E-commerce" description="Commission management dashboard" />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hoa hồng của tôi</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Theo dõi và quản lý thu nhập hoa hồng của bạn
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tổng đã kiếm
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(summary.totalEarned)}
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                  <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Đã duyệt
                  </p>
                  <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(summary.totalApproved)}
                  </p>
                </div>
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Đang chờ
                  </p>
                  <p className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {formatCurrency(summary.totalPending)}
                  </p>
                </div>
                <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Số dư khả dụng
                  </p>
                  <p className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(summary.availableBalance)}
                  </p>
                </div>
                <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commissions Table */}
        <div className="rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="border-b border-gray-200 p-6 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Lịch sử hoa hồng
              </h2>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as CommissionStatus | '');
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Đang chờ</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="REJECTED">Từ chối</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Mã đơn hàng
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Tầng
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Giá trị đơn
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Tỷ lệ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Hoa hồng
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Ngày tạo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Đang tải...
                    </td>
                  </tr>
                ) : commissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Chưa có hoa hồng nào
                    </td>
                  </tr>
                ) : (
                  commissions.map((commission) => (
                    <tr
                      key={commission.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {commission.order?.orderNumber || commission.orderId}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                        Tầng {commission.level}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                        {formatCurrency(commission.orderValue)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                        {commission.commissionRate}%
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(commission.commissionAmount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(commission.status)}`}
                        >
                          {getStatusText(commission.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                        {formatDate(commission.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Trang trước
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
