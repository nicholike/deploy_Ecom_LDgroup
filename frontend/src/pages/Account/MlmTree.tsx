import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { userService, type UserTreeNodeResponse } from "../../services/userService";
import { UserManagementService } from "../../services/user-management.service";
import MlmTreeViewport from "../../components/account/MlmTreeViewport";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const MlmTreePage: React.FC = () => {
  const { accessToken, user } = useAuth();
  const { showToast } = useToast();
  const [tree, setTree] = useState<UserTreeNodeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDialogType, setDeleteDialogType] = useState<'danger' | 'warning'>('warning');
  const [deleteDialogTitle, setDeleteDialogTitle] = useState('');
  const [deleteDialogMessage, setDeleteDialogMessage] = useState<React.ReactNode>('');
  const [userToDelete, setUserToDelete] = useState<{ id: string; username: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const loadTree = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await userService.getTree(accessToken, {});
      setTree(response.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải cây hệ thống.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Handle delete user from tree
  const handleDeleteUser = async (userId: string, username: string) => {
    try {
      // Step 1: Check if can delete
      const checkResult = await UserManagementService.checkDeleteUser(userId);

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
        setUserToDelete({ id: userId, username });
        setDeleteDialogType('danger');
        setDeleteDialogTitle('⚠️ Cảnh báo');
        setDeleteDialogMessage(
          <div className="space-y-3">
            <p>
              Tài khoản <strong>{username}</strong> còn{' '}
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
        setUserToDelete({ id: userId, username });
        setDeleteDialogType('warning');
        setDeleteDialogTitle('Xác nhận xóa');
        setDeleteDialogMessage(
          <div className="space-y-2">
            <p>
              Bạn có chắc chắn muốn xóa tài khoản <strong>{username}</strong>?
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

      // Close dialog first
      setShowDeleteDialog(false);
      setUserToDelete(null);

      showToast({
        tone: 'success',
        title: 'Thành công',
        description: `Đã xóa tài khoản ${userToDelete.username}. Đang tải lại cây...`,
      });

      // Add small delay to ensure backend transaction committed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force reload tree after deletion
      setIsLoading(true);
      try {
        const response = await userService.getTree(accessToken!, {});
        setTree(response.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải cây hệ thống.");
      } finally {
        setIsLoading(false);
      }
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

  return (
    <>
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
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
      <PageMeta
        title="MLM Tree | LD Group Admin"
        description="Theo dõi cấu trúc đa cấp của hệ thống"
      />
      
      {/* Error notification - floating */}
      {error && (
        <div className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 transform items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 shadow-lg dark:border-red-900 dark:bg-red-900/30 dark:text-red-300">
          <span>{error}</span>
          <button
            onClick={loadTree}
            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Fullscreen Viewport */}
      <MlmTreeViewport
        data={tree}
        isLoading={isLoading}
        onDeleteUser={handleDeleteUser}
        isAdmin={isAdmin}
      />
    </div>
    </>
  );
};

export default MlmTreePage;
