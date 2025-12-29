import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Shield, Edit, Save, X,
  Lock, Calendar, CheckCircle, AlertCircle,
  Package, Users, Truck, FileText, MessageSquare
} from 'lucide-react';
import './AdminProfilePage.css';

const AdminProfilePage = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // بيانات التعديل
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // جلب بيانات المشرف من جدول admins
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('admin_id', user.id)
        .single();

      if (adminError) {
        // إذا لم يكن موجوداً في admins، قد يكون في profiles
        // يمكنك إضافة منطق التحويل هنا إذا أردت
        console.error('المستخدم ليس مشرفاً:', adminError);
        navigate('/unauthorized');
        return;
      }

      setAdmin(adminData);
      setFormData({
        full_name: adminData.full_name || '',
        username: adminData.username || '',
        phone: adminData.phone || '',
        email: adminData.email || user.email || ''
      });
    } catch (error: any) {
      console.error('Error fetching admin profile:', error);
      setError('حدث خطأ في تحميل بيانات الملف الشخصي');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('يجب تسجيل الدخول أولاً');
        return;
      }

      // تحديث البيانات في جدول admins
      const { error: updateError } = await supabase
        .from('admins')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('admin_id', user.id);

      if (updateError) throw updateError;

      setSuccess('تم تحديث البيانات بنجاح');
      setEditing(false);
      fetchAdminProfile(); // تحديث البيانات
    } catch (error: any) {
      console.error('Error updating admin profile:', error);
      setError('حدث خطأ في تحديث البيانات');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const newPassword = prompt('أدخل كلمة المرور الجديدة:');
    if (!newPassword) return;

    const confirmPassword = prompt('تأكيد كلمة المرور الجديدة:');
    if (newPassword !== confirmPassword) {
      alert('كلمتا المرور غير متطابقتين');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      alert('تم تغيير كلمة المرور بنجاح');
    } catch (error: any) {
      console.error('Error changing password:', error);
      alert('حدث خطأ في تغيير كلمة المرور');
    }
  };

  const getRoleArabicName = (role: string) => {
    const roles: { [key: string]: string } = {
      'super_admin': 'مدير النظام',
      'admin': 'مشرف رئيسي',
      'support_supervisor': 'مشرف دعم المباشر',
      'orders_supervisor': 'مشرف الطلبات',
      'customers_supervisor': 'مشرف العملاء',
      'drivers_supervisor': 'مشرف السائقين',
      'invoices_supervisor': 'مشرف الفواتير'
    };
    return roles[role] || role;
  };

  const getRoleIcon = (role: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      'super_admin': <Shield className="admin-role-icon super-admin" />,
      'admin': <Shield className="admin-role-icon admin" />,
      'support_supervisor': <MessageSquare className="admin-role-icon support" />,
      'orders_supervisor': <Package className="admin-role-icon orders" />,
      'customers_supervisor': <Users className="admin-role-icon customers" />,
      'drivers_supervisor': <Truck className="admin-role-icon drivers" />,
      'invoices_supervisor': <FileText className="admin-role-icon invoices" />
    };
    return icons[role] || <Shield className="admin-role-icon" />;
  };

  if (loading) {
    return (
      <div className="admin-profile-loading">
        <div className="admin-profile-spinner"></div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="admin-profile-error">
        <AlertCircle size={48} />
        <p>لم يتم العثور على بيانات المشرف</p>
        <button 
          className="admin-back-btn"
          onClick={() => navigate('/')}
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    );
  }

  // استخراج الحروف الأولى من الاسم
  const getInitials = (fullName: string) => {
    if (!fullName) return 'A';
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return fullName.charAt(0).toUpperCase();
  };

  return (
    <div className="admin-profile-page">
      <div className="admin-profile-header">
        <h1>
          <User size={28} />
          الملف الشخصي للمشرف
        </h1>
        <button 
          className="admin-back-btn"
          onClick={() => navigate(-1)}
        >
          رجوع
        </button>
      </div>

      <div className="admin-profile-container">
        <div className="admin-profile-card">
          <div className="admin-profile-avatar">
            {admin.avatar_url ? (
              <img 
                src={admin.avatar_url} 
                alt={admin.full_name}
                className="admin-avatar-image"
              />
            ) : (
              <div className="admin-avatar-initials">
                {getInitials(admin.full_name)}
              </div>
            )}
            <div className="admin-role-badge">
              {getRoleIcon(admin.role)}
              <span>{getRoleArabicName(admin.role)}</span>
            </div>
          </div>

          <div className="admin-profile-info">
            {error && (
              <div className="admin-error-message">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="admin-success-message">
                <CheckCircle size={18} />
                {success}
              </div>
            )}

            <div className="admin-info-section">
              <h3>
                <User size={20} />
                المعلومات الشخصية
              </h3>

              {editing ? (
                <div className="admin-edit-form">
                  <div className="admin-form-group">
                    <label>الاسم الكامل *</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="admin-form-input"
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>اسم المستخدم</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="admin-form-input"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      <Phone size={16} />
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="admin-form-input"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      <Mail size={16} />
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="admin-form-input"
                    />
                    <small className="admin-form-note">
                      لا يمكن تغيير البريد الإلكتروني
                    </small>
                  </div>

                  <div className="admin-form-actions">
                    <button
                      className="admin-btn admin-btn-secondary"
                      onClick={() => setEditing(false)}
                      disabled={saving}
                    >
                      <X size={18} />
                      إلغاء
                    </button>
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <div className="admin-spinner-small"></div>
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          حفظ التغييرات
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="admin-info-display">
                  <div className="admin-info-grid">
                    <div className="admin-info-item">
                      <span className="admin-info-label">الاسم الكامل:</span>
                      <span className="admin-info-value">
                        {admin.full_name}
                      </span>
                    </div>
                    <div className="admin-info-item">
                      <span className="admin-info-label">اسم المستخدم:</span>
                      <span className="admin-info-value">
                        {admin.username || 'غير محدد'}
                      </span>
                    </div>
                    <div className="admin-info-item">
                      <span className="admin-info-label">البريد الإلكتروني:</span>
                      <span className="admin-info-value">
                        <Mail size={16} />
                        {admin.email}
                      </span>
                    </div>
                    <div className="admin-info-item">
                      <span className="admin-info-label">رقم الهاتف:</span>
                      <span className="admin-info-value">
                        <Phone size={16} />
                        {admin.phone || 'غير محدد'}
                      </span>
                    </div>
                    <div className="admin-info-item">
                      <span className="admin-info-label">الدور:</span>
                      <span className="admin-info-value admin-role-display">
                        {getRoleIcon(admin.role)}
                        {getRoleArabicName(admin.role)}
                      </span>
                    </div>
                    <div className="admin-info-item">
                      <span className="admin-info-label">تاريخ التسجيل:</span>
                      <span className="admin-info-value">
                        <Calendar size={16} />
                        {new Date(admin.created_at).toLocaleDateString('ar-IQ')}
                      </span>
                    </div>
                    <div className="admin-info-item">
                      <span className="admin-info-label">آخر تحديث:</span>
                      <span className="admin-info-value">
                        <Calendar size={16} />
                        {admin.updated_at ? 
                          new Date(admin.updated_at).toLocaleDateString('ar-IQ') : 
                          'غير محدد'}
                      </span>
                    </div>
                    <div className="admin-info-item">
                      <span className="admin-info-label">الحالة:</span>
                      <span className={`admin-status ${admin.is_active ? 'active' : 'inactive'}`}>
                        {admin.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                  </div>

                  <div className="admin-actions">
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={() => setEditing(true)}
                    >
                      <Edit size={18} />
                      تعديل البيانات
                    </button>
                    <button
                      className="admin-btn admin-btn-outline"
                      onClick={handleChangePassword}
                    >
                      <Lock size={18} />
                      تغيير كلمة المرور
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-info-section">
              <h3>
                <Shield size={20} />
                الصلاحيات والوصول
              </h3>
              <div className="admin-permissions-list">
                {admin.permissions && admin.permissions.length > 0 ? (
                  admin.permissions.map((permission: string, index: number) => (
                    <div key={index} className="admin-permission-item">
                      <CheckCircle size={16} />
                      <span>{permission}</span>
                    </div>
                  ))
                ) : (
                  <p className="admin-no-permissions">لا توجد صلاحيات محددة</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfilePage;