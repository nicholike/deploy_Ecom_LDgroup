import PageMeta from "../../components/common/PageMeta";
import CreateUserForm from "../../components/account/CreateUserForm";

const CreateUserPage: React.FC = () => {
  return (
    <div className="max-w-4xl">
      <PageMeta
        title="Tạo tài khoản mới | LD Group Admin"
        description="Tạo thành viên mới trên hệ thống phân cấp F1/F2/F3/F4"
      />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Admin tạo tài khoản cho các nhánh F1, F2, F3, F4. Đảm bảo bạn nhập đúng Sponsor ID để gán thành viên vào
          nhánh tương ứng.
        </p>
      </div>
      <CreateUserForm />
    </div>
  );
};

export default CreateUserPage;
