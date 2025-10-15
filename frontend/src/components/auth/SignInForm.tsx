import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { useAuth } from "../../context/AuthContext";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role
      const destination = user.role === "ADMIN" ? "/admin/dashboard" : "/";
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      // After login, useEffect will handle redirect based on role
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-hidden">
      {/* Background Image - Sắc nét */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/login.jpg)' }}
      >
        {/* Overlay nhẹ */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Logo - At top */}
      <div className="relative z-10 pt-8 sm:pt-12 mb-8 flex justify-center w-full">
        <img
          src="/LOGO_LD%20PERFUME%20OIL%20LUXURY%20(4)_NA%CC%82U%201.svg"
          alt="LD Perfume Oil Luxury Logo"
          width={350}
          height={110}
          className="max-w-[350px] drop-shadow-2xl"
        />
      </div>

      {/* Glass Form Container */}
      <div className="relative z-10 w-full max-w-md mx-4 flex-1 flex items-start justify-center mt-8">
        {/* Glass Card - CSS.glass effect */}
        <div 
          className="p-8 sm:p-10"
          style={{
            background: 'rgba(255, 255, 255, 0)',
            borderRadius: '16px',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(3.2px)',
            WebkitBackdropFilter: 'blur(3.2px)',
            border: '1px solid rgba(255, 255, 255, 0.42)'
          }}
        >
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="mb-2 font-bold text-white text-3xl sm:text-4xl drop-shadow-lg">
              Đăng nhập
            </h1>
            <p className="text-sm text-white/80 drop-shadow">
              Nhập email và mật khẩu để đăng nhập vào hệ thống!
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-white/90 font-medium mb-2">
                Email <span className="text-red-400">*</span>
              </Label>
              <div 
                className="overflow-hidden transition-all focus-within:shadow-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(3.2px)',
                  WebkitBackdropFilter: 'blur(3.2px)',
                  border: '1px solid rgba(255, 255, 255, 0.42)'
                }}
              >
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="bg-transparent border-0 text-white placeholder:text-white/70 focus:ring-0"
                />
              </div>
            </div>

            <div>
              <Label className="text-white/90 font-medium mb-2">
                Mật khẩu <span className="text-red-400">*</span>
              </Label>
              <div 
                className="relative overflow-hidden transition-all focus-within:shadow-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(3.2px)',
                  WebkitBackdropFilter: 'blur(3.2px)',
                  border: '1px solid rgba(255, 255, 255, 0.42)'
                }}
              >
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="bg-transparent border-0 text-white placeholder:text-white/70 focus:ring-0 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 hover:scale-110 transition-transform"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeIcon className="fill-white/80 size-5" />
                  ) : (
                    <EyeCloseIcon className="fill-white/80 size-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={rememberMe} onChange={setRememberMe} />
                <span className="block font-normal text-white/90 text-sm">
                  Giữ đăng nhập
                </span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm text-white/90 hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                Quên mật khẩu?
              </a>
            </div>

            {error && (
              <div className="backdrop-blur-md bg-red-500/20 border border-red-400/50 text-white px-4 py-3 rounded-xl text-sm" role="alert">
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button 
                className="w-full !bg-[#8b5e1e] hover:!bg-[#6d4916] text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] uppercase text-sm" 
                size="sm" 
                type="submit" 
                isLoading={isSubmitting}
              >
                Đăng nhập
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
