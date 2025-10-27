import { useState, useEffect } from 'react';
import { UserManagementService } from '../../services/user-management.service';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import PageMeta from '../../components/common/PageMeta';

// ========================================
// HELPER FUNCTIONS
// ========================================
const getFlevelColor = (role: string | undefined | null): string => {
  if (!role) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';

  const colorMap: Record<string, string> = {
    'F1': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'F2': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'F3': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'F4': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'F5': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'F6': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'ADMIN': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  };

  return colorMap[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};

type PendingUser = {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  referralCode: string;
  sponsor: {
    id: string;
    username: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    referralCode: string;
    status: string;
  } | null;
  createdAt: string;
};

const PendingUsers: React.FC = () => {
  // State
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const { showToast } = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Load pending users
  const loadPendingUsers = async () => {
    // Wait for auth to initialize
    if (authLoading) {
      return;
    }

    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await UserManagementService.getPendingUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
      });

      setUsers(response.data);
      setPagination({
        total: response.pagination.total,
        page: response.pagination.page,
        limit: response.pagination.limit,
        totalPages: response.pagination.totalPages,
      });
    } catch (error: any) {
      // Silently fail on auth errors
      if (error.message !== 'Unauthorized') {
        showToast({
          tone: 'error',
          title: 'Lỗi',
          description: 'Không thể tải danh sách tài khoản chờ duyệt',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingUsers();
  }, [pagination.page, pagination.limit, authLoading, isAuthenticated]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        loadPendingUsers();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // View user details
  const handleViewDetails = (user: PendingUser) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  // Approve user
  const handleApproveUser = async (user: PendingUser) => {
    if (!confirm(`Bạn có chắc muốn phê duyệt tài khoản "${user.username}"?`)) {
      return;
    }

    try {
      await UserManagementService.approveUser(user.id);

      showToast({
        tone: 'success',
        title: 'Thành công',
        description: `Đã phê duyệt tài khoản ${user.username}`,
      });

      await loadPendingUsers();
    } catch (error: any) {
      console.error('Failed to approve user:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: error.message || 'Không thể phê duyệt tài khoản',
      });
    }
  };

  // Reject user
  const handleRejectUser = (user: PendingUser) => {
    setSelectedUser(user);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmRejectUser = async () => {
    if (!selectedUser) return;

    if (!rejectReason.trim()) {
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: 'Vui lòng nhập lý do từ chối',
      });
      return;
    }

    try {
      setModalLoading(true);
      await UserManagementService.rejectUser(selectedUser.id, rejectReason);

      // Show success toast
      showToast({
        tone: 'success',
        title: 'Thành công',
        description: `Đã từ chối tài khoản ${selectedUser.username}`,
      });

      // Close modal after a short delay to let toast appear
      setTimeout(() => {
        setShowRejectModal(false);
        setSelectedUser(null);
        setRejectReason('');
      }, 300);

      // Reload pending users list
      await loadPendingUsers();
    } catch (error: any) {
      console.error('Failed to reject user:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: error.message || 'Không thể từ chối tài khoản',
      });
    } finally {
      setModalLoading(false);
    }
  };

  // Format functions
  const formatDate = (date: string) => {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4 sm:p-6">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[#8B5E1E]"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Đang kiểm tra...</p>
        </div>
      </div>
    );
  }

  // Show login message if not authenticated
  if (!isAuthenticated && !loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4 sm:p-6">
        <div className="text-center">
          <div className="mb-4 text-6xl">🔒</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Vui lòng đăng nhập
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Bạn cần đăng nhập để truy cập trang này
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Tài khoản chờ duyệt"
        description="Quản lý tài khoản đăng ký mới chờ phê duyệt"
      />
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tài khoản chờ duyệt
          </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Danh sách tài khoản đăng ký mới đang chờ phê duyệt từ quản trị viên
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Email, username, tên..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Page Size */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Hiển thị
            </label>
            <select
              value={pagination.limit}
              onChange={(e) => setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="10">10 / trang</option>
              <option value="20">20 / trang</option>
              <option value="50">50 / trang</option>
              <option value="100">100 / trang</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[#8B5E1E]"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Đang tải...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-4 text-6xl">✅</div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Không có tài khoản chờ duyệt</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Tất cả tài khoản đăng ký mới đã được xử lý
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Thông tin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Mã giới thiệu
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Người giới thiệu
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Cấp độ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Ngày đăng ký
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                        {user.referralCode}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {user.sponsor ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {user.sponsor.username}
                            </div>
                            <div className="text-xs">
                              {user.sponsor.firstName} {user.sponsor.lastName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {user.sponsor.email}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getFlevelColor(user.sponsor.role)}`}>
                                {user.sponsor.role}
                              </span>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                user.sponsor.status === 'ACTIVE' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {user.sponsor.status === 'ACTIVE' ? '✓' : '✗'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Không có</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getFlevelColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(user)}
                            className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Chi tiết
                          </button>
                          <button
                            onClick={() => handleApproveUser(user)}
                            className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                          >
                            Phê duyệt
                          </button>
                          <button
                            onClick={() => handleRejectUser(user)}
                            className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} tài khoản
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Trước
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedUser && (
        <RejectUserModal
          user={selectedUser}
          reason={rejectReason}
          setReason={setRejectReason}
          loading={modalLoading}
          onConfirm={confirmRejectUser}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedUser(null);
            setRejectReason('');
          }}
        />
      )}
    </div>
    </>
  );
};

export default PendingUsers;

// ========================================
// USER DETAIL MODAL
// ========================================
const UserDetailModal: React.FC<{
  user: PendingUser;
  onClose: () => void;
}> = ({ user, onClose }) => {
  const formatDate = (date: string) => {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Chi tiết tài khoản chờ duyệt
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Thông tin người đăng ký
              </h4>
              <div className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Username:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Họ tên:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Đã nhập mã giới thiệu:</span>
                  <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                    {user.sponsor?.referralCode || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mã giới thiệu của user này:</span>
                  <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">{user.referralCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cấp độ sau khi duyệt:</span>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getFlevelColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Ngày đăng ký:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sponsor Info */}
            {user.sponsor && (
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Thông tin người giới thiệu
                </h4>
                <div className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Username:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.sponsor.username}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Họ tên:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.sponsor.firstName} {user.sponsor.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.sponsor.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Số điện thoại:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.sponsor.phone || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Mã giới thiệu:</span>
                    <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                      {user.sponsor.referralCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Cấp độ:</span>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getFlevelColor(user.sponsor.role)}`}>
                      {user.sponsor.role}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Trạng thái:</span>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      user.sponsor.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : user.sponsor.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {user.sponsor.status === 'ACTIVE' ? 'Đang hoạt động' :
                       user.sponsor.status === 'PENDING' ? 'Chờ duyệt' :
                       user.sponsor.status === 'LOCKED' ? 'Đã khóa' :
                       user.sponsor.status === 'SUSPENDED' ? 'Tạm ngưng' :
                       user.sponsor.status === 'BANNED' ? 'Bị cấm' :
                       user.sponsor.status}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================================
// REJECT USER MODAL
// ========================================
const RejectUserModal: React.FC<{
  user: PendingUser;
  reason: string;
  setReason: (reason: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ user, reason, setReason, loading, onConfirm, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Từ chối tài khoản
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Bạn có chắc muốn từ chối tài khoản <strong>{user.username}</strong>?
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Nhập lý do từ chối tài khoản..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !reason.trim()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
          </button>
        </div>
      </div>
    </div>
  );
};
