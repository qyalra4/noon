import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Save, X, Upload, Eye, EyeOff, Trash2 } from 'lucide-react';
import './styles/AddUser.css';

const EditUser: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [governorates, setGovernorates] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserData(userId);
    }
  }, [userId]);

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (formData?.country_id) {
      fetchGovernorates(formData.country_id);
    }
  }, [formData?.country_id]);

  useEffect(() => {
    if (formData?.governorate_id) {
      fetchAreas(formData.governorate_id);
    }
  }, [formData?.governorate_id]);

  const fetchUserData = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setFormData(data);
    } catch (error) {
      console.error('Error fetching user:', error);
      alert('حدث خطأ أثناء تحميل بيانات المستخدم');
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    const { data } = await supabase
      .from('countries')
      .select('id, name_ar')
      .order('name_ar');
    setCountries(data || []);
  };

  const fetchGovernorates = async (countryId: string) => {
    const { data } = await supabase
      .from('governorates')
      .select('id, name_ar')
      .eq('country_id', countryId)
      .order('name_ar');
    setGovernorates(data || []);
  };

  const fetchAreas = async (governorateId: string) => {
    const { data } = await supabase
      .from('areas')
      .select('id, name_ar')
      .eq('governorate_id', governorateId)
      .order('name_ar');
    setAreas(data || []);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file || !userId) return;
    
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `user-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData((prev: any) => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('هل تريد حذف الصورة الشخصية؟')) return;
    
    try {
      // حذف الصورة من التخزين إذا كانت موجودة
      if (formData.avatar_url) {
        const fileName = formData.avatar_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('avatars')
            .remove([`user-avatars/${fileName}`]);
        }
      }

      setFormData((prev: any) => ({ ...prev, avatar_url: null }));
    } catch (error) {
      console.error('Error removing avatar:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData?.first_name?.trim()) newErrors.first_name = 'الاسم الأول مطلوب';
    if (!formData?.last_name?.trim()) newErrors.last_name = 'الاسم الأخير مطلوب';
    
    if (newPassword && newPassword.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    if (formData?.phone && !/^[\d\s+()-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'رقم الهاتف غير صالح';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const updateData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || null,
        avatar_url: formData.avatar_url || null,
        country_id: formData.country_id || null,
        governorate_id: formData.governorate_id || null,
        area_id: formData.area_id || null,
        address: formData.address || null,
        status: formData.status,
        updated_at: new Date().toISOString()
      };

      // تحديث كلمة المرور إذا تم إدخال واحدة جديدة
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passwordError) throw passwordError;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      alert('تم تحديث بيانات المستخدم بنجاح');
      navigate(`/users/${userId}`);
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert('حدث خطأ أثناء تحديث بيانات المستخدم: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>جاري تحميل بيانات المستخدم...</p>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="error-container">
        <h2>المستخدم غير موجود</h2>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/users')}
        >
          العودة لقائمة المستخدمين
        </button>
      </div>
    );
  }

  return (
    <div className="add-user-page">
      <div className="page-header">
        <div className="header-left">
          <h1>تعديل بيانات المستخدم</h1>
          <p>تعديل بيانات: {formData.first_name} {formData.last_name}</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => navigate(`/users/${userId}`)}
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
                  value={formData.first_name || ''}
                  onChange={handleChange}
                  className={errors.first_name ? 'error' : ''}
                />
                {errors.first_name && <span className="error-message">{errors.first_name}</span>}
              </div>

              <div className="form-group">
                <label>الاسم الأخير *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name || ''}
                  onChange={handleChange}
                  className={errors.last_name ? 'error' : ''}
                />
                {errors.last_name && <span className="error-message">{errors.last_name}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="disabled"
                />
                <small className="form-text">لا يمكن تغيير البريد الإلكتروني</small>
              </div>

              <div className="form-group">
                <label>رقم الهاتف</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className={errors.phone ? 'error' : ''}
                  placeholder="0770XXXXXXX"
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>كلمة المرور الجديدة (اختياري)</label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={errors.password ? 'error' : ''}
                    placeholder="اتركه فارغاً للحفاظ على كلمة المرور الحالية"
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
                <small className="form-text">اتركه فارغاً للحفاظ على كلمة المرور الحالية</small>
              </div>

              <div className="form-group">
                <label>حالة المستخدم</label>
                <select
                  name="status"
                  value={formData.status || 'active'}
                  onChange={handleChange}
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="suspended">موقوف</option>
                </select>
              </div>
            </div>
          </div>

          {/* قسم الصورة */}
          <div className="form-section">
            <h3 className="section-title">الصورة الشخصية</h3>
            
            <div className="avatar-upload">
              <div className="avatar-preview">
                {formData.avatar_url ? (
                  <>
                    <img src={formData.avatar_url} alt="صورة المستخدم" />
                    <button
                      type="button"
                      className="remove-avatar"
                      onClick={handleRemoveAvatar}
                      title="حذف الصورة"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <div className="avatar-placeholder">
                    <div className="placeholder-text">
                      {formData.first_name?.charAt(0)}{formData.last_name?.charAt(0)}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="upload-controls">
                <label className="btn btn-secondary">
                  <Upload size={16} />
                  {formData.avatar_url ? 'تغيير الصورة' : 'اختر صورة'}
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
                  value={formData.country_id || ''}
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
                  value={formData.governorate_id || ''}
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
                  value={formData.area_id || ''}
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

            <div className="form-group">
              <label>العنوان التفصيلي</label>
              <textarea
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                rows={3}
                placeholder="أدخل العنوان بالتفصيل"
              />
            </div>
          </div>

         
       
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/users/${userId}`)}
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="spinner-small"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save size={16} />
                حفظ التغييرات
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditUser;