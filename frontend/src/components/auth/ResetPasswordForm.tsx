import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getFormErrorMessage } from "../../shared/errorTranslator";

const ResetPasswordForm: React.FC = () => {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialToken = searchParams.get("token") ?? "";

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    // Validation
    if (!token || token.trim().length === 0) {
      setError("Token không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.");
      setIsSubmitting(false);
      return;
    }

    if (!password || password.length === 0) {
      setError("Vui lòng nhập mật khẩu mới!");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự!");
      setIsSubmitting(false);
      return;
    }

    if (!confirmPassword || confirmPassword.length === 0) {
      setError("Vui lòng nhập xác nhận mật khẩu!");
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await resetPassword(token, password);
      setMessage(response.message);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      const errorMessage = getFormErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center px-2.5 overflow-hidden pt-1 md:pt-16">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: 'url(/login.jpg)' }}
      />

      {/* Logo */}
      <div className="relative z-10 mb-1 md:mb-12 flex justify-center">
        <img
          src="/LOGO_LD%20PERFUME%20OIL%20LUXURY%20(4)_NA%CC%82U%201.svg"
          alt="LD Perfume Oil Luxury Logo"
          width={300}
          height={90}
          className="max-w-[300px] drop-shadow-2xl"
        />
      </div>

      {/* Glassmorphism Wrapper */}
      <div
        className="w-full max-w-lg rounded-2xl px-12 py-8 text-center transition-all duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 0, 0, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.37)';
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Title */}
          <h2 className="text-4xl mb-6 text-white tracking-wide">Đặt lại mật khẩu</h2>

          {/* Description */}
          <p className="text-white/80 text-sm mb-8 text-left">
            Nhập mật khẩu mới của bạn để hoàn tất quá trình đặt lại.
          </p>

          {/* New Password Input Field */}
          <div className="relative border-b-2 border-white/30 my-5">
            <input
                type="password"
                value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder=" "
              className="w-full h-10 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base text-white px-0 peer"
            />
            <label className="absolute left-0 top-1/2 -translate-y-1/2 text-white text-base pointer-events-none transition-all duration-300 peer-focus:text-[0.9rem] peer-focus:top-2.5 peer-focus:-translate-y-[150%] peer-focus:text-white peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-white peer-[:not(:placeholder-shown)]:text-[0.9rem] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:-translate-y-[150%] peer-[:not(:placeholder-shown)]:text-white">
              Mật khẩu mới *
            </label>
            </div>

          {/* Confirm Password Input Field */}
          <div className="relative border-b-2 border-white/30 my-5">
            <input
                type="password"
                value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder=" "
              className="w-full h-10 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base text-white px-0 peer"
            />
            <label className="absolute left-0 top-1/2 -translate-y-1/2 text-white text-base pointer-events-none transition-all duration-300 peer-focus:text-[0.9rem] peer-focus:top-2.5 peer-focus:-translate-y-[150%] peer-focus:text-white peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-white peer-[:not(:placeholder-shown)]:text-[0.9rem] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:-translate-y-[150%] peer-[:not(:placeholder-shown)]:text-white">
              Xác nhận mật khẩu mới *
            </label>
            </div>

          {/* Error Message */}
            {error && (
            <div className="mb-5 backdrop-blur-md bg-red-500/20 border border-red-400/50 text-white px-4 py-3 rounded-xl text-sm whitespace-pre-line text-left">
                {error}
            </div>
            )}

          {/* Success Message */}
            {message && (
            <div className="mb-5 backdrop-blur-md bg-green-500/20 border border-green-400/50 text-white px-4 py-3 rounded-xl text-sm text-left">
              ✅ {message}
              <br />
              <span className="text-xs text-white/70">Đang chuyển hướng đến trang đăng nhập...</span>
              </div>
            )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#8b5e1e] text-white font-semibold border-none py-4 cursor-pointer rounded-full text-base transition-all duration-300 hover:bg-[#6f4715] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
          </button>

          {/* Back to Login Link */}
          <div className="text-center mt-8 text-white">
            <p className="text-sm">
              Nhớ mật khẩu?{" "}
              <Link to="/login" className="text-white no-underline hover:underline">
                Đăng nhập ngay
              </Link>
            </p>
            </div>
          </form>
      </div>
    </div>
  );
};

export default ResetPasswordForm;