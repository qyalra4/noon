import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  Save, ArrowLeft, User, Calendar, DollarSign, 
  Package, CheckCircle, XCircle, Search, Filter,
  Plus, Minus, FileText, Trash2
} from 'lucide-react';
import './CreateInvoicePage.css';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  phone: string;
  email?: string;
  created_at: string;
}

interface Order {
  id: string;
  order_id: string;
  user_id: string;
  customer_name: string;
  phone1: string;
  product_price: number;
  delivery_price: number;
  status: string;
  created_at: string;
  governorate_name?: string;
  area_name?: string;
  category_name?: string;
}

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [invoiceData, setInvoiceData] = useState({
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });

  const [searchOrderTerm, setSearchOrderTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('delivered');

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      fetchAvailableOrders();
    }
  }, [selectedProfile, statusFilter]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      alert('حدث خطأ في تحميل بيانات العملاء');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableOrders = async () => {
    if (!selectedProfile) return;

    try {
      console.log('جلب الطلبات للعميل:', selectedProfile.user_id);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', selectedProfile.user_id)
        .in('status', ['delivered', 'returned_delivered'])
        .is('invoice_id', null)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('خطأ في جلب الطلبات:', ordersError);
        throw ordersError;
      }

      if (!ordersData || ordersData.length === 0) {
        setAvailableOrders([]);
        return;
      }

      const orderIds = ordersData.map(order => order.id);
      const categoryIds = ordersData.map(order => order.category_id).filter(Boolean);
      const governorateIds = ordersData.map(order => order.governorate_id).filter(Boolean);
      const areaIds = ordersData.map(order => order.area_id).filter(Boolean);

      const [categoriesResponse, governoratesResponse, areasResponse] = await Promise.all([
        categoryIds.length > 0 ? supabase.from('categories').select('*').in('id', categoryIds) : { data: [] },
        governorateIds.length > 0 ? supabase.from('governorates').select('*').in('id', governorateIds) : { data: [] },
        areaIds.length > 0 ? supabase.from('areas').select('*').in('id', areaIds) : { data: [] }
      ]);

      const categories = categoriesResponse.data || [];
      const governorates = governoratesResponse.data || [];
      const areas = areasResponse.data || [];

      const processedOrders = ordersData.map(order => {
        const category = categories.find(c => c.id === order.category_id);
        const governorate = governorates.find(g => g.id === order.governorate_id);
        const area = areas.find(a => a.id === order.area_id);

        return {
          ...order,
          governorate_name: governorate?.name_ar || 'غير محدد',
          area_name: area?.name_ar || 'غير محدد',
          category_name: category?.name_ar || 'غير محدد'
        };
      });

      setAvailableOrders(processedOrders);

    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('حدث خطأ في تحميل الطلبات المتاحة');
    }
  };

  const handleProfileSelect = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    setSelectedProfile(profile || null);
    setSelectedOrders([]);
    setAvailableOrders([]);
  };

  const addOrderToInvoice = (order: Order) => {
    if (!selectedOrders.some(o => o.id === order.id)) {
      setSelectedOrders([...selectedOrders, order]);
    }
  };

  const removeOrderFromInvoice = (orderId: string) => {
    setSelectedOrders(selectedOrders.filter(order => order.id !== orderId));
  };

  const calculateTotals = () => {
    const subtotal = selectedOrders.reduce((sum, order) => 
      sum + (order.product_price || 0), 0
    );
    
    return { subtotal, total: subtotal };
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProfile) {
      alert('يرجى اختيار عميل');
      return;
    }

    if (selectedOrders.length === 0) {
      alert('يرجى اختيار طلبات على الأقل');
      return;
    }

    setSaving(true);

    try {
      const { total } = calculateTotals();
      const invoice_number = generateInvoiceNumber();

      const { data: { user } } = await supabase.auth.getUser();

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number,
          user_id: selectedProfile.id,
          total_amount: total,
          status: 'pending',
          issue_date: invoiceData.issue_date,
          due_date: invoiceData.due_date,
          notes: invoiceData.notes,
          created_by: user?.id
        }])
        .select()
        .single();

      if (invoiceError) {
        console.error('خطأ في إنشاء الفاتورة:', invoiceError);
        throw invoiceError;
      }

      const invoiceItems = selectedOrders.map(order => ({
        invoice_id: invoice.id,
        order_id: order.id,
        order_number: order.order_id,
        product_price: order.product_price || 0,
        total_price: (order.product_price || 0)
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        console.error('خطأ في إضافة عناصر الفاتورة:', itemsError);
        throw itemsError;
      }

      const updatePromises = selectedOrders.map(order =>
        supabase
          .from('orders')
          .update({ invoice_id: invoice.id })
          .eq('id', order.id)
      );

      const updateResults = await Promise.all(updatePromises);
      const hasUpdateError = updateResults.some(result => result.error);

      if (hasUpdateError) {
        console.error('خطأ في تحديث الطلبات:', updateResults);
        throw new Error('فشل تحديث بعض الطلبات');
      }

      alert('تم إنشاء الفاتورة بنجاح!');
      navigate(`/invoices/${invoice.id}`);
      
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert(`حدث خطأ: ${error.message || 'غير معروف'}`);
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, total } = calculateTotals();

  const filteredAvailableOrders = availableOrders.filter(order =>
    order.order_id.toLowerCase().includes(searchOrderTerm.toLowerCase()) ||
    order.customer_name.toLowerCase().includes(searchOrderTerm.toLowerCase()) ||
    (order.phone1 && order.phone1.includes(searchOrderTerm))
  );

  if (loading) {
    return (
      <div className="create-invoice-page__loading-overlay">
        <div className="create-invoice-page__spinner"></div>
        <p className="create-invoice-page__loading-text">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="create-invoice-page">
      <div className="create-invoice-page__header">
        <div className="create-invoice-page__header-left">
          <div className="create-invoice-page__header-icon">
            <FileText size={24} />
          </div>
          <div className="create-invoice-page__header-title">
            <h1>إنشاء فاتورة جديدة</h1>
            <div className="create-invoice-page__header-subtitle">
              إضافة فاتورة جديدة للعميل وربطها بالطلبات
            </div>
          </div>
        </div>
        
        <button 
          className="create-invoice-page__back-btn"
          onClick={() => navigate('/invoices')}
          type="button"
        >
          <ArrowLeft size={18} />
          رجوع إلى القائمة
        </button>
      </div>

      <div className="create-invoice-page__form-container">
        <form onSubmit={handleSubmit}>
          {/* اختيار العميل */}
          <div className="create-invoice-page__form-section">
            <div className="create-invoice-page__section-header">
              <div className="create-invoice-page__section-icon">
                <User size={20} />
              </div>
              <div className="create-invoice-page__section-title">اختيار العميل</div>
            </div>
            
            <div className="create-invoice-page__form-group">
              <label className="create-invoice-page__form-label">
                اختر عميل من القائمة *
              </label>
              <select
                value={selectedProfile?.id || ''}
                onChange={(e) => handleProfileSelect(e.target.value)}
                className="create-invoice-page__form-select"
                required
              >
                <option value="">-- اختر العميل --</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.first_name} - {profile.phone} - ({profile.email || 'لا يوجد بريد'})
                  </option>
                ))}
              </select>
            </div>

            {selectedProfile && (
              <div className="create-invoice-page__customer-card">
                <div className="create-invoice-page__customer-header">
                  <div className="create-invoice-page__customer-avatar">
                    {selectedProfile.first_name.charAt(0)}
                  </div>
                  <h4>العميل المختار</h4>
                </div>
                <div className="create-invoice-page__customer-details">
                  <div className="create-invoice-page__customer-detail">
                    <span className="create-invoice-page__customer-label">الاسم:</span>
                    <span className="create-invoice-page__customer-value">{selectedProfile.first_name}</span>
                  </div>
                  <div className="create-invoice-page__customer-detail">
                    <span className="create-invoice-page__customer-label">الهاتف:</span>
                    <span className="create-invoice-page__customer-value">{selectedProfile.phone}</span>
                  </div>
                  {selectedProfile.email && (
                    <div className="create-invoice-page__customer-detail">
                      <span className="create-invoice-page__customer-label">البريد الإلكتروني:</span>
                      <span className="create-invoice-page__customer-value">{selectedProfile.email}</span>
                    </div>
                  )}
                  <div className="create-invoice-page__customer-detail">
                    <span className="create-invoice-page__customer-label">معرف العميل:</span>
                    <span className="create-invoice-page__customer-value">{selectedProfile.user_id}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* الطلبات المتاحة */}
          {selectedProfile && (
            <div className="create-invoice-page__form-section">
              <div className="create-invoice-page__section-header">
                <div className="create-invoice-page__section-icon">
                  <Package size={20} />
                </div>
                <div className="create-invoice-page__section-title">
                  الطلبات المتاحة للعميل
                  <span className="create-invoice-page__section-note">
                    (الطلبات الموصلة فقط والتي ليست ضمن فواتير سابقة)
                  </span>
                </div>
              </div>

              <div className="create-invoice-page__filters-bar">
                <div className="create-invoice-page__search-box">
                  <Search className="search-icon" size={18} />
                  <input
                    type="text"
                    placeholder="ابحث برقم الطلب أو اسم المستلم أو الهاتف..."
                    value={searchOrderTerm}
                    onChange={(e) => setSearchOrderTerm(e.target.value)}
                    className="create-invoice-page__search-input"
                  />
                </div>

                <div className="create-invoice-page__filters-group">
                  <Filter size={16} />
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="create-invoice-page__filter-select"
                  >
                    <option value="delivered">تم التوصيل</option>
                    <option value="returned_delivered">راجع تم توصيله</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="create-invoice-page__btn create-invoice-page__btn--secondary"
                  onClick={fetchAvailableOrders}
                >
                  تحديث القائمة
                </button>
              </div>

              <div className="create-invoice-page__orders-container">
                {availableOrders.length === 0 ? (
                  <div className="create-invoice-page__empty-state">
                    <Package className="create-invoice-page__empty-icon" size={48} />
                    <p className="create-invoice-page__empty-message">لا توجد طلبات متاحة لهذا العميل</p>
                    <p className="create-invoice-page__empty-submessage">
                      قد يكون العميل ليس لديه طلبات، أو جميع طلباته مدرجة في فواتير سابقة
                    </p>
                    <button
                      type="button"
                      className="create-invoice-page__btn create-invoice-page__btn--primary"
                      onClick={() => navigate('/orders')}
                    >
                      عرض جميع الطلبات
                    </button>
                  </div>
                ) : filteredAvailableOrders.length === 0 ? (
                  <div className="create-invoice-page__empty-state">
                    <Search className="create-invoice-page__empty-icon" size={48} />
                    <p className="create-invoice-page__empty-message">لا توجد نتائج تطابق البحث</p>
                  </div>
                ) : (
                  filteredAvailableOrders.map(order => (
                    <div 
                      key={order.id} 
                      className={`create-invoice-page__order-item ${
                        selectedOrders.some(o => o.id === order.id) ? 'create-invoice-page__order-item--selected' : ''
                      }`}
                    >
                      <div className="create-invoice-page__order-info">
                        <div className="create-invoice-page__order-header">
                          <div className="create-invoice-page__order-number">طلب #{order.order_id}</div>
                          <div className="create-invoice-page__order-date">
                            {new Date(order.created_at).toLocaleDateString('ar-IQ')}
                          </div>
                        </div>
                        
                        <div className="create-invoice-page__order-details">
                          <div className="create-invoice-page__order-detail">
                            <span className="create-invoice-page__order-detail-label">المستلم:</span>
                            <span className="create-invoice-page__order-detail-value">{order.customer_name}</span>
                          </div>
                          <div className="create-invoice-page__order-detail">
                            <span className="create-invoice-page__order-detail-label">الهاتف:</span>
                            <span className="create-invoice-page__order-detail-value">{order.phone1}</span>
                          </div>
                          <div className="create-invoice-page__order-detail">
                            <span className="create-invoice-page__order-detail-label">المنطقة:</span>
                            <span className="create-invoice-page__order-detail-value">{order.area_name}</span>
                          </div>
                          <div className="create-invoice-page__order-detail">
                            <span className="create-invoice-page__order-detail-label">الحالة:</span>
                            <span className={`create-invoice-page__status create-invoice-page__status--${order.status}`}>
                              {order.status === 'delivered' ? 'تم التوصيل' : 'راجع تم توصيله'}
                            </span>
                          </div>
                        </div>

                        <div className="create-invoice-page__order-prices">
                          <div className="create-invoice-page__price-item">
                            <span className="create-invoice-page__price-label">سعر المنتج:</span>
                            <span className="create-invoice-page__price-value">{order.product_price.toLocaleString()} د.ع</span>
                          </div>
                          <div className="create-invoice-page__price-item">
                            <span className="create-invoice-page__price-label">سعر التوصيل:</span>
                            <span className="create-invoice-page__price-value">{order.delivery_price.toLocaleString()} د.ع</span>
                          </div>
                          <div className="create-invoice-page__price-item">
                            <span className="create-invoice-page__price-label create-invoice-page__price-total">الإجمالي:</span>
                            <span className="create-invoice-page__price-value create-invoice-page__price-total">
                              {(order.product_price + order.delivery_price).toLocaleString()} د.ع
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="create-invoice-page__order-actions">
                        {selectedOrders.some(o => o.id === order.id) ? (
                          <button
                            type="button"
                            className="create-invoice-page__btn create-invoice-page__btn--danger create-invoice-page__btn--small"
                            onClick={() => removeOrderFromInvoice(order.id)}
                          >
                            <Trash2 size={16} />
                            إزالة
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="create-invoice-page__btn create-invoice-page__btn--success create-invoice-page__btn--small"
                            onClick={() => addOrderToInvoice(order)}
                          >
                            <Plus size={16} />
                            إضافة
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* الطلبات المختارة */}
          {selectedOrders.length > 0 && (
            <div className="create-invoice-page__form-section">
              <div className="create-invoice-page__section-header">
                <div className="create-invoice-page__section-icon">
                  <CheckCircle size={20} />
                </div>
                <div className="create-invoice-page__section-title">
                  الطلبات المختارة
                  <span className="create-invoice-page__selected-orders-count">
                    {selectedOrders.length} طلب
                  </span>
                </div>
              </div>

              <div className="create-invoice-page__selected-orders">
                <div className="create-invoice-page__selected-orders-header">
                  <div className="create-invoice-page__selected-orders-title">
                    قائمة الطلبات المضافة إلى الفاتورة
                  </div>
                </div>
                <div className="create-invoice-page__selected-orders-table-container">
                  <table className="create-invoice-page__selected-orders-table">
                    <thead>
                      <tr>
                        <th>رقم الطلب</th>
                        <th>المستلم</th>
                        <th>سعر المنتج</th>
                        <th>الإجمالي</th>
                        <th>الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrders.map(order => (
                        <tr key={order.id}>
                          <td className="create-invoice-page__selected-order-number">{order.order_id}</td>
                          <td className="create-invoice-page__selected-order-customer">{order.customer_name}</td>
                          <td className="create-invoice-page__selected-order-price">{order.product_price.toLocaleString()} د.ع</td>
                          <td className="create-invoice-page__selected-order-total">
                            {(order.product_price).toLocaleString()} د.ع
                          </td>
                          <td>
                            <button
                              type="button"
                              className="create-invoice-page__btn create-invoice-page__btn--danger create-invoice-page__btn--icon"
                              onClick={() => removeOrderFromInvoice(order.id)}
                              title="إزالة من الفاتورة"
                            >
                              <Minus size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="create-invoice-page__selected-orders-total-label">
                          المجموع:
                        </td>
                        <td colSpan={2} className="create-invoice-page__selected-orders-total-value">
                          {subtotal.toLocaleString()} د.ع
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* تفاصيل الفاتورة */}
          <div className="create-invoice-page__form-section">
            <div className="create-invoice-page__section-header">
              <div className="create-invoice-page__section-icon">
                <FileText size={20} />
              </div>
              <div className="create-invoice-page__section-title">تفاصيل الفاتورة</div>
            </div>
            
            <div className="create-invoice-page__form-grid">
              <div className="create-invoice-page__form-group">
                <label className="create-invoice-page__form-label">
                  <Calendar size={16} />
                  تاريخ الإصدار *
                </label>
                <input
                  type="date"
                  value={invoiceData.issue_date}
                  onChange={(e) => setInvoiceData({...invoiceData, issue_date: e.target.value})}
                  required
                  className="create-invoice-page__form-input"
                />
              </div>

              <div className="create-invoice-page__form-group">
                <label className="create-invoice-page__form-label">
                  <Calendar size={16} />
                  تاريخ الاستحقاق *
                </label>
                <input
                  type="date"
                  value={invoiceData.due_date}
                  onChange={(e) => setInvoiceData({...invoiceData, due_date: e.target.value})}
                  required
                  className="create-invoice-page__form-input"
                  min={invoiceData.issue_date}
                />
              </div>
            </div>

            <div className="create-invoice-page__form-group">
              <label className="create-invoice-page__form-label">ملاحظات</label>
              <textarea
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                className="create-invoice-page__form-textarea"
                rows={4}
                placeholder="ملاحظات إضافية عن الفاتورة..."
              />
            </div>
          </div>

          {/* ملخص الفاتورة */}
          <div className="create-invoice-page__invoice-summary">
            <div className="create-invoice-page__invoice-summary-header">
              <h3>ملخص الفاتورة</h3>
            </div>
            <div className="create-invoice-page__invoice-summary-details">
              <div className="create-invoice-page__invoice-summary-row">
                <span className="create-invoice-page__invoice-summary-label">رقم الفاتورة:</span>
                <span className="create-invoice-page__invoice-summary-value create-invoice-page__invoice-summary-number">
                  {generateInvoiceNumber()}
                </span>
              </div>
              <div className="create-invoice-page__invoice-summary-row">
                <span className="create-invoice-page__invoice-summary-label">اسم العميل:</span>
                <span className="create-invoice-page__invoice-summary-value">{selectedProfile?.first_name || 'غير محدد'}</span>
              </div>
              <div className="create-invoice-page__invoice-summary-row">
                <span className="create-invoice-page__invoice-summary-label">عدد الطلبات:</span>
                <span className="create-invoice-page__invoice-summary-value">{selectedOrders.length} طلب</span>
              </div>
              <div className="create-invoice-page__invoice-summary-row">
                <span className="create-invoice-page__invoice-summary-label">المجموع:</span>
                <span className="create-invoice-page__invoice-summary-value">{subtotal.toLocaleString()} د.ع</span>
              </div>
              <div className="create-invoice-page__invoice-summary-row create-invoice-page__invoice-summary-total-row">
                <span className="create-invoice-page__invoice-summary-label">الإجمالي النهائي:</span>
                <span className="create-invoice-page__invoice-summary-value">{total.toLocaleString()} د.ع</span>
              </div>
            </div>
          </div>

          {/* أزرار الإرسال */}
          <div className="create-invoice-page__form-actions">
            <button
              type="button"
              className="create-invoice-page__btn create-invoice-page__btn--secondary"
              onClick={() => navigate('/invoices')}
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="create-invoice-page__btn create-invoice-page__btn--primary"
              disabled={saving || selectedOrders.length === 0}
            >
              {saving ? (
                <>
                  <div className="create-invoice-page__spinner--small"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save size={18} />
                  إنشاء الفاتورة
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInvoicePage;