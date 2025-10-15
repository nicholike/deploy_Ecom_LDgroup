import PageMeta from "../../components/common/PageMeta";
import ChangePasswordForm from "../../components/auth/ChangePasswordForm";

const ChangePasswordPage: React.FC = () => {
  return (
    <div className="max-w-3xl">
      <PageMeta
        title="Change Password | LD Group Admin"
        description="Update the password for your LD Group administrator account"
      />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Change Password
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Keep your account secure by using a strong, unique password.
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
};

export default ChangePasswordPage;
