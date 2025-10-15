import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useAuth } from "../../context/AuthContext";

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

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await resetPassword(token, password);
      setMessage(response.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to reset password";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Reset Password
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose a new password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>
                Reset token <span className="text-error-500">*</span>
              </Label>
              <Input
                placeholder="Paste the token you received"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required
              />
            </div>
            <div>
              <Label>
                New password <span className="text-error-500">*</span>
              </Label>
              <Input
                type="password"
                placeholder="Enter a new password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div>
              <Label>
                Confirm password <span className="text-error-500">*</span>
              </Label>
              <Input
                type="password"
                placeholder="Re-enter the new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-error-500" role="alert">
                {error}
              </p>
            )}

            {message && (
              <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
                {message}
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" size="sm" className="w-full sm:w-auto" isLoading={isSubmitting}>
                Reset password
              </Button>
              <Link
                to="/login"
                className="text-sm text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;
