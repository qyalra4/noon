import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CountriesTable from './components/CountriesTable';
import GovernoratesTable from './components/GovernoratesTable';
import AreasTable from './components/AreasTable';
import AddCountryModal from './components/AddCountryModal';
import AddGovernorateModal from './components/AddGovernorateModal';
import AddAreaModal from './components/AddAreaModal';
import './styles/AreasManagement.css';

interface Country {
  id: string;
  name_ar: string;
  name_en: string;
  currency: string;
  is_active: boolean;
  created_at: string;
}

interface Governorate {
  id: string;
  country_id: string;
  name_ar: string;
  name_en: string;
  delivery_price: number;
  is_active: boolean;
  created_at: string;
  country?: Country;
}

interface Area {
  id: string;
  governorate_id: string;
  name_ar: string;
  name_en: string;
  delivery_price: number | null;
  is_active: boolean;
  created_at: string;
  governorate?: Governorate;
}

const AreasManagement: React.FC = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState<Governorate | null>(null);
  const [loading, setLoading] = useState(true);
  
  // حالات النوافذ المنبثقة
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [showAddGovernorate, setShowAddGovernorate] = useState(false);
  const [showAddArea, setShowAddArea] = useState(false);

  // جلب البيانات
  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      fetchGovernorates(selectedCountry.id);
    } else {
      setGovernorates([]);
      setAreas([]);
      setSelectedGovernorate(null);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedGovernorate) {
      fetchAreas(selectedGovernorate.id);
    } else {
      setAreas([]);
    }
  }, [selectedGovernorate]);

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name_ar');
      
      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGovernorates = async (countryId: string) => {
    try {
      const { data, error } = await supabase
        .from('governorates')
        .select(`
          *,
          country:countries(*)
        `)
        .eq('country_id', countryId)
        .order('name_ar');
      
      if (error) throw error;
      setGovernorates(data || []);
    } catch (error) {
      console.error('Error fetching governorates:', error);
    }
  };

  const fetchAreas = async (governorateId: string) => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select(`
          *,
          governorate:governorates(*, country:countries(*))
        `)
        .eq('governorate_id', governorateId)
        .order('name_ar');
      
      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  // وظائف الحذف
  const handleDeleteCountry = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الدولة؟ سيتم حذف جميع المحافظات والمناطق التابعة لها.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('countries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setCountries(countries.filter(c => c.id !== id));
      if (selectedCountry?.id === id) {
        setSelectedCountry(null);
      }
    } catch (error) {
      console.error('Error deleting country:', error);
      alert('حدث خطأ أثناء حذف الدولة');
    }
  };

  const handleDeleteGovernorate = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المحافظة؟ سيتم حذف جميع المناطق التابعة لها.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('governorates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setGovernorates(governorates.filter(g => g.id !== id));
      if (selectedGovernorate?.id === id) {
        setSelectedGovernorate(null);
      }
    } catch (error) {
      console.error('Error deleting governorate:', error);
      alert('حدث خطأ أثناء حذف المحافظة');
    }
  };

  const handleDeleteArea = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المنطقة؟')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setAreas(areas.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting area:', error);
      alert('حدث خطأ أثناء حذف المنطقة');
    }
  };

  // وظائف تحديث السعر
  const updateGovernoratePrice = async (id: string, newPrice: number) => {
    try {
      const { data: oldData } = await supabase
        .from('governorates')
        .select('delivery_price')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('governorates')
        .update({ 
          delivery_price: newPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // تسجيل تغيير السعر في التاريخ
      await supabase.from('delivery_price_history').insert({
        entity_type: 'governorate',
        entity_id: id,
        old_price: oldData?.delivery_price || 0,
        new_price: newPrice,
        change_reason: 'تحديد سعر التوصيل'
      });
      
      // تحديث البيانات المحلية
      setGovernorates(governorates.map(g => 
        g.id === id ? { ...g, delivery_price: newPrice } : g
      ));
      
      // تحديث أسعار المناطق التابعة التي ليس لها سعر خاص
      const { error: areaError } = await supabase
        .from('areas')
        .update({ 
          delivery_price: newPrice,
          updated_at: new Date().toISOString()
        })
        .eq('governorate_id', id)
        .is('delivery_price', null);
      
      if (areaError) console.error('Error updating area prices:', areaError);
      
      alert('تم تحديث السعر بنجاح');
    } catch (error) {
      console.error('Error updating price:', error);
      alert('حدث خطأ أثناء تحديث السعر');
    }
  };

  const updateAreaPrice = async (id: string, newPrice: number | null) => {
    try {
      const { data: oldData } = await supabase
        .from('areas')
        .select('delivery_price')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('areas')
        .update({ 
          delivery_price: newPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // تسجيل تغيير السعر في التاريخ
      await supabase.from('delivery_price_history').insert({
        entity_type: 'area',
        entity_id: id,
        old_price: oldData?.delivery_price,
        new_price: newPrice,
        change_reason: newPrice ? 'تحديث سعر المنطقة' : 'إعادة التعيين لسعر المحافظة'
      });
      
      // تحديث البيانات المحلية
      setAreas(areas.map(a => 
        a.id === id ? { ...a, delivery_price: newPrice } : a
      ));
      
      alert('تم تحديث السعر بنجاح');
    } catch (error) {
      console.error('Error updating area price:', error);
      alert('حدث خطأ أثناء تحديث السعر');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="areas-management">
      <div className="page-header">
        <h1>إدارة المناطق والتسعير</h1>
        <p>إدارة الدول والمحافظات والمناطق وأسعار التوصيل</p>
      </div>

      <div className="management-layout">
        {/* قسم الدول */}
        <div className="section countries-section">
          <div className="section-header">
            <h2>الدول</h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddCountry(true)}
            >
              + إضافة دولة
            </button>
          </div>
          
          <CountriesTable
            countries={countries}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            onDeleteCountry={handleDeleteCountry}
          />
        </div>

        {/* قسم المحافظات */}
        <div className="section governorates-section">
          <div className="section-header">
            <h2>
              المحافظات 
              {selectedCountry && ` - ${selectedCountry.name_ar}`}
            </h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddGovernorate(true)}
              disabled={!selectedCountry}
            >
              + إضافة محافظة
            </button>
          </div>
          
          {selectedCountry ? (
            <GovernoratesTable
              governorates={governorates}
              selectedGovernorate={selectedGovernorate}
              onSelectGovernorate={setSelectedGovernorate}
              onDeleteGovernorate={handleDeleteGovernorate}
              onUpdatePrice={updateGovernoratePrice}
              currency={selectedCountry.currency}
            />
          ) : (
            <div className="empty-state">
              <p>يرجى اختيار دولة لعرض محافظاتها</p>
            </div>
          )}
        </div>

        {/* قسم المناطق */}
        <div className="section areas-section">
          <div className="section-header">
            <h2>
              المناطق 
              {selectedGovernorate && ` - ${selectedGovernorate.name_ar}`}
            </h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddArea(true)}
              disabled={!selectedGovernorate}
            >
              + إضافة منطقة
            </button>
          </div>
          
          {selectedGovernorate ? (
            <AreasTable
              areas={areas}
              onDeleteArea={handleDeleteArea}
              onUpdatePrice={updateAreaPrice}
              governoratePrice={selectedGovernorate.delivery_price}
              currency={selectedCountry?.currency || 'IQD'}
            />
          ) : (
            <div className="empty-state">
              <p>يرجى اختيار محافظة لعرض مناطقها</p>
            </div>
          )}
        </div>
      </div>

      {/* النوافذ المنبثقة */}
      <AddCountryModal
        isOpen={showAddCountry}
        onClose={() => setShowAddCountry(false)}
        onSuccess={() => {
          setShowAddCountry(false);
          fetchCountries();
        }}
      />

      <AddGovernorateModal
        isOpen={showAddGovernorate}
        onClose={() => setShowAddGovernorate(false)}
        countryId={selectedCountry?.id}
        onSuccess={() => {
          setShowAddGovernorate(false);
          if (selectedCountry) fetchGovernorates(selectedCountry.id);
        }}
      />

      <AddAreaModal
        isOpen={showAddArea}
        onClose={() => setShowAddArea(false)}
        governorateId={selectedGovernorate?.id}
        governoratePrice={selectedGovernorate?.delivery_price || 0}
        onSuccess={() => {
          setShowAddArea(false);
          if (selectedGovernorate) fetchAreas(selectedGovernorate.id);
        }}
      />
    </div>
  );
};

export default AreasManagement;