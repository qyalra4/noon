// FILE: src/components/Header.tsx
import React, { useState, useEffect } from 'react';
import { LogOut, User, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import './Header.css';

interface AdminData {
  admin_id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
}

export default function Header() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // جلب بيانات المسؤول الحالي
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        
        // الحصول على المستخدم الحالي من Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        // جلب بيانات المسؤول من جدول admins
        const { data: adminData, error } = await supabase
          .from('admins')
          .select('*')
          .eq('admin_id', user.id)
          .single();

        if (error) {
          console.error('خطأ في جلب بيانات المسؤول:', error);
          // استخدام بيانات افتراضية إذا لم توجد في قاعدة البيانات
          setAdmin({
            admin_id: user.id,
            full_name: user.user_metadata?.full_name || 'مسؤول',
            username: user.user_metadata?.username || 'admin',
            email: user.email || 'admin@example.com',
            role: 'admin',
            avatar_url: user.user_metadata?.avatar_url || '/default-avatar.png'
          });
        } else {
          setAdmin(adminData);
        }
      } catch (error) {
        console.error('خطأ في تحميل بيانات المسؤول:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();

    // الاستماع لتغييرات حالة المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/login');
      } else if (session?.user) {
        fetchAdminData();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // معالجة تسجيل الخروج
  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await supabase.auth.signOut();
      setShowLogoutModal(false);
      navigate('/login');
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      alert('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setLogoutLoading(false);
    }
  };

  // الانتقال إلى صفحة الملف الشخصي
  const goToProfile = () => {
    navigate('/profile');
  };

  // الانتقال إلى صفحة الإعدادات
  const goToSettings = () => {
    navigate('/settings');
  };

  if (loading) {
    return (
      <header className="admin-header">
        <div className="admin__header-left">
          <div className="admin-header__user-info">
            <div className="admin-header__avatar-placeholder"></div>
            <div className="admin__brand-text">
              <div className="admin__brand-name">لوحة التحكم</div>
              <div className="admin__brand-sub">جاري التحميل...</div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="admin-header">
        <div className="admin__header-left">
          <div className="admin-header__user-info">
            <div className="admin-header__logo">
              <img 
                src="/logo192.png" 
                alt="شعار النظام" 
                className="admin-header__logo-img" 
                onClick={() => navigate('/')}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div className="admin__brand-text">
              <div className="admin__brand-name">لوحة التحكم</div>
              <div className="admin__brand-sub">نظام إدارة متكامل</div>
            </div>
          </div>
        </div>

        <div className="admin-header__right">
          <div className="admin-header__actions">
            <button 
              className="admin-header__action-btn" 
              title="الإعدادات"
              onClick={goToSettings}
            >
              <Settings size={18} />
            </button>
            
            <div className="admin-header__user-info">
              <div className="admin-header__avatar" onClick={goToProfile} style={{ cursor: 'pointer' }}>
                {admin?.avatar_url ? (
                  <img 
                    src={admin.avatar_url} 
                    className="admin__admin-avatar" 
                    alt="صورة المسؤول" 
                  />
                ) : (
                  <div className="admin__avatar-initials">
                    {admin?.full_name?.charAt(0) || 'م'}
                  </div>
                )}
              </div>
              
              <div className="admin-text" onClick={goToProfile} style={{ cursor: 'pointer' }}>
                <div className="admin__admin-name">
                  {admin?.full_name || 'مسؤول'}
                </div>
                <div className="admin__admin-role">
                  {admin?.role === 'super_admin' ? 'مدير عام' : 
                   admin?.role === 'admin' ? 'مسؤول' : 
                   admin?.role || 'مستخدم'}
                </div>
              </div>
            </div>

            <button 
              className="admin__btn-ghost" 
              title="تسجيل خروج"
              onClick={() => setShowLogoutModal(true)}
            >
              <LogOut size={16} />
              <span className="admin__btn-text">تسجيل خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* مودال تأكيد تسجيل الخروج */}
      {showLogoutModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal__header">
              <h3 className="admin-modal__title">تأكيد تسجيل الخروج</h3>
              <button 
                className="admin-modal__close"
                onClick={() => setShowLogoutModal(false)}
                disabled={logoutLoading}
              >
                &times;
              </button>
            </div>
            
            <div className="admin-modal__body">
              <div className="admin-modal__icon">
                <LogOut size={48} />
              </div>
              <p className="admin-modal__message">
                هل أنت متأكد من رغبتك في تسجيل الخروج؟
              </p>
              <p className="admin-modal__submessage">
                سيتم إغلاق جلسة العمل الحالية وسيُطلب منك إعادة تسجيل الدخول للوصول إلى لوحة التحكم.
              </p>
            </div>
            
            <div className="admin-modal__footer">
              <button
                className="admin-modal__btn admin-modal__btn-cancel"
                onClick={() => setShowLogoutModal(false)}
                disabled={logoutLoading}
              >
                إلغاء
              </button>
              <button
                className="admin-modal__btn admin-modal__btn-confirm"
                onClick={handleLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <>
                    <span className="admin-modal__spinner"></span>
                    جاري تسجيل الخروج...
                  </>
                ) : (
                  'تسجيل الخروج'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}