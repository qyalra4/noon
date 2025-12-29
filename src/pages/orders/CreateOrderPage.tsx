import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  Save, ArrowLeft, User, Phone, Package, MapPin, 
  DollarSign, MessageSquare, Search, X, Navigation,
  Building, Home, MapPinCheck, UserCheck, Filter
} from 'lucide-react';
import './CreateOrderPage.css';

// تعريف واجهات البيانات
interface Category {
  id: string;
  name_ar: string;
  is_active: boolean;
}

interface Governorate {
  id: string;
  name_ar: string;
  delivery_price: number;
}

interface Area {
  id: string;
  name_ar: string;
  governorate_id: string;
}

interface Customer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone: string;
  email?: string;
  address?: string;
  governorate_id?: string;
  area_id?: string;
  created_at: string;
  governorate?: { name_ar: string };
  area?: { name_ar: string };
}

const CreateOrderPage = () => {
  const navigate = useNavigate();
  
  // الحقول الرئيسية
  const [categories, setCategories] = useState<Category[]>([]);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [filteredAreas, setFilteredAreas] = useState<Area[]>([]);
  
  // بيانات الطلب
  const [orderData, setOrderData] = useState({
    // بيانات المرسل (العميل)
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    customer_governorate: '',
    customer_area: '',
    
    // بيانات المستلم
    receiver_name: '',
    receiver_phone1: '',
    receiver_phone2: '',
    receiver_governorate_id: '',
    receiver_area_id: '',
    receiver_nearest_landmark: '',
    
    // تفاصيل الطلب
    category_id: '',
    product_price: '',
    delivery_price: '0',
    notes: '',
    status: 'pending',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // حالة مودال البحث عن العملاء
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchCustomerTerm, setSearchCustomerTerm] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // جلب البيانات من Supabase
  useEffect(() => {
    fetchAllData();
  }, []);

  // تصفية المناطق عند تغيير المحافظة
  useEffect(() => {
    if (orderData.receiver_governorate_id) {
      const filtered = areas.filter(area => area.governorate_id === orderData.receiver_governorate_id);
      setFilteredAreas(filtered);
      
      // تحديث سعر التوصيل من المحافظة
      const selectedGov = governorates.find(g => g.id === orderData.receiver_governorate_id);
      if (selectedGov) {
        setOrderData(prev => ({
          ...prev,
          delivery_price: selectedGov.delivery_price.toString()
        }));
      }
    } else {
      setFilteredAreas([]);
    }
  }, [orderData.receiver_governorate_id, areas, governorates]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // جلب جميع البيانات بالتوازي
      const [
        { data: categoriesData },
        { data: governoratesData },
        { data: areasData }
      ] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true),
        supabase.from('governorates').select('*'),
        supabase.from('areas').select('*')
      ]);

      setCategories(categoriesData || []);
      setGovernorates(governoratesData || []);
      setAreas(areasData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      alert('حدث خطأ في تحميل البيانات الأساسية');
    } finally {
      setLoading(false);
    }
  };

  // جلب العملاء مع البحث
  const fetchCustomers = async (searchTerm = '') => {
    setCustomerLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          governorate:governorates(name_ar),
          area:areas(name_ar)
        `)
        .order('created_at', { ascending: false });

      if (searchTerm.trim()) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedCustomers = (data || []).map(customer => ({
        ...customer,
        full_name: `${customer.first_name} ${customer.last_name}`
      }));

      setCustomers(formattedCustomers);
      setFilteredCustomers(formattedCustomers);

    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('حدث خطأ في تحميل بيانات العملاء');
    } finally {
      setCustomerLoading(false);
    }
  };

  // فتح مودال البحث عن العملاء
  const openCustomerModal = async () => {
    setShowCustomerModal(true);
    await fetchCustomers();
    setTimeout(() => {
      searchRef.current?.focus();
    }, 100);
  };

  // تصفية العملاء أثناء البحث
  useEffect(() => {
    if (searchCustomerTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.first_name?.toLowerCase().includes(searchCustomerTerm.toLowerCase()) ||
        customer.last_name?.toLowerCase().includes(searchCustomerTerm.toLowerCase()) ||
        customer.phone?.includes(searchCustomerTerm) ||
        customer.email?.toLowerCase().includes(searchCustomerTerm.toLowerCase()) ||
        customer.full_name?.toLowerCase().includes(searchCustomerTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchCustomerTerm, customers]);

  // اختيار عميل
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOrderData({
      ...orderData,
      customer_id: customer.id,
      customer_name: customer.full_name || '',
      customer_phone: customer.phone || '',
      customer_email: customer.email || '',
      customer_address: customer.address || '',
      customer_governorate: customer.governorate?.name_ar || '',
      customer_area: customer.area?.name_ar || ''
    });
    setShowCustomerModal(false);
  };

  // إلغاء اختيار العميل
  const clearCustomerSelection = () => {
    setSelectedCustomer(null);
    setOrderData({
      ...orderData,
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      customer_address: '',
      customer_governorate: '',
      customer_area: ''
    });
  };

  // توليد رقم طلب فريد
  const generateOrderId = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
    return `NID-${year}${month}${day}-${random}`;
  };

  // إرسال الطلب
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // التحقق من البيانات المطلوبة
      if (!selectedCustomer) {
        throw new Error('يرجى اختيار عميل');
      }
      if (!orderData.receiver_name.trim()) {
        throw new Error('يرجى إدخال اسم المستلم');
      }
      if (!orderData.receiver_phone1.trim()) {
        throw new Error('يرجى إدخال رقم هاتف المستلم');
      }
      if (!orderData.category_id) {
        throw new Error('يرجى اختيار الفئة');
      }
      if (!orderData.receiver_governorate_id) {
        throw new Error('يرجى اختيار محافظة المستلم');
      }
      if (!orderData.receiver_area_id) {
        throw new Error('يرجى اختيار منطقة المستلم');
      }
      if (!orderData.product_price || parseFloat(orderData.product_price) <= 0) {
        throw new Error('يرجى إدخال سعر صحيح للمنتج');
      }

      // توليد رقم طلب
      const order_id = generateOrderId();

      // الحصول على المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();

      // إعداد بيانات الطلب للإرسال
      const orderPayload = {
        order_id,
        // بيانات المرسل (العميل)
        user_id: selectedCustomer.user_id,
        sender_id: selectedCustomer.id,
        sender_name: selectedCustomer.full_name,
        sender_phone: selectedCustomer.phone,
        
        // بيانات المستلم
        customer_name: orderData.receiver_name.trim(),
        phone1: orderData.receiver_phone1.trim(),
        phone2: orderData.receiver_phone2?.trim() || null,
        governorate_id: orderData.receiver_governorate_id,
        area_id: orderData.receiver_area_id,
        nearest_landmark: orderData.receiver_nearest_landmark?.trim() || null,
        
        // تفاصيل الطلب
        category_id: orderData.category_id,
        product_price: parseFloat(orderData.product_price),
        delivery_price: parseFloat(orderData.delivery_price) || 0,
        notes: orderData.notes?.trim() || null,
        status: orderData.status,
        
        // المستخدم الحالي (المسؤول الذي ينشئ الطلب)
        // created_by: user?.id
      };

      const { error } = await supabase
        .from('orders')
        .insert([orderPayload]);

      if (error) throw error;

      // إضافة إشعار للعميل
      await supabase
        .from('user_notifications')
        .insert([{
          user_id: selectedCustomer.user_id,
          title: 'طلب جديد',
          message: `تم إنشاء طلب جديد برقم ${order_id} باسمك`,
          type: 'success',
          
        }]);

      alert('تم إنشاء الطلب بنجاح!');
      navigate('/orders');
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      alert(`حدث خطأ: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="create-order-loading">
        <div className="create-order-spinner"></div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="create-order-container">
      <div className="create-order-header">
        <div>
          <button 
            className="create-order-btn-back"
            onClick={() => navigate('/orders')}
            type="button"
          >
            <ArrowLeft size={18} />
            رجوع للطلبات
          </button>
          <h1 className="create-order-title">إنشاء طلب جديد</h1>
        </div>
      </div>

      <div className="create-order-form-container">
        <form onSubmit={handleSubmit}>
          {/* قسم اختيار العميل */}
          <div className="create-order-section">
            <div className="create-order-section-header">
              <User size={22} className="create-order-section-icon" />
              <h3 className="create-order-section-title">اختيار العميل (صاحب الطلب)</h3>
            </div>
            
            {selectedCustomer ? (
              <div className="create-order-selected-customer">
                <div className="create-order-customer-card">
                  <div className="create-order-customer-header">
                    <h4 className="create-order-customer-name">
                      <UserCheck size={18} />
                      {selectedCustomer.full_name}
                    </h4>
                    <button 
                      type="button"
                      className="create-order-customer-clear"
                      onClick={clearCustomerSelection}
                    >
                      <X size={16} />
                      تغيير العميل
                    </button>
                  </div>
                  
                  <div className="create-order-customer-details">
                    <div className="create-order-customer-detail">
                      <Phone size={16} />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                    {/* {selectedCustomer.email && (
                      <div className="create-order-customer-detail">
                        <span> {selectedCustomer.email}</span>
                      </div>
                    )} */}
                    {(selectedCustomer.governorate?.name_ar || selectedCustomer.area?.name_ar) && (
                      <div className="create-order-customer-detail">
                        <MapPin size={16} />
                        <span>
                          {selectedCustomer.governorate?.name_ar} - {selectedCustomer.area?.name_ar}
                        </span>
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="create-order-customer-detail">
                        <Home size={16} />
                        <span>{selectedCustomer.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="create-order-customer-select">
                <button 
                  type="button"
                  className="create-order-btn-select-customer"
                  onClick={openCustomerModal}
                >
                  <User size={18} />
                  اختر عميل من القائمة
                </button>
                <p className="create-order-customer-hint">
                  سيتم إنشاء الطلب باسم العميل المختار    
                </p>
              </div>
            )}
          </div>

          {/* قسم معلومات المستلم */}
          <div className="create-order-section">
            <div className="create-order-section-header">
              <User size={22} className="create-order-section-icon" />
              <h3 className="create-order-section-title">معلومات المستلم (الزبون)</h3>
            </div>
            
            <div className="create-order-form-grid">
              <div className="create-order-form-group">
                <label className="create-order-form-label">
                  <span>اسم المستلم *</span>
                </label>
                <input
                  type="text"
                  value={orderData.receiver_name}
                  onChange={(e) => setOrderData({...orderData, receiver_name: e.target.value})}
                  required
                  className="create-order-form-input"
                  placeholder="أدخل الاسم الكامل للمستلم"
                />
              </div>

              <div className="create-order-form-group">
                <label className="create-order-form-label">
                  <Phone size={16} />
                  <span>الهاتف الرئيسي *</span>
                </label>
                <input
                  type="tel"
                  value={orderData.receiver_phone1}
                  onChange={(e) => setOrderData({...orderData, receiver_phone1: e.target.value})}
                  required
                  className="create-order-form-input"
                  placeholder="مثال: 07801234567"
                />
              </div>

              <div className="create-order-form-group">
                <label className="create-order-form-label">
                  <Phone size={16} />
                  <span>هاتف إضافي (اختياري)</span>
                </label>
                <input
                  type="tel"
                  value={orderData.receiver_phone2}
                  onChange={(e) => setOrderData({...orderData, receiver_phone2: e.target.value})}
                  className="create-order-form-input"
                  placeholder="رقم هاتف بديل"
                />
              </div>
            </div>
          </div>

          {/* قسم موقع المستلم */}
          <div className="create-order-section">
            <div className="create-order-section-header">
              <MapPin size={22} className="create-order-section-icon" />
              <h3 className="create-order-section-title">موقع المستلم</h3>
            </div>
            
            <div className="create-order-form-grid">
              <div className="create-order-form-group">
                <label className="create-order-form-label">المحافظة *</label>
                <select
                  value={orderData.receiver_governorate_id}
                  onChange={(e) => setOrderData({...orderData, receiver_governorate_id: e.target.value})}
                  required
                  className="create-order-form-select"
                >
                  <option value="">-- اختر المحافظة --</option>
                  {governorates.map(gov => (
                    <option key={gov.id} value={gov.id}>
                      {gov.name_ar} - {gov.delivery_price} د.ع
                    </option>
                  ))}
                </select>
              </div>

              <div className="create-order-form-group">
                <label className="create-order-form-label">المنطقة *</label>
                <select
                  value={orderData.receiver_area_id}
                  onChange={(e) => setOrderData({...orderData, receiver_area_id: e.target.value})}
                  required
                  className="create-order-form-select"
                  disabled={!orderData.receiver_governorate_id}
                >
                  <option value="">-- اختر المنطقة --</option>
                  {filteredAreas.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.name_ar}
                    </option>
                  ))}
                </select>
                {!orderData.receiver_governorate_id && (
                  <p className="create-order-form-hint">يرجى اختيار المحافظة أولاً</p>
                )}
              </div>

              <div className="create-order-form-group">
                <label className="create-order-form-label">
                  <Navigation size={16} />
                  <span>أقرب نقطة دالة (اختياري)</span>
                </label>
                <input
                  type="text"
                  value={orderData.receiver_nearest_landmark}
                  onChange={(e) => setOrderData({...orderData, receiver_nearest_landmark: e.target.value})}
                  className="create-order-form-input"
                  placeholder="مثال: قرب جامع الرحمن، مقابل المدرسة"
                />
                <p className="create-order-form-hint">
                  تساعد السائق على الوصول بسرعة
                </p>
              </div>
            </div>
          </div>

          {/* قسم تفاصيل الطلب */}
          <div className="create-order-section">
            <div className="create-order-section-header">
              <Package size={22} className="create-order-section-icon" />
              <h3 className="create-order-section-title">تفاصيل الطلب</h3>
            </div>
            
            <div className="create-order-form-grid">
              <div className="create-order-form-group">
                <label className="create-order-form-label">الفئة *</label>
                <select
                  value={orderData.category_id}
                  onChange={(e) => setOrderData({...orderData, category_id: e.target.value})}
                  required
                  className="create-order-form-select"
                >
                  <option value="">-- اختر فئة الطلب --</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div className="create-order-form-group">
                <label className="create-order-form-label">
                  <DollarSign size={16} />
                  <span>سعر الطلب (دينار عراقي) *</span>
                </label>
                <input
                  type="number"
                  value={orderData.product_price}
                  onChange={(e) => setOrderData({...orderData, product_price: e.target.value})}
                  required
                  min="0"
                  step="100"
                  className="create-order-form-input"
                  placeholder="أدخل سعر الطلب"
                />
              </div>

              <div className="create-order-form-group">
                <label className="create-order-form-label">
                  <DollarSign size={16} />
                  <span>سعر التوصيل (دينار عراقي)</span>
                </label>
                <input
                  type="number"
                  value={orderData.delivery_price}
                  readOnly
                  className="create-order-form-input create-order-form-input-readonly"
                  placeholder="تلقائي من المحافظة"
                />
                <p className="create-order-form-hint">
                  يأتي تلقائياً من سعر المحافظة المختارة
                </p>
              </div>

              <div className="create-order-form-group">
                <label className="create-order-form-label">حالة الطلب</label>
                <select
                  value={orderData.status}
                  onChange={(e) => setOrderData({...orderData, status: e.target.value})}
                  className="create-order-form-select"
                >
                  <option value="pending">قيد الانتظار</option>
                  <option value="in_receiving">جاري الاستلام</option>
                  <option value="in_warehouse">في المستودع</option>
                  <option value="in_delivery">قيد التوصيل</option>
                  <option value="returned_to_warehouse">راجع للمستودع</option>
                </select>
              </div>
            </div>

            <div className="create-order-form-group">
              <label className="create-order-form-label">
                <MessageSquare size={16} />
                <span>ملاحظات إضافية (اختياري)</span>
              </label>
              <textarea
                value={orderData.notes}
                onChange={(e) => setOrderData({...orderData, notes: e.target.value})}
                className="create-order-form-textarea"
                rows={4}
                placeholder="أي تفاصيل إضافية عن الطلب، مواصفات الطلب تعليمات خاصة..."
              />
            </div>
          </div>

          {/* ملخص الطلب */}
          <div className="create-order-summary">
            <div className="create-order-summary-header">
              <Package size={22} className="create-order-section-icon" />
              <h3 className="create-order-section-title">ملخص الطلب</h3>
            </div>
            
            <div className="create-order-summary-grid">
              <div className="create-order-summary-item">
                <span>رقم الطلب:</span>
                <strong className="create-order-number">{generateOrderId()}</strong>
              </div>
              
              <div className="create-order-summary-item">
                <span>سعر الطلب:</span>
                <span>{parseFloat(orderData.product_price || '0').toLocaleString()} د.ع</span>
              </div>
              
              <div className="create-order-summary-item">
                <span>سعر التوصيل:</span>
                <span>{parseFloat(orderData.delivery_price || '0').toLocaleString()} د.ع</span>
              </div>
              
              <div className="create-order-summary-total">
                <span>الإجمالي:</span>
                <strong className="create-order-total-amount">
                  {(
                    parseFloat(orderData.product_price || '0') + 
                    parseFloat(orderData.delivery_price || '0')
                  ).toLocaleString()} د.ع
                </strong>
              </div>
            </div>
            
            {selectedCustomer && (
              <div className="create-order-summary-note">
                <p>
                  ⓘ سيتم إنشاء هذا الطلب باسم <strong>{selectedCustomer.full_name}</strong> 
                </p>
              </div>
            )}
          </div>

          {/* أزرار الإرسال */}
          <div className="create-order-form-actions">
            <button
              type="button"
              className="create-order-btn-secondary"
              onClick={() => navigate('/orders')}
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="create-order-btn-primary"
              disabled={saving || !selectedCustomer}
            >
              {saving ? (
                <>
                  <div className="create-order-spinner-small"></div>
                  جاري إنشاء الطلب...
                </>
              ) : (
                <>
                  <Save size={18} />
                  إنشاء الطلب
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* مودال البحث عن العملاء */}
      {showCustomerModal && (
        <div 
          className="create-order-modal-overlay"
          onClick={() => setShowCustomerModal(false)}
        >
          <div 
            className="create-order-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="create-order-modal-header">
              <div className="create-order-modal-title-section">
                <User size={24} />
                <h2 className="create-order-modal-title">اختيار عميل</h2>
              </div>
              <button 
                className="create-order-modal-close"
                onClick={() => setShowCustomerModal(false)}
                disabled={customerLoading}
              >
                <X size={24} />
              </button>
            </div>

            <div className="create-order-modal-body">
              <div className="create-order-search-box">
                <Search size={20} className="create-order-search-icon" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="ابحث باسم العميل، رقم الهاتف، أو البريد الإلكتروني..."
                  value={searchCustomerTerm}
                  onChange={(e) => setSearchCustomerTerm(e.target.value)}
                  className="create-order-search-input"
                />
                <button 
                  className="create-order-search-clear"
                  onClick={() => setSearchCustomerTerm('')}
                >
                  <X size={16} />
                </button>
              </div>

              {customerLoading ? (
                <div className="create-order-modal-loading">
                  <div className="create-order-spinner-small"></div>
                  <p>جاري تحميل العملاء...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="create-order-modal-empty">
                  <User size={48} />
                  <p>لا توجد نتائج</p>
                  {searchCustomerTerm && (
                    <button 
                      className="create-order-btn-secondary"
                      onClick={() => setSearchCustomerTerm('')}
                    >
                      عرض جميع العملاء
                    </button>
                  )}
                </div>
              ) : (
                <div className="create-order-customers-list">
                  <div className="create-order-customers-count">
                    <Filter size={16} />
                    <span>عدد العملاء: {filteredCustomers.length}</span>
                  </div>
                  
                  {filteredCustomers.map(customer => (
                    <div 
                      key={customer.id}
                      className={`create-order-customer-item ${
                        selectedCustomer?.id === customer.id ? 'create-order-customer-selected' : ''
                      }`}
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="create-order-customer-avatar">
                        <User size={24} />
                      </div>
                      
                      <div className="create-order-customer-info">
                        <div className="create-order-customer-main">
                          <h4 className="create-order-customer-name">
                            {customer.full_name}
                          </h4>
                          {customer.id === selectedCustomer?.id && (
                            <span className="create-order-customer-selected-badge">
                              <UserCheck size={14} />
                              محدد
                            </span>
                          )}
                        </div>
                        
                        <div className="create-order-customer-details-list">
                          <div className="create-order-customer-detail-item">
                            <Phone size={14} />
                            <span>{customer.phone}</span>
                          </div>
                          
                          {/* {customer.email && (
                            <div className="create-order-customer-detail-item">
                              <span>📧 {customer.email}</span>
                            </div>
                          )} */}
                          
                          {(customer.governorate?.name_ar || customer.area?.name_ar) && (
                            <div className="create-order-customer-detail-item">
                              <MapPin size={14} />
                              <span>
                                {customer.governorate?.name_ar || ''} 
                                {customer.area?.name_ar ? ` - ${customer.area.name_ar}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="create-order-customer-footer">
                          <span className="create-order-customer-date">
                            مسجل منذ: {new Date(customer.created_at).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="create-order-customer-select-btn">
                        <button
                          className={`create-order-btn-select ${
                            selectedCustomer?.id === customer.id ? 'create-order-btn-selected' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCustomerSelect(customer);
                          }}
                        >
                          {selectedCustomer?.id === customer.id ? 'مختار' : 'اختيار'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="create-order-modal-footer">
              <button
                className="create-order-btn-secondary"
                onClick={() => setShowCustomerModal(false)}
                disabled={customerLoading}
              >
                إلغاء
              </button>
              <p className="create-order-modal-hint">
                اختر عميلاً لإنشاء الطلب باسمه
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrderPage;