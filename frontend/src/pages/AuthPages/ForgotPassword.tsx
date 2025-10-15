import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ForgotPasswordForm from "../../components/auth/ForgotPasswordForm";

const ForgotPasswordPage: React.FC = () => {
  return (
    <>
      <PageMeta
        title="Forgot Password | LD Group Admin"
        description="Request a password reset for the LD Group admin portal"
      />
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </>
  );
};

export default ForgotPasswordPage;
