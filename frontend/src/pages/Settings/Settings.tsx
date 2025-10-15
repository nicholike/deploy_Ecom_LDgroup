import { useState, useEffect } from 'react';
import { SettingsService, type SystemSetting } from '../../services/settings.service';
import { useToast } from '../../context/ToastContext';

type Tab = 'system' | 'email' | 'bank';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('system');
  const { showToast } = useToast();

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'system', label: 'Hệ thống', icon: '⚙️' },
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'bank', label: 'Ngân hàng', icon: '🏦' },
  ];

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Cấu hình hệ thống
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Quản lý các thiết lập và cấu hình của hệ thống
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-[#8B5E1E] text-[#8B5E1E]'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        {activeTab === 'system' && <SystemTab showToast={showToast} />}
        {activeTab === 'email' && <EmailTab showToast={showToast} />}
        {activeTab === 'bank' && <BankTab showToast={showToast} />}
      </div>
    </div>
  );
};

// ========================================
// SYSTEM TAB
// ========================================
const SystemTab: React.FC<{ showToast: any }> = ({ showToast }) => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [grouped, setGrouped] = useState<Record<string, SystemSetting[]>>({});
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await SettingsService.getSystemSettings();
      setSettings(data.settings);
      setGrouped(data.grouped);

      // Initialize edit values
      const values: Record<string, string> = {};
      data.settings.forEach((setting) => {
        values[setting.key] = setting.value;
      });
      setEditValues(values);
    } catch (error: any) {
      console.log('Failed to load settings:', error.message);
      // Silently fail on auth errors
      if (error.message !== 'Unauthorized') {
        showToast({
          tone: 'error',
          title: 'Lỗi',
          description: 'Không thể tải cấu hình hệ thống',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInitDefaults = async () => {
    if (!confirm('Bạn có chắc muốn khởi tạo các cấu hình mặc định? (Chỉ tạo những cài đặt chưa tồn tại)')) {
      return;
    }

    try {
      setInitializing(true);
      const result = await SettingsService.initDefaultSettings();
      
      showToast({
        tone: 'success',
        title: 'Thành công',
        description: `Đã tạo ${result.created} cài đặt mới, bỏ qua ${result.skipped} cài đặt đã tồn tại`,
      });

      await loadSettings();
    } catch (error: any) {
      console.error('Failed to init defaults:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: error.message || 'Không thể khởi tạo cấu hình',
      });
    } finally {
      setInitializing(false);
    }
  };

  const handleSave = async (key: string) => {
    try {
      setSaving(key);
      await SettingsService.updateSystemSetting(key, {
        value: editValues[key],
      });

      showToast({
        tone: 'success',
        title: 'Thành công',
        description: 'Đã cập nhật cài đặt',
      });

      await loadSettings();
    } catch (error: any) {
      console.error('Failed to update setting:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật cài đặt',
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[#8B5E1E]"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  const categories = ['GENERAL', 'SHIPPING', 'COMMISSION'];
  const categoryLabels: Record<string, string> = {
    GENERAL: 'Cài đặt chung',
    SHIPPING: 'Vận chuyển',
    COMMISSION: 'Hoa hồng',
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cài đặt hệ thống
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Quản lý các cấu hình chung của hệ thống
          </p>
        </div>
        <button
          onClick={handleInitDefaults}
          disabled={initializing}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {initializing ? 'Đang khởi tạo...' : 'Khởi tạo mặc định'}
        </button>
      </div>

      {settings.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Chưa có cài đặt nào. Nhấn nút "Khởi tạo mặc định" để tạo các cài đặt cơ bản.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => {
            const categorySettings = grouped[category] || [];
            if (categorySettings.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
                  {categoryLabels[category] || category}
                </h3>
                <div className="space-y-3">
                  {categorySettings.map((setting) => (
                    <div
                      key={setting.key}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-white">
                            {setting.label}
                            {setting.required && <span className="ml-1 text-red-500">*</span>}
                          </label>
                          {setting.description && (
                            <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                              {setting.description}
                            </p>
                          )}
                          <input
                            type={setting.type === 'NUMBER' ? 'number' : 'text'}
                            value={editValues[setting.key] || ''}
                            onChange={(e) =>
                              setEditValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                            }
                            disabled={!setting.editable}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700"
                          />
                        </div>
                        {setting.editable && (
                          <button
                            onClick={() => handleSave(setting.key)}
                            disabled={saving === setting.key}
                            className="mt-6 rounded-md bg-[#8B5E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d4a17] disabled:opacity-50"
                          >
                            {saving === setting.key ? 'Đang lưu...' : 'Lưu'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========================================
// EMAIL TAB
// ========================================
const EmailTab: React.FC<{ showToast: any }> = ({ showToast }) => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await SettingsService.getSystemSettings('EMAIL');
      setSettings(data.settings);
    } catch (error) {
      console.error('Failed to load email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[#8B5E1E]"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Mẫu Email
      </h2>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        Quản lý các mẫu email tự động gửi cho khách hàng
      </p>

      {settings.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Chưa có mẫu email nào. Vui lòng khởi tạo cài đặt mặc định ở tab "Hệ thống".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {settings.map((setting) => {
            let template: { subject: string; body: string } = { subject: '', body: '' };
            try {
              template = JSON.parse(setting.value);
            } catch (e) {
              // ignore
            }

            return (
              <div
                key={setting.key}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
                  {setting.label}
                </h3>
                {setting.description && (
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                    {setting.description}
                  </p>
                )}
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Tiêu đề:
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">{template.subject}</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Nội dung:
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">{template.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💡 <strong>Gợi ý:</strong> Chỉnh sửa email templates trong tab "Hệ thống" hoặc qua
          database. Các biến có thể dùng: {'{orderNumber}'}, {'{amount}'}, {'{siteName}'}, ...
        </p>
      </div>
    </div>
  );
};

// ========================================
// BANK TAB
// ========================================
const BankTab: React.FC<{ showToast: any }> = ({ showToast }) => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await SettingsService.getSystemSettings('BANK');
      setSettings(data.settings);

      const values: Record<string, string> = {};
      data.settings.forEach((setting) => {
        values[setting.key] = setting.value;
      });
      setEditValues(values);
    } catch (error) {
      console.error('Failed to load bank settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    try {
      setSaving(key);
      await SettingsService.updateSystemSetting(key, {
        value: editValues[key],
      });

      showToast({
        tone: 'success',
        title: 'Thành công',
        description: 'Đã cập nhật thông tin ngân hàng',
      });

      await loadSettings();
    } catch (error: any) {
      console.error('Failed to update setting:', error);
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật',
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[#8B5E1E]"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  const withdrawalSettings = settings.filter((s) =>
    ['min_withdrawal_amount', 'max_withdrawal_amount', 'withdrawal_processing_days'].includes(s.key)
  );
  const bankInfoSettings = settings.filter((s) =>
    ['company_bank_name', 'company_bank_account', 'company_bank_account_name'].includes(s.key)
  );

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Thông tin ngân hàng & Rút tiền
      </h2>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        Quản lý thông tin ngân hàng và cài đặt rút tiền
      </p>

      {/* Withdrawal Settings */}
      {withdrawalSettings.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
            Cài đặt rút tiền
          </h3>
          <div className="space-y-3">
            {withdrawalSettings.map((setting) => (
              <div
                key={setting.key}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-white">
                      {setting.label}
                    </label>
                    {setting.description && (
                      <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                        {setting.description}
                      </p>
                    )}
                    <input
                      type="number"
                      value={editValues[setting.key] || ''}
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={() => handleSave(setting.key)}
                    disabled={saving === setting.key}
                    className="mt-6 rounded-md bg-[#8B5E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d4a17] disabled:opacity-50"
                  >
                    {saving === setting.key ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bank Info */}
      {bankInfoSettings.length > 0 && (
        <div>
          <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
            Thông tin tài khoản ngân hàng
          </h3>
          <div className="space-y-3">
            {bankInfoSettings.map((setting) => (
              <div
                key={setting.key}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-white">
                      {setting.label}
                    </label>
                    {setting.description && (
                      <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                        {setting.description}
                      </p>
                    )}
                    <input
                      type="text"
                      value={editValues[setting.key] || ''}
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={() => handleSave(setting.key)}
                    disabled={saving === setting.key}
                    className="mt-6 rounded-md bg-[#8B5E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d4a17] disabled:opacity-50"
                  >
                    {saving === setting.key ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {settings.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Chưa có cài đặt nào. Vui lòng khởi tạo cài đặt mặc định ở tab "Hệ thống".
          </p>
        </div>
      )}
    </div>
  );
};

export default Settings;


