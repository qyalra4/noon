import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, User, Phone, Mail, Car, Shield, Hash, FileText } from 'lucide-react';
import './DriversPage.css';

const AddDriverPage = () => {
  const navigate = useNavigate();
  
  const [driverData, setDriverData] = useState({
    full_name: '',
    phone: '',
    email: '',
    vehicle_type: '',
    vehicle_number: '',
    license_number: '',
    status: 'active',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // توليد رقم سائق فريد
  const generateDriverId = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `DRV-${year}${month}${day}-${random}`;
  };

  // التحقق من صحة البيانات
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!driverData.full_name.trim()) {
      newErrors.full_name = 'يرجى إدخال الاسم الكامل';
    }

    if (!driverData.phone.trim()) {
      newErrors.phone = 'يرجى إدخال رقم الهاتف';
    } else if (!/^[0-9]{10,15}$/.test(driverData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'يرجى إدخال رقم هاتف صحيح';
    }

    if (driverData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driverData.email)) {
      newErrors.email = 'يرجى إدخال بريد إلكتروني صحيح';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // توليد رقم السائق
      const driver_id = generateDriverId();

      // الحصول على المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('drivers')
        .insert([{
          driver_id,
          full_name: driverData.full_name.trim(),
          phone: driverData.phone.trim(),
          email: driverData.email?.trim() || null,
          vehicle_type: driverData.vehicle_type || null,
          vehicle_number: driverData.vehicle_number?.trim() || null,
          license_number: driverData.license_number?.trim() || null,
          status: driverData.status,
          notes: driverData.notes?.trim() || null,
          user_id: user?.id || null
        }]);

      if (error) throw error;

      alert('تم إضافة السائق بنجاح!');
      navigate('/drivers');
      
    } catch (error: any) {
      console.error('Error adding driver:', error);
      alert(`حدث خطأ: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-driver-page">
      <div className="page-header">
        <div>
          <button 
            className="btn-back"
            onClick={() => navigate('/drivers')}
            type="button"
          >
            <ArrowLeft size={18} />
            رجوع إلى القائمة
          </button>
          <h1>إضافة سائق جديد</h1>
        </div>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          {/* المعلومات الشخصية */}
          <div className="form-section">
            <h3>
              <User size={20} />
              المعلومات الشخصية
            </h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>الاسم الكامل *</label>
                <input
                  type="text"
                  value={driverData.full_name}
                  onChange={(e) => {
                    setDriverData({...driverData, full_name: e.target.value});
                    if (errors.full_name) setErrors({...errors, full_name: ''});
                  }}
                  className={`form-input ${errors.full_name ? 'error' : ''}`}
                  placeholder="أدخل الاسم الكامل للسائق"
                />
                {errors.full_name && <div className="error-message">{errors.full_name}</div>}
              </div>

              <div className="form-group">
                <label>
                  <Phone size={16} />
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  value={driverData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setDriverData({...driverData, phone: value});
                    if (errors.phone) setErrors({...errors, phone: ''});
                  }}
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  placeholder="مثال: 07801234567"
                />
                {errors.phone && <div className="error-message">{errors.phone}</div>}
              </div>

              <div className="form-group">
                <label>
                  <Mail size={16} />
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={driverData.email}
                  onChange={(e) => {
                    setDriverData({...driverData, email: e.target.value});
                    if (errors.email) setErrors({...errors, email: ''});
                  }}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="example@email.com"
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>
            </div>
          </div>

          {/* معلومات المركبة */}
          <div className="form-section">
            <h3>
              <Car size={20} />
              معلومات المركبة
            </h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>نوع المركبة</label>
                <select
                  value={driverData.vehicle_type}
                  onChange={(e) => setDriverData({...driverData, vehicle_type: e.target.value})}
                  className="form-select"
                >
                  <option value="">-- اختر نوع المركبة --</option>
                  <option value="دراجة نارية">دراجة نارية</option>
                  <option value="سيارة">سيارة</option>
                  <option value="شاحنة">شاحنة</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <Shield size={16} />
                  رقم المركبة
                </label>
                <input
                  type="text"
                  value={driverData.vehicle_number}
                  onChange={(e) => setDriverData({...driverData, vehicle_number: e.target.value})}
                  className="form-input"
                  placeholder="رقم لوحة المركبة"
                />
              </div>

              <div className="form-group">
                <label>
                  <Hash size={16} />
                  رقم الرخصة
                </label>
                <input
                  type="text"
                  value={driverData.license_number}
                  onChange={(e) => setDriverData({...driverData, license_number: e.target.value})}
                  className="form-input"
                  placeholder="رقم رخصة القيادة"
                />
              </div>
            </div>
          </div>

          {/* معلومات إضافية */}
          <div className="form-section">
            <h3>معلومات إضافية</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>حالة السائق</label>
                <select
                  value={driverData.status}
                  onChange={(e) => setDriverData({...driverData, status: e.target.value})}
                  className="form-select"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="on_delivery">في التوصيل</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>
                <FileText size={16} />
                ملاحظات
              </label>
              <textarea
                value={driverData.notes}
                onChange={(e) => setDriverData({...driverData, notes: e.target.value})}
                className="form-textarea"
                rows={4}
                placeholder="أي ملاحظات إضافية عن السائق (اختياري)..."
              />
            </div>
          </div>

          {/* ملخص البيانات */}
          <div className="driver-summary">
            <h3>ملخص البيانات</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <p>رقم السائق:</p>
                <p className="driver-id-preview">{generateDriverId()}</p>
              </div>
              <div className="summary-item">
                <p>الاسم:</p>
                <p>{driverData.full_name || 'لم يتم الإدخال'}</p>
              </div>
              <div className="summary-item">
                <p>الهاتف:</p>
                <p>{driverData.phone || 'لم يتم الإدخال'}</p>
              </div>
              <div className="summary-item">
                <p>نوع المركبة:</p>
                <p>{driverData.vehicle_type || 'غير محدد'}</p>
              </div>
              <div className="summary-item">
                <p>الحالة:</p>
                <p>{driverData.status === 'active' ? 'نشط' : driverData.status === 'inactive' ? 'غير نشط' : 'في التوصيل'}</p>
              </div>
            </div>
          </div>

          {/* أزرار الإرسال */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/drivers')}
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="spinner-small"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save size={18} />
                  إضافة السائق
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDriverPage;