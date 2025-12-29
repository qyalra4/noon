import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Shield, User, Mail, Phone, Lock,
  Save, ArrowLeft, CheckCircle, AlertCircle,
  Package, Users, Truck, FileText, MessageSquare
} from 'lucide-react';
import './AddAdminPage.css';

// تعريف الأدوار والصلاحيات
const ADMIN_ROLES = [
  {
    id: 'super_admin',
    name: 'مدير النظام',
    description: 'صلاحيات كاملة على النظام - يمكنه إدارة جميع المشرفين',
    icon: Shield,
    permissions: [
      'إدارة جميع المشرفين',
      'إعدادات النظام الكاملة',
      'التقارير والإحصائيات',
      'إدارة جميع الأقسام',
      'صلاحيات غير محدودة'
    ]
  },
  {
    id: 'admin',
    name: 'مشرف رئيسي',
    description: 'صلاحيات إدارية واسعة على النظام',
    icon: Shield,
    permissions: [
      'إدارة المشرفين',
      'إعدادات النظام',
      'عرض التقارير',
      'إدارة الطلبات والعملاء'
    ]
  },
  {
    id: 'support_supervisor',
    name: 'مشرف دعم المباشر',
    description: 'إدارة محادثات الدعم الفوري مع العملاء',
    icon: MessageSquare,
    permissions: [
      'إدارة محادثات الدعم',
      'الرد على استفسارات العملاء',
      'متابعة الشكاوى',
      'تقرير مشاكل النظام'
    ]
  },
  {
    id: 'orders_supervisor',
    name: 'مشرف الطلبات',
    description: 'إدارة جميع الطلبات وعمليات التتبع',
    icon: Package,
    permissions: [
      'عرض جميع الطلبات',
      'تحديث حالة الطلبات',
      'إدارة عمليات التوصيل',
      'تتبع السائقين',
      'تقرير الطلبات'
    ]
  },
  {
    id: 'customers_supervisor',
    name: 'مشرف العملاء',
    description: 'إدارة حسابات العملاء والخدمات',
    icon: Users,
    permissions: [
      'إدارة حسابات العملاء',
      'تعديل بيانات العملاء',
      'متابعة شكاوى العملاء',
      'إرسال إشعارات للعملاء',
      'تقرير العملاء'
    ]
  },
  {
    id: 'drivers_supervisor',
    name: 'مشرف السائقين',
    description: 'إدارة حسابات وتحركات السائقين',
    icon: Truck,
    permissions: [
      'إدارة حسابات السائقين',
      'تتبع حركة السائقين',
      'توزيع الطلبات',
      'تقييم أداء السائقين',
      'تقرير السائقين'
    ]
  },
  {
    id: 'invoices_supervisor',
    name: 'مشرف الفواتير',
    description: 'إدارة الفواتير والمدفوعات',
    icon: FileText,
    permissions: [
      'إنشاء وإدارة الفواتير',
      'متابعة المدفوعات',
      'إصدار تقارير مالية',
      'إدارة حسابات العملاء',
      'تقرير الفواتير'
    ]
  }
];

const AddAdminPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
    username: '',
    phone: '',
    role: 'support_supervisor' as string,
   
  });
