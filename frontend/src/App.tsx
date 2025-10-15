import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ChangePassword from "./pages/Account/ChangePassword";
import CreateUser from "./pages/Account/CreateUser";
import MlmTree from "./pages/Account/MlmTree";
import LandingPage from "./pages/LandingPage";
import CartCheckout from "./pages/CartCheckout";
import Account from "./pages/Account";
import Footer from "./components/footer/Footer";
import ProductList from "./pages/Products/ProductList";
import AddProduct from "./pages/Products/AddProduct";
import EditProduct from "./pages/Products/EditProduct";
import ProductDetails from "./pages/Products/ProductDetails";
import CategoryList from "./pages/Products/CategoryList";
import CommissionDashboard from "./pages/Commission/CommissionDashboard";
import AdminWithdrawals from "./pages/Wallet/AdminWithdrawals";
import WalletManagement from "./pages/Wallet/WalletManagement";
import { ToastProvider } from "./context/ToastContext";
import OrdersManagement from "./pages/Orders/OrdersManagement";
import Settings from "./pages/Settings/Settings";
import UserManagement from "./pages/Users/UserManagement";
import Payment from "./pages/Payment";

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdminRoute) {
      document.body.classList.add("font-outfit-default");
      document.body.classList.remove("font-fz-poppins");
    } else {
      document.body.classList.add("font-fz-poppins");
      document.body.classList.remove("font-outfit-default");
    }
  }, [isAdminRoute]);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/cart" element={<CartCheckout />} />
        <Route path="/payment/:orderId" element={<Payment />} />
        <Route path="/account" element={<Account />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Home />} />
          <Route path="profile" element={<UserProfiles />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="blank" element={<Blank />} />
          <Route path="form-elements" element={<FormElements />} />
          <Route path="basic-tables" element={<BasicTables />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="avatars" element={<Avatars />} />
          <Route path="badge" element={<Badges />} />
          <Route path="buttons" element={<Buttons />} />
          <Route path="images" element={<Images />} />
          <Route path="videos" element={<Videos />} />
          <Route path="products/list" element={<ProductList />} />
          <Route path="products/add" element={<AddProduct />} />
          <Route path="products/:id" element={<ProductDetails />} />
          <Route path="products/:id/edit" element={<EditProduct />} />
          <Route path="products/categories" element={<CategoryList />} />
          <Route path="orders" element={<OrdersManagement />} />
          <Route path="line-chart" element={<LineChart />} />
          <Route path="bar-chart" element={<BarChart />} />
          <Route path="account/change-password" element={<ChangePassword />} />
          <Route path="account/create-user" element={<CreateUser />} />
          <Route path="account/mlm-tree" element={<MlmTree />} />

          {/* Wallet & Commission Routes */}
          <Route path="wallet-management" element={<WalletManagement />} />
          <Route path="withdrawals" element={<AdminWithdrawals />} />
          
          {/* User Management Route */}
          <Route path="users" element={<UserManagement />} />
          
          {/* Settings Route */}
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAdminRoute && <Footer />}
    </>
  );
};

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </Router>
  );
}
