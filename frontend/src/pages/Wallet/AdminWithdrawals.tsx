import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/wallet.service';
import type { WithdrawalRequest, WithdrawalStatus } from '../../types/wallet.types';
import { CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import PageMeta from '../../components/common/PageMeta';

export default function AdminWithdrawals() {
  const { getToken } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | ''>('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'complete' | 'reject'>('approve');
  const [adminNote, setAdminNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) return;

      const data = await walletService.getAllWithdrawals(
        {
          page,
          limit: 10,
          status: statusFilter || undefined,
        },
        token,
      );
      setWithdrawals(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = (withdrawal: WithdrawalRequest, action: 'approve' | 'complete' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setModalAction(action);
    setAdminNote('');
    setRejectReason('');
    setShowModal(true);
  };

  const handleAction = async () => {
    if (!selectedWithdrawal) return;

    try {
      setProcessing(true);
      const token = getToken();
      if (!token) return;

      if (modalAction === 'approve') {
        await walletService.approveWithdrawal(selectedWithdrawal.id, adminNote || undefined, token);
      } else if (modalAction === 'complete') {
        await walletService.completeWithdrawal(selectedWithdrawal.id, adminNote || undefined, token);
      } else if (modalAction === 'reject') {
        if (!rejectReason) {
          alert('Vui lòng nhập lý do từ chối');
          return;
        }
        await walletService.rejectWithdrawal(
          selectedWithdrawal.id,
          rejectReason,
          adminNote || undefined,
          token,
        );
      }

      setShowModal(false);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('vi-VN');
  };

  const getStatusBadge = (status: WithdrawalStatus) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: WithdrawalStatus) => {
    const texts = {
      PENDING: 'Đang chờ',
      PROCESSING: 'Đang xử lý',
      COMPLETED: 'Hoàn thành',
      REJECTED: 'Từ chối',
    };
    return texts[status] || status;
  };

  return (
    <>
      <PageMeta title="Quản lý rút tiền | Admin" description="Admin withdrawal management" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Quản lý yêu cầu rút tiền
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Duyệt và xử lý yêu cầu rút tiền từ người dùng
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="border-b border-gray-200 p-6 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Danh sách yêu cầu
              </h2>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as WithdrawalStatus | '');
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Đang chờ</option>
                <option value="PROCESSING">Đang xử lý</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Người dùng
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Số tiền
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Ngân hàng
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Đang tải...
                    </td>
                  </tr>
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Chưa có yêu cầu nào
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {withdrawal.user ? (
                              withdrawal.user.username
                            ) : (
                              <span className="text-gray-500 italic">🔒 Ẩn danh</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {withdrawal.user ? withdrawal.user.email : "Người dùng đã xóa"}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(withdrawal.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium">{withdrawal.bankInfo.bankName}</div>
                          <div className="text-gray-500">{withdrawal.bankInfo.accountNumber}</div>
                          <div className="text-gray-500">{withdrawal.bankInfo.accountName}</div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(withdrawal.status)}`}
                        >
                          {getStatusText(withdrawal.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                        {formatDate(withdrawal.requestedAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex gap-2">
                          {/* SIMPLIFIED: Only 2 buttons for PENDING */}
                          {withdrawal.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => openModal(withdrawal, 'complete')}
                                className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                              >
                                Hoàn thành
                              </button>
                              <button
                                onClick={() => openModal(withdrawal, 'reject')}
                                className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                              >
                                Hủy
                              </button>
                            </>
                          )}
                          {/* PROCESSING can still be completed (backward compatibility) */}
                          {withdrawal.status === 'PROCESSING' && (
                            <button
                              onClick={() => openModal(withdrawal, 'complete')}
                              className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                            >
                              Hoàn thành
                            </button>
                          )}
                        </div>
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

      {/* Modal */}
      {showModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
            <h3 className="mb-4 text-xl font-semibold">
              {modalAction === 'approve' && 'Duyệt yêu cầu'}
              {modalAction === 'complete' && 'Hoàn thành rút tiền'}
              {modalAction === 'reject' && 'Từ chối yêu cầu'}
            </h3>

            <div className="mb-4 space-y-2 text-sm">
              <p>
                <strong>Người dùng:</strong>{' '}
                {selectedWithdrawal.user ? (
                  selectedWithdrawal.user.username
                ) : (
                  <span className="text-gray-500 italic">🔒 Ẩn danh (Người dùng đã xóa)</span>
                )}
              </p>
              <p><strong>Số tiền:</strong> {formatCurrency(selectedWithdrawal.amount)}</p>
            </div>

            {modalAction === 'reject' && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium">Lý do từ chối *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  required
                />
              </div>
            )}

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Ghi chú</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAction}
                disabled={processing}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2 hover:bg-gray-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
