import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { 
  User, Mail, Phone, MapPin, Calendar, Edit, 
  Package, DollarSign, Shield, Clock, History,
  ArrowLeft, Home, Activity, Wallet, FileText,
  CreditCard, TrendingUp, XCircle, CheckCircle,
  AlertCircle, Truck, Building, Navigation,
  Download, Printer, Filter, BarChart,
  ShoppingBag, PackageOpen, PackageX
} from 'lucide-react';
import './styles/UserDetails.css';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  address: string;
  country_id?: string;
  governorate_id?: string;
  area_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  notes?: string;
  
  // بيانات مرتبطة
  country?: { name_ar: string; name_en: string };
  governorate?: { name_ar: string; name_en: string; delivery_price: number };
  area?: { name_ar: string; name_en: string };
}

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  phone1: string;
  phone2?: string;
  product_price: number;
  delivery_price: number;
  status: string;
  created_at: string;
  driver?: {
    full_name: string;
    driver_id: string;
    phone: string;
  };
  category?: { name_ar: string };
  governorate?: { name_ar: string };
  area?: { name_ar: string };
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string;
  created_at: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  order_id: string;
  order_number: string;
  product_price: number;
  delivery_price: number;
  total_price: number;
}

interface FinancialStats {
  total_orders: number;
  total_spent: number;
  total_received: number;
  pending_amount: number;
  completed_orders: number;
  cancelled_orders: number;
  active_orders: number;
}

const UserDetailsPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [error, setError] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState('all');
  
  // البيانات
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [financialStats, setFinancialStats] = useState<FinancialStats>({
    total_orders: 0,
    total_spent: 0,
    total_received: 0,
    pending_amount: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    active_orders: 0
  });

  useEffect(() => {
    if (userId) {
      fetchAllData(userId);
    } else {
      setLoading(false);
      setError('معرف المستخدم غير صالح');
    }
  }, [userId]);

  // دالة موحدة لجلب جميع البيانات
  const fetchAllData = async (id: string) => {
    console.log('بدء تحميل البيانات للمستخدم ID:', id);
    setLoading(true);
    setError(null);
    
    try {
      // جلب جميع البيانات بشكل متوازي
      const [userData, ordersData, invoicesData] = await Promise.all([
        fetchUserData(id),
        fetchUserOrders(id),
        fetchUserInvoices(id)
      ]);

      console.log('تم جلب البيانات:', { userData, ordersDataLength: ordersData?.length, invoicesDataLength: invoicesData?.length });

      // تعيين بيانات المستخدم
      if (userData) {
        setUser(userData);
      } else {
        throw new Error('المستخدم غير موجود');
      }
      
      // تعيين الطلبات
      if (ordersData) {
        setAllOrders(ordersData);
        
        // حساب الإحصائيات المالية
        if (ordersData.length > 0) {
          const stats: FinancialStats = {
            total_orders: ordersData.length,
            total_spent: ordersData.reduce((sum, order) => sum + order.product_price + order.delivery_price, 0),
            total_received: ordersData
              .filter(order => order.status === 'delivered')
              .reduce((sum, order) => sum + order.product_price, 0),
            pending_amount: ordersData
              .filter(order => order.status !== 'delivered' && order.status !== 'cancelled')
              .reduce((sum, order) => sum + order.product_price, 0),
            completed_orders: ordersData.filter(order => order.status === 'delivered').length,
            cancelled_orders: ordersData.filter(order => order.status === 'cancelled').length,
            active_orders: ordersData.filter(order => 
              ['pending', 'in_receiving', 'in_warehouse', 'in_delivery'].includes(order.status)
            ).length
          };
          
          setFinancialStats(stats);
        }
      }
      
      // تعيين الفواتير
      if (invoicesData) {
        setInvoices(invoicesData);
      }
      
    } catch (err: any) {
      console.error('خطأ في جلب البيانات:', err);
      setError(err.message || 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
      console.log('انتهى التحميل');
    }
  };

  // جلب بيانات المستخدم
  const fetchUserData = async (id: string): Promise<UserProfile | null> => {
    try {
      console.log('جاري جلب بيانات المستخدم...');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          country:countries(name_ar, name_en),
          governorate:governorates(name_ar, name_en, delivery_price),
          area:areas(name_ar, name_en)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('خطأ في جلب بيانات المستخدم:', error);
        throw new Error(`فشل تحميل بيانات المستخدم: ${error.message}`);
      }
      
      console.log('بيانات المستخدم التي تم جلبها:', data);
      return data;
    } catch (error: any) {
      console.error('خطأ في fetchUserData:', error);
      throw error;
    }
  };

  // جلب طلبات المستخدم
  const fetchUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    console.log('جاري جلب طلبات المستخدم ID:', userId);
    
    // محاولة 1: البحث بـ user_id
    let { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // محاولة 2: إذا لم ينجح، جرب بـ customer_id
    if (ordersError || !ordersData || ordersData.length === 0) {
      console.log('جرب طريقة أخرى للبحث...');
      const response = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });
      
      ordersData = response.data;
      ordersError = response.error;
    }

    // محاولة 3: البحث حسب البريد أو الهاتف (إذا كان userId هو email)
    if (ordersError || !ordersData || ordersData.length === 0) {
      console.log('جرب البحث عبر اسم المستلم...');
      
      // أولاً: جلب معلومات المستخدم
      const { data: userData } = await supabase
        .from('profiles')
        .select('first_name, phone, email')
        .eq('id', userId)
        .single();

      if (userData) {
        const response = await supabase
          .from('orders')
          .select('*')
          .or(`customer_name.ilike.%${userData.first_name}%,phone1.ilike.%${userData.phone}%`)
          .order('created_at', { ascending: false });
        
        ordersData = response.data;
        ordersError = response.error;
      }
    }

    if (ordersError) {
      console.error('خطأ في جلب الطلبات:', ordersError);
      throw new Error(`فشل تحميل طلبات المستخدم: ${ordersError.message}`);
    }

    if (!ordersData || ordersData.length === 0) {
      console.log('لا توجد طلبات للمستخدم');
      return [];
    }

    // الآن جلب البيانات المرتبطة
    const enrichedOrders: Order[] = [];
    
    for (const order of ordersData) {
      const enrichedOrder: any = { ...order };
      
      // جلب بيانات السائق (إذا كان driver_id موجوداً)
      if (order.driver_id) {
        try {
          const { data: driverData } = await supabase
            .from('drivers')
            .select('full_name, driver_id, phone')
            .eq('id', order.driver_id)
            .single();
          
          if (driverData) {
            enrichedOrder.driver = driverData;
          }
        } catch (driverError) {
          console.log('خطأ في جلب بيانات السائق:', driverError);
        }
      }

      // جلب بيانات الفئة (إذا كان category_id موجوداً)
      if (order.category_id) {
        try {
          const { data: categoryData } = await supabase
            .from('categories')
            .select('name_ar')
            .eq('id', order.category_id)
            .single();
          
          if (categoryData) {
            enrichedOrder.category = categoryData;
          }
        } catch (categoryError) {
          console.log('خطأ في جلب بيانات الفئة:', categoryError);
        }
      }

      // جلب بيانات المحافظة (إذا كان governorate_id موجوداً)
      if (order.governorate_id) {
        try {
          const { data: governorateData } = await supabase
            .from('governorates')
            .select('name_ar')
            .eq('id', order.governorate_id)
            .single();
          
          if (governorateData) {
            enrichedOrder.governorate = governorateData;
          }
        } catch (govError) {
          console.log('خطأ في جلب بيانات المحافظة:', govError);
        }
      }

      // جلب بيانات المنطقة (إذا كان area_id موجوداً)
      if (order.area_id) {
        try {
          const { data: areaData } = await supabase
            .from('areas')
            .select('name_ar')
            .eq('id', order.area_id)
            .single();
          
          if (areaData) {
            enrichedOrder.area = areaData;
          }
        } catch (areaError) {
          console.log('خطأ في جلب بيانات المنطقة:', areaError);
        }
      }

      enrichedOrders.push(enrichedOrder);
    }

    console.log('تم جلب الطلبات:', enrichedOrders.length);
    return enrichedOrders;
  } catch (error: any) {
    console.error('خطأ في fetchUserOrders:', error);
    throw error;
  }
};
  // جلب فواتير المستخدم
  const fetchUserInvoices = async (id: string): Promise<Invoice[]> => {
    try {
      console.log('جاري جلب فواتير المستخدم...');
      // جلب الفواتير المرتبطة بالمستخدم
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          items:invoice_items(*)
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (invoicesError) {
        console.error('خطأ في جلب فواتير المستخدم:', invoicesError);
        throw new Error(`فشل تحميل فواتير المستخدم: ${invoicesError.message}`);
      }
      
      console.log('عدد الفواتير التي تم جلبها:', invoicesData?.length || 0);
      return invoicesData || [];
    } catch (error: any) {
      console.error('خطأ في fetchUserInvoices:', error);
      throw error;
    }
  };

  // تصفية الطلبات
  const filteredOrders = allOrders.filter(order => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'active') return ['pending', 'in_receiving', 'in_warehouse', 'in_delivery'].includes(order.status);
    if (orderFilter === 'completed') return order.status === 'delivered';
    if (orderFilter === 'cancelled') return order.status === 'cancelled';
    return true;
  });

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('ar-IQ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // الحصول على نص الحالة
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: 'نشط',
      inactive: 'غير نشط',
      suspended: 'موقوف'
    };
    return statusMap[status] || status;
  };

  const getOrderStatusText = (status: string) => {
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

  // إنشاء شارة الحالة
  const getStatusBadge = (status: string, type: 'user' | 'order' = 'user') => {
    const baseClasses = 'status-badge';
    
    if (type === 'user') {
      switch(status) {
        case 'active':
          return <span className={`${baseClasses} status-success`}>نشط</span>;
        case 'inactive':
          return <span className={`${baseClasses} status-warning`}>غير نشط</span>;
        case 'suspended':
          return <span className={`${baseClasses} status-danger`}>موقوف</span>;
        default:
          return <span className={`${baseClasses} status-secondary`}>{status}</span>;
      }
    } else {
      switch(status) {
        case 'delivered':
          return <span className={`${baseClasses} status-success`}>تم التوصيل</span>;
        case 'cancelled':
          return <span className={`${baseClasses} status-danger`}>ملغى</span>;
        case 'in_delivery':
          return <span className={`${baseClasses} status-info`}>قيد التوصيل</span>;
        default:
          return <span className={`${baseClasses} status-warning`}>{getOrderStatusText(status)}</span>;
      }
    }
  };

  // تصدير بيانات المستخدم
  const exportUserData = () => {
    if (!user) return;
    
    const userData = {
      'المعلومات الشخصية': {
        'الاسم الكامل': `${user.first_name} ${user.last_name}`,
        'البريد الإلكتروني': user.email,
        'رقم الهاتف': user.phone || 'غير محدد',
        'الحالة': getStatusText(user.status),
        'تاريخ التسجيل': formatDate(user.created_at),
        'آخر تحديث': formatDate(user.updated_at)
      },
      'الموقع الجغرافي': {
        'العنوان': user.address || 'غير محدد',
        'المحافظة': user.governorate?.name_ar || 'غير محدد',
        'المنطقة': user.area?.name_ar || 'غير محدد',
        'الدولة': user.country?.name_ar || 'غير محدد'
      },
      'الإحصائيات المالية': {
        'إجمالي الطلبات': financialStats.total_orders,
        'الطلبات المكتملة': financialStats.completed_orders,
        'الطلبات الملغاة': financialStats.cancelled_orders,
        'الطلبات النشطة': financialStats.active_orders,
        'المبالغ المستلمة': formatCurrency(financialStats.total_received),
        'المبالغ المعلقة': formatCurrency(financialStats.pending_amount)
      }
    };

    const dataStr = JSON.stringify(userData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `بيانات_العميل_${user.first_name}_${user.last_name}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // طباعة تقرير المستخدم
  const printUserReport = () => {
    const printContent = document.getElementById('user-details-print');
    if (!printContent || !user) return;
    
    const originalContent = document.body.innerHTML;
    const printElements = printContent.innerHTML;
    
    document.body.innerHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير العميل: ${user.first_name} ${user.last_name}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; }
          .print-header { text-align: center; margin-bottom: 30px; }
          .print-header h1 { color: #2c3e50; }
          .section { margin-bottom: 30px; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
          .section-title { border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 15px; }
          .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
          .info-item { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
          .info-label { font-weight: bold; color: #495057; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 20px; }
          .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
          @media print {
            .no-print { display: none; }
            body { font-size: 12pt; }
          }
        </style>
      </head>
      <body>
        ${printElements}
        <div class="no-print" style="text-align: center; margin-top: 30px; color: #666;">
          <p>تم الطباعة في: ${new Date().toLocaleString('ar-IQ')}</p>
        </div>
      </body>
      </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="user-details-loading">
        <div className="user-details-spinner"></div>
        <p className="user-details-loading-text">جاري تحميل بيانات العميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-details-error">
        <AlertCircle size={48} className="user-details-error-icon" />
        <h2 className="user-details-error-title">{error}</h2>
        <button 
          className="user-details-btn-primary"
          onClick={() => navigate('/users')}
        >
          العودة لقائمة المستخدمين
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-details-error">
        <AlertCircle size={48} className="user-details-error-icon" />
        <h2 className="user-details-error-title">العميل غير موجود</h2>
        <button 
          className="user-details-btn-primary"
          onClick={() => navigate('/users')}
        >
          العودة لقائمة المستخدمين
        </button>
      </div>
    );
  }

  return (
    <div className="user-details-page">
      <div className="user-details-header">
        <div className="user-details-header-left">
          <button 
            className="user-details-btn-back"
            onClick={() => navigate('/users')}
          >
            <ArrowLeft size={18} />
            رجوع للمستخدمين
          </button>
          <h1 className="user-details-title">تفاصيل العميل</h1>
          <div className="user-details-breadcrumb">
            <span onClick={() => navigate('/')}><Home size={14} /> الرئيسية</span>
            <span> / </span>
            <span onClick={() => navigate('/users')}>المستخدمين</span>
            <span> / </span>
            <span className="active">{user.first_name} {user.last_name}</span>
          </div>
        </div>
        
        <div className="user-details-header-actions">
          <button 
            className="user-details-btn-secondary"
           
          >
            <Download size={16} />
            تصدير البيانات
          </button>
          <button 
            className="user-details-btn-secondary"
            onClick={printUserReport}
          >
            <Printer size={16} />
            طباعة التقرير
          </button>
          <button 
            className="user-details-btn-primary"
            onClick={() => navigate(`/users/edit/${user.id}`)}
          >
            <Edit size={16} />
            تعديل البيانات
          </button>
        </div>
      </div>

      <div id="user-details-print">
        {/* البطاقة الرئيسية */}
        <div className="user-details-card user-details-main-card">
          <div className="user-details-card-header">
            <div className="user-details-profile-header">
              <div className="user-details-avatar-large">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.first_name} />
                ) : (
                  <div className="user-details-avatar-placeholder">
                    {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                  </div>
                )}
              </div>
              
              <div className="user-details-profile-info">
                <h2 className="user-details-profile-name">{user.first_name} {user.last_name}</h2>
                <div className="user-details-profile-meta">
                  <span className="user-details-profile-email">
                    <Mail size={16} />
                    {user.email}
                  </span>
                  <span className="user-details-profile-phone">
                    <Phone size={16} />
                    {user.phone || 'لا يوجد هاتف'}
                  </span>
                  <span className="user-details-profile-status">
                    {getStatusBadge(user.status, 'user')}
                  </span>
                </div>
              </div>
            </div>
            
           
          </div>

          {/* الإحصائيات المالية */}
          <div className="user-details-stats-grid">
            <div className="user-details-stat-card user-details-stat-primary">
              <div className="user-details-stat-icon">
                <Package size={24} />
              </div>
              <div className="user-details-stat-content">
                <div className="user-details-stat-value">{financialStats.total_orders}</div>
                <div className="user-details-stat-label">إجمالي الطلبات</div>
              </div>
            </div>

           

            <div className="user-details-stat-card user-details-stat-info">
              <div className="user-details-stat-icon">
                <Wallet size={24} />
              </div>
              <div className="user-details-stat-content">
                <div className="user-details-stat-value">{formatCurrency(financialStats.total_received)}</div>
                <div className="user-details-stat-label">المبالغ المستلمة</div>
              </div>
            </div>

            <div className="user-details-stat-card user-details-stat-warning">
              <div className="user-details-stat-icon">
                <AlertCircle size={24} />
              </div>
              <div className="user-details-stat-content">
                <div className="user-details-stat-value">{formatCurrency(financialStats.pending_amount)}</div>
                <div className="user-details-stat-label">مبالغ معلقة</div>
              </div>
            </div>

            <div className="user-details-stat-card user-details-stat-secondary">
              <div className="user-details-stat-icon">
                <CheckCircle size={24} />
              </div>
              <div className="user-details-stat-content">
                <div className="user-details-stat-value">{financialStats.completed_orders}</div>
                <div className="user-details-stat-label">طلبات مكتملة</div>
              </div>
            </div>

            <div className="user-details-stat-card user-details-stat-danger">
              <div className="user-details-stat-icon">
                <XCircle size={24} />
              </div>
              <div className="user-details-stat-content">
                <div className="user-details-stat-value">{financialStats.cancelled_orders}</div>
                <div className="user-details-stat-label">طلبات ملغاة</div>
              </div>
            </div>
          </div>
        </div>

        {/* التبويبات */}
        <div className="user-details-tabs-container">
          <div className="user-details-tabs">
            <button 
              className={`user-details-tab ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <User size={18} />
              <span>المعلومات الشخصية</span>
            </button>
            
            <button 
              className={`user-details-tab ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <Package size={18} />
              <span>الطلبات ({allOrders.length})</span>
            </button>
            
            <button 
              className={`user-details-tab ${activeTab === 'invoices' ? 'active' : ''}`}
              onClick={() => setActiveTab('invoices')}
            >
              <FileText size={18} />
              <span>الفواتير ({invoices.length})</span>
            </button>
            
            <button 
              className={`user-details-tab ${activeTab === 'financial' ? 'active' : ''}`}
              onClick={() => setActiveTab('financial')}
            >
              <TrendingUp size={18} />
              <span>الإحصائيات المالية</span>
            </button>
            
            <button 
              className={`user-details-tab ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <Activity size={18} />
              <span>سجل النشاط</span>
            </button>
          </div>

          <div className="user-details-tab-content">
            {/* تبويب المعلومات الشخصية */}
            {activeTab === 'info' && (
              <div className="user-details-info-tab">
                <div className="user-details-info-section">
                  <h3 className="user-details-section-title">
                    <User size={20} />
                    <span>المعلومات الأساسية</span>
                  </h3>
                  <div className="user-details-info-grid">
                    <div className="user-details-info-item">
                      <label className="user-details-info-label">الاسم الكامل:</label>
                      <span className="user-details-info-value">{user.first_name} {user.last_name}</span>
                    </div>
                    
                    <div className="user-details-info-item">
                      <label className="user-details-info-label">
                        <Mail size={16} />
                        <span>البريد الإلكتروني:</span>
                      </label>
                      <span className="user-details-info-value">{user.email}</span>
                    </div>
                    
                    <div className="user-details-info-item">
                      <label className="user-details-info-label">
                        <Phone size={16} />
                        <span>رقم الهاتف:</span>
                      </label>
                      <span className="user-details-info-value">{user.phone || 'غير محدد'}</span>
                    </div>
                    
                    <div className="user-details-info-item">
                      <label className="user-details-info-label">رقم العميل:</label>
                      <span className="user-details-info-value user-details-user-id">
                        <Shield size={14} />
                        {user.user_id.substring(0, 8)}...
                      </span>
                    </div>
                    
                    <div className="user-details-info-item">
                      <label className="user-details-info-label">حالة الحساب:</label>
                      <span className="user-details-info-value">{getStatusBadge(user.status, 'user')}</span>
                    </div>
                  </div>
                </div>

                <div className="user-details-info-section">
                  <h3 className="user-details-section-title">
                    <MapPin size={20} />
                    <span>الموقع الجغرافي</span>
                  </h3>
                  <div className="user-details-info-grid">
                    <div className="user-details-info-item">
                      <label className="user-details-info-label">العنوان:</label>
                      <span className="user-details-info-value">{user.address || 'غير محدد'}</span>
                    </div>
                    
                    <div className="user-details-info-item">
                      <label className="user-details-info-label">
                        <Building size={16} />
                        <span>المحافظة:</span>
                      </label>
                      <span className="user-details-info-value">
                        {user.governorate?.name_ar || 'غير محدد'}
                        {user.governorate?.delivery_price && (
                          <span className="user-details-price-info"> - {user.governorate.delivery_price} د.ع للتوصيل</span>
                        )}
                      </span>
                    </div>
                    
                    <div className="user-details-info-item">
                      <label className="user-details-info-label">
                        <Navigation size={16} />
                        <span>المنطقة:</span>
                      </label>
                      <span className="user-details-info-value">{user.area?.name_ar || 'غير محدد'}</span>
                    </div>
                    
                    <div className="user-details-info-item">
                      <label className="user-details-info-label">الدولة:</label>
                      <span className="user-details-info-value">{user.country?.name_ar || 'غير محدد'}</span>
                    </div>
                  </div>
                </div>

                <div className="user-details-info-section">
                  <h3 className="user-details-section-title">
                    <Calendar size={20} />
                    <span>معلومات التسجيل</span>
                  </h3>
                  <div className="user-details-info-grid">
                    <div className="user-details-info-item">
                      <label className="user-details-info-label">تاريخ التسجيل:</label>
                      <span className="user-details-info-value">{formatDate(user.created_at)}</span>
                    </div>
                    
                    <div className="user-details-info-item">
                      <label className="user-details-info-label">آخر تحديث:</label>
                      <span className="user-details-info-value">{formatDate(user.updated_at)}</span>
                    </div>
                    
                    {user.last_login && (
                      <div className="user-details-info-item">
                        <label className="user-details-info-label">
                          <Clock size={16} />
                          <span>آخر دخول:</span>
                        </label>
                        <span className="user-details-info-value">{formatDate(user.last_login)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {user.notes && (
                  <div className="user-details-info-section">
                    <h3 className="user-details-section-title">ملاحظات</h3>
                    <div className="user-details-notes-content">
                      <p>{user.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* تبويب الطلبات */}
            {activeTab === 'orders' && (
              <div className="user-details-orders-tab">
                <div className="user-details-orders-header">
                  <div className="user-details-orders-filter">
                    <Filter size={16} />
                    <select 
                      value={orderFilter}
                      onChange={(e) => setOrderFilter(e.target.value)}
                      className="user-details-filter-select"
                    >
                      <option value="all">جميع الطلبات</option>
                      <option value="active">الطلبات النشطة</option>
                      <option value="completed">الطلبات المكتملة</option>
                      <option value="cancelled">الطلبات الملغاة</option>
                    </select>
                  </div>
                  
                  <div className="user-details-orders-stats">
                    <span className="user-details-orders-count">
                      {filteredOrders.length} طلب
                    </span>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="user-details-empty-state">
                    <Package size={48} />
                    <h3>لا توجد طلبات</h3>
                    <p>لا يوجد طلبات تطابق معايير البحث</p>
                  </div>
                ) : (
                  <div className="user-details-orders-table-container">
                    <table className="user-details-orders-table">
                      <thead>
                        <tr>
                          <th>رقم الطلب</th>
                          <th>اسم المستلم</th>
                          <th>الهاتف</th>
                          <th>الموقع</th>
                          <th>السعر</th>
                          <th>الحالة</th>
                          <th>التاريخ</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className={`user-details-order-row status-${order.status}`}>
                            <td className="user-details-order-id">#{order.order_id}</td>
                            <td className="user-details-order-customer">
                              <strong>{order.customer_name}</strong>
                              {order.category && (
                                <small className="user-details-order-category">
                                  {order.category.name_ar}
                                </small>
                              )}
                            </td>
                            <td className="user-details-order-phone">
                              <div className="user-details-phone-primary">{order.phone1}</div>
                              {order.phone2 && (
                                <div className="user-details-phone-secondary">{order.phone2}</div>
                              )}
                            </td>
                            <td className="user-details-order-location">
                              <div className="user-details-location-info">
                                {order.governorate?.name_ar || '-'}
                                {order.area?.name_ar && ` / ${order.area.name_ar}`}
                              </div>
                              {order.driver && (
                                <div className="user-details-driver-info">
                                  <Truck size={12} />
                                  <small>{order.driver.full_name}</small>
                                </div>
                              )}
                            </td>
                            <td className="user-details-order-price">
                              <div className="user-details-price-info">
                                <div>المنتج: {formatCurrency(order.product_price)}</div>
                                <div>التوصيل: {formatCurrency(order.delivery_price)}</div>
                                <div className="user-details-price-total">
                                  الإجمالي: {formatCurrency(order.product_price + order.delivery_price)}
                                </div>
                              </div>
                            </td>
                            <td className="user-details-order-status">
                              {getStatusBadge(order.status, 'order')}
                            </td>
                            <td className="user-details-order-date">
                              {new Date(order.created_at).toLocaleDateString('ar-SA')}
                            </td>
                            <td className="user-details-order-actions">
                              <button 
                                className="user-details-btn-view"
                                onClick={() => navigate(`/orders/${order.id}`)}
                                title="عرض التفاصيل"
                              >
                                عرض
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* تبويب الفواتير */}
            {activeTab === 'invoices' && (
              <div className="user-details-invoices-tab">
                {invoices.length === 0 ? (
                  <div className="user-details-empty-state">
                    <FileText size={48} />
                    <h3>لا توجد فواتير</h3>
                    <p>لم يتم إنشاء أي فواتير لهذا المستخدم</p>
                  </div>
                ) : (
                  <div className="user-details-invoices-list">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="user-details-invoice-card">
                        <div className="user-details-invoice-header">
                          <div className="user-details-invoice-info">
                            <h4 className="user-details-invoice-number">فاتورة #{invoice.invoice_number}</h4>
                            <div className="user-details-invoice-dates">
                              <span>تاريخ الإصدار: {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}</span>
                              <span>تاريخ الاستحقاق: {new Date(invoice.due_date).toLocaleDateString('ar-SA')}</span>
                            </div>
                          </div>
                          
                          <div className="user-details-invoice-status">
                            <span className={`user-details-invoice-status-badge status-${invoice.status}`}>
                              {invoice.status === 'paid' ? 'مدفوعة' : invoice.status === 'pending' ? 'معلقة' : 'متأخرة'}
                            </span>
                            <span className="user-details-invoice-amount">
                              {formatCurrency(invoice.total_amount)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="user-details-invoice-items">
                          <h5>تفاصيل الفاتورة:</h5>
                          <table className="user-details-invoice-items-table">
                            <thead>
                              <tr>
                                <th>رقم الطلب</th>
                                <th>سعر المنتج</th>
                                <th>سعر التوصيل</th>
                                <th>الإجمالي</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoice.items.map((item) => (
                                <tr key={item.id}>
                                  <td>#{item.order_number}</td>
                                  <td>{formatCurrency(item.product_price)}</td>
                                  <td>{formatCurrency(item.delivery_price)}</td>
                                  <td>{formatCurrency(item.total_price)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="user-details-invoice-actions">
                          <button className="user-details-btn-secondary">
                            <Download size={16} />
                            تحميل الفاتورة
                          </button>
                          <button className="user-details-btn-primary">
                            <CreditCard size={16} />
                            تسديد الفاتورة
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* تبويب الإحصائيات المالية */}
            {activeTab === 'financial' && (
              <div className="user-details-financial-tab">
                <div className="user-details-financial-overview">
                  <div className="user-details-financial-chart">
                    <h3 className="user-details-section-title">
                      <BarChart size={20} />
                      <span>نظرة عامة على الأرباح</span>
                    </h3>
                    <div className="user-details-chart-container">
                      <div className="user-details-chart-placeholder">
                        <BarChart size={48} />
                        <p>مخطط الأرباح الشهري</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="user-details-financial-breakdown">
                    <h3 className="user-details-section-title">
                      <TrendingUp size={20} />
                      <span>تفصيل المدفوعات</span>
                    </h3>
                    <div className="user-details-breakdown-grid">
                      <div className="user-details-breakdown-item user-details-breakdown-success">
                        <div className="user-details-breakdown-label">المبالغ المستلمة</div>
                        <div className="user-details-breakdown-value">
                          {formatCurrency(financialStats.total_received)}
                        </div>
                        <div className="user-details-breakdown-percentage">
                          {financialStats.total_spent > 0 
                            ? `${Math.round((financialStats.total_received / financialStats.total_spent) * 100)}%`
                            : '0%'
                          }
                        </div>
                      </div>
                      
                      <div className="user-details-breakdown-item user-details-breakdown-warning">
                        <div className="user-details-breakdown-label">المبالغ المعلقة</div>
                        <div className="user-details-breakdown-value">
                          {formatCurrency(financialStats.pending_amount)}
                        </div>
                        <div className="user-details-breakdown-percentage">
                          {financialStats.total_spent > 0 
                            ? `${Math.round((financialStats.pending_amount / financialStats.total_spent) * 100)}%`
                            : '0%'
                          }
                        </div>
                      </div>
                      
                      <div className="user-details-breakdown-item user-details-breakdown-danger">
                        <div className="user-details-breakdown-label">الطلبات الملغاة</div>
                        <div className="user-details-breakdown-value">
                          {financialStats.cancelled_orders} طلبات
                        </div>
                        <div className="user-details-breakdown-percentage">
                          {financialStats.total_orders > 0 
                            ? `${Math.round((financialStats.cancelled_orders / financialStats.total_orders) * 100)}%`
                            : '0%'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="user-details-financial-summary">
                  <h3 className="user-details-section-title">ملخص مالي</h3>
                  <div className="user-details-summary-grid">
                    <div className="user-details-summary-card">
                      <div className="user-details-summary-icon">
                        <ShoppingBag size={24} />
                      </div>
                      <div className="user-details-summary-content">
                        <div className="user-details-summary-label">متوسط قيمة الطلب</div>
                        <div className="user-details-summary-value">
                          {financialStats.total_orders > 0 
                            ? formatCurrency(financialStats.total_spent / financialStats.total_orders)
                            : formatCurrency(0)
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="user-details-summary-card">
                      <div className="user-details-summary-icon">
                        <PackageOpen size={24} />
                      </div>
                      <div className="user-details-summary-content">
                        <div className="user-details-summary-label">نسبة النجاح</div>
                        <div className="user-details-summary-value">
                          {financialStats.total_orders > 0 
                            ? `${Math.round((financialStats.completed_orders / financialStats.total_orders) * 100)}%`
                            : '0%'
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="user-details-summary-card">
                      <div className="user-details-summary-icon">
                        <PackageX size={24} />
                      </div>
                      <div className="user-details-summary-content">
                        <div className="user-details-summary-label">نسبة الإلغاء</div>
                        <div className="user-details-summary-value">
                          {financialStats.total_orders > 0 
                            ? `${Math.round((financialStats.cancelled_orders / financialStats.total_orders) * 100)}%`
                            : '0%'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* تبويب سجل النشاط */}
            {activeTab === 'activity' && (
              <div className="user-details-activity-tab">
                <div className="user-details-activity-list">
                  <div className="user-details-activity-item">
                    <div className="user-details-activity-icon">
                      <Calendar size={18} />
                    </div>
                    <div className="user-details-activity-content">
                      <div className="user-details-activity-header">
                        <h4>تم إنشاء الحساب</h4>
                        <span className="user-details-activity-date">{formatDate(user.created_at)}</span>
                      </div>
                      <p className="user-details-activity-description">تم إنشاء حساب المستخدم في النظام</p>
                    </div>
                  </div>

                  {user.last_login && (
                    <div className="user-details-activity-item">
                      <div className="user-details-activity-icon">
                        <Clock size={18} />
                      </div>
                      <div className="user-details-activity-content">
                        <div className="user-details-activity-header">
                          <h4>آخر تسجيل دخول</h4>
                          <span className="user-details-activity-date">{formatDate(user.last_login)}</span>
                        </div>
                        <p className="user-details-activity-description">قام المستخدم بتسجيل الدخول للنظام</p>
                      </div>
                    </div>
                  )}

                  <div className="user-details-activity-item">
                    <div className="user-details-activity-icon">
                      <History size={18} />
                    </div>
                    <div className="user-details-activity-content">
                      <div className="user-details-activity-header">
                        <h4>آخر تحديث للبيانات</h4>
                        <span className="user-details-activity-date">{formatDate(user.updated_at)}</span>
                      </div>
                      <p className="user-details-activity-description">تم تحديث معلومات الملف الشخصي</p>
                    </div>
                  </div>

                  {financialStats.total_orders > 0 && (
                    <div className="user-details-activity-item">
                      <div className="user-details-activity-icon">
                        <Package size={18} />
                      </div>
                      <div className="user-details-activity-content">
                        <div className="user-details-activity-header">
                          <h4>أول طلب</h4>
                          <span className="user-details-activity-date">
                            {allOrders.length > 0 ? formatDate(allOrders[allOrders.length - 1].created_at) : '-'}
                          </span>
                        </div>
                        <p className="user-details-activity-description">تم تقديم أول طلب للمستخدم</p>
                      </div>
                    </div>
                  )}

                  {financialStats.completed_orders > 0 && (
                    <div className="user-details-activity-item">
                      <div className="user-details-activity-icon">
                        <CheckCircle size={18} />
                      </div>
                      <div className="user-details-activity-content">
                        <div className="user-details-activity-header">
                          <h4>آخر طلب مكتمل</h4>
                          <span className="user-details-activity-date">
                            {allOrders.find(o => o.status === 'delivered')?.created_at 
                              ? formatDate(allOrders.find(o => o.status === 'delivered')!.created_at)
                              : '-'
                            }
                          </span>
                        </div>
                        <p className="user-details-activity-description">آخر طلب تم تسليمه بنجاح</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsPage;