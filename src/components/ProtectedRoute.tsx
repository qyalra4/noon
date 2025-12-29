import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        // التحقق من الجلسة الحالية
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // التحقق من وجود المستخدم في جدول admin
          const { data: adminData } = await supabase
            .from('admin')
            .select('admin_id')
            .eq('admin_id', session.user.id)
            .maybeSingle();

          if (isMounted) {
            if (adminData) {
              setAuthState('authenticated');
            } else {
              setAuthState('unauthenticated');
            }
          }
        } else {
          if (isMounted) {
            setAuthState('unauthenticated');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (isMounted) {
          setAuthState('unauthenticated');
        }
      }
    };

    checkAuth();

    // الاستماع لتغيرات حالة المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          const { data: adminData } = await supabase
            .from('admin')
            .select('admin_id')
            .eq('admin_id', session.user.id)
            .maybeSingle();

          if (adminData) {
            setAuthState('authenticated');
          } else {
            setAuthState('unauthenticated');
          }
        } else {
          setAuthState('unauthenticated');
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (authState === 'checking') {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>جاري التحقق من الصلاحيات...</p>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #f8f9fa;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;