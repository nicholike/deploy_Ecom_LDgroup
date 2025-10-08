'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Đã có lỗi xảy ra
        </h2>
        <p className="text-gray-600 mb-8">
          {error.message || 'Có lỗi không xác định đã xảy ra.'}
        </p>
        <button
          onClick={reset}
          className="bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] text-white font-bold py-3 px-8 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
