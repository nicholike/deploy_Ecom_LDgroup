import { FormEvent, useEffect, useMemo, useState } from "react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useAuth } from "../../context/AuthContext";
import { userService, type CreateUserPayload, type RoleLevel, type UserResponse } from "../../services/userService";

const roleOptions: Array<{ value: RoleLevel; label: string; description: string }> = [
  { value: "ADMIN", label: "ADMIN", description: "Quản trị viên hệ thống (không tham gia MLM, không có ví)." },
  { value: "F1", label: "F1", description: "Tuyến dưới cấp trực tiếp cho admin." },
  { value: "F2", label: "F2", description: "Tuyến dưới cấp 2 (nhánh dưới F1)." },
  { value: "F3", label: "F3", description: "Tuyến dưới cấp 3 (nhánh dưới F2)." },
  { value: "F4", label: "F4", description: "Tuyến dưới cấp 4." },
  { value: "F5", label: "F5", description: "Tuyến dưới cấp 5." },
  { value: "F6", label: "F6", description: "Tuyến dưới cấp 6." },
];

type FormState = CreateUserPayload;

const initialState = (sponsorId: string | undefined): FormState => ({
  email: "",
  username: "",
  password: "",
  role: "F1",
  sponsorId: sponsorId ?? "",
  firstName: "",
  lastName: "",
  phone: "",
});

