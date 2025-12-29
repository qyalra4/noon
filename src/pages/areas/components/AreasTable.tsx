import React, { useState } from 'react';
import { Check, X, Edit2, Save, XCircle, RotateCcw } from 'lucide-react';

interface Area {
  id: string;
  governorate_id: string;
  name_ar: string;
  name_en: string;
  delivery_price: number | null;
  is_active: boolean;
  created_at: string;
  governorate?: any;
}

interface AreasTableProps {
  areas: Area[];
  onDeleteArea: (id: string) => void;
  onUpdatePrice: (id: string, newPrice: number | null) => void;
  governoratePrice: number;
  currency: string;
}

const AreasTable: React.FC<AreasTableProps> = ({
  areas,
  onDeleteArea,
  onUpdatePrice,
  governoratePrice,
  currency
}) => {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');

  const handleStartEdit = (area: Area) => {
    setEditingPriceId(area.id);
    setPriceInput(area.delivery_price?.toString() || '');
  };

  const handleSavePrice = (id: string) => {
    const newPrice = priceInput === '' ? null : parseFloat(priceInput);
    if (newPrice === null || (!isNaN(newPrice) && newPrice >= 0)) {
      onUpdatePrice(id, newPrice);
      setEditingPriceId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingPriceId(null);
  };

  const handleResetToGovernoratePrice = (id: string) => {
    if (window.confirm('هل تريد إعادة تعيين السعر إلى سعر المحافظة الافتراضي؟')) {
      onUpdatePrice(id, null);
    }
  };

  if (areas.length === 0) {
    return (
      <div className="empty-state">
        <p>لا توجد مناطق مضافة</p>
        <p>ابدأ بإضافة منطقة جديدة</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>الاسم العربي</th>
            <th>الاسم الإنجليزي</th>
            <th>سعر التوصيل</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {areas.map((area) => (
            <tr key={area.id}>
              <td>{area.name_ar}</td>
              <td>{area.name_en || '-'}</td>
              <td>
                {editingPriceId === area.id ? (
                  <div className="price-editor">
                    <input
                      type="number"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="price-input"
                      min="0"
                      step="0.01"
                      placeholder="سعر المحافظة"
                    />
                    <div className="price-actions">
                      <button
                        className="btn btn-success"
                        onClick={() => handleSavePrice(area.id)}
                      >
                        <Save size={14} />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={handleCancelEdit}
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="price-display">
                    <div style={{ marginBottom: '5px' }}>
                      <strong>
                        {area.delivery_price !== null 
                          ? `${area.delivery_price.toFixed(2)} ${currency}`
                          : `${governoratePrice.toFixed(2)} ${currency} (سعر المحافظة)`
                        }
                      </strong>
                    </div>
                    <div>
                      <button
                        className="action-btn action-btn-price"
                        onClick={() => handleStartEdit(area)}
                        style={{ marginRight: '5px' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      {area.delivery_price !== null && (
                        <button
                          className="action-btn action-btn-price"
                          onClick={() => handleResetToGovernoratePrice(area.id)}
                          title="إعادة التعيين لسعر المحافظة"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </td>
              <td>
                <span className={`status-badge ${area.is_active ? 'status-active' : 'status-inactive'}`}>
                  {area.is_active ? (
                    <>
                      <Check size={14} /> نشطة
                    </>
                  ) : (
                    <>
                      <X size={14} /> غير نشطة
                    </>
                  )}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  <button
                    className="action-btn action-btn-delete"
                    onClick={() => onDeleteArea(area.id)}
                  >
                    حذف
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AreasTable;