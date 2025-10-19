import { FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { getFormErrorMessage } from "../../shared/errorTranslator";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      const destination = user.role === "ADMIN" ? "/admin/dashboard" : "/";
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!usernameOrEmail || usernameOrEmail.trim().length === 0) {
      setError("Vui lòng nhập tên đăng nhập hoặc email!");
      setIsSubmitting(false);
      return;
    }

    if (!password || password.length === 0) {
      setError("Vui lòng nhập Mật khẩu!");
      setIsSubmitting(false);
      return;
    }

    try {
      await login(usernameOrEmail, password);
    } catch (err) {
      const message = getFormErrorMessage(err);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center px-2.5 overflow-hidden pt-1 md:pt-16 overscroll-none">
      {/* Background Image - Fixed position to prevent pull-to-refresh white space */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{
          backgroundImage: 'url(/login.jpg)',
          backgroundAttachment: 'fixed'
        }}
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
        className="w-full max-w-lg rounded-2xl px-12 py-12 text-center transition-all duration-300"
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
          <h2 className="text-4xl mb-6 text-white tracking-wide">Đăng nhập</h2>

          {/* Username or Email Input Field */}
          <div className="relative border-b-2 border-white/30 my-5">
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              autoComplete="username"
              placeholder=" "
              className="w-full h-10 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-white px-0 peer"
            />
            <label className="absolute left-0 top-1/2 -translate-y-1/2 text-white text-base pointer-events-none transition-all duration-300 peer-focus:text-[0.9rem] peer-focus:top-2.5 peer-focus:-translate-y-[150%] peer-focus:text-white peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-white peer-[:not(:placeholder-shown)]:text-[0.9rem] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:-translate-y-[150%] peer-[:not(:placeholder-shown)]:text-white">
              Tên đăng nhập hoặc email
            </label>
          </div>

          {/* Password Input Field */}
          <div className="relative border-b-2 border-white/30 my-5">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              placeholder=" "
              className="w-full h-10 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-white px-0 pr-10 peer"
            />
            <label className="absolute left-0 top-1/2 -translate-y-1/2 text-white text-base pointer-events-none transition-all duration-300 peer-focus:text-[0.9rem] peer-focus:top-2.5 peer-focus:-translate-y-[150%] peer-focus:text-white peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-white peer-[:not(:placeholder-shown)]:text-[0.9rem] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:-translate-y-[150%] peer-[:not(:placeholder-shown)]:text-white">
              Nhập mật khẩu của bạn
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? (
                <EyeIcon className="fill-white/80 size-5" />
              ) : (
                <EyeCloseIcon className="fill-white/80 size-5" />
              )}
            </button>
          </div>

          {/* Forgot Password */}
          <div className="flex items-center justify-end mb-6 text-white">
            <a
              href="/forgot-password"
              className="text-sm text-white no-underline hover:underline"
            >
              Quên mật khẩu?
            </a>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 backdrop-blur-md bg-red-500/20 border border-red-400/50 text-white px-4 py-3 rounded-xl text-sm whitespace-pre-line text-left">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#8b5e1e] text-white font-semibold border-none py-4 cursor-pointer rounded-full text-base transition-all duration-300 hover:bg-[#6f4715] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          {/* Register Link */}
          <div className="text-center mt-8 text-white">
            <p className="text-sm">
              Chưa có tài khoản?{" "}
              <a href="/signup" className="text-white no-underline hover:underline">
                Đăng ký ngay
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
