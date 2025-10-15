import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { userService, type UserTreeNodeResponse } from "../../services/userService";
import MlmTreeViewport from "../../components/account/MlmTreeViewport";

const MlmTreePage: React.FC = () => {
  const { accessToken } = useAuth();
  const [tree, setTree] = useState<UserTreeNodeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
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
      <MlmTreeViewport data={tree} isLoading={isLoading} />
    </div>
  );
};

export default MlmTreePage;
