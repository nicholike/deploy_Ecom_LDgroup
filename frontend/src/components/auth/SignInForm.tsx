import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
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
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Quay lại dashboard
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          {/* Logo for mobile view */}
          <div className="mb-8 lg:hidden flex justify-center">
            <img
              src="/LOGO_LD%20PERFUME%20OIL%20LUXURY%20(4)_NA%CC%82U%201.svg"
              alt="LD Perfume Oil Luxury Logo"
              width={220}
              height={70}
              className="w-auto h-auto max-w-[220px]"
            />
          </div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Đăng nhập
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nhập email và mật khẩu để đăng nhập vào hệ thống!
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>
                Email <span className="text-error-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <Label>
                Password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3">
                <Checkbox checked={rememberMe} onChange={setRememberMe} />
                <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                  Giữ đăng nhập
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400"
              >
                Quên mật khẩu?
              </Link>
            </div>

            {error && (
              <p className="text-sm text-error-500" role="alert">
                {error}
              </p>
            )}

            <div>
              <Button className="w-full" size="sm" type="submit" isLoading={isSubmitting}>
                Đăng nhập
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
