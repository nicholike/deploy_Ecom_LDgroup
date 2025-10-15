import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { paymentService, type PaymentInfo } from '../services/payment.service';
import { CheckCircle, Copy, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function Payment() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Load payment info - CHỈ GỌI 1 LẦN khi mount
  const loadPaymentInfo = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      console.log('🔄 Loading payment info (should only run ONCE)');
      const info = await paymentService.getPaymentInfo(orderId, token);
      setPaymentInfo(info);

      // If already paid, show success
      if (info.paymentStatus === 'COMPLETED') {
        setIsPaid(true);
      }
    } catch (err: any) {
      console.error('Failed to load payment info:', err);
      setError(err.message || 'Không thể tải thông tin thanh toán');
      showToast({
        tone: 'error',
        title: 'Lỗi',
        description: 'Không thể tải thông tin thanh toán',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check payment status - Polling mỗi 5s
  const checkPaymentStatus = async () => {
    if (!orderId || checking || isPaid) return;

    try {
      setChecking(true);
      const token = getToken();
      if (!token) return;

      console.log('🔍 Checking payment status...');
      const status = await paymentService.checkPaymentStatus(orderId, token);

      if (status.paymentStatus === 'COMPLETED') {
        console.log('✅ Payment completed!');
        setIsPaid(true);
        setPaymentInfo((prev) => (prev ? { ...prev, paymentStatus: 'COMPLETED' } : null));

        // Clear polling interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        // Show success toast
        showToast({
          tone: 'success',
          title: 'Thanh toán thành công!',
          description: `Đơn hàng ${status.orderNumber} đã được thanh toán`,
        });

        // Start countdown to redirect
        setCountdown(5);
        countdownRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownRef.current!);
              navigate('/account');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      console.error('Failed to check payment status:', err);
    } finally {
      setChecking(false);
    }
  };

  // Initial load - CHỈ GỌI 1 LẦN khi component mount
  useEffect(() => {
    loadPaymentInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = chỉ chạy 1 lần khi mount

  // Start polling - CHỈ CHECK STATUS mỗi 5s, KHÔNG reload payment info
  useEffect(() => {
    if (loading || isPaid || !paymentInfo) return;

    console.log('🔄 Starting payment status polling (every 5 seconds)');

    // Check immediately
    checkPaymentStatus();

    // Then check every 5 seconds
    intervalRef.current = setInterval(() => {
      checkPaymentStatus();
    }, 5000);

    return () => {
      console.log('🛑 Stopping payment status polling');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isPaid, paymentInfo]); // Không include checkPaymentStatus để tránh re-run

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast({
      tone: 'success',
      title: 'Đã sao chép',
      description: `Đã sao chép ${label}`,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tải thông tin thanh toán...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Có lỗi xảy ra</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error || 'Không tìm thấy thông tin thanh toán'}</p>
          <button
            onClick={() => navigate('/account')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
          >
            <ArrowLeft className="h-5 w-5" />
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (isPaid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-800">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Thanh toán thành công!</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Đơn hàng của bạn đã được thanh toán</p>
          <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Mã đơn hàng</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{paymentInfo.orderNumber}</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Số tiền</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(paymentInfo.amount)}</p>
          </div>
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Tự động chuyển về trang tài khoản sau {countdown} giây...
          </p>
          <button
            onClick={() => navigate('/account')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
          >
            Về trang tài khoản ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/cart-checkout')}
            className="rounded-lg p-2 text-gray-600 transition hover:bg-white/50 dark:text-gray-400 dark:hover:bg-gray-800/50"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thanh toán đơn hàng</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Mã đơn: {paymentInfo.orderNumber}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* QR Code Section */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Quét mã QR để thanh toán</h2>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="overflow-hidden rounded-xl border-4 border-blue-500 bg-white p-4">
                <img
                  src={paymentInfo.qrCodeUrl}
                  alt="QR Code"
                  className="h-full w-full object-contain"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    console.error('QR Code load error:', e);
                    console.log('QR URL:', paymentInfo.qrCodeUrl);
                    e.currentTarget.src = 'https://via.placeholder.com/300x300?text=QR+Code+Error';
                  }}
                />
              </div>

              {checking && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                    <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Đang kiểm tra thanh toán...
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="text-center text-sm text-blue-700 dark:text-blue-300">
                📱 Mở app ngân hàng và quét mã QR để thanh toán
              </p>
            </div>
          </div>

          {/* Bank Info Section */}
          <div className="space-y-4">
            {/* Amount */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white shadow-lg">
              <p className="text-sm opacity-90">Số tiền cần thanh toán</p>
              <p className="mt-1 text-3xl font-bold">{formatCurrency(paymentInfo.amount)}</p>
            </div>

            {/* Bank Details */}
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Thông tin chuyển khoản</h3>

              <div className="space-y-4">
                {/* Bank Name */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Ngân hàng</label>
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {paymentInfo.bankAccount.bankName}
                    </span>
                  </div>
                </div>

                {/* Account Number */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Số tài khoản</label>
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                    <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                      {paymentInfo.bankAccount.accountNumber}
                    </span>
                    <button
                      onClick={() => copyToClipboard(paymentInfo.bankAccount.accountNumber, 'số tài khoản')}
                      className="rounded-md p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Account Name */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Chủ tài khoản</label>
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {paymentInfo.bankAccount.accountName}
                    </span>
                  </div>
                </div>

                {/* Transfer Content */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nội dung chuyển khoản</label>
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                    <span className="font-mono font-bold text-yellow-900 dark:text-yellow-300">
                      {paymentInfo.description}
                    </span>
                    <button
                      onClick={() => copyToClipboard(paymentInfo.description, 'nội dung')}
                      className="rounded-md p-2 text-yellow-700 transition hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    ⚠️ Vui lòng nhập chính xác nội dung để hệ thống tự động xác nhận thanh toán
                  </p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="rounded-lg bg-gray-100 p-4 text-center dark:bg-gray-800">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Đang chờ thanh toán... (tự động cập nhật)
                </p>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Hệ thống sẽ tự động xác nhận sau khi bạn chuyển khoản thành công
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

