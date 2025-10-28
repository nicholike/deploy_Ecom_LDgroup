import React, { useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode | string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
  confirmButtonClass?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'warning',
  loading = false,
  confirmButtonClass,
}) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  // Get icon and colors based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: ExclamationTriangleIcon,
          iconBgColor: 'bg-red-100 dark:bg-red-900/20',
          iconColor: 'text-red-600 dark:text-red-400',
          buttonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
        };
      case 'warning':
        return {
          icon: ExclamationTriangleIcon,
          iconBgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          buttonClass: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white',
        };
      case 'info':
        return {
          icon: InformationCircleIcon,
          iconBgColor: 'bg-blue-100 dark:bg-blue-900/20',
          iconColor: 'text-blue-600 dark:text-blue-400',
          buttonClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
        };
      case 'success':
        return {
          icon: CheckCircleIcon,
          iconBgColor: 'bg-green-100 dark:bg-green-900/20',
          iconColor: 'text-green-600 dark:text-green-400',
          buttonClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white',
        };
      default:
        return {
          icon: InformationCircleIcon,
          iconBgColor: 'bg-gray-100 dark:bg-gray-900/20',
          iconColor: 'text-gray-600 dark:text-gray-400',
          buttonClass: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-white',
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;
  const finalConfirmButtonClass = confirmButtonClass || config.buttonClass;

  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl transform transition-all">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${config.iconBgColor}`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>

            {/* Title */}
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="px-6 pb-6">
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {typeof message === 'string' ? (
              <p>{message}</p>
            ) : (
              message
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${finalConfirmButtonClass}`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Đang xử lý...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
