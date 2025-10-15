import React from 'react';
import { Link } from 'react-router-dom';

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
            <Link to="#"><span className="icon_heart_alt"></span>
              <div className="tip">2</div>
            </Link>
          </li>
          <li>
            <Link to="#"><span className="icon_bag_alt"></span>
              <div className="tip">2</div>
            </Link>
          </li>
        </ul>
        <div className="offcanvas__logo">
          <Link to="/"><img src="/img/logo.png" alt="Logo" /></Link>
        </div>
        <div id="mobile-menu-wrap"></div>
        <div className="offcanvas__auth">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </div>

      {/* Header Section */}
      <header className="header">
        <div className="container-fluid">
          <div className="row">
            <div className="col-xl-3 col-lg-2">
              <div className="header__logo">
                <Link to="/"><img src="/img/logo.png" alt="Logo" /></Link>
              </div>
            </div>
            <div className="col-xl-6 col-lg-7">
              <nav className="header__menu">
                <ul>
                  <li className="active"><Link to="/">Home</Link></li>
                  <li><Link to="/shop?category=women">Women's</Link></li>
                  <li><Link to="/shop?category=men">Men's</Link></li>
                  <li><Link to="/shop">Shop</Link></li>
                  <li><Link to="#">Pages</Link>
                    <ul className="dropdown">
                      <li><Link to="/product/1">Product Details</Link></li>
                      <li><Link to="/cart">Shop Cart</Link></li>
                      <li><Link to="/checkout">Checkout</Link></li>
                      <li><Link to="/blog/1">Blog Details</Link></li>
                    </ul>
                  </li>
                  <li><Link to="/blog">Blog</Link></li>
                  <li><Link to="/contact">Contact</Link></li>
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
                    <Link to="#"><span className="icon_heart_alt"></span>
                      <div className="tip">2</div>
                    </Link>
                  </li>
                  <li>
                    <Link to="/cart"><span className="icon_bag_alt"></span>
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
