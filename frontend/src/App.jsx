import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './components/guards/AuthGuard';
import RoleGuard from './components/guards/RoleGuard';
import SuperAdminGuard from './components/guards/SuperAdminGuard';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import OTPVerify from './pages/auth/OTPVerify';
import ForgotPassword from './pages/auth/ForgotPassword';

// Public
import Home from './pages/public/Home';
import Explore from './pages/public/Explore';
import ProductDetail from './pages/public/ProductDetail';
import VendorShopPage from './pages/public/VendorShop';

// Client
import Cart from './pages/client/Cart';
import Checkout from './pages/client/Checkout';
import Orders from './pages/client/Orders';
import OrderDetail from './pages/client/OrderDetail';
import Profile from './pages/client/Profile';
import Wallet from './pages/client/Wallet';
import Referral from './pages/client/Referral';

// Payment
import PaymentReturn from './pages/payment/PaymentReturn';
import PaymentDemo from './pages/payment/PaymentDemo';

// Vendor
import VendorDashboard from './pages/vendor/Dashboard';
import VendorProducts from './pages/vendor/Products';
import VendorOrders from './pages/vendor/VendorOrders';
import VendorWallet from './pages/vendor/VendorWallet';
import VendorShopSettings from './pages/vendor/Shop';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminVendors from './pages/admin/Vendors';
import AdminProducts from './pages/admin/Products';
import AdminSupport from './pages/admin/Support';
import AdminFinances from './pages/admin/Finances';
import AdminLogistics from './pages/admin/Logistics';
import AdminAnalytics from './pages/admin/Analytics';

// Super Admin
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import SuperAdminAdmins from './pages/superadmin/Admins';
import SuperAdminLogs from './pages/superadmin/Logs';
import SuperAdminClients from './pages/superadmin/Clients';
import SuperAdminConfig from './pages/superadmin/Config';

const ADMIN_ROLES = [
  'admin_support', 'admin_finances', 'admin_vendeurs',
  'admin_contenu', 'admin_logistique', 'admin_marketing', 'agent_relais',
];

function AccessDenied() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <div className="font-syne text-2xl font-bold mb-2">Accès refusé</div>
        <div className="text-white/40 text-sm mb-6">Vous n'avez pas les droits nécessaires pour accéder à cette page.</div>
        <a href="/" className="btn-primary inline-block">← Retour à l'accueil</a>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="text-center">
        <div className="font-syne text-8xl font-extrabold text-white/5 mb-4">404</div>
        <div className="font-syne text-2xl font-bold mb-2">Page introuvable</div>
        <div className="text-white/40 text-sm mb-6">Cette page n'existe pas ou a été déplacée.</div>
        <a href="/" className="btn-primary inline-block">← Retour à l'accueil</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ─── Public ─── */}
        <Route path="/" element={<Home/>}/>
        <Route path="/explorer" element={<Explore/>}/>
        <Route path="/produit/:id" element={<ProductDetail/>}/>
        <Route path="/boutique/:id" element={<VendorShopPage/>}/>

        {/* ─── Auth ─── */}
        <Route path="/connexion" element={<Login/>}/>
        <Route path="/inscription" element={<Register/>}/>
        <Route path="/verifier-otp" element={<OTPVerify/>}/>
        <Route path="/mot-de-passe-oublie" element={<ForgotPassword/>}/>

        {/* ─── Client (authenticated) ─── */}
        <Route path="/panier" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['client', 'vendeur']}>
              <Cart/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/checkout" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['client', 'vendeur']}>
              <Checkout/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/commandes" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['client']}>
              <Orders/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/commandes/:id" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['client']}>
              <OrderDetail/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/profil" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['client', 'vendeur']}>
              <Profile/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/mon-wallet" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['client']}>
              <Wallet/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/parrainage" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['client', 'vendeur']}>
              <Referral/>
            </RoleGuard>
          </AuthGuard>
        }/>

        {/* ─── Vendor ─── */}
        <Route path="/vendeur" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['vendeur']}>
              <VendorDashboard/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/vendeur/produits" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['vendeur']}>
              <VendorProducts/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/vendeur/commandes" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['vendeur']}>
              <VendorOrders/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/vendeur/wallet" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['vendeur']}>
              <VendorWallet/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/vendeur/boutique" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['vendeur']}>
              <VendorShopSettings/>
            </RoleGuard>
          </AuthGuard>
        }/>

        {/* ─── Admin ─── */}
        <Route path="/admin" element={
          <AuthGuard>
            <RoleGuard allowedRoles={ADMIN_ROLES}>
              <AdminDashboard/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/admin/vendeurs" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['admin_vendeurs']}>
              <AdminVendors/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/admin/produits" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['admin_contenu']}>
              <AdminProducts/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/admin/tickets" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['admin_support']}>
              <AdminSupport/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/admin/litiges" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['admin_support']}>
              <AdminSupport/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/admin/retraits" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['admin_finances']}>
              <AdminFinances/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/admin/finances" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['admin_finances']}>
              <AdminFinances/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/admin/commandes" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['admin_logistique', 'agent_relais']}>
              <AdminLogistics/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/admin/relais" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['admin_logistique']}>
              <AdminLogistics/>
            </RoleGuard>
          </AuthGuard>
        }/>
        <Route path="/admin/analytics" element={
          <AuthGuard>
            <RoleGuard allowedRoles={['admin_marketing']}>
              <AdminAnalytics/>
            </RoleGuard>
          </AuthGuard>
        }/>

        {/* ─── Super Admin (completely isolated) ─── */}
        <Route path="/superadmin" element={
          <AuthGuard>
            <SuperAdminGuard>
              <SuperAdminDashboard/>
            </SuperAdminGuard>
          </AuthGuard>
        }/>
        <Route path="/superadmin/admins" element={
          <AuthGuard>
            <SuperAdminGuard>
              <SuperAdminAdmins/>
            </SuperAdminGuard>
          </AuthGuard>
        }/>
        <Route path="/superadmin/logs" element={
          <AuthGuard>
            <SuperAdminGuard>
              <SuperAdminLogs/>
            </SuperAdminGuard>
          </AuthGuard>
        }/>
        <Route path="/superadmin/clients" element={
          <AuthGuard>
            <SuperAdminGuard>
              <SuperAdminClients/>
            </SuperAdminGuard>
          </AuthGuard>
        }/>
        <Route path="/superadmin/config" element={
          <AuthGuard>
            <SuperAdminGuard>
              <SuperAdminConfig/>
            </SuperAdminGuard>
          </AuthGuard>
        }/>

        {/* ─── Payment ─── */}
        <Route path="/paiement/retour" element={
          <AuthGuard>
            <PaymentReturn/>
          </AuthGuard>
        }/>
        <Route path="/paiement/demo" element={<PaymentDemo/>}/>

        {/* ─── Utility ─── */}
        <Route path="/acces-refuse" element={<AccessDenied/>}/>
        <Route path="*" element={<NotFound/>}/>
      </Routes>
    </BrowserRouter>
  );
}
