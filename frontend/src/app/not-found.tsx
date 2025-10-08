import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mt-4">
          Không tìm thấy trang
        </h2>
        <p className="text-gray-600 mt-4 mb-8">
          Trang bạn đang tìm kiếm không tồn tại.
        </p>
        <Link
          href="/login"
          className="inline-block bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] text-white font-bold py-3 px-8 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
        >
          Về trang đăng nhập
        </Link>
      </div>
    </div>
  );
}
