import { FormEvent, useState } from "react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useAuth } from "../../context/AuthContext";

const ChangePasswordForm: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { changePassword } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await changePassword(currentPassword, newPassword);
      setMessage(response.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to change password";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div>
        <Label>
          Current password <span className="text-error-500">*</span>
        </Label>
        <Input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Enter current password"
          required
        />
      </div>
      <div>
        <Label>
          New password <span className="text-error-500">*</span>
        </Label>
        <Input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Enter new password"
          required
        />
      </div>
      <div>
        <Label>
          Confirm new password <span className="text-error-500">*</span>
        </Label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm new password"
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

      <Button type="submit" size="sm" isLoading={isSubmitting}>
        Update password
      </Button>
    </form>
  );
};

export default ChangePasswordForm;
