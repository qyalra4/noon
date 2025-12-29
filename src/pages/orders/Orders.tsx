import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Search, Filter, Download, FileText, FileSpreadsheet, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './ordersss.css';

interface Order {
  id: string;
  order_id: string;
  customer_name: string; // اسم المستلم
  phone1: string;       // هاتف المستلم 1
  phone2?: string;      // هاتف المستلم 2
  sender_id?: string;   // id المرسل (من profiles)
  sender_name?: string; // اسم المرسل
  sender_phone?: string; // هاتف المرسل
  nearest_landmark?: string; // أقرب نقطة دالة للمستلم
  category_id?: string;
  category?: { name_ar: string };
  governorate_id?: string; // محافظة المستلم
  governorate?: { name_ar: string };
  area_id?: string; // منطقة المستلم
  area?: { name_ar: string };
  product_price: number;
  delivery_price: number;
  status: string;
  created_at: string;
  profile?: { // بيانات المرسل (العميل)
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    governorate_id?: string;
    area_id?: string;
    governorate?: { name_ar: string };
    area?: { name_ar: string };
  };
}

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const navigate = useNavigate();

  // جلب الطلبات من Supabase
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      // جلب الطلبات
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!ordersData) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // استخراج جميع الـ IDs المطلوبة
      const userIds = ordersData
        .map(order => order.user_id)
        .filter(id => id) as string[];

      const categoryIds = ordersData
        .map(order => order.category_id)
        .filter(id => id) as string[];

      const governorateIds = ordersData
        .map(order => order.governorate_id)
        .filter(id => id) as string[];

      const areaIds = ordersData
        .map(order => order.area_id)
        .filter(id => id) as string[];

      // جلب البيانات بشكل منفصل
      const [
        { data: profilesData },
        { data: categoriesData },
        { data: governoratesData },
        { data: areasData }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, user_id, first_name, last_name, phone, email, governorate_id, area_id')
          .in('user_id', userIds.length ? userIds : ['']),
        
        supabase
          .from('categories')
          .select('id, name_ar')
          .in('id', categoryIds.length ? categoryIds : ['']),
        
        supabase
          .from('governorates')
          .select('id, name_ar')
          .in('id', governorateIds.length ? governorateIds : ['']),
        
        supabase
          .from('areas')
          .select('id, name_ar, governorate_id')
          .in('id', areaIds.length ? areaIds : [''])
      ]);

      // إنشاء خرائط للبحث السريع
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      const categoriesMap = new Map();
      categoriesData?.forEach(category => {
        categoriesMap.set(category.id, category);
      });

      const governoratesMap = new Map();
      governoratesData?.forEach(governorate => {
        governoratesMap.set(governorate.id, governorate);
      });

      const areasMap = new Map();
      areasData?.forEach(area => {
        areasMap.set(area.id, area);
      });

      // جلب محافظات ومناطق المرسلين
      const senderGovIds = profilesData
        ?.map(p => p.governorate_id)
        .filter(id => id) as string[];

      const senderAreaIds = profilesData
        ?.map(p => p.area_id)
        .filter(id => id) as string[];

      const [
        { data: senderGovernorates },
        { data: senderAreas }
      ] = await Promise.all([
        supabase
          .from('governorates')
          .select('id, name_ar')
          .in('id', senderGovIds?.length ? senderGovIds : ['']),
        
        supabase
          .from('areas')
          .select('id, name_ar')
          .in('id', senderAreaIds?.length ? senderAreaIds : [''])
      ]);

      // إضافة محافظات ومناطق المرسلين للخرائط
      senderGovernorates?.forEach(gov => {
        governoratesMap.set(gov.id, gov);
      });

      senderAreas?.forEach(area => {
        areasMap.set(area.id, area);
      });

      // دمج البيانات
      const formattedOrders = ordersData.map(order => {
        const profile = order.user_id ? profilesMap.get(order.user_id) : null;
        
        return {
          ...order,
          category: order.category_id ? categoriesMap.get(order.category_id) : null,
          governorate: order.governorate_id ? governoratesMap.get(order.governorate_id) : null,
          area: order.area_id ? areasMap.get(order.area_id) : null,
          profile: profile ? {
            ...profile,
            governorate: profile.governorate_id ? governoratesMap.get(profile.governorate_id) : null,
            area: profile.area_id ? areasMap.get(profile.area_id) : null
          } : null,
          sender_name: profile ? `${profile.first_name} ${profile.last_name}` : order.sender_name,
          sender_phone: profile?.phone || order.sender_phone
        };
      });

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  // تصفية الطلبات
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.profile?.first_name + ' ' + order.profile?.last_name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone1.includes(searchTerm) ||
      order.sender_phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // حذف طلب
  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
      try {
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        setOrders(orders.filter(order => order.id !== id));
        alert('تم حذف الطلب بنجاح');
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('حدث خطأ أثناء حذف الطلب');
      }
    }
  };

  // تصدير إلى Excel
  const exportToExcel = () => {
    const data = filteredOrders.map(order => ({
      'رقم الطلب': order.order_id,
      
      // بيانات المرسل (العميل)
      'اسم المرسل (الأول)': order.profile?.first_name || order.sender_name?.split(' ')[0] || '',
      'اسم المرسل (الثاني)': order.profile?.last_name || order.sender_name?.split(' ')[1] || '',
      'هاتف المرسل': order.profile?.phone || order.sender_phone || '',
      'بريد المرسل': order.profile?.email || '',
      
      // بيانات المستلم (الزبون)
      'اسم المستلم': order.customer_name,
      'هاتف المستلم 1': order.phone1,
      'هاتف المستلم 2': order.phone2 || '',
      
      // مكان الاستلام (موقع المرسل)
      'محافظة الاستلام': order.profile?.governorate?.name_ar || '',
      'منطقة الاستلام': order.profile?.area?.name_ar || '',
      
      // مكان التسليم (موقع المستلم)
      'محافظة التسليم': order.governorate?.name_ar || '',
      'منطقة التسليم': order.area?.name_ar || '',
      'أقرب نقطة دالة': order.nearest_landmark || '',
      
      // معلومات الطلب
      'الفئة': order.category?.name_ar || '',
      'سعر المنتج': order.product_price,
      'سعر التوصيل': order.delivery_price,
      'المبلغ الإجمالي': order.product_price + order.delivery_price,
      'الحالة': getStatusText(order.status),
      'تاريخ الإنشاء': new Date(order.created_at).toLocaleDateString('ar-IQ'),
      'وقت الإنشاء': new Date(order.created_at).toLocaleTimeString('ar-IQ')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الطلبات');
    
    // تنسيق الأعمدة
    const wscols = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `طلبات_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // تصدير إلى Word
  const exportToWord = () => {
    const selected = orders.filter(order => selectedOrders.includes(order.id));
    if (selected.length === 0) {
      alert('يرجى اختيار طلبات للتصدير');
      return;
    }

    // إنشاء محتوى HTML لملف Word
    let htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير الطلبات</title>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 20px; }
          h1 { color: #2d3748; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4c6ef5; color: white; padding: 12px; text-align: center; }
          td { border: 1px solid #ddd; padding: 10px; text-align: center; }
          .header { margin-bottom: 30px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>تقرير الطلبات</h1>
          <div class="info">
            <div>تاريخ التصدير: ${new Date().toLocaleDateString('ar-IQ')}</div>
            <div>عدد الطلبات: ${selected.length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>المرسل</th>
              <th>هاتف المرسل</th>
              <th>المستلم</th>
              <th>هاتف المستلم</th>
              <th>مكان الاستلام</th>
              <th>مكان التسليم</th>
              <th>الفئة</th>
              <th>المبلغ</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
    `;

    selected.forEach(order => {
      htmlContent += `
        <tr>
          <td>${order.order_id}</td>
          <td>${order.profile?.first_name || ''} ${order.profile?.last_name || ''}</td>
          <td>${order.profile?.phone || order.sender_phone || ''}</td>
          <td>${order.customer_name}</td>
          <td>${order.phone1}${order.phone2 ? `<br/>${order.phone2}` : ''}</td>
          <td>${order.profile?.governorate?.name_ar || ''} - ${order.profile?.area?.name_ar || ''}</td>
          <td>${order.governorate?.name_ar || ''} - ${order.area?.name_ar || ''}</td>
          <td>${order.category?.name_ar || ''}</td>
          <td>${order.product_price + order.delivery_price} د.ع</td>
          <td>${getStatusText(order.status)}</td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    // إنشاء Blob وتنزيله كملف .doc
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    saveAs(blob, `طلبات_${new Date().toISOString().split('T')[0]}.doc`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>جاري تحميل الطلبات...</p>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <h1>إدارة الطلبات</h1>
          <p className="page-subtitle">إجمالي الطلبات: {orders.length}</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => navigate('/orders/new')}
        >
          <Plus size={18} />
          إنشاء طلب جديد
        </button>
      </div>

      {/* شريط الفلاتر */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="ابحث برقم الطلب، اسم المرسل، اسم المستلم، أو الهواتف..."
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
            <option value="pending">معلق</option>
            <option value="in_receiving">قيد الاستلام</option>
            <option value="in_warehouse">في المستودع</option>
            <option value="in_delivery">قيد التوصيل</option>
            <option value="delivered">تم التوصيل</option>
            <option value="cancelled">ملغى</option>
          </select>
        </div>

        <div className="export-buttons">
          <button className="buttons-btn-export" onClick={exportToExcel}>
            <FileSpreadsheet size={16} />
            تصدير Excel
          </button>
          <button className="buttons-btn-export" onClick={exportToWord}>
            <FileText size={16} />
            تصدير Word
          </button>
          <button className="buttons-btn-secondary" onClick={fetchOrders}>
            <Download size={16} />
            تحديث
          </button>
        </div>
      </div>

      {/* جدول الطلبات */}
      <div className="table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrders(filteredOrders.map(o => o.id));
                    } else {
                      setSelectedOrders([]);
                    }
                  }}
                />
              </th>
              <th>رقم الطلب</th>
              <th>المرسل (العميل)</th>
              <th>المستلم (الزبون)</th>
              <th>مكان الاستلام</th>
              <th>مكان التسليم</th>
              <th>الفئة</th>
              
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id}>
                <td>
                  <input 
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrders([...selectedOrders, order.id]);
                      } else {
                        setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                      }
                    }}
                  />
                </td>
                <td className="order-id">{order.order_id}</td>
                
                {/* بيانات المرسل */}
                <td>
                  <div className="sender-cell">
                    <strong>
                    {order.profile?.first_name || ''} {order.profile?.last_name || ''}
                    </strong>
                    <div className="phone-info">
                    {order.profile?.phone || order.sender_phone || 'لا يوجد'}
                    </div>
                    {/* {order.profile?.email && (
                      <div className="email-info">
                      {order.profile.email}
                      </div>
                    )} */}
                  </div>
                </td>
                
                {/* بيانات المستلم */}
                <td>
                  <div className="receiver-cell">
                    <strong>{order.customer_name}</strong>
                    <div className="phone-info">
                    {order.phone1}
                    </div>
                    
                  </div>
                </td>
                
                {/* مكان الاستلام (موقع المرسل) */}
                <td>
                  <div className="location-cell">
                    {order.profile?.governorate?.name_ar ? (
                      <>
                        <div className="governorate">
                          <strong>المحافظة:</strong> {order.profile.governorate.name_ar}
                        </div>
                        {order.profile.area?.name_ar && (
                          <div className="area">
                            <strong>المنطقة:</strong> {order.profile.area.name_ar}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="no-location">غير محدد</span>
                    )}
                  </div>
                </td>
                
                {/* مكان التسليم (موقع المستلم) */}
                <td>
                  <div className="location-cell">
                    {order.governorate?.name_ar ? (
                      <>
                        <div className="governorate">
                          <strong>المحافظة:</strong> {order.governorate.name_ar}
                        </div>
                        {order.area?.name_ar && (
                          <div className="area">
                            <strong>المنطقة:</strong> {order.area.name_ar}
                          </div>
                        )}
                        {order.nearest_landmark && (
                          <div className="landmark">
                            <strong>أقرب نقطة:</strong> {order.nearest_landmark}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="no-location">غير محدد</span>
                    )}
                  </div>
                </td>
                
                <td>{order.category?.name_ar || '-'}</td>
                
               
                
                <td>
                  <span className={`status-badge status-${order.status}`}>
                    {getStatusText(order.status)}
                  </span>
                </td>
                
                <td>
                  {new Date(order.created_at).toLocaleDateString('ar-IQ', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  <br />
                  <small>
                    {new Date(order.created_at).toLocaleTimeString('ar-IQ', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </small>
                </td>
                
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-view"
                      onClick={() => navigate(`/orders/${order.id}`)}
                      title="عرض التفاصيل"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn-edit"
                      onClick={() => navigate(`/orders/edit/${order.id}`)}
                      title="تعديل الطلب"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(order.id)}
                      title="حذف الطلب"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredOrders.length === 0 && (
          <div className="no-data">
            <p>لا توجد طلبات تطابق معايير البحث</p>
          </div>
        )}
      </div>

      {/* إحصائيات */}
      <div className="stats-container">
        <div className="stat-card">
          <h3>المعلقة</h3>
          <p className="stat-number">{orders.filter(o => o.status === 'pending').length}</p>
        </div>
        <div className="stat-card">
          <h3>قيد التوصيل</h3>
          <p className="stat-number">{orders.filter(o => o.status === 'in_delivery').length}</p>
        </div>
        <div className="stat-card">
          <h3>تم التوصيل</h3>
          <p className="stat-number">{orders.filter(o => o.status === 'delivered').length}</p>
        </div>
        <div className="stat-card">
          <h3>الإجمالي المالي</h3>
          <p className="stat-number">
            {orders.reduce((sum, order) => sum + order.product_price + order.delivery_price, 0)} د.ع
          </p>
        </div>
      </div>
    </div>
  );
};

// دالة للحصول على نص الحالة
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'معلق',
    in_receiving: 'قيد الاستلام',
    in_warehouse: 'في المستودع',
    in_delivery: 'قيد التوصيل',
    delivered: 'تم التوصيل',
    cancelled: 'ملغى',
    returned_to_warehouse: 'مرتجع للمستودع',
    returned_delivered: 'مرتجع تم توصيله'
  };
  return statusMap[status] || status;
};

export default OrdersPage;