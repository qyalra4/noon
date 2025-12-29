import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Search, Filter, Download, Eye, Edit, Trash2, Plus, 
  User, Phone, Mail, Car, Shield, CheckCircle, XCircle,
  DollarSign, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './DriversPage.css';

interface Driver {
  id: string;
  driver_id: string;
  full_name: string;
  phone: string;
  email?: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

const DriversPage = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      alert('حدث خطأ في تحميل بيانات السواق');
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.driver_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm) ||
      (driver.vehicle_number && driver.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    const matchesVehicle = vehicleFilter === 'all' || driver.vehicle_type === vehicleFilter;
    
    return matchesSearch && matchesStatus && matchesVehicle;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السائق؟')) {
      try {
        const { error } = await supabase
          .from('drivers')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        setDrivers(drivers.filter(driver => driver.id !== id));
        alert('تم حذف السائق بنجاح');
      } catch (error) {
        console.error('Error deleting driver:', error);
        alert('حدث خطأ أثناء حذف السائق');
      }
    }
  };

  const updateDriverStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setDrivers(drivers.map(driver => 
        driver.id === id ? { ...driver, status: newStatus } : driver
      ));
      alert(`تم تغيير حالة السائق إلى: ${getStatusText(newStatus)}`);
    } catch (error) {
      console.error('Error updating driver status:', error);
      alert('حدث خطأ أثناء تحديث حالة السائق');
    }
  };

  const exportToExcel = () => {
    const data = filteredDrivers.map(driver => ({
      'رقم السائق': driver.driver_id,
      'الاسم الكامل': driver.full_name,
      'الهاتف': driver.phone,
      'البريد الإلكتروني': driver.email || '',
      'نوع المركبة': getVehicleTypeText(driver.vehicle_type),
      'رقم المركبة': driver.vehicle_number || '-',
      'رقم الرخصة': driver.license_number || '-',
      'الحالة': getStatusText(driver.status),
      'تاريخ الإضافة': new Date(driver.created_at).toLocaleDateString('ar-SA'),
      'آخر تحديث': new Date(driver.updated_at).toLocaleDateString('ar-SA')
    }));

    // استخدام مكتبة sheetjs لتصدير Excel
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "السواق");
    XLSX.writeFile(wb, `السواق_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>جاري تحميل بيانات السواق...</p>
      </div>
    );
  }

  return (
    <div className="drivers-page">
      <div className="page-header">
        <div>
          <h1>إدارة السواق</h1>
          <p className="page-subtitle">إجمالي السواق: {drivers.length}</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={() => navigate('/drivers/invoices')}
          >
            <DollarSign size={18} />
            فواتير السواق
          </button>
          <button 
            className="btn-primary"
            onClick={() => navigate('/drivers/add')}
          >
            <Plus size={18} />
            إضافة سائق جديد
          </button>
        </div>
      </div>

      {/* شريط الفلاتر */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="ابحث برقم السائق أو الاسم أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={16} />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="on_delivery">في التوصيل</option>
          </select>

          <select 
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
          >
            <option value="all">جميع المركبات</option>
            <option value="دراجة نارية">دراجة نارية</option>
            <option value="سيارة">سيارة</option>
            <option value="شاحنة">شاحنة</option>
            <option value="أخرى">أخرى</option>
          </select>
        </div>

        <div className="export-buttons">
          <button className="btn-export" onClick={exportToExcel}>
            <Download size={16} />
            تصدير Excel
          </button>
          <button className="btn-secondary" onClick={fetchDrivers}>
            تحديث القائمة
          </button>
        </div>
      </div>

      {/* جدول السواق */}
      <div className="table-container">
        <table className="drivers-table">
          <thead>
            <tr>
              <th>رقم السائق</th>
              <th>الاسم الكامل</th>
              <th>معلومات الاتصال</th>
              <th>معلومات المركبة</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.map(driver => (
              <tr key={driver.id}>
                <td className="driver-id">{driver.driver_id}</td>
                <td>
                  <div className="driver-name-cell">
                    <strong>{driver.full_name}</strong>
                    {driver.notes && (
                      <small className="driver-notes" title={driver.notes}>
                        <FileText size={12} />
                        ملاحظات
                      </small>
                    )}
                  </div>
                </td>
                <td>
                  <div className="contact-cell">
                    <div className="phone-row">
                      <Phone size={14} />
                      {driver.phone}
                    </div>
                    {driver.email && (
                      <div className="email-row">
                        <Mail size={14} />
                        {driver.email}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="vehicle-cell">
                    <div className="vehicle-type">
                      <Car size={14} />
                      {getVehicleTypeText(driver.vehicle_type)}
                    </div>
                    {driver.vehicle_number && (
                      <div className="vehicle-number">
                        <Shield size={14} />
                        {driver.vehicle_number}
                      </div>
                    )}
                    {driver.license_number && (
                      <div className="license-number">
                        رقم الرخصة: {driver.license_number}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="status-cell">
                    <span className={`status-badge status-${driver.status}`}>
                      {getStatusText(driver.status)}
                    </span>
                    <select
                      value={driver.status}
                      onChange={(e) => updateDriverStatus(driver.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                      <option value="on_delivery">في التوصيل</option>
                    </select>
                  </div>
                </td>
                <td>
                  <div className="date-cell">
                    <div>الإضافة: {new Date(driver.created_at).toLocaleDateString('ar-SA')}</div>
                    <div>التحديث: {new Date(driver.updated_at).toLocaleDateString('ar-SA')}</div>
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-view"
                      onClick={() => navigate(`/drivers/${driver.id}`)}
                      title="عرض التفاصيل"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn-edit"
                      onClick={() => navigate(`/drivers/edit/${driver.id}`)}
                      title="تعديل"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(driver.id)}
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredDrivers.length === 0 && (
          <div className="no-data">
            <p>لا توجد بيانات تطابق معايير البحث</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/drivers/add')}
            >
              <Plus size={16} />
              إضافة سائق جديد
            </button>
          </div>
        )}
      </div>

      {/* إحصائيات */}
      <div className="stats-container">
        <div className="stat-card stat-active">
          <h3>السواق النشطين</h3>
          <p className="stat-number">{drivers.filter(d => d.status === 'active').length}</p>
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
        </div>
        <div className="stat-card stat-delivery">
          <h3>في التوصيل</h3>
          <p className="stat-number">{drivers.filter(d => d.status === 'on_delivery').length}</p>
          <div className="stat-icon">
            <Car size={24} />
          </div>
        </div>
        <div className="stat-card stat-inactive">
          <h3>غير النشطين</h3>
          <p className="stat-number">{drivers.filter(d => d.status === 'inactive').length}</p>
          <div className="stat-icon">
            <XCircle size={24} />
          </div>
        </div>
        <div className="stat-card stat-total">
          <h3>إجمالي السواق</h3>
          <p className="stat-number">{drivers.length}</p>
          <div className="stat-icon">
            <User size={24} />
          </div>
        </div>
      </div>
    </div>
  );
};

// دوال مساعدة
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    active: 'نشط',
    inactive: 'غير نشط',
    on_delivery: 'في التوصيل'
  };
  return statusMap[status] || status;
};

const getVehicleTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'دراجة نارية': 'دراجة نارية',
    'سيارة': 'سيارة',
    'شاحنة': 'شاحنة',
    'أخرى': 'أخرى'
  };
  return typeMap[type] || type || 'غير محدد';
};

export default DriversPage;