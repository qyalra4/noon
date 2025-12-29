import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, Package, FileText, DollarSign,
  TrendingUp, TrendingDown, Activity, Calendar,
  BarChart, PieChart, Target, Clock, CheckCircle,
  AlertCircle, Truck, CreditCard, ShoppingBag,
  RefreshCw, Download, MoreVertical, ArrowUpRight,
  ArrowDownRight, Eye, ChevronRight, ChevronLeft
} from 'lucide-react';
import './styles/Dashboard.css';

interface DashboardStats {
  totalUsers: number;
  totalAdmins: number;
  totalOrders: number;
  totalInvoices: number;
  pendingOrders: number;
  completedOrders: number;
  pendingInvoices: number;
  paidInvoices: number;
  todaysOrders: number;
  weeklyOrders: number;
  monthlyRevenue: number;
  activeCustomers: number;
}

interface RecentOrder {
  id: string;
  order_id: string;
  customer_name: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  due_date: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAdmins: 0,
    totalOrders: 0,
    totalInvoices: 0,
    pendingOrders: 0,
    completedOrders: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    todaysOrders: 0,
    weeklyOrders: 0,
    monthlyRevenue: 0,
    activeCustomers: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // حساب التواريخ للفلاتر
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      // جلب جميع الإحصائيات في وقت واحد
      const [
        usersData,
        adminsData,
        ordersData,
        invoicesData,
        todaysOrdersData,
        weeklyOrdersData,
        completedOrdersData,
        pendingInvoicesData,
        paidInvoicesData,
        activeCustomersData,
        recentOrdersData,
        recentInvoicesData
      ] = await Promise.all([
        // عدد المستخدمين
        supabase.from('profiles').select('id', { count: 'exact' }),
        
        // عدد المشرفين
        supabase.from('admins').select('id', { count: 'exact' }),
        
        // عدد الطلبات
        supabase.from('orders').select('id', { count: 'exact' }),
        
        // عدد الفواتير
        supabase.from('invoices').select('id', { count: 'exact' }),
        
        // طلبات اليوم
        supabase.from('orders')
          .select('id', { count: 'exact' })
          .gte('created_at', today.toISOString()),
        
        // طلبات الأسبوع
        supabase.from('orders')
          .select('id', { count: 'exact' })
          .gte('created_at', weekAgo.toISOString()),
        
        // الطلبات المكتملة
        supabase.from('orders')
          .select('id', { count: 'exact' })
          .eq('status', 'delivered'),
        
        // الفواتير المعلقة
        supabase.from('invoices')
          .select('id', { count: 'exact' })
          .eq('status', 'pending'),
        
        // الفواتير المدفوعة
        supabase.from('invoices')
          .select('id', { count: 'exact' })
          .eq('status', 'paid'),
        
        // العملاء النشطين (الذين لديهم طلبات في الشهر الماضي)
        supabase.from('orders')
          .select('user_id', { count: 'exact' })
          .gte('created_at', monthAgo.toISOString())
          .not('user_id', 'is', null),
        
        // الطلبات الحديثة
        supabase.from('orders')
          .select('id, order_id, customer_name, status, product_price, delivery_price, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        
        // الفواتير الحديثة
        supabase.from('invoices')
          .select(`
            id,
            invoice_number,
            total_amount,
            status,
            due_date,
            profile:user_id (first_name, last_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // حساب الإيرادات الشهرية (مجموع الفواتير المدفوعة في الشهر)
      const { data: monthlyRevenueData } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('created_at', monthAgo.toISOString());

      const monthlyRevenue = monthlyRevenueData?.reduce((sum, invoice) => 
        sum + (invoice.total_amount || 0), 0
      ) || 0;

      // تحديث الإحصائيات
      setStats({
        totalUsers: usersData.count || 0,
        totalAdmins: adminsData.count || 0,
        totalOrders: ordersData.count || 0,
        totalInvoices: invoicesData.count || 0,
        pendingOrders: (ordersData.count || 0) - (completedOrdersData.count || 0),
        completedOrders: completedOrdersData.count || 0,
        pendingInvoices: pendingInvoicesData.count || 0,
        paidInvoices: paidInvoicesData.count || 0,
        todaysOrders: todaysOrdersData.count || 0,
        weeklyOrders: weeklyOrdersData.count || 0,
        monthlyRevenue,
        activeCustomers: activeCustomersData.count || 0
      });

      // تحديث الطلبات الحديثة
      setRecentOrders(recentOrdersData.data?.map(order => ({
        id: order.id,
        order_id: order.order_id,
        customer_name: order.customer_name,
        status: order.status,
        total_amount: (order.product_price || 0) + (order.delivery_price || 0),
        created_at: order.created_at
      })) || []);

     

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string, color: string } } = {
      'pending': { label: 'معلق', color: 'warning' },
      'processing': { label: 'جاري المعالجة', color: 'info' },
      'delivered': { label: 'تم التوصيل', color: 'success' },
      'cancelled': { label: 'ملغي', color: 'danger' },
      'paid': { label: 'مدفوع', color: 'success' },
      'overdue': { label: 'متأخر', color: 'danger' }
    };
    
    const statusInfo = statusMap[status] || { label: status, color: 'secondary' };
    
    return (
      <span className={`status-badge status-${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-IQ', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getPeriodLabel = () => {
    const labels = {
      'day': 'اليوم',
      'week': 'هذا الأسبوع',
      'month': 'هذا الشهر'
    };
    return labels[selectedPeriod];
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner"></div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* رأس الصفحة */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <div className="dashboard-header-icon">
            <Activity size={32} />
          </div>
          <div className="dashboard-header-title">
            <h1>لوحة التحكم</h1>
            <p className="dashboard-header-subtitle">
              نظرة عامة على أداء النظام وإحصائياته
            </p>
          </div>
        </div>

        <div className="dashboard-header-actions">
          <div className="dashboard-period-selector">
            <button
              className={`period-btn ${selectedPeriod === 'day' ? 'active' : ''}`}
              onClick={() => setSelectedPeriod('day')}
            >
              اليوم
            </button>
            <button
              className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
              onClick={() => setSelectedPeriod('week')}
            >
              الأسبوع
            </button>
            <button
              className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
              onClick={() => setSelectedPeriod('month')}
            >
              الشهر
            </button>
          </div>

          <button
            className="dashboard-btn dashboard-btn-outline"
            onClick={fetchDashboardData}
          >
            <RefreshCw size={18} />
            تحديث
          </button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="stats-grid">
        {/* المستخدمين */}
        <div className="stats-card stats-card-users">
          <div className="stats-card-header">
            <div className="stats-card-icon">
              <Users size={24} />
            </div>
            <div className="stats-card-trend">
              <TrendingUp size={16} />
              <span>+12%</span>
            </div>
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{stats.totalUsers.toLocaleString()}</h3>
            <p className="stats-card-label">إجمالي المستخدمين</p>
          </div>
          <div className="stats-card-footer">
            <span className="stats-card-detail">
              {stats.activeCustomers} عميل نشط
            </span>
            <button 
              className="stats-card-action"
              onClick={() => navigate('/users')}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* المشرفين */}
        <div className="stats-card stats-card-admins">
          <div className="stats-card-header">
            <div className="stats-card-icon">
              <UserPlus size={24} />
            </div>
            <div className="stats-card-trend">
              <TrendingUp size={16} />
              <span>+5%</span>
            </div>
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{stats.totalAdmins.toLocaleString()}</h3>
            <p className="stats-card-label">إجمالي المشرفين</p>
          </div>
          <div className="stats-card-footer">
            <span className="stats-card-detail">
              {stats.totalAdmins} مشرف نشط
            </span>
            <button 
              className="stats-card-action"
              onClick={() => navigate('/admins')}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* الطلبات */}
        <div className="stats-card stats-card-orders">
          <div className="stats-card-header">
            <div className="stats-card-icon">
              <Package size={24} />
            </div>
            <div className="stats-card-trend">
              <TrendingUp size={16} />
              <span>+24%</span>
            </div>
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{stats.totalOrders.toLocaleString()}</h3>
            <p className="stats-card-label">إجمالي الطلبات</p>
          </div>
          <div className="stats-card-footer">
            <span className="stats-card-detail">
              {stats.completedOrders} مكتمل • {stats.pendingOrders} معلق
            </span>
            <button 
              className="stats-card-action"
              onClick={() => navigate('/orders')}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* الفواتير */}
        <div className="stats-card stats-card-invoices">
          <div className="stats-card-header">
            <div className="stats-card-icon">
              <FileText size={24} />
            </div>
            <div className="stats-card-trend">
              <TrendingUp size={16} />
              <span>+18%</span>
            </div>
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{stats.totalInvoices.toLocaleString()}</h3>
            <p className="stats-card-label">إجمالي الفواتير</p>
          </div>
          <div className="stats-card-footer">
            <span className="stats-card-detail">
              {stats.paidInvoices} مدفوع • {stats.pendingInvoices} معلق
            </span>
            <button 
              className="stats-card-action"
              onClick={() => navigate('/invoices')}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* الإيرادات */}
        <div className="stats-card stats-card-revenue">
          <div className="stats-card-header">
            <div className="stats-card-icon">
              <DollarSign size={24} />
            </div>
            <div className="stats-card-trend">
              <TrendingUp size={16} />
              <span>+32%</span>
            </div>
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{formatCurrency(stats.monthlyRevenue)}</h3>
            <p className="stats-card-label">الإيرادات الشهرية</p>
          </div>
          <div className="stats-card-footer">
            <span className="stats-card-detail">
              هذا الشهر
            </span>
            <button 
              className="stats-card-action"
              onClick={() => navigate('/reports/financial')}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* النشاط اليومي */}
        <div className="stats-card stats-card-activity">
          <div className="stats-card-header">
            <div className="stats-card-icon">
              <Target size={24} />
            </div>
            <div className="stats-card-trend">
              <Activity size={16} />
            </div>
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{stats.todaysOrders}</h3>
            <p className="stats-card-label">طلبات {getPeriodLabel()}</p>
          </div>
          <div className="stats-card-footer">
            <span className="stats-card-detail">
              {stats.weeklyOrders} طلب هذا الأسبوع
            </span>
            <button 
              className="stats-card-action"
              onClick={() => navigate('/reports/orders')}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* الشبكة الرئيسية */}
      <div className="dashboard-grid">
        {/* الطلبات الحديثة */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <Package size={20} />
              <h3>الطلبات الحديثة</h3>
            </div>
            <button 
              className="dashboard-btn-link"
              onClick={() => navigate('/orders')}
            >
              عرض الكل <ChevronLeft size={16} />
            </button>
          </div>
          
          <div className="dashboard-card-content">
            {recentOrders.length === 0 ? (
              <div className="empty-state">
                <Package size={32} />
                <p>لا توجد طلبات حديثة</p>
              </div>
            ) : (
              <div className="recent-list">
                {recentOrders.map((order) => (
                  <div key={order.id} className="recent-item">
                    <div className="recent-item-main">
                      <div className="recent-item-header">
                        <span className="recent-item-id">طلب #{order.order_id}</span>
                        <span className="recent-item-date">
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                      <div className="recent-item-customer">
                        {order.customer_name}
                      </div>
                    </div>
                    
                    <div className="recent-item-side">
                      <div className="recent-item-status">
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="recent-item-amount">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <button 
                        className="recent-item-action"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* الفواتير الحديثة */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <CreditCard size={20} />
              <h3>الفواتير الحديثة</h3>
            </div>
            <button 
              className="dashboard-btn-link"
              onClick={() => navigate('/invoices')}
            >
              عرض الكل <ChevronLeft size={16} />
            </button>
          </div>
          
          <div className="dashboard-card-content">
            {recentInvoices.length === 0 ? (
              <div className="empty-state">
                <FileText size={32} />
                <p>لا توجد فواتير حديثة</p>
              </div>
            ) : (
              <div className="recent-list">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="recent-item">
                    <div className="recent-item-main">
                      <div className="recent-item-header">
                        <span className="recent-item-id">فاتورة #{invoice.invoice_number}</span>
                        <span className="recent-item-date">
                          مستحق: {formatDate(invoice.due_date)}
                        </span>
                      </div>
                      <div className="recent-item-customer">
                        {invoice.customer_name || 'عميل'}
                      </div>
                    </div>
                    
                    <div className="recent-item-side">
                      <div className="recent-item-status">
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="recent-item-amount">
                        {formatCurrency(invoice.total_amount)}
                      </div>
                      <button 
                        className="recent-item-action"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ملخص الأداء */}
        <div className="dashboard-card dashboard-card-summary">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <BarChart size={20} />
              <h3>ملخص الأداء</h3>
            </div>
            <select 
              className="dashboard-select"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
            >
              <option value="day">اليوم</option>
              <option value="week">هذا الأسبوع</option>
              <option value="month">هذا الشهر</option>
            </select>
          </div>
          
          <div className="dashboard-card-content">
            <div className="performance-summary">
              <div className="performance-item">
                <div className="performance-item-label">
                  <div className="performance-item-icon">
                    <Package size={16} />
                  </div>
                  <span>معدل إتمام الطلبات</span>
                </div>
                <div className="performance-item-value">
                  {stats.totalOrders > 0 
                    ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
                    : 0}%
                </div>
              </div>
              
              <div className="performance-item">
                <div className="performance-item-label">
                  <div className="performance-item-icon">
                    <Clock size={16} />
                  </div>
                  <span>متوسط وقت التسليم</span>
                </div>
                <div className="performance-item-value">2.4 يوم</div>
              </div>
              
              <div className="performance-item">
                <div className="performance-item-label">
                  <div className="performance-item-icon">
                    <CheckCircle size={16} />
                  </div>
                  <span>رضا العملاء</span>
                </div>
                <div className="performance-item-value">94%</div>
              </div>
              
              <div className="performance-item">
                <div className="performance-item-label">
                  <div className="performance-item-icon">
                    <Truck size={16} />
                  </div>
                  <span>كفاءة السائقين</span>
                </div>
                <div className="performance-item-value">88%</div>
              </div>
              
              <div className="performance-item">
                <div className="performance-item-label">
                  <div className="performance-item-icon">
                    <CreditCard size={16} />
                  </div>
                  <span>تحصيل الفواتير</span>
                </div>
                <div className="performance-item-value">
                  {stats.totalInvoices > 0 
                    ? Math.round((stats.paidInvoices / stats.totalInvoices) * 100)
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="dashboard-card dashboard-card-quick-stats">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <PieChart size={20} />
              <h3>إحصائيات سريعة</h3>
            </div>
          </div>
          
          <div className="dashboard-card-content">
            <div className="quick-stats-grid">
              <div className="quick-stat">
                <div className="quick-stat-icon quick-stat-orders">
                  <Package size={20} />
                </div>
                <div className="quick-stat-info">
                  <div className="quick-stat-value">{stats.todaysOrders}</div>
                  <div className="quick-stat-label">طلبات اليوم</div>
                </div>
              </div>
              
              <div className="quick-stat">
                <div className="quick-stat-icon quick-stat-revenue">
                  <DollarSign size={20} />
                </div>
                <div className="quick-stat-info">
                  <div className="quick-stat-value">{formatCurrency(stats.monthlyRevenue / 30)}</div>
                  <div className="quick-stat-label">متوسط الإيراد اليومي</div>
                </div>
              </div>
              
              <div className="quick-stat">
                <div className="quick-stat-icon quick-stat-users">
                  <Users size={20} />
                </div>
                <div className="quick-stat-info">
                  <div className="quick-stat-value">{Math.round(stats.totalUsers / 30)}</div>
                  <div className="quick-stat-label">مستخدم جديد/يوم</div>
                </div>
              </div>
              
              <div className="quick-stat">
                <div className="quick-stat-icon quick-stat-success">
                  <CheckCircle size={20} />
                </div>
                <div className="quick-stat-info">
                  <div className="quick-stat-value">{stats.completedOrders}</div>
                  <div className="quick-stat-label">طلبات مكتملة</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* الإجراءات السريعة */}
      {/* <div className="quick-actions-section">
        <h3 className="section-title">الإجراءات السريعة</h3>
        <div className="quick-actions-grid">
          <button 
            className="quick-action"
            onClick={() => navigate('/orders/add')}
          >
            <div className="quick-action-icon quick-action-order">
              <Package size={24} />
            </div>
            <span>إنشاء طلب جديد</span>
          </button>
          
          <button 
            className="quick-action"
            onClick={() => navigate('/invoices/create')}
          >
            <div className="quick-action-icon quick-action-invoice">
              <FileText size={24} />
            </div>
            <span>إنشاء فاتورة</span>
          </button>
          
          <button 
            className="quick-action"
            onClick={() => navigate('/users/add')}
          >
            <div className="quick-action-icon quick-action-user">
              <UserPlus size={24} />
            </div>
            <span>إضافة مستخدم</span>
          </button>
          
          <button 
            className="quick-action"
            onClick={() => navigate('/admins/add')}
          >
            <div className="quick-action-icon quick-action-admin">
              <Users size={24} />
            </div>
            <span>إضافة مشرف</span>
          </button>
          
          <button 
            className="quick-action"
            onClick={() => navigate('/reports')}
          >
            <div className="quick-action-icon quick-action-report">
              <BarChart size={24} />
            </div>
            <span>التقارير والإحصائيات</span>
          </button>
          
          <button 
            className="quick-action"
            onClick={() => navigate('/settings')}
          >
            <div className="quick-action-icon quick-action-settings">
              <Activity size={24} />
            </div>
            <span>إعدادات النظام</span>
          </button>
        </div>
      </div> */}
    </div>
  );
};

export default Dashboard;