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

        // Countdown sẽ được start bởi useEffect
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

  // Start countdown when payment is completed
  useEffect(() => {
    if (!isPaid) return;

    console.log('⏱️ Starting countdown...');
    setCountdown(5);
    
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          navigate('/account');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isPaid, navigate]);

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
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md w-[90%] rounded-xl border-2 border-[#8B5E1E] bg-white p-5 sm:p-8 text-center shadow-lg relative">
          {/* Title */}
          <h2 className="text-[15px] sm:text-[18px] font-bold text-black uppercase leading-tight">
            Thanh toán thành công!
          </h2>
          <p className="mt-2 text-[11px] sm:text-sm text-gray-600">
            Đơn hàng của bạn đã được thanh toán
          </p>
          
          {/* Order Info */}
          <div className="mt-4 sm:mt-6 rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="space-y-2 sm:space-y-3 text-[11px] sm:text-sm">
              <div>
                <span className="text-gray-600">Mã đơn hàng:</span>
                <p className="font-semibold text-[#8B5E1E] text-sm sm:text-base">{paymentInfo.orderNumber}</p>
              </div>
              <div>
                <span className="text-gray-600">Số tiền:</span>
                <p className="font-bold text-green-600 text-base sm:text-xl">{formatCurrency(paymentInfo.amount)}</p>
              </div>
            </div>
          </div>
          
          {/* Button */}
          <button
            onClick={() => navigate('/account')}
            className="mt-4 sm:mt-6 w-full bg-[#8B5E1E] text-white font-bold text-[12px] md:text-[14px] rounded-md py-2.5 sm:py-3 uppercase hover:bg-[#6f4715] transition"
          >
            Về trang tài khoản ngay ({countdown}s)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(180deg, #e6ebf3 0%, #f7f9fc 100%)' }}
    >
      <div 
        className="max-w-4xl w-full border border-blue-400 rounded-md p-6 bg-white bg-opacity-70"
        style={{ backdropFilter: 'saturate(180%) blur(20px)' }}
      >
        <h2 className="text-center font-semibold text-sm mb-6">
          Thanh toán qua chuyển khoản ngân hàng
        </h2>
        
        <div className="flex flex-col md:flex-row md:space-x-8">
          {/* Left side - QR Code */}
          <div className="flex-1 flex flex-col items-center">
            <p className="text-xs text-center mb-3 px-2 md:px-0">
              Cách 1: Mở app ngân hàng/ Ví và <span className="font-semibold">quét mã QR</span>
            </p>
            
            <div className="relative border border-green-600 w-72 h-72 flex flex-col items-center justify-center">
              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-green-600 rounded-tl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-green-600 rounded-tr"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-green-600 rounded-bl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-600 rounded-br"></div>
              
              {/* QR Code Image */}
              <img
                src={paymentInfo.qrCodeUrl}
                alt="QR Code"
                className="w-56 h-56 object-contain"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  console.error('QR Code load error:', e);
                  console.log('QR URL:', paymentInfo.qrCodeUrl);
                  e.currentTarget.src = 'https://via.placeholder.com/224x224?text=QR+Code+Error';
                }}
              />
              
              {/* Checking overlay */}
              {checking && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                    <p className="mt-2 text-xs font-medium text-gray-700">
                      Đang kiểm tra...
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = paymentInfo.qrCodeUrl;
                link.download = `QR_${paymentInfo.orderNumber}.png`;
                link.click();
              }}
              className="mt-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded px-3 py-1 flex items-center space-x-2"
              type="button"
            >
              <Copy className="h-3 w-3" />
              <span>Tải ảnh QR</span>
            </button>
          </div>

          {/* Right side - Bank Info */}
          <div className="flex-1 mt-8 md:mt-0">
            <p className="text-xs text-center md:text-left mb-3 px-2 md:px-0">
              Cách 2: Chuyển khoản <span className="font-semibold">thủ công</span> theo thông tin
            </p>
            
            <div className="border border-gray-300 rounded-md overflow-hidden text-xs">
              <div className="bg-gray-100 text-center text-teal-700 font-semibold py-1 px-2">
                {paymentInfo.bankAccount.bankName}
              </div>
              
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-t border-gray-300">
                    <td className="py-2 px-3 w-28">Ngân hàng</td>
                    <td className="py-2 px-3 font-semibold">{paymentInfo.bankAccount.bankName}</td>
                  </tr>
                  
                  <tr className="border-t border-gray-300">
                    <td className="py-2 px-3 w-28">Thụ hưởng</td>
                    <td className="py-2 px-3 font-semibold">{paymentInfo.bankAccount.accountName}</td>
                  </tr>
                  
                  <tr className="border-t border-gray-300">
                    <td className="py-2 px-3 w-28">Số tài khoản</td>
                    <td className="py-2 px-3 font-semibold flex items-center space-x-2">
                      <span>{paymentInfo.bankAccount.accountNumber}</span>
                      <button
                        onClick={() => copyToClipboard(paymentInfo.bankAccount.accountNumber, 'số tài khoản')}
                        className="text-blue-500 text-xs flex items-center space-x-1 hover:underline"
                        type="button"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Sao chép</span>
                      </button>
                    </td>
                  </tr>
                  
                  <tr className="border-t border-gray-300">
                    <td className="py-2 px-3 w-28">Số tiền</td>
                    <td className="py-2 px-3 font-semibold flex items-center space-x-2">
                      <span>{formatCurrency(paymentInfo.amount)}</span>
                      <button
                        onClick={() => copyToClipboard(paymentInfo.amount.toString(), 'số tiền')}
                        className="text-blue-500 text-xs flex items-center space-x-1 hover:underline"
                        type="button"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Sao chép</span>
                      </button>
                    </td>
                  </tr>
                  
                  <tr className="border-t border-gray-300">
                    <td className="py-2 px-3 w-28">Nội dung CK</td>
                    <td className="py-2 px-3 font-semibold flex items-center space-x-2">
                      <span>{paymentInfo.description}</span>
                      <button
                        onClick={() => copyToClipboard(paymentInfo.description, 'nội dung')}
                        className="text-blue-500 text-xs flex items-center space-x-1 hover:underline"
                        type="button"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Sao chép</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-3 bg-yellow-100 border border-yellow-300 rounded px-3 py-2 text-xs text-yellow-900 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="leading-tight">
                <span className="font-semibold">Lưu ý:</span> Vui lòng giữ nguyên nội dung chuyển khoản{' '}
                <span className="font-semibold">{paymentInfo.description}</span> để xác nhận thanh toán tự động.
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-center text-xs mt-6 flex items-center justify-center gap-2">
          Trạng thái: Chờ thanh toán
          <Loader2 className="h-3 w-3 animate-spin" />
        </p>
      </div>
    </div>
  );
}

