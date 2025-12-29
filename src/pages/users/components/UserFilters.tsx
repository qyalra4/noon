import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface UserFiltersProps {
  filters: {
    status: string;
    date_from: string;
    date_to: string;
    country_id: string;
  };
  onFilterChange: (filters: any) => void;
  onApplyFilters: () => void;
}

const UserFilters: React.FC<UserFiltersProps> = ({
  filters,
  onFilterChange,
  onApplyFilters
}) => {
  const [countries, setCountries] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name_ar')
      .order('name_ar');
    
    if (error) {
      console.error('Error fetching countries:', error);
    } else {
      setCountries(data || []);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  const resetFilters = () => {
    onFilterChange({
      status: 'all',
      date_from: '',
      date_to: '',
      country_id: ''
    });
  };

  return (
    <div className="user-filters">
      <button 
        className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setShowFilters(!showFilters)}
      >
        <Filter size={16} /> 
        {showFilters ? 'إخفاء الفلاتر' : 'عرض الفلاتر'}
      </button>

      {showFilters && (
        <div className="filters-panel">
          <div className="filters-header">
            <h4>فلاتر البحث</h4>
            <button 
              className="close-filters"
              onClick={() => setShowFilters(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="filters-grid">
            

            <div className="filter-group">
              <label>الحالة</label>
              <select 
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="form-control"
              >
                <option value="all">الكل</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="suspended">موقوف</option>
              </select>
            </div>

            <div className="filter-group">
              <label>الدولة</label>
              <select 
                value={filters.country_id}
                onChange={(e) => handleFilterChange('country_id', e.target.value)}
                className="form-control"
              >
                <option value="">الكل</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>
                    {country.name_ar}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>من تاريخ</label>
              <input 
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="form-control"
              />
            </div>

            <div className="filter-group">
              <label>إلى تاريخ</label>
              <input 
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="form-control"
              />
            </div>
          </div>

          <div className="filter-actions">
            <button 
              className="btn btn-secondary"
              onClick={resetFilters}
            >
              إعادة التعيين
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                onApplyFilters();
                setShowFilters(false);
              }}
            >
              تطبيق الفلاتر
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserFilters;