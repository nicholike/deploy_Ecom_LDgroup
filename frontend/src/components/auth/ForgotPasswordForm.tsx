import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useAuth } from "../../context/AuthContext";

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

    try {
      const response = await requestPasswordReset(email);
      setMessage(response.message);
      if (response.resetToken) {
        setResetToken(response.resetToken);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to process request";
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
              Forgot Password
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter the email associated with your account and we&apos;ll send instructions to reset your password.
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

            {resetToken && (
              <div className="p-3 text-sm text-brand-600 bg-brand-50 border border-brand-100 rounded-lg dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
                <p className="font-medium">Development reset token:</p>
                <code className="block mt-1 break-words">{resetToken}</code>
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" size="sm" className="w-full sm:w-auto" isLoading={isSubmitting}>
                Send reset link
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

export default ForgotPasswordForm;
