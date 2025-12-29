// DriverOrdersPage.tsx - صفحة خاصة بالسائق
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  Package, MapPin, Phone, Clock, CheckCircle, 
  XCircle, Navigation, User, Truck
} from 'lucide-react';
import './DriversPage.css';

const DriverOrdersPage = () => {
  const [driver, setDriver] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkDriverSession();
  }, []);

  const checkDriverSession = async () => {
    try {
      // هنا يمكنك إضافة نظام تسجيل دخول للسائقين
      // أو استخدام النظام الحالي
      fetchDriverOrders();
    } catch (error) {
      console.error('Error checking session:', error);
      navigate('/login');
    }
  };

  const fetchDriverOrders = async () => {
    setLoading(true);
    try {
      // جلب بيانات السائق الحالي (يمكن تعديل هذا حسب نظام المصادقة)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('غير مسجل دخول');
      }

      // جلب بيانات السائق
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (driverError) throw driverError;

      setDriver(driverData);

      // جلب طلبات السائق
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          category:categories(name_ar),
          governorate:governorates(name_ar),
          area:areas(name_ar)
        `)
        .eq('driver_id', driverData.id)
        .in('status', ['in_delivery', 'delivered'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

    } catch (error) {
      console.error('Error fetching driver orders:', error);
      alert('حدث خطأ في تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: now,
          delivery_completed_at: newStatus === 'delivered' ? now : null
        })
        .eq('id', orderId);

      if (error) throw error;

      // تحديث البيانات المحلية
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: now }
          : order
      ));

      alert(`تم تحديث حالة الطلب إلى: ${getStatusText(newStatus)}`);
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('حدث خطأ أثناء تحديث حالة الطلب');
    }
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
    <div className="driver-orders-page">
      <div className="driver-header">
        <div className="driver-profile">
          <Truck size={24} />
          <div>
            <h1>لوحة السائق</h1>
            <p className="driver-name">{driver?.full_name} - {driver?.driver_id}</p>
          </div>
        </div>
        <button className="btn-refresh" onClick={fetchDriverOrders}>
          تحديث
        </button>
      </div>

      <div className="driver-stats">
        <div className="stat-card">
          <h3>طلبات جارية</h3>
          <p className="stat-number">
            {orders.filter(o => o.status === 'in_delivery').length}
          </p>
        </div>
        <div className="stat-card">
          <h3>طلبات مكتملة</h3>
          <p className="stat-number">
            {orders.filter(o => o.status === 'delivered').length}
          </p>
        </div>
      </div>

      <div className="orders-list">
        <h2>طلباتي</h2>
        
        {orders.length === 0 ? (
          <div className="no-orders">
            <Package size={48} />
            <p>لا توجد طلبات حالياً</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div>
                  <h3>طلب #{order.order_id}</h3>
                  <p className="order-date">
                    <Clock size={14} />
                    {new Date(order.created_at).toLocaleString('ar-IQ')}
                  </p>
                </div>
                <span className={`status-badge status-${order.status}`}>
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="order-details">
                <div className="detail-row">
                  <User size={14} />
                  <span>العميل: {order.customer_name}</span>
                </div>
                <div className="detail-row">
                  <Phone size={14} />
                  <span>{order.phone1}</span>
                </div>
                <div className="detail-row">
                  <MapPin size={14} />
                  <span>{order.governorate?.name_ar} - {order.area?.name_ar}</span>
                </div>
                <div className="detail-row">
                  <Package size={14} />
                  <span>{order.category?.name_ar}</span>
                </div>
                <div className="detail-row">
                  <span>السعر: {order.product_price} د.ع</span>
                </div>
              </div>

              <div className="order-actions">
                {order.status === 'in_delivery' ? (
                  <>
                    <button 
                      className="btn-secondary"
                      onClick={() => window.open(`https://maps.google.com/?q=${order.area?.name_ar}`)}
                    >
                      <Navigation size={16} />
                      فتح الخريطة
                    </button>
                    <button 
                      className="btn-primary"
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                    >
                      <CheckCircle size={16} />
                      تأكيد التوصيل
                    </button>
                  </>
                ) : (
                  <div className="delivered-info">
                    <CheckCircle size={16} className="success-icon" />
                    <span>تم التوصيل في: {new Date(order.updated_at).toLocaleString('ar-IQ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    in_delivery: 'جاري التوصيل',
    delivered: 'تم التوصيل'
  };
  return statusMap[status] || status;
};

export default DriverOrdersPage;