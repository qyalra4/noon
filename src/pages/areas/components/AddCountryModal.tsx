import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface AddCountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddCountryModal: React.FC<AddCountryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    currency: 'IQD',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name_ar.trim()) {
      setError('الاسم العربي مطلوب');
      setLoading(false);
      return;
    }

    try {
      const { error: supabaseError } = await supabase
        .from('countries')
        .insert([{
          name_ar: formData.name_ar.trim(),
          name_en: formData.name_en.trim() || null,
          currency: formData.currency,
          is_active: formData.is_active
        }]);

      if (supabaseError) throw supabaseError;

      // Reset form
      setFormData({
        name_ar: '',
        name_en: '',
        currency: 'IQD',
        is_active: true
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إضافة الدولة');
      console.error('Error adding country:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>إضافة دولة جديدة</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message" style={{ 
              background: '#f8d7da', 
              color: '#721c24', 
              padding: '10px', 
              borderRadius: '4px',
              marginBottom: '15px'
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name_ar">الاسم العربي *</label>
            <input
              type="text"
              id="name_ar"
              name="name_ar"
              value={formData.name_ar}
              onChange={handleChange}
              className="form-control"
              required
              placeholder="مثال: العراق"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name_en">الاسم الإنجليزي (اختياري)</label>
            <input
              type="text"
              id="name_en"
              name="name_en"
              value={formData.name_en}
              onChange={handleChange}
              className="form-control"
              placeholder="مثال: Iraq"
            />
          </div>

          <div className="form-group">
            <label htmlFor="currency">العملة</label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="form-control"
            >
              <option value="IQD">دينار عراقي (IQD)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="EUR">يورو (EUR)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="AED">درهم إماراتي (AED)</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              دولة نشطة
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={onClose}
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'جاري الإضافة...' : 'إضافة الدولة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCountryModal;