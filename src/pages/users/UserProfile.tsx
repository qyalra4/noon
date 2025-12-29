import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { 
  User, Mail, Phone, MapPin, Calendar, Edit, 
  Package, DollarSign, Shield, Clock, History 
} from 'lucide-react';
import './styles/UserDetails.css';

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (userId) {
      fetchUserData(userId);
      fetchUserOrders(userId);
    }
  }, [userId]);

  const fetchUserData = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          country:countries(name_ar, name_en),
          governorate:governorates(name_ar, name_en),
          area:areas(name_ar, name_en)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOrders = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setUserOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD'
    }).format(amount);
  };

  

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string, color: string }> = {
      active: { label: 'نشط', color: 'success' },
      inactive: { label: 'غير نشط', color: 'warning' },
      suspended: { label: 'موقوف', color: 'danger' }
    };
    
    const statusInfo = statusMap[status] || { label: status, color: 'secondary' };
    
    return (
      <span className={`status-badge status-${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>جاري تحميل بيانات المستخدم...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="error-container">
        <h2>المستخدم غير موجود</h2>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/users')}
        >
          العودة لقائمة المستخدمين
        </button>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <div className="page-header">
        <div className="header-left">
          <h1>تفاصيل المستخدم</h1>
          <div className="breadcrumb">
            <span onClick={() => navigate('/users')}>المستخدمين</span>
            <span> / </span>
            <span className="active">{user.first_name} {user.last_name}</span>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/users')}
          >
            رجوع
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/users/edit/${user.id}`)}
          >
            <Edit size={16} /> تعديل البيانات
          </button>
        </div>
      </div>

      <div className="user-profile-container">
        {/* بطاقة المستخدم الرئيسية */}
        <div className="user-card">
          <div className="user-header">
            <div className="user-avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.first_name} />
              ) : (
                <div className="avatar-large">
                  {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                </div>
              )}
            </div>
            
            <div className="user-info">
              <h2 className="user-name">{user.first_name} {user.last_name}</h2>
              <div className="user-meta">
                <span className="user-id">
                  <Shield size={14} /> ID: {user.id.substring(0, 8)}
                </span>
                
                {getStatusBadge(user.status)}
              </div>
            </div>
          </div>

          <div className="user-stats">
            <div className="stat-item">
              <div className="stat-icon">
                <Package size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{user.total_orders}</div>
                <div className="stat-label">عدد الطلبات</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon">
                <DollarSign size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(user.total_spent)}</div>
                <div className="stat-label">إجمالي المشتريات</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon">
                <Calendar size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{formatDate(user.created_at)}</div>
                <div className="stat-label">تاريخ التسجيل</div>
              </div>
            </div>

            {user.last_login && (
              <div className="stat-item">
                <div className="stat-icon">
                  <Clock size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatDate(user.last_login)}</div>
                  <div className="stat-label">آخر دخول</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* التبويبات */}
        <div className="profile-tabs">
          <button 
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            المعلومات الشخصية
          </button>
          <button 
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            الطلبات ({userOrders.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            النشاطات
          </button>
        </div>

        {/* محتوى التبويبات */}
        <div className="tab-content">
          {activeTab === 'info' && (
            <div className="info-section">
              <div className="section-card">
                <h3 className="section-title">
                  <User size={20} /> المعلومات الأساسية
                </h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>الاسم الكامل:</label>
                    <span>{user.first_name} {user.last_name}</span>
                  </div>
                  <div className="info-item">
                    <label><Mail size={14} /> البريد الإلكتروني:</label>
                    <span>{user.email}</span>
                  </div>
                  <div className="info-item">
                    <label><Phone size={14} /> رقم الهاتف:</label>
                    <span>{user.phone || 'غير محدد'}</span>
                  </div>
                  
                  <div className="info-item">
                    <label>الحالة:</label>
                    <span>{getStatusBadge(user.status)}</span>
                  </div>
                </div>
              </div>

              <div className="section-card">
                <h3 className="section-title">
                  <MapPin size={20} /> الموقع 
                </h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>الدولة:</label>
                    <span>{user.country?.name_ar || 'غير محدد'}</span>
                  </div>
                  <div className="info-item">
                    <label>المحافظة:</label>
                    <span>{user.governorate?.name_ar || 'غير محدد'}</span>
                  </div>
                  <div className="info-item">
                    <label>المنطقة:</label>
                    <span>{user.area?.name_ar || 'غير محدد'}</span>
                  </div>
                  <div className="info-item full-width">
                    <label>العنوان:</label>
                    <span>{user.address || 'غير محدد'}</span>
                  </div>
                </div>
              </div>

              <div className="section-card">
                <h3 className="section-title">
                  <Calendar size={20} /> معلومات التسجيل
                </h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>تاريخ التسجيل:</label>
                    <span>{formatDate(user.created_at)}</span>
                  </div>
                  <div className="info-item">
                    <label>آخر تحديث:</label>
                    <span>{formatDate(user.updated_at)}</span>
                  </div>
                  {user.last_login && (
                    <div className="info-item">
                      <label>آخر دخول:</label>
                      <span>{formatDate(user.last_login)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="orders-section">
              {userOrders.length === 0 ? (
                <div className="empty-orders">
                  <Package size={48} />
                  <h3>لا توجد طلبات</h3>
                  <p>لم يقم المستخدم بأي طلبات حتى الآن</p>
                </div>
              ) : (
                <div className="orders-table">
                  <table>
                    <thead>
                      <tr>
                        <th>رقم الطلب</th>
                        <th>التاريخ</th>
                        <th>الحالة</th>
                        <th>المجموع</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userOrders.map((order) => (
                        <tr key={order.id}>
                          <td>#{order.order_number}</td>
                          <td>{formatDate(order.created_at)}</td>
                          <td>
                            <span className={`order-status status-${order.status}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>{formatCurrency(order.total_amount)}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-info"
                              onClick={() => navigate(`/orders/${order.id}`)}
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

          {activeTab === 'activity' && (
            <div className="activity-section">
              <div className="activity-list">
                {[
                  {
                    id: 1,
                    action: 'تسجيل الدخول',
                    date: user.last_login || user.created_at,
                    description: 'آخر تسجيل دخول للنظام'
                  },
                  {
                    id: 2,
                    action: 'تحديث الملف الشخصي',
                    date: user.updated_at,
                    description: 'آخر تحديث للبيانات الشخصية'
                  },
                  {
                    id: 3,
                    action: 'إنشاء الحساب',
                    date: user.created_at,
                    description: 'تم إنشاء الحساب في النظام'
                  }
                ].map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      <History size={18} />
                    </div>
                    <div className="activity-content">
                      <div className="activity-header">
                        <h4>{activity.action}</h4>
                        <span className="activity-date">{formatDate(activity.date)}</span>
                      </div>
                      <p className="activity-description">{activity.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;