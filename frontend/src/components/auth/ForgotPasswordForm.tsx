import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getFormErrorMessage } from "../../shared/errorTranslator";

const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setResetToken(null);
    setIsSubmitting(true);

    if (!email || email.trim().length === 0) {
      setError("Vui lòng nhập Email!");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await requestPasswordReset(email);
      setMessage(response.message);
      if (response.resetToken) {
        setResetToken(response.resetToken);
      }
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
          <h2 className="text-4xl mb-6 text-white tracking-wide">Quên mật khẩu</h2>

          {/* Description */}
          <p className="text-white/80 text-sm mb-8 text-left">
            Nhập địa chỉ email của bạn và chúng tôi sẽ gửi cho bạn liên kết để đặt lại mật khẩu.
          </p>

          {/* Email Input Field */}
          <div className="relative border-b-2 border-white/30 my-5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              placeholder=" "
              className="w-full h-10 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base text-white px-0 peer"
            />
            <label className="absolute left-0 top-1/2 -translate-y-1/2 text-white text-base pointer-events-none transition-all duration-300 peer-focus:text-[0.9rem] peer-focus:top-2.5 peer-focus:-translate-y-[150%] peer-focus:text-white peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-white peer-[:not(:placeholder-shown)]:text-[0.9rem] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:-translate-y-[150%] peer-[:not(:placeholder-shown)]:text-white">
              Nhập email của bạn *
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
            </div>
          )}

          {/* Reset Token */}
          {resetToken && (
            <div className="mb-5 backdrop-blur-md bg-blue-500/20 border border-blue-400/50 text-white px-4 py-3 rounded-xl text-sm text-left">
              <p className="font-medium">Token đặt lại mật khẩu:</p>
              <p className="font-mono text-xs mt-1 break-all bg-white/10 p-2 rounded">{resetToken}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#8b5e1e] text-white font-semibold border-none py-4 cursor-pointer rounded-full text-base transition-all duration-300 hover:bg-[#6f4715] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
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

export default ForgotPasswordForm;