const CreateUserForm: React.FC = () => {
  const { accessToken, user } = useAuth();
  const [form, setForm] = useState<FormState>(() => initialState(user?.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UserResponse | null>(null);
  const [sponsors, setSponsors] = useState<UserResponse[]>([]);
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [isLoadingSponsors, setIsLoadingSponsors] = useState(false);

  useEffect(() => {
    if (user?.id && !form.sponsorId) {
      setForm((prev) => ({ ...prev, sponsorId: user.id }));
    }
  }, [user?.id, form.sponsorId]);

  const sponsorRoleMap: Record<RoleLevel, RoleLevel | "ADMIN" | null> = {
    ADMIN: null, // Will be handled separately (root admin)
    F1: "ADMIN",
    F2: "F1",
    F3: "F2",
    F4: "F3",
    F5: "F4",
    F6: "F5",
  };

  const requiredSponsorRole = useMemo<RoleLevel | "ADMIN" | null>(() => {
    return sponsorRoleMap[form.role] ?? null;
  }, [form.role]);

  useEffect(() => {
    if (!accessToken) return;

    // For ADMIN role, fetch root admin (first admin in system)
    if (form.role === "ADMIN") {
      setIsLoadingSponsors(true);
      setSponsorError(null);

      userService
        .listUsers(accessToken, { role: "ADMIN", limit: 1 })
        .then((response) => {
          const list = response.data ?? [];
          setSponsors(list);
          if (list.length) {
            // Root admin exists, new admin will be under root admin
            setForm((prev) => ({ ...prev, sponsorId: list[0].id }));
          } else {
            // No admin exists yet, this will be the root admin
            setForm((prev) => ({ ...prev, sponsorId: "" }));
          }
        })
        .catch((err) => {
          setSponsorError(err instanceof Error ? err.message : "Không thể tải thông tin admin gốc.");
        })
        .finally(() => {
          setIsLoadingSponsors(false);
        });
      return;
    }

    if (!requiredSponsorRole) {
      setSponsors([]);
      setSponsorError(null);
      return;
    }

    // For ADMIN sponsor role we default to current admin user; no need to fetch extra.
    if (requiredSponsorRole === "ADMIN") {
      setSponsorError(null);
      if (user) {
        setSponsors([user]);
        setForm((prev) => ({ ...prev, sponsorId: user.id }));
      } else {
        setSponsors([]);
        setForm((prev) => ({ ...prev, sponsorId: "" }));
      }
      return;
    }

    setIsLoadingSponsors(true);
    setSponsorError(null);

    const MAX_SPONSOR_RESULTS = 100;

    userService
      .listUsers(accessToken, { role: requiredSponsorRole, limit: MAX_SPONSOR_RESULTS })
      .then((response) => {
        const list = response.data ?? [];
        setSponsors(list);
        if (list.length) {
          setForm((prev) => ({ ...prev, sponsorId: list[0].id }));
        } else {
          setForm((prev) => ({ ...prev, sponsorId: "" }));
        }
      })
      .catch((err) => {
        setSponsorError(err instanceof Error ? err.message : "Không thể tải danh sách người bảo trợ.");
      })
      .finally(() => {
        setIsLoadingSponsors(false);
      });
  }, [accessToken, requiredSponsorRole, user, form.role]);

  const sponsorHint = useMemo(() => {
    if (form.role === "ADMIN") {
      if (!sponsors.length) {
        return "Đây sẽ là ADMIN gốc (đứng đầu cây MLM).";
      }
      return `Admin mới sẽ được gắn dưới admin gốc: ${sponsors[0].username}`;
    }
    if (requiredSponsorRole === "ADMIN") {
      return "Thành viên F1 sẽ được gắn trực tiếp dưới tài khoản admin.";
    }
    if (!sponsors.length) {
      return "Chưa có người bảo trợ phù hợp. Bạn cần tạo cấp trên trước khi tạo cấp này.";
    }
    return `Chọn người bảo trợ cấp ${requiredSponsorRole}.`;
  }, [requiredSponsorRole, sponsors.length, form.role, sponsors]);

  const onChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!accessToken) {
      setError("Bạn cần đăng nhập lại để tiếp tục.");
      return;
    }

    // Determine sponsor based on role
    let sponsorId: string | undefined;
    if (form.role === "ADMIN") {
      // For ADMIN role, sponsorId is either root admin or undefined (if this is first admin)
      sponsorId = form.sponsorId.trim() || undefined;
    } else {
      sponsorId = requiredSponsorRole === "ADMIN" ? user?.id ?? "" : form.sponsorId.trim();
      if (!sponsorId) {
        setError("Vui lòng chọn người bảo trợ cho cấp này.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: CreateUserPayload = {
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        sponsorId,
        firstName: form.firstName?.trim() || undefined,
        lastName: form.lastName?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
      };

      const created = await userService.createUser(accessToken, payload);
      setResult(created);
      setForm({
        ...initialState(sponsorId),
        role: form.role,
        sponsorId: sponsorId || "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo tài khoản, vui lòng thử lại.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6 max-w-3xl" onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Email <span className="text-error-500">*</span>
          </Label>
          <Input
            type="email"
            placeholder="member@example.com"
            value={form.email}
            onChange={onChange("email")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>
            Username <span className="text-error-500">*</span>
          </Label>
          <Input
            placeholder="username123"
            value={form.username}
            onChange={onChange("username")}
            required
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Mật khẩu <span className="text-error-500">*</span>
          </Label>
          <Input
            type="password"
            placeholder="Ít nhất 8 ký tự, gồm hoa, thường, số và ký tự đặc biệt"
            value={form.password}
            onChange={onChange("password")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>
            Vai trò / Nhánh <span className="text-error-500">*</span>
          </Label>
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            value={form.role}
            onChange={onChange("role")}
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {roleOptions.find((option) => option.value === form.role)?.description}
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            {form.role === "ADMIN" ? "Cấu trúc MLM" : "Người bảo trợ"} {form.role !== "ADMIN" && <span className="text-error-500">*</span>}
          </Label>
          {form.role === "ADMIN" ? (
            <>
              {isLoadingSponsors ? (
                <div className="h-11 flex items-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  Đang kiểm tra...
                </div>
              ) : sponsors.length > 0 ? (
                <Input value={`Dưới admin gốc: ${sponsors[0].username} (${sponsors[0].email})`} disabled />
              ) : (
                <div className="h-11 flex items-center rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                  Đây sẽ là admin gốc
                </div>
              )}
            </>
          ) : requiredSponsorRole === "ADMIN" ? (
            <Input value={user?.email ?? ""} disabled />
          ) : (
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={form.sponsorId}
              onChange={onChange("sponsorId")}
              disabled={isLoadingSponsors || !sponsors.length}
              required
            >
              {sponsors.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.username} - {candidate.email} ({candidate.role})
                </option>
              ))}
            </select>
          )}
          {form.role !== "ADMIN" && isLoadingSponsors && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Đang tải danh sách người bảo trợ...</p>
          )}
          {sponsorError && (
            <p className="text-xs text-error-500" role="alert">
              {sponsorError}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">{sponsorHint}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Họ</Label>
            <Input placeholder="Nguyễn" value={form.firstName} onChange={onChange("firstName")} />
          </div>
          <div className="space-y-2">
            <Label>Tên</Label>
            <Input placeholder="Văn A" value={form.lastName} onChange={onChange("lastName")} />
          </div>
        </div>
      </div>

      <div className="space-y-2 md:w-1/2">
        <Label>Số điện thoại</Label>
        <Input placeholder="+84901234567" value={form.phone} onChange={onChange("phone")} />
      </div>

      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-700 dark:bg-error-900/30 dark:text-error-300">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-700 dark:bg-success-900/30 dark:text-success-300">
          <p className="font-medium">Tạo tài khoản thành công!</p>
          <p className="mt-1 text-xs">
            ID: <span className="font-semibold">{result.id}</span> · Referral Code:{" "}
            <span className="font-semibold">{result.referralCode}</span>
          </p>
        </div>
      )}

      <Button type="submit" size="sm" isLoading={isSubmitting}>
        Tạo tài khoản
      </Button>
    </form>
  );
};

export default CreateUserForm;
