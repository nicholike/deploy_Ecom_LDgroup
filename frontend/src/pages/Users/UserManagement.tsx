import { useState, useEffect, useMemo } from 'react';
import {
  UserManagementService,
  type User,
  type UserDetail,
  type SearchUsersParams,
} from '../../services/user-management.service';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import PageMeta from '../../components/common/PageMeta';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// ========================================
// HELPER FUNCTIONS
// ========================================
const getFlevelFromRole = (role: string | undefined | null): string => {
  if (!role) return 'F1';
  if (role === 'ADMIN') return 'Admin';
  if (role.startsWith('F') && role.length === 2) {
    return role;
  }
  return 'F1';
};

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

const UserManagement: React.FC = () => {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [flevelFilter, setFlevelFilter] = useState<string>('');
  
  // Selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDialogType, setDeleteDialogType] = useState<'danger' | 'warning'>('warning');
  const [deleteDialogTitle, setDeleteDialogTitle] = useState('');
  const [deleteDialogMessage, setDeleteDialogMessage] = useState<React.ReactNode>('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  const { showToast } = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Load users
  const loadUsers = async () => {
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
      
      const params: SearchUsersParams = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      // Handle role filter (includes F-level)
      if (roleFilter) {
        params.role = roleFilter;
      } else if (flevelFilter) {
        params.role = flevelFilter;
      }

      const data = await UserManagementService.searchUsers(params);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error: any) {
      // Silently fail on auth errors
      if (error.message !== 'Unauthorized') {
        showToast({
          tone: 'error',
          title: 'Lỗi',
          description: 'Không thể tải danh sách người dùng',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [pagination.page, pagination.pageSize, roleFilter, statusFilter, flevelFilter, authLoading, isAuthenticated]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        loadUsers();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // View user details
  const handleViewDetails = async (user: User) => {
    try {
      setSelectedUser(user);
      setShowDetailModal(true);
      setModalLoading(true);
      
      const details = await UserManagementService.getUserDetails(user.id);
      setUserDetail(details);
    } catch (error: any) {
      console.error('Failed to load user details:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: 'Không thể tải thông tin chi tiết',
      });
    } finally {
      setModalLoading(false);
    }
  };

  // Lock/Unlock user
  const handleLockUser = (user: User) => {
    setSelectedUser(user);
    setLockReason('');
    setShowLockModal(true);
  };

  const confirmLockUser = async () => {
    if (!selectedUser) return;
    
    if (!lockReason.trim()) {
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: 'Vui lòng nhập lý do khóa tài khoản',
      });
      return;
    }

    try {
      setModalLoading(true);
      await UserManagementService.lockUser(selectedUser.id, lockReason);
      
      showToast({
        tone: 'success',
        title: 'Thành công',
        description: 'Đã khóa tài khoản',
      });

      setShowLockModal(false);
      setSelectedUser(null);
      setLockReason('');
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to lock user:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: error.message || 'Không thể khóa tài khoản',
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleUnlockUser = async (user: User) => {
    if (!confirm(`Bạn có chắc muốn mở khóa tài khoản "${user.username}"?`)) {
      return;
    }

    try {
      await UserManagementService.unlockUser(user.id);

      showToast({
        tone: 'success',
        title: 'Thành công',
        description: 'Đã mở khóa tài khoản',
      });

      await loadUsers();
    } catch (error: any) {
      console.error('Failed to unlock user:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: error.message || 'Không thể mở khóa tài khoản',
      });
    }
  };

  // Delete user
  const handleDeleteUser = async (user: User) => {
    try {
      // Step 1: Check if can delete
      const checkResult = await UserManagementService.checkDeleteUser(user.id);

      // Step 2: If has blocks → Show error
      if (!checkResult.canDelete) {
        showToast({
          tone: 'error',
          title: 'Không thể xóa tài khoản',
          description: (
            <div>
              <p className="font-semibold">Lý do:</p>
              <ul className="list-disc ml-4 mt-2">
                {checkResult.blocks.map((block, i) => (
                  <li key={i}>{block}</li>
                ))}
              </ul>
            </div>
          ),
        });
        return;
      }

      // Step 3: If has warnings → Show confirmation dialog with wallet info
      if (checkResult.requireConfirmation) {
        setUserToDelete(user);
        setDeleteConfirmed(false);
        setDeleteDialogType('danger');
        setDeleteDialogTitle('⚠️ Cảnh báo');
        setDeleteDialogMessage(
          <div className="space-y-3">
            <p>
              Tài khoản <strong>{user.username}</strong> còn{' '}
              <strong className="text-red-600 dark:text-red-400">
                {checkResult.walletBalance.toLocaleString('vi-VN')} VND
              </strong>{' '}
              trong ví.
            </p>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-300 font-semibold text-sm">
                ⚠️ Số tiền này sẽ bị mất vĩnh viễn khi xóa tài khoản.
              </p>
            </div>
            <p className="text-sm">Bạn có chắc chắn muốn xóa?</p>
          </div>
        );
        setShowDeleteDialog(true);
      } else {
        // Step 4: No warnings → Show normal confirmation
        setUserToDelete(user);
        setDeleteConfirmed(false);
        setDeleteDialogType('warning');
        setDeleteDialogTitle('Xác nhận xóa');
        setDeleteDialogMessage(
          <div className="space-y-2">
            <p>
              Bạn có chắc chắn muốn xóa tài khoản <strong>{user.username}</strong>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Hành động này không thể hoàn tác.
            </p>
          </div>
        );
        setShowDeleteDialog(true);
      }
    } catch (error: any) {
      console.error('Failed to check delete user:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: error.message || 'Không thể kiểm tra điều kiện xóa',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      setDeleteLoading(true);

      // Call delete API with confirmed flag
      await UserManagementService.deleteUser(userToDelete.id, true);

      showToast({
        tone: 'success',
        title: 'Thành công',
        description: `Đã xóa tài khoản ${userToDelete.username}`,
      });

      setShowDeleteDialog(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);

      // Check if error is 428 (confirmation required)
      if (error.status === 428 || error.statusCode === 428) {
        const errorData = error.response?.data || error;
        showToast({
          tone: 'warning',
          title: 'Yêu cầu xác nhận',
          description: errorData.message || 'Cần xác nhận để xóa tài khoản này',
        });
      } else {
        showToast({
          tone: 'error',
          title: 'Lỗi',
          description: error.message || 'Không thể xóa tài khoản',
        });
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // Edit user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (newSponsorId?: string) => {
    if (!selectedUser) return;

    console.log('🔄 Starting save edit:', {
      userId: selectedUser.id,
      editForm,
      newSponsorId,
    });

    try {
      setModalLoading(true);

      // Always update user info (send empty strings instead of undefined)
      console.log('📤 Updating user info...');
      const updateResult = await UserManagementService.updateUser(selectedUser.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
      });
      console.log('✅ Update result:', updateResult);

      // Change sponsor if provided
      if (newSponsorId && newSponsorId !== selectedUser.sponsorId) {
        const confirmMsg =
          '⚠️ ĐIỀU KIỆN: Ví tài khoản phải bằng 0 mới được chuyển nhánh.\n\n' +
          'Chuyển nhánh sẽ:\n' +
          '- Hủy tất cả hoa hồng\n' +
          '- Đặt lại hạn mức mua hàng\n\n' +
          'Lưu ý: Ví sẽ KHÔNG bị reset.\n\n' +
          'Bạn có chắc muốn chuyển nhánh?';

        if (!confirm(confirmMsg)) {
          console.log('❌ User cancelled sponsor change');
          setModalLoading(false);
          return;
        }

        console.log('📤 Changing sponsor...');
        await UserManagementService.changeSponsor(selectedUser.id, newSponsorId);
        console.log('✅ Sponsor changed');
      }

      console.log('✅ Showing success toast');
      showToast({
        tone: 'success',
        title: 'Thành công',
        description: newSponsorId ? 'Đã cập nhật thông tin và chuyển nhánh' : 'Đã cập nhật thông tin người dùng',
      });

      console.log('🔄 Reloading users...');
      setShowEditModal(false);
      setSelectedUser(null);
      await loadUsers();
      console.log('✅ Save complete');
    } catch (error: any) {
      console.error('❌ Failed to update user:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật thông tin',
      });
    } finally {
      setModalLoading(false);
    }
  };

  // Bulk actions
  const handleBulkLock = async () => {
    if (selectedUsers.size === 0) {
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: 'Vui lòng chọn ít nhất 1 người dùng',
      });
      return;
    }

    const reason = prompt('Nhập lý do khóa tài khoản:');
    if (!reason) return;

    try {
      const result = await UserManagementService.bulkLockUsers(Array.from(selectedUsers), reason);
      
      showToast({
        tone: 'success',
        title: 'Thành công',
        description: `Đã khóa ${result.success} tài khoản, thất bại ${result.failed}`,
      });

      setSelectedUsers(new Set());
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to bulk lock:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: 'Không thể khóa tài khoản',
      });
    }
  };

  const handleBulkUnlock = async () => {
    if (selectedUsers.size === 0) {
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: 'Vui lòng chọn ít nhất 1 người dùng',
      });
      return;
    }

    if (!confirm(`Bạn có chắc muốn mở khóa ${selectedUsers.size} tài khoản?`)) {
      return;
    }

    try {
      const result = await UserManagementService.bulkUnlockUsers(Array.from(selectedUsers));
      
      showToast({
        tone: 'success',
        title: 'Thành công',
        description: `Đã mở khóa ${result.success} tài khoản, thất bại ${result.failed}`,
      });

      setSelectedUsers(new Set());
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to bulk unlock:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: 'Không thể mở khóa tài khoản',
      });
    }
  };

  // Toggle selection
  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };

    const labels: Record<string, string> = {
      ACTIVE: 'Hoạt động',
      SUSPENDED: 'Bị khóa',
      INACTIVE: 'Đã xóa',
    };

    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colors[status] || colors.INACTIVE}`}>
        {labels[status] || status}
      </span>
    );
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
            Bạn cần đăng nhập để truy cập trang quản lý người dùng
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Quản lý người dùng"
        description="Quản lý tài khoản và phân quyền người dùng"
      />
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quản lý người dùng
          </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Quản lý tài khoản, phân quyền và theo dõi hoạt động của người dùng
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          {/* F-Level Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cấp độ
            </label>
            <select
              value={flevelFilter}
              onChange={(e) => {
                setFlevelFilter(e.target.value);
                setRoleFilter('');
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tất cả cấp</option>
              <option value="F1">F1</option>
              <option value="F2">F2</option>
              <option value="F3">F3</option>
              <option value="F4">F4</option>
              <option value="F5">F5</option>
              <option value="F6">F6</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tất cả (trừ đã xóa)</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="SUSPENDED">Bị khóa</option>
              <option value="INACTIVE">Đã xóa / Không hoạt động</option>
            </select>
          </div>

          {/* Page Size */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Hiển thị
            </label>
            <select
              value={pagination.pageSize}
              onChange={(e) => setPagination({ ...pagination, pageSize: parseInt(e.target.value), page: 1 })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="10">10 / trang</option>
              <option value="20">20 / trang</option>
              <option value="50">50 / trang</option>
              <option value="100">100 / trang</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="mt-4 flex items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Đã chọn {selectedUsers.size} người dùng
            </span>
            <button
              onClick={handleBulkLock}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Khóa hàng loạt
            </button>
            <button
              onClick={handleBulkUnlock}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Mở khóa hàng loạt
            </button>
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Hủy chọn
            </button>
          </div>
        )}
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
            <p className="text-gray-600 dark:text-gray-400">Không tìm thấy người dùng nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="w-[5%] px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === users.length && users.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-[#8B5E1E] focus:ring-[#8B5E1E]"
                      />
                    </th>
                    <th className="w-[17%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Người dùng
                    </th>
                    <th className="w-[10%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Username
                    </th>
                    <th className="w-[9%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Mã giới thiệu
                    </th>
                    <th className="w-[7%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Cấp độ
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Người giới thiệu
                    </th>
                    <th className="w-[9%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Trạng thái
                    </th>
                    <th className="w-[11%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Ngày tạo
                    </th>
                    <th className="w-[27%] px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#8B5E1E] focus:ring-[#8B5E1E]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {user.username}
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {user.referralCode || '—'}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getFlevelColor(user.role)}`}>
                          {getFlevelFromRole(user.role)}
                        </span>
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
                          </div>
                        ) : (
                          <span className="text-gray-400">Không có</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(user.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="w-[27%] px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(user)}
                            className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Chi tiết
                          </button>
                          {user.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleEditUser(user)}
                              className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
                            >
                              Sửa
                            </button>
                          )}
                          {user.status === 'SUSPENDED' ? (
                            <button
                              onClick={() => handleUnlockUser(user)}
                              className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Mở khóa
                            </button>
                          ) : user.role !== 'ADMIN' ? (
                            <button
                              onClick={() => handleLockUser(user)}
                              className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                            >
                              Khóa
                            </button>
                          ) : null}
                          {/* Delete button - Show for ALL users (backend will block root admin) */}
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700"
                            title="Xóa tài khoản"
                          >
                            Xóa
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
                Hiển thị {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} / {pagination.total} người dùng
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
          userDetail={userDetail}
          loading={modalLoading}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
            setUserDetail(null);
          }}
        />
      )}

      {/* Lock Modal */}
      {showLockModal && selectedUser && (
        <LockUserModal
          user={selectedUser}
          reason={lockReason}
          setReason={setLockReason}
          loading={modalLoading}
          onConfirm={confirmLockUser}
          onClose={() => {
            setShowLockModal(false);
            setSelectedUser(null);
            setLockReason('');
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          editForm={editForm}
          setEditForm={setEditForm}
          loading={modalLoading}
          onSave={handleSaveEdit}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setUserToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title={deleteDialogTitle}
        message={deleteDialogMessage}
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        type={deleteDialogType}
        loading={deleteLoading}
      />
    </div>
    </>
  );
};

// ========================================
// USER DETAIL MODAL
// ========================================
const UserDetailModal: React.FC<{
  user: User;
  userDetail: UserDetail | null;
  loading: boolean;
  onClose: () => void;
}> = ({ user, userDetail, loading, onClose }) => {
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
            Thông tin chi tiết người dùng
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#8B5E1E]"></div>
            </div>
          ) : userDetail ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Thông tin cơ bản
                </h4>
                <div className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{userDetail.email || user.email || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Username:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{userDetail.username || user.username || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Mã giới thiệu:</span>
                    <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      {userDetail.referralCode || user.referralCode || '—'}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Họ tên:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {`${(userDetail.firstName || user.firstName || '')} ${(userDetail.lastName || user.lastName || '')}`.trim() || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Cấp độ:</span>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getFlevelColor(userDetail.role)}`}>
                      {getFlevelFromRole(userDetail.role)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Trạng thái:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{userDetail.status || user.status || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Email verified:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {userDetail.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Ngày tạo:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(userDetail.createdAt || user.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lock Info */}
              {userDetail.lockedAt && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Thông tin khóa tài khoản
                  </h4>
                  <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ngày khóa:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(userDetail.lockedAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Lý do:</span>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                        {userDetail.lockedReason || 'Không có lý do'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sponsor Info */}
              {userDetail.sponsor && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Người giới thiệu
                  </h4>
                  <div className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Username:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {userDetail.sponsor.username}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Họ tên:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {userDetail.sponsor.firstName} {userDetail.sponsor.lastName}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              

              {/* Quota Info */}
              {userDetail.quota && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Hạn mức mua hàng
                  </h4>
                  <div className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Hạn mức:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {userDetail.quota.quotaLimit} sản phẩm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Đã dùng:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {userDetail.quota.quotaUsed} sản phẩm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Còn lại:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {userDetail.quota.quotaRemaining} sản phẩm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Chu kỳ:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(userDetail.quota.periodStart).toLocaleDateString('vi-VN')} -{' '}
                        {new Date(userDetail.quota.periodEnd).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400">Không thể tải thông tin</p>
          )}
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
// LOCK USER MODAL
// ========================================
const LockUserModal: React.FC<{
  user: User;
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
            Khóa tài khoản
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
            Bạn có chắc muốn khóa tài khoản <strong>{user.username}</strong>?
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Lý do khóa <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Nhập lý do khóa tài khoản..."
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
            {loading ? 'Đang xử lý...' : 'Xác nhận khóa'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================================
// EDIT USER MODAL
// ========================================
const EditUserModal: React.FC<{
  user: User;
  editForm: { firstName: string; lastName: string; phone: string };
  setEditForm: (form: { firstName: string; lastName: string; phone: string }) => void;
  loading: boolean;
  onSave: (newSponsorId?: string) => void;
  onClose: () => void;
}> = ({ user, editForm, setEditForm, loading, onSave, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<User | null>(null);
  const { showToast } = useToast();

  // Search sponsors
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: 'Vui lòng nhập từ khóa tìm kiếm',
      });
      return;
    }

    try {
      setSearching(true);
      const data = await UserManagementService.searchUsers({
        search: searchTerm,
        status: 'ACTIVE',
        pageSize: 10,
      });

      // Filter out the current user and admin accounts
      setSearchResults(data.users.filter(u => u.id !== user.id && u.role !== 'ADMIN'));
    } catch (error: any) {
      console.error('Failed to search users:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: 'Không thể tìm kiếm người dùng',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSave = () => {
    onSave(selectedSponsor?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sửa thông tin người dùng
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
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
            {/* User Info */}
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Thông tin cơ bản
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Họ
                  </label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tên
                  </label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Change Sponsor */}
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Chuyển nhánh (tùy chọn)
              </h4>
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 dark:border-gray-600">
                <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Sponsor hiện tại: <strong>{user.sponsor?.username || 'Không có'}</strong>
                  {user.sponsor && (
                    <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getFlevelColor(user.sponsor.role)}`}>
                      {getFlevelFromRole(user.sponsor.role)}
                    </span>
                  )}
                </div>
                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Tìm sponsor mới (username, email...)"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="rounded-md bg-[#8B5E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#6D4916] disabled:opacity-50"
                  >
                    {searching ? 'Đang tìm...' : 'Tìm'}
                  </button>
                </div>

                {selectedSponsor && (
                  <div className="mb-3 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Sponsor mới đã chọn: {selectedSponsor.username}
                      </p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getFlevelColor(selectedSponsor.role)}`}>
                        {getFlevelFromRole(selectedSponsor.role)}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedSponsor(null)}
                      className="mt-1 text-xs text-green-600 hover:underline dark:text-green-400"
                    >
                      Hủy chọn
                    </button>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Kết quả tìm kiếm:
                    </p>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => {
                            setSelectedSponsor(result);
                            setSearchResults([]);
                            setSearchTerm('');
                          }}
                          className="w-full rounded-md border border-gray-200 bg-white p-2 text-left text-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {result.username}
                                </span>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getFlevelColor(result.role)}`}>
                                  {getFlevelFromRole(result.role)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {result.firstName} {result.lastName} • {result.email}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSponsor && (
                  <div className="mt-3 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                      ⚠️ YÊU CẦU: Ví phải = 0 mới được chuyển nhánh
                    </p>
                    <p className="mt-2 text-xs font-medium text-yellow-800 dark:text-yellow-200">
                      Chuyển nhánh sẽ:
                    </p>
                    <ul className="mt-1 list-inside list-disc text-xs text-yellow-700 dark:text-yellow-300">
                      <li>Hủy tất cả hoa hồng hiện có</li>
                      <li>Đặt lại hạn mức mua hàng</li>
                      <li className="font-bold">Ví sẽ KHÔNG bị reset</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
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
            onClick={handleSave}
            disabled={loading}
            className="rounded-md bg-[#8B5E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#6D4916] disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;


