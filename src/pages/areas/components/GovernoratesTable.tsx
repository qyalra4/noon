import React, { useState } from 'react';
import { Check, X, Edit2, Save, XCircle } from 'lucide-react';

interface Governorate {
  id: string;
  country_id: string;
  name_ar: string;
  name_en: string;
  delivery_price: number;
  is_active: boolean;
  created_at: string;
  country?: any;
}

interface GovernoratesTableProps {
  governorates: Governorate[];
  selectedGovernorate: Governorate | null;
  onSelectGovernorate: (governorate: Governorate) => void;
  onDeleteGovernorate: (id: string) => void;
  onUpdatePrice: (id: string, newPrice: number) => void;
  currency: string;
}

const GovernoratesTable: React.FC<GovernoratesTableProps> = ({
  governorates,
  selectedGovernorate,
  onSelectGovernorate,
  onDeleteGovernorate,
  onUpdatePrice,
  currency
}) => {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');

  const handleStartEdit = (governorate: Governorate) => {
    setEditingPriceId(governorate.id);
    setPriceInput(governorate.delivery_price.toString());
  };

  const handleSavePrice = (id: string) => {
    const newPrice = parseFloat(priceInput);
    if (!isNaN(newPrice) && newPrice >= 0) {
      onUpdatePrice(id, newPrice);
      setEditingPriceId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingPriceId(null);
  };

  if (governorates.length === 0) {
    return (
      <div className="empty-state">
        <p>لا توجد محافظات مضافة</p>
        <p>ابدأ بإضافة محافظة جديدة</p>
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
          {governorates.map((governorate) => (
            <tr 
              key={governorate.id}
              className={selectedGovernorate?.id === governorate.id ? 'selected' : ''}
              onClick={() => onSelectGovernorate(governorate)}
              style={{ cursor: 'pointer' }}
            >
              <td>{governorate.name_ar}</td>
              <td>{governorate.name_en || '-'}</td>
              <td>
                {editingPriceId === governorate.id ? (
                  <div className="price-editor">
                    <input
                      type="number"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="price-input"
                      min="0"
                      step="0.01"
                    />
                    <div className="price-actions">
                      <button
                        className="btn btn-success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSavePrice(governorate.id);
                        }}
                      >
                        <Save size={14} />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="price-display">
                    <span>{governorate.delivery_price.toFixed(2)} {currency}</span>
                    <button
                      className="action-btn action-btn-price"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(governorate);
                      }}
                      style={{ marginRight: '8px' }}
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </td>
              <td>
                <span className={`status-badge ${governorate.is_active ? 'status-active' : 'status-inactive'}`}>
                  {governorate.is_active ? (
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteGovernorate(governorate.id);
                    }}
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

export default GovernoratesTable;