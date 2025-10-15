import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ResetPasswordForm from "../../components/auth/ResetPasswordForm";

const ResetPasswordPage: React.FC = () => {
  return (
    <>
      <PageMeta
        title="Reset Password | LD Group Admin"
        description="Reset your password for the LD Group admin portal"
      />
      <AuthLayout>
        <ResetPasswordForm />
      </AuthLayout>
    </>
  );
};

export default ResetPasswordPage;
