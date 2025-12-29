import React from 'react';
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';


import Users from './pages/users/Users';
import UserDetails from './pages/users/UserDetails';
import AddUser from './pages/users/AddUser';
import EditUser from './pages/users/EditUser';
import UserProfile from './pages/users/UserProfile';

import AreasManagement from './pages/areas/AreasManagement';

import SupportPage from './pages/support/SupportPage';
import DriverSupportPage from './pages/support/DriverSupportPage';



import InvoicesPage from './pages/invoices/InvoicesPage';
import CreateInvoicePage from './pages/invoices/CreateInvoicePage';

import AdminProfilePage from './pages/admin/AdminProfilePage';
import AdminsListPage from './pages/admin/AdminsListPage';
import AddAdminPage from './pages/admin/AddAdminPage';

import OrdersList from './pages/orders/Orders';
import CreateOrderPage from './pages/orders/CreateOrderPage';
import OrderDetails from './pages/orders/OrderDetailsPage';

import DriversPage from './pages/drivers/DriversPage';
import AddDriverPage from './pages/drivers/AddDriverPage';
import DriverDetailsPage from './pages/drivers/DriverDetailsPage';




import Layout from './components/Layout/Layout';
// import ProtectedRoute from './components/ProtectedRoute';

import './App.css';

function App() {
 const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التحقق من حالة المصادقة
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* الصفحات العامة */}
          <Route 
            path="/login" 
            element={!session ? <Login /> : <Navigate to="/" />} 
          />
         

          {/* الصفحات المحمية */}
           <Route 
            path="/" 
            element={
             
                <Layout>
                  <Dashboard />
                </Layout>
            } 
          /> 

          <Route 
            path="/areas" 
            element={
              <Layout>
                <AreasManagement />
              </Layout>
            } 
          />
          
             <Route 
                path="/users" 
                element={
                  <Layout>
                    <Users />
                  </Layout>
                } 
              />

              <Route 
                path="/users/add" 
                element={
                  <Layout>
                    <AddUser />
                  </Layout>
                } 
              />

              <Route 
                path="/users/:userId" 
                element={
                  <Layout>
                    <UserDetails />
                  </Layout>
                } 
              />

              <Route 
                path="/users/edit/:userId" 
                element={
                  <Layout>
                    <EditUser />
                  </Layout>
                } 
              />

              <Route 
                path="/profile" 
                element={
                  <Layout>
                    <AdminProfilePage />
                  </Layout>
                } 
              />
              <Route 
                path="/AllAdmins" 
                element={
                  <Layout>
                    <AdminsListPage />
                  </Layout>
                } 
              />
              <Route 
                path="/admin/add" 
                element={
                  <Layout>
                    <AddAdminPage />
                  </Layout>
                } 
              />

              <Route 
                path="/drivers" 
                element={
                  <Layout>
                    <DriversPage />
                  </Layout>
                } 
              />

              <Route 
                path="/drivers/add" 
                element={
                  <Layout>
                    <AddDriverPage />
                  </Layout>
                } 
              />

              <Route 
                path="/drivers/:id" 
                element={
                  <Layout>
                    <DriverDetailsPage />
                  </Layout>
                } 
              />
{/* 
<Route 
  path="/drivers/edit/:id" 
  element={
    <Layout>
    </Layout>
  } 
/>

<Route 
  path="/drivers/invoices" 
  element={
    <Layout>
    </Layout>
  } 
/> */}


              <Route 
  path="/orders" 
  element={
    <Layout>
      <OrdersList />
    </Layout>
  } 
/>
{/* <Route 
  path="/orders/create" 
  element={
    <Layout>
      <CreateOrder />
    </Layout>
  } 
/> */}
<Route 
  path="/orders/:id" 
  element={
    <Layout>
      <OrderDetails />
    </Layout>
  } 
/>

            
            <Route 
  path="/invoices" 
  element={
    <Layout>
      <InvoicesPage />
    </Layout>
  } 
/>
<Route 
  path="/invoices/new" 
  element={
    <Layout>
      <CreateInvoicePage />
    </Layout>
  } 
/>

            <Route 
              path="/support" 
              element={
                <Layout>
                  <SupportPage />
                </Layout>
              } 
            />

            <Route 
              path="/support-drivers" 
              element={
                <Layout>
                  <DriverSupportPage />
                </Layout>
              } 
            />

            {/* <Route 
              path="" 
              element={
                  <Layout>
                    <Types />
                  </Layout>
              } 
            />
            <Route 
              path="" 
              element={
                  <Layout>
                    <AddType />
                  </Layout>
              } 
            />
            <Route 
              path="" 
              element={
                  <Layout>
                    <EditType />
                  </Layout>
              } 
            /> */}

            <Route 
  path="/orders/new" 
  element={
    <Layout>
      <CreateOrderPage />
    </Layout>
  } 
/>

          {/* إعادة التوجيه */}
          <Route 
            path="/" 
            element={<Navigate to={session ? "/" : "/login"} />} 
          />
          
          {/* صفحة 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;