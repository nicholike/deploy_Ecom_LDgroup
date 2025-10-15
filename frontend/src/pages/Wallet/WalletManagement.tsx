import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/wallet.service';
import { Wallet, DollarSign, Users, TrendingUp, AlertCircle, Eye, X } from 'lucide-react';
import PageMeta from '../../components/common/PageMeta';
import type { WalletTransaction, WithdrawalRequest } from '../../types/wallet.types';

interface TopUser {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
  };
  balance: number;
  updatedAt: string;
}

export default function WalletManagement() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<{ totalBalance: number; totalWallets: number } | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [topLimit, setTopLimit] = useState(20);
  
  // Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TopUser | null>(null);
  const [userTransactions, setUserTransactions] = useState<WalletTransaction[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) return;

      // Load stats and top users
      const [statsData, topUsersData] = await Promise.all([
        walletService.getWalletStats(token),
        walletService.getTopBalanceUsers(topLimit, token),
      ]);

      setStats(statsData);
      setTopUsers(topUsersData); // Backend already filters out ADMIN
    } catch (error) {
      console.error('Failed to load wallet management data:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, topLimit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadUserDetails = async (user: TopUser) => {
    try {
      setLoadingDetails(true);
      setSelectedUser(user);
      setShowDetailModal(true);
      
      const token = getToken();
      if (!token) return;

      // Load transactions and withdrawals for this user using admin endpoints
      const [transactions, withdrawals] = await Promise.all([
        walletService.getUserTransactions(user.user.id, { page: 1, limit: 50 }, token).catch(() => ({ data: [] })),
        walletService.getAllWithdrawals({ page: 1, limit: 20, userId: user.user.id }, token).catch(() => ({ data: [] })),
      ]);
      
      setUserTransactions(transactions.data || []);
      setUserWithdrawals(withdrawals.data || []);
    } catch (error) {
      console.error('Failed to load user details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedUser(null);
    setUserTransactions([]);
    setUserWithdrawals([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <PageMeta title="Quản lý Ví điện tử | MLM E-commerce" description="Wallet management dashboard" />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Ví điện tử</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Thống kê tổng tiền hoa hồng và quản lý ví của toàn bộ người dùng
          </p>
        </div>

        {/* Summary Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Total Balance Card */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tổng tiền trong hệ thống</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats.totalBalance)}
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <AlertCircle className="mr-1 inline h-3 w-3" />
                    Số tiền cần dự trù khi tất cả rút tiền
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            {/* Total Wallets Card */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tổng số ví</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalWallets}</p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Người dùng đang hoạt động</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Average Balance Card */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Trung bình mỗi ví</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats.totalBalance / (stats.totalWallets || 1))}
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Dự kiến trên mỗi người dùng</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Users Table */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Top {topLimit} người dùng có nhiều tiền nhất
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Danh sách ưu tiên dự trù kinh phí khi có yêu cầu rút tiền
                </p>
              </div>
              <select
                value={topLimit}
                onChange={(e) => setTopLimit(Number(e.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Đang tải...</p>
              </div>
            ) : topUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-600 dark:text-gray-400">Không có dữ liệu</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Vai trò
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Số dư
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Cập nhật
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {topUsers.map((wallet, index) => (
                    <tr key={wallet.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <span className="font-bold">{index + 1}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                            <span className="text-xs font-semibold">
                              {wallet.user.username?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {wallet.user.username || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {[wallet.user.firstName, wallet.user.lastName].filter(Boolean).join(' ') || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {wallet.user.email}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            wallet.user.role === 'ADMIN'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : wallet.user.role.startsWith('F1')
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {wallet.user.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(wallet.balance)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(wallet.updatedAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                        <button
                          onClick={() => loadUserDetails(wallet)}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                          <Eye className="h-4 w-4" />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary Footer */}
          {!loading && topUsers.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Tổng {topLimit} người: <span className="font-semibold">{topUsers.length} ví</span>
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  Tổng cộng:{' '}
                  <span className="text-green-600 dark:text-green-400">
                    {formatCurrency(topUsers.reduce((sum, w) => sum + w.balance, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Wallet className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-lg font-bold text-white">Chi tiết Ví</h3>
                  <p className="text-sm text-white/80">
                    {selectedUser.user.username} - {selectedUser.user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDetailModal}
                className="rounded-lg p-2 text-white transition hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[70vh] overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* User Summary */}
                  <div className="grid grid-cols-1 gap-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:from-blue-900/20 dark:to-purple-900/20 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Tên đầy đủ</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {[selectedUser.user.firstName, selectedUser.user.lastName].filter(Boolean).join(' ') || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Vai trò</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedUser.user.role}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Số dư hiện tại</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(selectedUser.balance)}
                      </p>
                    </div>
                  </div>

                  {/* Transactions Section */}
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Lịch sử giao dịch ({userTransactions.length})
                    </h4>
                    {userTransactions.length > 0 ? (
                      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Loại
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Số tiền
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Mô tả
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Thời gian
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                            {userTransactions.map((tx) => {
                              // Determine if this is a credit (positive) or debit (negative) transaction
                              const isCredit = tx.type === 'COMMISSION_EARNED' || tx.type === 'ORDER_REFUND' || (tx.type === 'ADMIN_ADJUSTMENT' && tx.amount > 0);
                              const transactionTypeLabel = {
                                COMMISSION_EARNED: 'Hoa hồng',
                                COMMISSION_REFUND: 'Hoàn hoa hồng',
                                WITHDRAWAL: 'Rút tiền',
                                ADMIN_ADJUSTMENT: tx.amount > 0 ? 'Admin cộng' : 'Admin trừ',
                                ORDER_REFUND: 'Hoàn đơn',
                              }[tx.type] || tx.type;

                              return (
                                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                                    <span
                                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                        isCredit
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                      }`}
                                    >
                                      {isCredit ? '+ ' : '- '}{transactionTypeLabel}
                                    </span>
                                  </td>
                                  <td
                                    className={`whitespace-nowrap px-4 py-3 text-right text-sm font-bold ${
                                      isCredit
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-red-600 dark:text-red-400'
                                    }`}
                                  >
                                    {isCredit ? '+' : '-'}
                                    {formatCurrency(Math.abs(tx.amount))}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                    {tx.description}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                    {formatDate(tx.createdAt)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900">
                        <p className="text-gray-500 dark:text-gray-400">Chưa có giao dịch nào</p>
                      </div>
                    )}
                  </div>

                  {/* Withdrawals Section */}
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                      <TrendingUp className="h-5 w-5 text-orange-600" />
                      Lịch sử rút tiền ({userWithdrawals.length})
                    </h4>
                    {userWithdrawals.length > 0 ? (
                      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Số tiền
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Trạng thái
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Ghi chú
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Yêu cầu lúc
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                            {userWithdrawals.map((wd) => (
                              <tr key={wd.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-orange-600 dark:text-orange-400">
                                  {formatCurrency(wd.amount)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-sm">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                      wd.status === 'APPROVED'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : wd.status === 'REJECTED'
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}
                                  >
                                    {wd.status === 'APPROVED' ? 'Đã duyệt' : wd.status === 'REJECTED' ? 'Từ chối' : 'Đang chờ'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                  {wd.adminNote || '-'}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                  {formatDate(wd.createdAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900">
                        <p className="text-gray-500 dark:text-gray-400">Chưa có lệnh rút tiền nào</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

