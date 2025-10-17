import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import { authService } from "../../services/authService";
import { getFormErrorMessage } from "../../shared/errorTranslator";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    referralCode: ""
  });

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    if (!formData.username || formData.username.trim().length === 0) {
      setError("Vui lòng nhập Username!");
      setIsSubmitting(false);
      return;
    }

    if (formData.username.trim().length < 3) {
      setError("Username phải có ít nhất 3 ký tự!");
      setIsSubmitting(false);
      return;
    }

    if (!formData.email || formData.email.trim().length === 0) {
      setError("Vui lòng nhập Email!");
      setIsSubmitting(false);
      return;
    }

    if (!formData.password || formData.password.length === 0) {
      setError("Vui lòng nhập Mật khẩu!");
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự!");
      setIsSubmitting(false);
      return;
    }

    if (!formData.referralCode || formData.referralCode.trim().length === 0) {
      setError("Vui lòng nhập Mã giới thiệu. Đây là trường bắt buộc!");
      setIsSubmitting(false);
      return;
    }

    if (!isChecked) {
      setError("Vui lòng đồng ý với Điều khoản sử dụng và Chính sách bảo mật!");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await authService.register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        referralCode: formData.referralCode.trim(),
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
      });

      setSuccess(response.message || 'Đăng ký thành công! Tài khoản của bạn đang chờ phê duyệt từ quản trị viên.');

      setTimeout(() => {
        navigate("/login");
      }, 3000);

    } catch (err) {
      const message = getFormErrorMessage(err);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center px-2.5 overflow-hidden pt-1 md:pt-12">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: 'url(/login.jpg)' }}
      />

      {/* Logo */}
      <div className="relative z-10 mb-1 md:mb-8 flex justify-center">
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
          <h2 className="text-3xl mb-3 text-white tracking-wide">Đăng ký</h2>

          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative border-b-2 border-white/30 my-3">
              <input
                type="text"
                value={formData.firstName}
                onChange={handleInputChange("firstName")}
                autoComplete="off"
                placeholder=" "
                className="w-full h-10 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base text-white px-0 peer"
              />
              <label className="absolute left-0 top-1/2 -translate-y-1/2 text-white text-sm pointer-events-none transition-all duration-300 peer-focus:text-xs peer-focus:top-2.5 peer-focus:-translate-y-[150%] peer-focus:text-white peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-white peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:-translate-y-[150%] peer-[:not(:placeholder-shown)]:text-white">
                Họ
              </label>
            </div>

            <div className="relative border-b-2 border-white/30 my-3">
              <input
                type="text"
                value={formData.lastName}
                onChange={handleInputChange("lastName")}
                autoComplete="off"
                placeholder=" "
                className="w-full h-10 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base text-white px-0 peer"
              />
              <label className="absolute left-0 top-1/2 -translate-y-1/2 text-white text-sm pointer-events-none transition-all duration-300 peer-focus:text-xs peer-focus:top-2.5 peer-focus:-translate-y-[150%] peer-focus:text-white peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-white peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:-translate-y-[150%] peer-[:not(:placeholder-shown)]:text-white">
                Tên
              </label>
            </div>
          </div>

          {/* Username */}
          <div className="relative border-b-2 border-white/30 my-3">
            <input
              type="text"
              value={formData.username}
              onChange={handleInputChange("username")}
              autoComplete="off"
              placeholder=" "
              className="w-full h-10 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base text-white px-0 peer"
            />
            <label className="absolute left-0 top-1/2 -translate-y-1/2 text-white text-base pointer-events-none transition-all duration-300 peer-focus:text-[0.9rem] peer-focus:top-2.5 peer-focus:-translate-y-[150%] peer-focus:text-white peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-white peer-[:not(:placeholder-shown)]:text-[0.9rem] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:-translate-y-[150%] peer-[:not(:placeholder-shown)]:text-white">
              Username *
            </label>
          </div>

          {/* Email */}
          <div className="relative border-b-2 border-white/30 my-3">
            <input
              type="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              autoComplete="off"
              placeholder=" "
              className="w-full h-10 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base text-white px-0 peer"
            />
            <label className="absolute left-0 top-1/2 -translate-y-1/2 text-white text-base pointer-events-none transition-all duration-300 peer-focus:text-[0.9rem] peer-focus:top-2.5 peer-focus:-translate-y-[150%] peer-focus:text-white peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-white peer-[:not(:placeholder-shown)]:text-[0.9rem] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:-translate-y-[150%] peer-[:not(:placeholder-shown)]:text-white">
              Email *
            </label>
          </div>

          {/* Password */}
          <div className="relative border-b-2 border-white/30 my-3">
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleInputChange("password")}
              autoComplete="new-password"
              placeholder=" "
              className="w-full h-10 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base text-white px-0 pr-10 peer"
            />
            <label className="absolute left-0 top-1/2 -translate-y-1/2 text-white text-base pointer-events-none transition-all duration-300 peer-focus:text-[0.9rem] peer-focus:top-2.5 peer-focus:-translate-y-[150%] peer-focus:text-white peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-white peer-[:not(:placeholder-shown)]:text-[0.9rem] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:-translate-y-[150%] peer-[:not(:placeholder-shown)]:text-white">
              Mật khẩu *
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

          {/* Referral Code */}
          <div className="relative border-b-2 border-white/30 my-3">
            <input
              type="text"
              value={formData.referralCode}
              onChange={handleInputChange("referralCode")}
              autoComplete="off"
              placeholder=" "
              className="w-full h-10 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base text-white px-0 uppercase peer"
            />
            <label className="absolute left-0 top-1/2 -translate-y-1/2 text-white text-base pointer-events-none transition-all duration-300 peer-focus:text-[0.9rem] peer-focus:top-2.5 peer-focus:-translate-y-[150%] peer-focus:text-white peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-white peer-[:not(:placeholder-shown)]:text-[0.9rem] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:-translate-y-[150%] peer-[:not(:placeholder-shown)]:text-white">
              Mã giới thiệu * (BẮT BUỘC)
            </label>
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-start gap-2 my-3 text-white text-left">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-1 accent-[#8b5e1e]"
            />
            <p className="text-sm leading-relaxed">
              Đồng ý với{" "}
              <span className="text-white font-semibold">Điều khoản sử dụng</span>
              {" "}và{" "}
              <span className="text-white font-semibold">Chính sách bảo mật</span>
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-3 backdrop-blur-md bg-red-500/20 border border-red-400/50 text-white px-3 py-2 rounded-xl text-sm whitespace-pre-line text-left">
              {error}
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-3 backdrop-blur-md bg-green-500/20 border border-green-400/50 text-white px-3 py-2 rounded-xl text-sm text-left">
              ✅ {success}
              <p className="mt-1 text-xs">Đang chuyển hướng đến trang đăng nhập...</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#8b5e1e] text-white font-semibold border-none py-3 cursor-pointer rounded-full text-base transition-all duration-300 hover:bg-[#6f4715] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Đang xử lý...' : 'Đăng ký tài khoản'}
          </button>

          {/* Login Link */}
          <div className="text-center mt-4 text-white">
            <p className="text-sm">
              Đã có tài khoản?{" "}
              <a href="/login" className="text-white no-underline hover:underline">
                Đăng nhập ngay
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
