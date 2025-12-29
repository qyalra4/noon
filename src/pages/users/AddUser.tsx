import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { UserPlus, Upload, Eye, EyeOff, Save, X } from 'lucide-react';
import './styles/AddUser.css';

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  avatar_url: string;
  country_id: string;
  governorate_id: string;
  area_id: string;
 
  
}

const AddUser: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    avatar_url: '',
    country_id: '',
    governorate_id: '',
    area_id: ''
  });
  
  const [countries, setCountries] = useState<any[]>([]);
  const [governorates, setGovernorates] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // جلب الدول
  useEffect(() => {
    fetchCountries();
  }, []);

  // جلب المحافظات عند تغيير الدولة
  useEffect(() => {
    if (formData.country_id) {
      fetchGovernorates(formData.country_id);
    } else {
      setGovernorates([]);
      setFormData(prev => ({ ...prev, governorate_id: '', area_id: '' }));
    }
  }, [formData.country_id]);

  // جلب المناطق عند تغيير المحافظة
  useEffect(() => {
    if (formData.governorate_id) {
      fetchAreas(formData.governorate_id);
    } else {
      setAreas([]);
      setFormData(prev => ({ ...prev, area_id: '' }));
    }
  }, [formData.governorate_id]);

  const fetchCountries = async () => {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name_ar')
      .order('name_ar');
    
    if (error) console.error('Error fetching countries:', error);
    setCountries(data || []);
  };

  const fetchGovernorates = async (countryId: string) => {
    const { data, error } = await supabase
      .from('governorates')
      .select('id, name_ar')
      .eq('country_id', countryId)
      .order('name_ar');
    
    if (error) console.error('Error fetching governorates:', error);
    setGovernorates(data || []);
    setFormData(prev => ({ ...prev, governorate_id: '', area_id: '' }));
  };

  const fetchAreas = async (governorateId: string) => {
    const { data, error } = await supabase
      .from('areas')
      .select('id, name_ar')
      .eq('governorate_id', governorateId)
      .order('name_ar');
    
    if (error) console.error('Error fetching areas:', error);
    setAreas(data || []);
    setFormData(prev => ({ ...prev, area_id: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'الاسم الأول مطلوب';
    if (!formData.last_name.trim()) newErrors.last_name = 'الاسم الأخير مطلوب';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) newErrors.email = 'البريد الإلكتروني مطلوب';
    else if (!emailRegex.test(formData.email)) newErrors.email = 'البريد الإلكتروني غير صالح';
    
    if (!formData.password) newErrors.password = 'كلمة المرور مطلوبة';
    else if (formData.password.length < 6) newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'كلمات المرور غير متطابقة';
    }

    if (formData.phone && !/^[\d\s+()-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'رقم الهاتف غير صالح';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `user-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // إنشاء المستخدم في المصادقة
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
       
      });

      if (authError) throw authError;

      if (authData.user) {
        // إضافة المستخدم في جدول profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            user_id: authData.user.id,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone || null,
            avatar_url: formData.avatar_url || null,
            country_id: formData.country_id || null,
            governorate_id: formData.governorate_id || null,
            area_id: formData.area_id || null,
           
            status: 'active'
          }]);

        if (profileError) throw profileError;

        alert('تم إضافة المستخدم بنجاح');
        navigate('/users');
      }
    } catch (error: any) {
      console.error('Error adding user:', error);
      
      if (error.message.includes('already registered')) {
        setErrors({ email: 'البريد الإلكتروني مسجل مسبقاً' });
      } else {
        alert('حدث خطأ أثناء إضافة المستخدم: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // مسح خطأ الحقل عند التعديل
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="add-user-page">
      <div className="page-header">
        <div className="header-left">
          <h1>
            <UserPlus size={24} /> إضافة مستخدم جديد
          </h1>
          <p>أضف مستخدم جديد للنظام</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/users')}
          >
            <X size={16} /> إلغاء
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-sections">
          {/* قسم المعلومات الأساسية */}
          <div className="form-section">
            <h3 className="section-title">المعلومات الأساسية</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>الاسم الأول *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={errors.first_name ? 'error' : ''}
                  placeholder="أدخل الاسم الأول"
                />
                {errors.first_name && <span className="error-message">{errors.first_name}</span>}
              </div>

              <div className="form-group">
                <label>الاسم الأخير *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={errors.last_name ? 'error' : ''}
                  placeholder="أدخل الاسم الأخير"
                />
                {errors.last_name && <span className="error-message">{errors.last_name}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>البريد الإلكتروني *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="example@domain.com"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>رقم الهاتف</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={errors.phone ? 'error' : ''}
                  placeholder="0770XXXXXXX"
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>
            </div>
          </div>

          {/* قسم كلمة المرور */}
          <div className="form-section">
            <h3 className="section-title">كلمة المرور</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>كلمة المرور *</label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? 'error' : ''}
                    placeholder="6 أحرف على الأقل"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label>تأكيد كلمة المرور *</label>
                <div className="password-input">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className={errors.confirm_password ? 'error' : ''}
                    placeholder="أعد إدخال كلمة المرور"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirm_password && <span className="error-message">{errors.confirm_password}</span>}
              </div>
            </div>
          </div>

          {/* قسم الصورة */}
          <div className="form-section">
            <h3 className="section-title">الصورة الشخصية</h3>
            
            <div className="avatar-upload">
              <div className="avatar-preview">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="صورة المستخدم" />
                ) : (
                  <div className="avatar-placeholder">
                    <UserPlus size={48} />
                  </div>
                )}
              </div>
              
              <div className="upload-controls">
                <label className="btn btn-secondary">
                  <Upload size={16} />
                  اختر صورة
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                <p className="upload-hint">JPG, PNG, GIF بحد أقصى 2MB</p>
                {uploadingAvatar && <p className="uploading">جاري رفع الصورة...</p>}
              </div>
            </div>
          </div>

          {/* قسم الموقع */}
          <div className="form-section">
            <h3 className="section-title">الموقع الجغرافي</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>الدولة</label>
                <select
                  name="country_id"
                  value={formData.country_id}
                  onChange={handleChange}
                >
                  <option value="">اختر الدولة</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>المحافظة</label>
                <select
                  name="governorate_id"
                  value={formData.governorate_id}
                  onChange={handleChange}
                  disabled={!formData.country_id}
                >
                  <option value="">اختر المحافظة</option>
                  {governorates.map(gov => (
                    <option key={gov.id} value={gov.id}>
                      {gov.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>المنطقة</label>
                <select
                  name="area_id"
                  value={formData.area_id}
                  onChange={handleChange}
                  disabled={!formData.governorate_id}
                >
                  <option value="">اختر المنطقة</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

           
          </div>

         
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/users')}
            disabled={loading}
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner-small"></div>
                جاري الإضافة...
              </>
            ) : (
              <>
                <Save size={16} />
                إضافة المستخدم
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddUser;