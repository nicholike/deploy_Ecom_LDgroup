'use client';

import { useState } from 'react';
import { useLogin } from '@/features/auth';
import { SignInPage, Testimonial } from '@/components/auth';

const testimonials: Testimonial[] = [
  {
    avatarSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    name: "Nguyễn Thị Mai",
    handle: "@mai_nguyen",
    text: "Hệ thống MLM tuyệt vời! Quản lý downline và hoa hồng rất dễ dàng."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    name: "Trần Văn Hùng",
    handle: "@hung_tran",
    text: "Giao diện đẹp, tính năng mạnh mẽ. Tốt nhất cho doanh nghiệp MLM."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    name: "Lê Thị Hương",
    handle: "@huong_le",
    text: "Theo dõi đơn hàng và hoa hồng real-time. Rất hài lòng với hệ thống này!"
  },
];

export default function LoginPage() {
  const { mutate: login, isPending, error } = useLogin();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    login(
      { email, password },
      {
        onSuccess: () => {
          // Redirect is handled by useLogin hook automatically
          // based on user role (see: features/auth/hooks/useAuth.ts)
          console.log('Login successful, redirecting...');
        },
        onError: (err: any) => {
          const message = err?.response?.data?.error?.message || 'Email hoặc mật khẩu không đúng';
          setErrorMessage(message);
          setTimeout(() => setErrorMessage(null), 5000);
        },
      }
    );
  };

  const handleResetPassword = () => {
    alert('Vui lòng liên hệ Admin để reset mật khẩu');
  };

  return (
    <SignInPage
      title={
        <span className="font-light text-foreground tracking-tighter">
          Chào mừng trở lại
        </span>
      }
      description="Đăng nhập vào hệ thống MLM E-commerce để quản lý mạng lưới và hoa hồng của bạn"
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
      testimonials={testimonials}
      onSignIn={handleSignIn}
      onResetPassword={handleResetPassword}
      isLoading={isPending}
      error={errorMessage}
    />
  );
}