//  is_active: true
  useEffect(() => {
    checkCurrentAdmin();
  }, []);

  const checkCurrentAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: admin } = await supabase
          .from('admins')
          .select('*')
          .eq('admin_id', user.id)
          .single();

        if (admin) {
          setCurrentAdmin(admin);
        }
      }
    } catch (error) {
      console.error('Error checking admin:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      setError('جميع الحقول المطلوبة يجب ملؤها');
      return false;
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return false;
    }

    if (formData.password !== formData.confirm_password) {
      setError('كلمتا المرور غير متطابقتين');
      return false;
    }

    // تحقق من صيغة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('صيغة البريد الإلكتروني غير صحيحة');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    // التحقق من صلاحية المشرف الحالي
    if (!currentAdmin || (currentAdmin.role !== 'super_admin' && currentAdmin.role !== 'admin')) {
      setError('ليس لديك صلاحية لإضافة مشرفين');
      return;
    }

    setLoading(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // 1. إنشاء مستخدم جديد في المصادقة
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            username: formData.username,
            phone: formData.phone,
            role: formData.role
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('البريد الإلكتروني مسجل مسبقاً في النظام');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('فشل في إنشاء حساب المستخدم');
      }

      // 2. إنشاء سجل المشرف في جدول admins
      const { error: adminError } = await supabase
        .from('admins')
        .insert([{
          admin_id: authData.user.id,
          email: formData.email,
          full_name: formData.full_name,
          username: formData.username,
          phone: formData.phone,
          role: formData.role,
          // is_active: formData.is_active,
          permissions: ADMIN_ROLES.find(r => r.id === formData.role)?.permissions || [],
          // created_by: currentUser?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (adminError) {
        // إذا فشل إنشاء المشرف، احذف المستخدم من المصادقة
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw adminError;
      }

      setSuccess('تم إضافة المشرف بنجاح! سيتم إرسال رابط تفعيل الحساب إلى بريده الإلكتروني.');
      setFormData({
        email: '',
        password: '',
        confirm_password: '',
        full_name: '',
        username: '',
        phone: '',
        role: 'support_supervisor',
        // is_active: true
      });

      // إرسال دعوة للمشرف الجديد (اختياري)
      try {
        await supabase.auth.admin.inviteUserByEmail(formData.email);
      } catch (inviteError) {
        console.warn('Could not send invitation email:', inviteError);
      }

    } catch (error: any) {
      console.error('Error adding admin:', error);
      setError(error.message || 'حدث خطأ في إضافة المشرف');
    } finally {
      setLoading(false);
    }
  };

  const getRolePermissions = (roleId: string) => {
    const role = ADMIN_ROLES.find(r => r.id === roleId);
    return role?.permissions || [];
  };

  return (
    <div className="add-admin-page">
      <div className="add-admin-header">
        <div className="add-admin-header-left">
          <h1>
            <UserPlus size={28} />
            إضافة مشرف جديد
          </h1>
          <p className="add-admin-subtitle">
            قم بإضافة مشرف جديد إلى النظام مع تحديد دوره وصلاحياته
          </p>
        </div>
        
        <button 
          className="add-admin-back-btn"
          onClick={() => navigate('/admins')}
        >
          <ArrowLeft size={18} />
          رجوع إلى القائمة
        </button>
      </div>

      <div className="add-admin-container">
        <form onSubmit={handleSubmit} className="add-admin-form">
          {error && (
            <div className="add-admin-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {success && (
            <div className="add-admin-success">
              <CheckCircle size={20} />
              {success}
            </div>
          )}

          {currentAdmin && (currentAdmin.role === 'super_admin' || currentAdmin.role === 'admin') ? (
            <>
              <div className="add-admin-form-sections">
                {/* المعلومات الأساسية */}
                <div className="add-admin-section">
                  <h3>
                    <User size={22} />
                    المعلومات الأساسية
                  </h3>
                  
                  <div className="add-admin-form-grid">
                    <div className="add-admin-form-group">
                      <label>البريد الإلكتروني *</label>
                      <div className="add-admin-input-with-icon">
                        <Mail size={18} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="example@domain.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="add-admin-form-group">
                      <label>كلمة المرور *</label>
                      <div className="add-admin-input-with-icon">
                        <Lock size={18} />
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="6 أحرف على الأقل"
                          minLength={6}
                          required
                        />
                      </div>
                    </div>

                    <div className="add-admin-form-group">
                      <label>تأكيد كلمة المرور *</label>
                      <div className="add-admin-input-with-icon">
                        <Lock size={18} />
                        <input
                          type="password"
                          name="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleInputChange}
                          placeholder="أعد إدخال كلمة المرور"
                          required
                        />
                      </div>
                    </div>

                    <div className="add-admin-form-group">
                      <label>الاسم الكامل *</label>
                      <div className="add-admin-input-with-icon">
                        <User size={18} />
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          placeholder="أدخل الاسم الكامل"
                          required
                        />
                      </div>
                    </div>

                    <div className="add-admin-form-group">
                      <label>اسم المستخدم</label>
                      <div className="add-admin-input-with-icon">
                        <User size={18} />
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          placeholder="أدخل اسم المستخدم (اختياري)"
                        />
                      </div>
                    </div>

                    <div className="add-admin-form-group">
                      <label>رقم الهاتف</label>
                      <div className="add-admin-input-with-icon">
                        <Phone size={18} />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="07XXXXXXXX (اختياري)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* اختيار الدور */}
                <div className="add-admin-section">
                  <h3>
                    <Shield size={22} />
                    اختيار الدور والصلاحيات
                  </h3>
                  
                  <div className="admin-roles-grid">
                    {ADMIN_ROLES
                      .filter(role => {
                        // المشرف الرئيسي يمكنه إضافة جميع الأدوار
                        if (currentAdmin.role === 'super_admin') return true;
                        // المشرف العادي يمكنه إضافة الأدوار الفرعية فقط
                        return role.id !== 'super_admin' && role.id !== 'admin';
                      })
                      .map(role => (
                      <div 
                        key={role.id}
                        className={`admin-role-card ${formData.role === role.id ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, role: role.id }))}
                      >
                        <div className="admin-role-icon">
                          <role.icon size={24} />
                        </div>
                        <div className="admin-role-content">
                          <h4>{role.name}</h4>
                          <p className="admin-role-description">{role.description}</p>
                          
                          <div className="admin-role-permissions">
                            {role.permissions.slice(0, 3).map((permission, index) => (
                              <div key={index} className="admin-role-permission">
                                <CheckCircle size={14} />
                                <span>{permission}</span>
                              </div>
                            ))}
                            {role.permissions.length > 3 && (
                              <div className="admin-role-more">
                                + {role.permissions.length - 3} صلاحية أخرى
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="admin-role-selector">
                          <div className={`admin-role-radio ${formData.role === role.id ? 'selected' : ''}`}>
                            {formData.role === role.id && <div className="admin-radio-dot"></div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* عرض الصلاحيات المختارة */}
                  {formData.role && (
                    <div className="admin-selected-permissions">
                      <h4>الصلاحيات الممنوحة:</h4>
                      <div className="admin-permissions-list">
                        {getRolePermissions(formData.role).map((permission, index) => (
                          <div key={index} className="admin-permission-badge">
                            <CheckCircle size={14} />
                            {permission}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* إعدادات إضافية */}
                <div className="add-admin-section">
                  <h3>إعدادات إضافية</h3>
                  
                  <div className="admin-settings">
                    {/* <div className="admin-setting-item">
                      <label className="admin-switch">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            is_active: e.target.checked 
                          }))}
                        />
                        <span className="admin-slider"></span>
                      </label>
                      <div className="admin-setting-info">
                        <h5>حساب نشط</h5>
                        <p>السماح للمشرف بالدخول إلى النظام فوراً</p>
                      </div>
                    </div> */}

                    <div className="admin-note">
                      <AlertCircle size={18} />
                      <div>
                        <p>
                          <strong>ملاحظة:</strong> سيتم إرسال بريد إلكتروني للمشرف الجديد 
                          مع تعليمات الدخول إلى النظام.
                        </p>
                        <p className="admin-note-detail">
                          يمكن للمشرف الجديد تغيير كلمة المرور بعد الدخول الأول
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* أزرار الإرسال */}
              <div className="add-admin-actions">
                <button
                  type="button"
                  className="add-admin-btn add-admin-btn-secondary"
                  onClick={() => navigate('/admins')}
                  disabled={loading}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="add-admin-btn add-admin-btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="add-admin-spinner"></div>
                      جاري إضافة المشرف...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      إضافة المشرف
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="admin-no-permission">
              <AlertCircle size={48} />
              <h3>غير مصرح لك</h3>
              <p>ليس لديك صلاحية لإضافة مشرفين جدد.</p>
              <p>فقط مدير النظام أو المشرف الرئيسي يمكنه إضافة مشرفين.</p>
              <button
                className="add-admin-btn add-admin-btn-secondary"
                onClick={() => navigate('/')}
              >
                العودة للصفحة الرئيسية
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddAdminPage;