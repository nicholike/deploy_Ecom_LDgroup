'use client';

import React from 'react';
import Link from 'next/link';

export const Header: React.FC = () => {
  return (
    <>
      {/* Offcanvas Menu */}
      <div className="offcanvas-menu-overlay"></div>
      <div className="offcanvas-menu-wrapper">
        <div className="offcanvas__close">+</div>
        <ul className="offcanvas__widget">
          <li><span className="icon_search search-switch"></span></li>
          <li>
            <Link href="#"><span className="icon_heart_alt"></span>
              <div className="tip">2</div>
            </Link>
          </li>
          <li>
            <Link href="#"><span className="icon_bag_alt"></span>
              <div className="tip">2</div>
            </Link>
          </li>
        </ul>
        <div className="offcanvas__logo">
          <Link href="/"><img src="/img/logo.png" alt="Logo" /></Link>
        </div>
        <div id="mobile-menu-wrap"></div>
        <div className="offcanvas__auth">
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
        </div>
      </div>

      {/* Header Section */}
      <header className="header">
        <div className="container-fluid">
          <div className="row">
            <div className="col-xl-3 col-lg-2">
              <div className="header__logo">
                <Link href="/"><img src="/img/logo.png" alt="Logo" /></Link>
              </div>
            </div>
            <div className="col-xl-6 col-lg-7">
              <nav className="header__menu">
                <ul>
                  <li className="active"><Link href="/">Home</Link></li>
                  <li><Link href="/shop?category=women">Women's</Link></li>
                  <li><Link href="/shop?category=men">Men's</Link></li>
                  <li><Link href="/shop">Shop</Link></li>
                  <li><Link href="#">Pages</Link>
                    <ul className="dropdown">
                      <li><Link href="/product/1">Product Details</Link></li>
                      <li><Link href="/cart">Shop Cart</Link></li>
                      <li><Link href="/checkout">Checkout</Link></li>
                      <li><Link href="/blog/1">Blog Details</Link></li>
                    </ul>
                  </li>
                  <li><Link href="/blog">Blog</Link></li>
                  <li><Link href="/contact">Contact</Link></li>
                </ul>
              </nav>
            </div>
            <div className="col-lg-3">
              <div className="header__right">
                <div className="header__right__auth">
                  <Link href="/login">Login</Link>
                  <Link href="/register">Register</Link>
                </div>
                <ul className="header__right__widget">
                  <li><span className="icon_search search-switch"></span></li>
                  <li>
                    <Link href="#"><span className="icon_heart_alt"></span>
                      <div className="tip">2</div>
                    </Link>
                  </li>
                  <li>
                    <Link href="/cart"><span className="icon_bag_alt"></span>
                      <div className="tip">2</div>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="canvas__open">
            <i className="fa fa-bars"></i>
          </div>
        </div>
      </header>
    </>
  );
};
