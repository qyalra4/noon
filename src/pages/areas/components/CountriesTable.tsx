import React from 'react';
import { Check, X } from 'lucide-react';

interface Country {
  id: string;
  name_ar: string;
  name_en: string;
  currency: string;
  is_active: boolean;
  created_at: string;
}

interface CountriesTableProps {
  countries: Country[];
  selectedCountry: Country | null;
  onSelectCountry: (country: Country) => void;
  onDeleteCountry: (id: string) => void;
}

const CountriesTable: React.FC<CountriesTableProps> = ({
  countries,
  selectedCountry,
  onSelectCountry,
  onDeleteCountry
}) => {
  if (countries.length === 0) {
    return (
      <div className="empty-state">
        <p>لا توجد دول مضافة</p>
        <p>ابدأ بإضافة دولة جديدة</p>
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
            <th>العملة</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((country) => (
            <tr 
              key={country.id}
              className={selectedCountry?.id === country.id ? 'selected' : ''}
              onClick={() => onSelectCountry(country)}
              style={{ cursor: 'pointer' }}
            >
              <td>{country.name_ar}</td>
              <td>{country.name_en || '-'}</td>
              <td>{country.currency}</td>
              <td>
                <span className={`status-badge ${country.is_active ? 'status-active' : 'status-inactive'}`}>
                  {country.is_active ? (
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
                      onDeleteCountry(country.id);
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

export default CountriesTable;