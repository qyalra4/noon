import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface AddGovernorateModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryId: string | undefined;
  onSuccess: () => void;
}

const AddGovernorateModal: React.FC<AddGovernorateModalProps> = ({ 
  isOpen, 
  onClose, 
  countryId, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    delivery_price: '0.00',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!countryId) {
      setError('يرجى اختيار الدولة أولاً');
      setLoading(false);
      return;
    }

    if (!formData.name_ar.trim()) {
      setError('الاسم العربي مطلوب');
      setLoading(false);
      return;
    }

    const price = parseFloat(formData.delivery_price);
    if (isNaN(price) || price < 0) {
      setError('سعر التوصيل يجب أن يكون رقمًا صالحًا');
      setLoading(false);
      return;
    }

    try {
      const { error: supabaseError } = await supabase
        .from('governorates')
        .insert([{
          country_id: countryId,
          name_ar: formData.name_ar.trim(),
          name_en: formData.name_en.trim() || null,
          delivery_price: price,
          is_active: formData.is_active
        }]);

      if (supabaseError) throw supabaseError;

      // Reset form
      setFormData({
        name_ar: '',
        name_en: '',
        delivery_price: '0.00',
        is_active: true
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إضافة المحافظة');
      console.error('Error adding governorate:', err);
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
          <h3>إضافة محافظة جديدة</h3>
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
              placeholder="مثال: بغداد"
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
              placeholder="مثال: Baghdad"
            />
          </div>

          <div className="form-group">
            <label htmlFor="delivery_price">سعر التوصيل (دينار عراقي) *</label>
            <input
              type="number"
              id="delivery_price"
              name="delivery_price"
              value={formData.delivery_price}
              onChange={handleChange}
              className="form-control"
              min="0"
              step="0.01"
              required
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              هذا السعر سيكون افتراضيًا لجميع المناطق في هذه المحافظة
            </small>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              محافظة نشطة
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
              disabled={loading || !countryId}
            >
              {loading ? 'جاري الإضافة...' : 'إضافة المحافظة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGovernorateModal;