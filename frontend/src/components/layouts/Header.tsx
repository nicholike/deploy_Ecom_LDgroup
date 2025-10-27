import React from 'react';

interface HeaderProps {
  cartItemCount?: number;
  userName?: string;
}

export const Header: React.FC<HeaderProps> = ({ cartItemCount = 0, userName }) => {
  return (
    <>
      <header
        className="sticky top-0 z-20 w-full bg-white/95 backdrop-blur-sm flex justify-center shadow-sm"
      >
        <div
          className="w-[95%] md:w-[65%] flex items-center justify-between py-2 md:py-2.5"
        >
          <a href="/">
            <img
              src="/LOGO_LD%20PERFUME%20OIL%20LUXURY%20(4)_NA%CC%82U%201.svg"
              alt="LD Perfume Oil Luxury logo"
              className="h-auto object-contain cursor-pointer w-28 md:w-36"
            />
          </a>
          <div className="flex items-center space-x-2 md:space-x-4 text-black">
            <a
              href="/cart"
              className="flex items-center space-x-2 relative cursor-pointer text-[11px] md:text-[12px] text-black font-semibold hover:text-[#5f3d10] transition -ml-1"
            >
              <div className="relative flex items-center">
                <img
                  src="/shopping-cart 1.svg"
                  alt="Giỏ hàng"
                  className="h-5 w-5 object-contain"
                />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span className="leading-none">Giỏ hàng</span>
            </a>
            <a
              href="/account"
              className="flex items-center space-x-1 cursor-pointer text-[11px] md:text-[12px] text-black font-semibold hover:text-[#5f3d10] transition"
            >
              <img
                src="/user 1.svg"
                alt="Tài khoản"
                className="h-5 w-5 object-contain"
              />
              <span className="leading-none">{userName || 'Tài khoản'}</span>
            </a>
          </div>
        </div>
      </header>

      <div className="w-full border-b border-[rgba(0,0,0,0.12)]" />
    </>
  );
};
