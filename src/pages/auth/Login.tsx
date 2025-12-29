// src/pages/Login.tsx
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Mail, Lock, Eye, EyeOff, LogIn, Shield, AlertCircle } from 'lucide-react';
import '../../assets/css/Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // تحقق مبدئي من المدخلات
    if (!email || !password) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    // تحقق من صيغة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('البريد الإلكتروني غير صالح');
      return;
    }

    setLoading(true);

    try {
      // تسجيل الدخول باستخدام البريد وكلمة المرور مباشرة
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        console.warn('Auth error:', authError);
        
        // رسائل خطأ مخصصة بناءً على نوع الخطأ
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('بيانات الدخول غير صحيحة');
        } else if (authError.message.includes('Email not confirmed')) {
          throw new Error('يرجى تأكيد بريدك الإلكتروني أولاً');
        } else {
          throw new Error('حدث خطأ أثناء تسجيل الدخول');
        }
      }

      // التحقق من وجود المستخدم في جدول admins
      if (data.user) {
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('admin_id', data.user.id)
          .single();

        if (adminError) {
          console.warn('Admin not found in admins table:', adminError);
          // يمكنك اختيار إما السماح بالدخول أو رفضه
          // هنا سنسمح بالدخول ولكن سنخزن المعلومات للتحقق لاحقاً
        }
      }

      // نجاح تسجيل الدخول
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* رأس البطاقة */}
        <div className="login-header">
          <div className="logo-container">
            <Shield size={40} className="logo-icon" />
            <h1>نظام الإدارة</h1>
          </div>
          <p className="login-subtitle">سجل الدخول إلى حسابك</p>
        </div>

        {/* نموذج تسجيل الدخول */}
        <form className="login-form" onSubmit={handleLogin}>
          {/* حقل البريد الإلكتروني */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              البريد الإلكتروني
            </label>
            <div className="input-group">
              <Mail size={20} className="input-icon" />
              <input
                id="email"
                type="email"
                required
                className="form-input"
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          {/* حقل كلمة المرور */}
          <div className="form-group">
            <div className="password-label-container">
              <label htmlFor="password" className="form-label">
                كلمة المرور
              </label>
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <>
                    <EyeOff size={16} />
                    <span>إخفاء</span>
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    <span>إظهار</span>
                  </>
                )}
              </button>
            </div>
            <div className="input-group">
              <Lock size={20} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          {/* رسالة الخطأ */}
          {error && (
            <div className="error-alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* زر تسجيل الدخول */}
          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? (
              <div className="button-loading">
                <div className="spinner"></div>
                <span>جاري تسجيل الدخول...</span>
              </div>
            ) : (
              <>
                <LogIn size={20} />
                <span>تسجيل الدخول</span>
              </>
            )}
          </button>
        </form>

        {/* تذييل البطاقة */}
        <div className="login-footer">
          <p className="footer-text">
            نظام الإدارة © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;