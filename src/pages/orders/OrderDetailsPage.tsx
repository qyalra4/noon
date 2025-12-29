import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { 
  ArrowLeft, Printer, Download, Edit, Calendar, Phone, 
  MapPin, Package, DollarSign, User, Clock, AlertCircle,
  CheckCircle, XCircle, FileText, Truck, Search, UserCheck,
  MapPinCheck, PackageCheck, Mail, Navigation, Home,
  Smartphone, Globe, RefreshCw, Shield,
  MessageSquare, Tag, Truck as TruckIcon
} from 'lucide-react';
import html2canvas from 'html2canvas';
// import { jsPDF } from 'jspdf';
import './OrderDetailsPage.css';

interface OrderDetails {
  id: string;
  order_id: string;
  customer_name: string;
  phone1: string;
  phone2?: string;
  nearest_landmark?: string;
  category_id?: string;
  governorate_id?: string;
  area_id?: string;
  product_price: number;
  delivery_price: number;
  notes?: string;
  status: string;
  profit_received: boolean;
  created_at: string;
  updated_at: string;
  user_id?: string;
  sender_id?: string;
  sender_name?: string;
  sender_phone?: string;
  driver_id?: string;
  delivery_started_at?: string;
  delivery_completed_at?: string;
  
  // بيانات مرتبطة
  category_name?: string;
  governorate_name?: string;
  area_name?: string;
  driver?: {
    id: string;
    driver_id: string;
    full_name: string;
    phone: string;
    vehicle_type: string;
  };
  
  // بيانات المرسل من جدول profiles
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    governorate_id?: string;
    area_id?: string;
    address?: string;
    governorate_name?: string;
    area_name?: string;
  };
}

interface Driver {
  id: string;
  driver_id: string;
  full_name: string;
  phone: string;
  email?: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number?: string;
  status: string;
  orders_in_progress: number;
}

interface StatusHistory {
  id: string;
  order_id: string;
  status: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

const OrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [governorates, setGovernorates] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // حالة المودال وبيانات السواق
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [searchDriverTerm, setSearchDriverTerm] = useState('');
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchOrderDetails(id);
    }
  }, [id]);

  // جلب تفاصيل الطلب
  const fetchOrderDetails = async (orderId: string) => {
    setLoading(true);
    try {
      // جلب الطلب الأساسي
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // استخراج جميع الـ IDs المطلوبة
      const categoryIds = orderData.category_id ? [orderData.category_id] : [];
      const governorateIds = orderData.governorate_id ? [orderData.governorate_id] : [];
      const areaIds = orderData.area_id ? [orderData.area_id] : [];
      const senderId = orderData.user_id;

      // جلب البيانات بشكل منفصل
      const [
        { data: categoriesData },
        { data: governoratesData },
        { data: areasData },
        { data: statusHistoryData },
        { data: driverData },
        { data: senderData }
      ] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .in('id', categoryIds.length ? categoryIds : ['']),
        
        supabase
          .from('governorates')
          .select('*')
          .in('id', governorateIds.length ? governorateIds : ['']),
        
        supabase
          .from('areas')
          .select('*')
          .in('id', areaIds.length ? areaIds : ['']),
        
        supabase
          .from('order_status_history')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false }),
        
        orderData.driver_id ? supabase
          .from('drivers')
          .select('*')
          .eq('id', orderData.driver_id)
          .single() : Promise.resolve({ data: null, error: null }),
        
        senderId ? supabase
          .from('profiles')
          .select(`
            *,
            governorate:governorates(name_ar),
            area:areas(name_ar)
          `)
          .eq('user_id', senderId)
          .single() : Promise.resolve({ data: null, error: null })
      ]);

      // دمج البيانات
      const orderWithDetails: OrderDetails = {
        ...orderData,
        category_name: categoriesData?.[0]?.name_ar,
        governorate_name: governoratesData?.[0]?.name_ar,
        area_name: areasData?.[0]?.name_ar,
        driver: driverData,
        sender: senderData ? {
          id: senderData.id,
          first_name: senderData.first_name,
          last_name: senderData.last_name,
          phone: senderData.phone,
          email: senderData.email,
          governorate_id: senderData.governorate_id,
          area_id: senderData.area_id,
          address: senderData.address,
          governorate_name: senderData.governorate?.name_ar,
          area_name: senderData.area?.name_ar
        } : undefined
      };

      setOrder(orderWithDetails);
      setCategories(categoriesData || []);
      setGovernorates(governoratesData || []);
      setAreas(areasData || []);
      setStatusHistory(statusHistoryData || []);

    } catch (error) {
      console.error('Error fetching order details:', error);
      alert('حدث خطأ في تحميل تفاصيل الطلب');
    } finally {
      setLoading(false);
    }
  };

  // جلب السواق المتاحين
  const fetchAvailableDrivers = async () => {
    try {
      // جلب جميع السواق النشطين
      const { data: driversData, error } = await supabase
        .from('drivers')
        .select(`
          *,
          orders:orders!orders_driver_id_fkey (
            id,
            status
          )
        `)
        .in('status', ['active', 'on_delivery']);

      if (error) throw error;

      // معالجة البيانات لحساب عدد الطلبات قيد التوصيل لكل سائق
      const processedDrivers = driversData.map(driver => ({
        ...driver,
        orders_in_progress: driver.orders?.filter((o: any) => 
          ['in_delivery', 'in_receiving'].includes(o.status)
        ).length || 0
      }));

      setDrivers(processedDrivers);
      setFilteredDrivers(processedDrivers);
      setShowDriverModal(true);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      alert('حدث خطأ في جلب بيانات السواق');
    }
  };

  // تصفية السواق أثناء البحث
  useEffect(() => {
    if (searchDriverTerm.trim() === '') {
      setFilteredDrivers(drivers);
    } else {
      const filtered = drivers.filter(driver =>
        driver.full_name.toLowerCase().includes(searchDriverTerm.toLowerCase()) ||
        driver.driver_id.toLowerCase().includes(searchDriverTerm.toLowerCase()) ||
        driver.phone.includes(searchDriverTerm) ||
        driver.vehicle_number.toLowerCase().includes(searchDriverTerm.toLowerCase())
      );
      setFilteredDrivers(filtered);
    }
  }, [searchDriverTerm, drivers]);

  // تعيين أو تغيير سائق للطلب
  const assignDriverToOrder = async (driverId: string) => {
    if (!order || !id) return;

    setAssigningDriver(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      
      const selectedDriver = drivers.find(d => d.id === driverId);
      
      // تحديث الطلب برقم السائق فقط بدون تغيير الحالة
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          driver_id: driverId,
          updated_at: now
        })
        .eq('id', id);

      if (orderError) throw orderError;

      // إذا كان السائق متواجد مسبقاً، تحديث سجل الحالة
      if (order.driver_id) {
        await supabase
          .from('order_status_history')
          .insert([{
            order_id: id,
            status: order.status,
            notes: `تم تغيير السائق من ${order.driver?.full_name} إلى ${selectedDriver?.full_name}`,
            created_by: user?.id
          }]);
      } else {
        await supabase
          .from('order_status_history')
          .insert([{
            order_id: id,
            status: order.status,
            notes: `تم تعيين السائق: ${selectedDriver?.full_name} (${selectedDriver?.driver_id})`,
            created_by: user?.id
          }]);
      }

      // تحديث البيانات المحلية
      const updatedOrder = { 
        ...order, 
        driver_id: driverId,
        updated_at: now,
        driver: selectedDriver ? {
          id: selectedDriver.id,
          driver_id: selectedDriver.driver_id,
          full_name: selectedDriver.full_name,
          phone: selectedDriver.phone,
          vehicle_type: selectedDriver.vehicle_type
        } : undefined
      };
      setOrder(updatedOrder);

      setShowDriverModal(false);
      alert(`تم ${order.driver_id ? 'تغيير' : 'تعيين'} السائق ${selectedDriver?.full_name} للطلب بنجاح!`);
      
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('حدث خطأ أثناء تعيين السائق');
    } finally {
      setAssigningDriver(false);
      setSelectedDriverId('');
    }
  };

  // إلغاء تعيين السائق
  const removeDriverFromOrder = async () => {
    if (!order || !id || !order.driver_id) return;
    
    if (!window.confirm(`هل أنت متأكد من إزالة السائق ${order.driver?.full_name} من هذا الطلب؟`)) {
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          driver_id: null,
          updated_at: now
        })
        .eq('id', id);

      if (orderError) throw orderError;

      // إضافة سجل الحالة
      await supabase
        .from('order_status_history')
        .insert([{
          order_id: id,
          status: order.status,
          notes: `تم إزالة السائق: ${order.driver?.full_name}`,
          created_by: user?.id
        }]);

      // تحديث البيانات المحلية
      const updatedOrder = { 
        ...order, 
        driver_id: undefined,
        driver: undefined,
        updated_at: now
      };
      
      setOrder(updatedOrder);

      alert('تم إزالة السائق من الطلب بنجاح');
      
    } catch (error) {
      console.error('Error removing driver:', error);
      alert('حدث خطأ أثناء إزالة السائق');
    }
  };

  // تحديث حالة الطلب
  const updateStatus = async (newStatus: string) => {
    if (!order || !id) return;
    
    if (!window.confirm(`هل أنت متأكد من تغيير حالة الطلب إلى "${getStatusText(newStatus)}"؟`)) {
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      
      let updates: any = { 
        status: newStatus,
        updated_at: now
      };

      // إذا تم التوصيل، نضيف وقت الإكمال
      if (newStatus === 'delivered') {
        updates.delivery_completed_at = now;
      }

      // إذا تم بدء التوصيل، نضيف وقت البدء
      if (newStatus === 'in_delivery' && !order.delivery_started_at) {
        updates.delivery_started_at = now;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      // إضافة سجل الحالة
      await supabase
        .from('order_status_history')
        .insert([{
          order_id: id,
          status: newStatus,
          notes: 'تم تغيير الحالة يدوياً',
          created_by: user?.id
        }]);

      // تحديث البيانات المحلية
      const updatedOrder = { 
        ...order, 
        status: newStatus, 
        updated_at: now 
      };
      
      if (newStatus === 'delivered') {
        updatedOrder.delivery_completed_at = now;
      }
      
      if (newStatus === 'in_delivery' && !order.delivery_started_at) {
        updatedOrder.delivery_started_at = now;
      }
      
      setOrder(updatedOrder);
      
      // تحديث سجل الحالة
      setStatusHistory([
        {
          id: Date.now().toString(),
          order_id: id,
          status: newStatus,
          notes: 'تم تغيير الحالة يدوياً',
          created_at: now,
          created_by: user?.id
        },
        ...statusHistory
      ]);

      alert(`تم تغيير حالة الطلب إلى: ${getStatusText(newStatus)}`);
      
    } catch (error) {
      console.error('Error updating status:', error);
      alert('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const toggleProfitReceived = async () => {
    if (!order || !id) return;
    
    try {
      const newProfitStatus = !order.profit_received;
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          profit_received: newProfitStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setOrder({ ...order, profit_received: newProfitStatus });
      alert(`تم ${newProfitStatus ? 'تحديد' : 'إلغاء'} استلام الربح`);
      
    } catch (error) {
      console.error('Error updating profit status:', error);
      alert('حدث خطأ أثناء تحديث حالة الربح');
    }
  };

  // إنشاء PDF بحجم A5 باستخدام html2canvas
  const printPDF = async () => {
    if (!order || !printRef.current) return;

    try {
      // إخفاء العناصر غير المرغوب فيها
      const originalDisplay: string[] = [];
      const elementsToHide = printRef.current.querySelectorAll('.no-print, button, .action-buttons');
      
      elementsToHide.forEach((el: any, index) => {
        originalDisplay[index] = el.style.display;
        el.style.display = 'none';
      });

      // تغيير الأنماط للطباعة
      const originalStyles = {
        width: printRef.current.style.width,
        padding: printRef.current.style.padding,
        backgroundColor: printRef.current.style.backgroundColor,
        boxShadow: printRef.current.style.boxShadow
      };

      printRef.current.style.width = '148mm';
      printRef.current.style.padding = '15mm';
      printRef.current.style.backgroundColor = 'white';
      printRef.current.style.boxShadow = 'none';

      // انتظر قليلاً لتطبيق الأنماط
      await new Promise(resolve => setTimeout(resolve, 100));

      // تحويل إلى canvas
      const canvas = await html2canvas(printRef.current, {
        scale: 3, // دقة عالية
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        allowTaint: true
      });

      // استعادة الأنماط الأصلية
      printRef.current.style.width = originalStyles.width;
      printRef.current.style.padding = originalStyles.padding;
      printRef.current.style.backgroundColor = originalStyles.backgroundColor;
      printRef.current.style.boxShadow = originalStyles.boxShadow;

      // إظهار العناصر المخفية
      elementsToHide.forEach((el: any, index) => {
        el.style.display = originalDisplay[index] || '';
      });

      // إنشاء PDF
      // const pdf = new jsPDF({
      //   orientation: 'portrait',
      //   unit: 'mm',
      //   format: 'a5'
      // });

      // أبعاد الصورة
      const imgWidth = 148;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // إضافة الصورة إلى PDF
      const imgData = canvas.toDataURL('image/png');
      // pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // حفظ الملف
      // pdf.save(`طلب_${order.order_id}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    }
  };

  // طباعة HTML
  const printHTML = () => {
    if (!order) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const content = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>وصل استلام وتوصيل</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Tajawal', sans-serif;
            line-height: 1.6;
            color: #000;
            padding: 20px;
            background: white;
            font-size: 14px;
            max-width: 210mm;
            margin: 0 auto;
          }
          
          .receipt-container {
            border: 2px solid #000;
            padding: 25px;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px double #000;
          }
          
          .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            color: #2c3e50;
          }
          
          .header h2 {
            font-size: 20px;
            color: #7f8c8d;
            margin-bottom: 10px;
          }
          
          .header p {
            font-size: 16px;
            color: #666;
          }
          
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          
          .section-title {
            background: #f8f9fa;
            padding: 10px 15px;
            margin-bottom: 15px;
            border-right: 5px solid #3498db;
            font-weight: bold;
            font-size: 18px;
            color: #2c3e50;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          
          .info-item {
            padding: 10px;
            border-bottom: 1px dashed #ddd;
          }
          
          .info-label {
            font-weight: bold;
            color: #555;
            margin-bottom: 5px;
            font-size: 14px;
          }
          
          .info-value {
            color: #000;
            font-size: 16px;
            padding: 5px 0;
          }
          
          .financial-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #dee2e6;
            margin: 25px 0;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #2c3e50;
            color: white;
            border-radius: 8px;
            margin-top: 15px;
            font-size: 20px;
            font-weight: bold;
          }
          
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 60px;
            padding-top: 30px;
            border-top: 3px double #000;
          }
          
          .signature-box {
            text-align: center;
            width: 200px;
          }
          
          .signature-line {
            width: 200px;
            height: 2px;
            background: #000;
            margin: 25px auto 15px;
          }
          
          .stamp {
            text-align: center;
            margin-top: 40px;
            padding: 15px;
            border: 3px solid #e74c3c;
            border-radius: 8px;
            display: inline-block;
            background: rgba(231, 76, 60, 0.1);
          }
          
          .footer {
            text-align: center;
            margin-top: 40px;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          
          .status-badge {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            display: inline-block;
          }
          
          .status-pending { background: #fff3cd; color: #856404; }
          .status-in_receiving { background: #cce5ff; color: #004085; }
          .status-in_warehouse { background: #d4edda; color: #155724; }
          .status-in_delivery { background: #d1ecf1; color: #0c5460; }
          .status-delivered { background: #28a745; color: white; }
          .status-cancelled { background: #dc3545; color: white; }
          
          @media print {
            body {
              padding: 10mm;
              font-size: 13px;
            }
            
            .receipt-container {
              border: 2px solid #000;
              padding: 5mm;
            }
            
            .no-print {
              display: none !important;
            }
            
            @page {
              size: A5;
              margin: 10mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1>وصل استلام وتوصيل</h1>
            <h2>رقم الطلب: ${order.order_id}</h2>
            <p>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p>وقت الطباعة: ${new Date().toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>

          <div class="section">
            <div class="section-title">🔵 معلومات المرسل (العميل)</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">الاسم الكامل:</div>
                <div class="info-value">${order.sender ? `${order.sender.first_name} ${order.sender.last_name}` : order.sender_name || 'غير محدد'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">رقم الهاتف:</div>
                <div class="info-value">${order.sender?.phone || order.sender_phone || 'غير محدد'}</div>
              </div>
              ${order.sender?.email ? `
              <div class="info-item">
                <div class="info-label">البريد الإلكتروني:</div>
                <div class="info-value">${order.sender.email}</div>
              </div>
              ` : ''}
              <div class="info-item">
                <div class="info-label">عنوان الاستلام:</div>
                <div class="info-value">
                  ${order.sender?.governorate_name || ''} - ${order.sender?.area_name || ''}
                  ${order.sender?.address ? `<br>${order.sender.address}` : ''}
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🟢 معلومات المستلم (الزبون)</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">اسم المستلم:</div>
                <div class="info-value">${order.customer_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">الهاتف الرئيسي:</div>
                <div class="info-value">${order.phone1}</div>
              </div>
              ${order.phone2 ? `
              <div class="info-item">
                <div class="info-label">الهاتف الإضافي:</div>
                <div class="info-value">${order.phone2}</div>
              </div>
              ` : ''}
              <div class="info-item">
                <div class="info-label">المحافظة:</div>
                <div class="info-value">${order.governorate_name || '-'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">المنطقة:</div>
                <div class="info-value">${order.area_name || '-'}</div>
              </div>
              ${order.nearest_landmark ? `
              <div class="info-item">
                <div class="info-label">أقرب نقطة دالة:</div>
                <div class="info-value">${order.nearest_landmark}</div>
              </div>
              ` : ''}
            </div>
          </div>

          ${order.driver ? `
          <div class="section">
            <div class="section-title">🚚 معلومات السائق</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">اسم السائق:</div>
                <div class="info-value">${order.driver.full_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">رقم السائق:</div>
                <div class="info-value">${order.driver.driver_id}</div>
              </div>
              <div class="info-item">
                <div class="info-label">هاتف السائق:</div>
                <div class="info-value">${order.driver.phone}</div>
              </div>
              <div class="info-item">
                <div class="info-label">نوع المركبة:</div>
                <div class="info-value">${order.driver.vehicle_type}</div>
              </div>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">💰 المعلومات المالية</div>
            <div class="financial-section">
              <div class="info-item">
                <div class="info-label">سعر المنتج:</div>
                <div class="info-value">${order.product_price.toLocaleString('ar-IQ')} دينار عراقي</div>
              </div>
              <div class="info-item">
                <div class="info-label">سعر التوصيل:</div>
                <div class="info-value">${order.delivery_price.toLocaleString('ar-IQ')} دينار عراقي</div>
              </div>
              <div class="total-row">
                <span>المبلغ الإجمالي:</span>
                <span>${(order.product_price + order.delivery_price).toLocaleString('ar-IQ')} دينار عراقي</span>
              </div>
              <div style="margin-top: 15px; padding: 10px; background: #e8f5e8; border-radius: 5px;">
                <div class="info-label" style="color: #27ae60;">حالة استلام الربح:</div>
                <div class="info-value" style="color: #27ae60; font-weight: bold;">
                  ${order.profit_received ? '✅ تم استلام الربح' : '❌ لم يتم استلام الربح'}
                </div>
              </div>
            </div>
          </div>

          ${order.notes ? `
          <div class="section">
            <div class="section-title">📝 ملاحظات إضافية</div>
            <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
              <p style="font-size: 15px; line-height: 1.8;">${order.notes}</p>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">📊 معلومات النظام</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">حالة الطلب:</div>
                <div class="info-value">
                  <span class="status-badge status-${order.status}">
                    ${getStatusText(order.status)}
                  </span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">تاريخ الإنشاء:</div>
                <div class="info-value">${new Date(order.created_at).toLocaleString('ar-IQ')}</div>
              </div>
              <div class="info-item">
                <div class="info-label">آخر تحديث:</div>
                <div class="info-value">${new Date(order.updated_at).toLocaleString('ar-IQ')}</div>
              </div>
              ${order.delivery_started_at ? `
              <div class="info-item">
                <div class="info-label">بدء التوصيل:</div>
                <div class="info-value">${new Date(order.delivery_started_at).toLocaleString('ar-IQ')}</div>
              </div>
              ` : ''}
              ${order.delivery_completed_at ? `
              <div class="info-item">
                <div class="info-label">انتهاء التوصيل:</div>
                <div class="info-value">${new Date(order.delivery_completed_at).toLocaleString('ar-IQ')}</div>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="signatures">
            <div class="signature-box">
              <p style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">توقيع المرسل</p>
              <div class="signature-line"></div>
              <p style="margin-top: 10px; font-size: 14px;">
                ${order.sender ? `${order.sender.first_name} ${order.sender.last_name}` : order.sender_name || ''}
              </p>
              <p style="font-size: 12px; color: #666; margin-top: 5px;">(العميل)</p>
            </div>
            
            <div class="signature-box">
              <p style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">توقيع المستلم</p>
              <div class="signature-line"></div>
              <p style="margin-top: 10px; font-size: 14px;">${order.customer_name}</p>
              <p style="font-size: 12px; color: #666; margin-top: 5px;">(الزبون)</p>
            </div>
          </div>

          ${order.driver ? `
          <div class="signatures" style="margin-top: 30px;">
            <div class="signature-box">
              <p style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">توقيع السائق</p>
              <div class="signature-line"></div>
              <p style="margin-top: 10px; font-size: 14px;">${order.driver.full_name}</p>
              <p style="font-size: 12px; color: #666; margin-top: 5px;">(سائق التوصيل)</p>
            </div>
          </div>
          ` : ''}

          <div style="text-align: center; margin-top: 50px;">
            <div class="stamp">
              <p style="font-size: 18px; font-weight: bold; color: #e74c3c; margin-bottom: 5px;">ختم المؤسسة</p>
              <p style="font-size: 14px; color: #333;">نظام إدارة الطلبات</p>
              <p style="font-size: 12px; color: #666; margin-top: 5px;">${new Date().toLocaleDateString('ar-SA')}</p>
            </div>
          </div>

          <div class="footer">
            <p>تم الطباعة في: ${new Date().toLocaleString('ar-IQ')}</p>
            <p>نظام إدارة الطلبات - جميع الحقوق محفوظة © ${new Date().getFullYear()}</p>
            <p style="font-size: 10px; color: #999; margin-top: 10px;">هذا الوصل رقم: ${order.order_id} - الرجاء الاحتفاظ به كإثبات للتسليم</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  const downloadInvoice = () => {
    if (!order) return;
    
    const invoiceContent = `
فــــاتــــورة طــــلــــب
============================

📌 معلومات الطلب
------------------------
رقم الطلب: ${order.order_id}
تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}
وقت الإصدار: ${new Date().toLocaleTimeString('ar-SA')}

👤 معلومات المرسل (العميل)
------------------------
الاسم: ${order.sender ? `${order.sender.first_name} ${order.sender.last_name}` : order.sender_name || 'غير محدد'}
الهاتف: ${order.sender?.phone || order.sender_phone || 'غير محدد'}
${order.sender?.email ? `البريد الإلكتروني: ${order.sender.email}` : ''}
الموقع: ${order.sender?.governorate_name || ''} ${order.sender?.area_name || ''}
${order.sender?.address ? `العنوان التفصيلي: ${order.sender.address}` : ''}

👤 معلومات المستلم (الزبون)
------------------------
الاسم: ${order.customer_name}
الهاتف 1: ${order.phone1}
${order.phone2 ? `الهاتف 2: ${order.phone2}` : ''}
المحافظة: ${order.governorate_name || '-'}
المنطقة: ${order.area_name || '-'}
${order.nearest_landmark ? `أقرب نقطة دالة: ${order.nearest_landmark}` : ''}

🚚 معلومات الشحن
------------------------
الفئة: ${order.category_name || '-'}
حالة الطلب: ${getStatusText(order.status)}
${order.driver ? `
معلومات السائق:
  • اسم السائق: ${order.driver.full_name}
  • رقم السائق: ${order.driver.driver_id}
  • هاتف السائق: ${order.driver.phone}
  • نوع المركبة: ${order.driver.vehicle_type}
` : ''}

💰 التفاصيل المالية
------------------------
سعر المنتج: ${order.product_price.toFixed(2)} د.ع
سعر التوصيل: ${order.delivery_price.toFixed(2)} د.ع
الإجمالي: ${(order.product_price + order.delivery_price).toFixed(2)} د.ع
تم استلام الربح: ${order.profit_received ? 'نعم' : 'لا'}

📝 ملاحظات
------------------------
${order.notes || 'لا توجد ملاحظات'}

📊 معلومات النظام
------------------------
تاريخ الإنشاء: ${new Date(order.created_at).toLocaleString('ar-IQ')}
آخر تحديث: ${new Date(order.updated_at).toLocaleString('ar-IQ')}
${order.delivery_started_at ? `بدء التوصيل: ${new Date(order.delivery_started_at).toLocaleString('ar-IQ')}` : ''}
${order.delivery_completed_at ? `انتهاء التوصيل: ${new Date(order.delivery_completed_at).toLocaleString('ar-IQ')}` : ''}

============================
نهاية الفاتورة
    `;
    
    const blob = new Blob([invoiceContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `فاتورة_${order.order_id}.txt`);
    link.click();
  };

  if (loading) {
    return (
      <div className="order-details-loading">
        <div className="order-details-spinner"></div>
        <p className="order-details-loading-text">جاري تحميل تفاصيل الطلب...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-details-error">
        <AlertCircle size={48} className="order-details-error-icon" />
        <h2 className="order-details-error-title">الطلب غير موجود</h2>
        <button 
          className="order-details-btn-primary"
          onClick={() => navigate('/orders')}
        >
          العودة للقائمة
        </button>
      </div>
    );
  }

  return (
    <div className="order-details-container">
      <div className="order-details-header">
        <div>
          <button 
            className="order-details-btn-back"
            onClick={() => navigate('/orders')}
          >
            <ArrowLeft size={18} />
            رجوع للقائمة
          </button>
          <h1 className="order-details-title">تفاصيل الطلب: #{order.order_id}</h1>
          <p className="order-details-subtitle">
            <Clock size={14} />
            تم الإنشاء: {new Date(order.created_at).toLocaleString('ar-IQ')}
          </p>
        </div>
        
        <div className="order-details-action-buttons">
          {/* أزرار إدارة السائق */}
          {order.driver ? (
            <div className="order-details-driver-actions">
              <button 
                className="order-details-btn-secondary order-details-btn-driver-change"
                onClick={fetchAvailableDrivers}
                disabled={assigningDriver}
              >
                <RefreshCw size={16} />
                تغيير السائق
              </button>
              <button 
                className="order-details-btn-danger order-details-btn-driver-remove"
                onClick={removeDriverFromOrder}
                disabled={assigningDriver}
              >
                <XCircle size={16} />
                إزالة السائق
              </button>
            </div>
          ) : (
            <button 
              className="order-details-btn-primary order-details-btn-assign-driver"
              onClick={fetchAvailableDrivers}
              disabled={assigningDriver}
            >
              <Truck size={16} />
              تعيين سائق
            </button>
          )}
          
          <button className="order-details-btn-print" onClick={printPDF}>
            <Download size={16} />
            PDF A5
          </button>
          <button className="order-details-btn-print" onClick={printHTML}>
            <Printer size={16} />
            طباعة 
          </button>
          <button className="order-details-btn-secondary" onClick={downloadInvoice}>
            <FileText size={16} />
            تحميل الفاتورة
          </button>
          <button 
            className="order-details-btn-primary"
            onClick={() => navigate(`/orders/edit/${order.id}`)}
          >
            <Edit size={16} />
            تعديل الطلب
          </button>
        </div>
      </div>

      {/* محتوى الطباعة */}
      <div ref={printRef} className="order-details-print-content">
        <div className="order-details-grid">
          {/* معلومات المرسل (العميل) */}
          <div className="order-details-card order-details-card-sender">
            <h3 className="order-details-card-title">
              <User size={20} />
              معلومات المرسل (العميل)
            </h3>
            <div className="order-details-card-content">
              <div className="order-details-row">
                <span className="order-details-label">الاسم:</span>
                <strong className="order-details-value">
                  {order.sender ? `${order.sender.first_name} ${order.sender.last_name}` : order.sender_name || 'غير محدد'}
                </strong>
              </div>
              <div className="order-details-row">
                <span className="order-details-label">الهاتف:</span>
                <span className="order-details-phone">
                  <Phone size={14} />
                  {order.sender?.phone || order.sender_phone || 'غير محدد'}
                </span>
              </div>
              {order.sender?.email && (
                <div className="order-details-row">
                  <span className="order-details-label">البريد الإلكتروني:</span>
                  <span className="order-details-email">
                    <Mail size={14} />
                    {order.sender.email}
                  </span>
                </div>
              )}
              <div className="order-details-row">
                <span className="order-details-label">الموقع:</span>
                <span className="order-details-location">
                  <MapPin size={14} />
                  {order.sender?.governorate_name || ''} {order.sender?.area_name || ''}
                  {order.sender?.address && ` - ${order.sender.address}`}
                </span>
              </div>
            </div>
          </div>

          {/* معلومات المستلم (الزبون) */}
          <div className="order-details-card order-details-card-receiver">
            <h3 className="order-details-card-title">
              <UserCheck size={20} />
              معلومات المستلم (الزبون)
            </h3>
            <div className="order-details-card-content">
              <div className="order-details-row">
                <span className="order-details-label">الاسم:</span>
                <strong className="order-details-value">{order.customer_name}</strong>
              </div>
              <div className="order-details-row">
                <span className="order-details-label">الهاتف 1:</span>
                <span className="order-details-phone">
                  <Phone size={14} />
                  {order.phone1}
                </span>
              </div>
              {order.phone2 && (
                <div className="order-details-row">
                  <span className="order-details-label">الهاتف 2:</span>
                  <span className="order-details-phone">
                    <Smartphone size={14} />
                    {order.phone2}
                  </span>
                </div>
              )}
              <div className="order-details-row">
                <span className="order-details-label">المحافظة:</span>
                <span className="order-details-value">{order.governorate_name || '-'}</span>
              </div>
              <div className="order-details-row">
                <span className="order-details-label">المنطقة:</span>
                <span className="order-details-value">{order.area_name || '-'}</span>
              </div>
              {order.nearest_landmark && (
                <div className="order-details-row">
                  <span className="order-details-label">أقرب نقطة دالة:</span>
                  <span className="order-details-landmark">
                    <Navigation size={14} />
                    {order.nearest_landmark}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* معلومات السائق */}
          {order.driver && (
            <div className="order-details-card order-details-card-driver">
              <h3 className="order-details-card-title">
                <TruckIcon size={20} />
                معلومات السائق
              </h3>
              <div className="order-details-card-content">
                <div className="order-details-row">
                  <span className="order-details-label">اسم السائق:</span>
                  <strong className="order-details-value">{order.driver.full_name}</strong>
                </div>
                <div className="order-details-row">
                  <span className="order-details-label">رقم السائق:</span>
                  <span className="order-details-driver-id">{order.driver.driver_id}</span>
                </div>
                <div className="order-details-row">
                  <span className="order-details-label">هاتف السائق:</span>
                  <span className="order-details-phone">
                    <Phone size={14} />
                    {order.driver.phone}
                  </span>
                </div>
                <div className="order-details-row">
                  <span className="order-details-label">نوع المركبة:</span>
                  <span className="order-details-value">{order.driver.vehicle_type}</span>
                </div>
                {order.delivery_started_at && (
                  <div className="order-details-row">
                    <span className="order-details-label">بدء التوصيل:</span>
                    <span className="order-details-time">
                      <Clock size={14} />
                      {new Date(order.delivery_started_at).toLocaleString('ar-IQ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* المعلومات المالية */}
          <div className="order-details-card order-details-card-financial">
            <h3 className="order-details-card-title">
              <DollarSign size={20} />
              المعلومات المالية
            </h3>
            <div className="order-details-card-content">
              <div className="order-details-row">
                <span className="order-details-label">سعر المنتج:</span>
                <strong className="order-details-price">{order.product_price.toFixed(2)} د.ع</strong>
              </div>
              <div className="order-details-row">
                <span className="order-details-label">سعر التوصيل:</span>
                <span className="order-details-price">{order.delivery_price.toFixed(2)} د.ع</span>
              </div>
              <div className="order-details-row order-details-total-row">
                <span className="order-details-label">الإجمالي:</span>
                <strong className="order-details-total-amount">
                  {(order.product_price + order.delivery_price).toFixed(2)} د.ع
                </strong>
              </div>
              <div className="order-details-row">
                <span className="order-details-label">تم استلام الربح:</span>
                <button 
                  onClick={toggleProfitReceived}
                  className={`order-details-profit-status ${order.profit_received ? 'order-details-profit-received' : 'order-details-profit-not-received'}`}
                >
                  {order.profit_received ? (
                    <>
                      <CheckCircle size={14} />
                      نعم
                    </>
                  ) : (
                    <>
                      <XCircle size={14} />
                      لا
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* حالة الطلب */}
          <div className="order-details-card order-details-card-status">
            <h3 className="order-details-card-title">
              <Package size={20} />
              حالة الطلب
            </h3>
            <div className="order-details-status-container">
              <div className="order-details-current-status">
                <span className={`order-details-status-badge order-details-status-${order.status}`}>
                  {getStatusText(order.status)}
                </span>
              </div>
              
              <div className="order-details-status-actions">
                <label className="order-details-status-label">تغيير الحالة:</label>
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="order-details-status-select"
                  disabled={assigningDriver}
                >
                  <option value="pending">معلق</option>
                  <option value="in_receiving">قيد الاستلام</option>
                  <option value="in_warehouse">في المستودع</option>
                  <option value="in_delivery">قيد التوصيل</option>
                  <option value="delivered">تم التوصيل</option>
                  <option value="cancelled">ملغى</option>
                  <option value="returned_to_warehouse">مرتجع للمستودع</option>
                  <option value="returned_delivered">مرتجع تم توصيله</option>
                </select>
              </div>
            </div>

            {statusHistory.length > 0 && (
              <div className="order-details-status-history">
                <h4 className="order-details-history-title">سجل الحالة</h4>
                <ul className="order-details-history-list">
                  {statusHistory.map((item) => (
                    <li key={item.id} className="order-details-history-item">
                      <span className={`order-details-history-status order-details-status-${item.status}`}>
                        {getStatusText(item.status)}
                      </span>
                      <span className="order-details-history-date">
                        {new Date(item.created_at).toLocaleString('ar-IQ')}
                      </span>
                      {item.notes && (
                        <span className="order-details-history-note">{item.notes}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* الملاحظات */}
          {order.notes && (
            <div className="order-details-card order-details-card-notes">
              <h3 className="order-details-card-title">
                <FileText size={20} />
                ملاحظات
              </h3>
              <div className="order-details-notes-content">
                <p className="order-details-notes-text">{order.notes}</p>
              </div>
            </div>
          )}

          {/* معلومات النظام */}
          <div className="order-details-card order-details-card-system">
            <h3 className="order-details-card-title">
              <Shield size={20} />
              معلومات النظام
            </h3>
            <div className="order-details-card-content">
              <div className="order-details-row">
                <span className="order-details-label">تاريخ الإنشاء:</span>
                <span className="order-details-time">
                  <Calendar size={14} />
                  {new Date(order.created_at).toLocaleString('ar-IQ')}
                </span>
              </div>
              <div className="order-details-row">
                <span className="order-details-label">آخر تحديث:</span>
                <span className="order-details-time">
                  <Calendar size={14} />
                  {new Date(order.updated_at).toLocaleString('ar-IQ')}
                </span>
              </div>
              {order.delivery_started_at && (
                <div className="order-details-row">
                  <span className="order-details-label">بدء التوصيل:</span>
                  <span className="order-details-time">
                    <PackageCheck size={14} />
                    {new Date(order.delivery_started_at).toLocaleString('ar-IQ')}
                  </span>
                </div>
              )}
              {order.delivery_completed_at && (
                <div className="order-details-row">
                  <span className="order-details-label">انتهاء التوصيل:</span>
                  <span className="order-details-time">
                    <MapPinCheck size={14} />
                    {new Date(order.delivery_completed_at).toLocaleString('ar-IQ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* مودال اختيار السائق */}
      {showDriverModal && (
        <div className="order-details-modal-overlay" onClick={() => !assigningDriver && setShowDriverModal(false)}>
          <div className="order-details-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="order-details-modal-header">
              <h2 className="order-details-modal-title">
                <Truck size={24} />
                {order.driver ? 'تغيير السائق' : 'تعيين سائق للتوصيل'}
              </h2>
              <button 
                className="order-details-modal-close"
                onClick={() => setShowDriverModal(false)}
                disabled={assigningDriver}
              >
                &times;
              </button>
            </div>

            <div className="order-details-modal-body">
              <div className="order-details-search-driver-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="ابحث عن سائق بالاسم، الرقم، أو المركبة..."
                  value={searchDriverTerm}
                  onChange={(e) => setSearchDriverTerm(e.target.value)}
                  disabled={assigningDriver}
                />
              </div>

              <div className="order-details-drivers-list">
                {filteredDrivers.length === 0 ? (
                  <div className="order-details-no-drivers">
                    <p className="order-details-no-drivers-text">لا توجد سائقين متاحين</p>
                    <button 
                      className="order-details-btn-secondary"
                      onClick={() => navigate('/drivers/add')}
                    >
                      <Truck size={16} />
                      إضافة سائق جديد
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="order-details-drivers-stats">
                      <p className="order-details-drivers-count">عدد السائقين المتاحين: {filteredDrivers.length}</p>
                    </div>
                    
                    {filteredDrivers.map(driver => (
                      <div 
                        key={driver.id}
                        className={`order-details-driver-item ${selectedDriverId === driver.id ? 'order-details-driver-selected' : ''}`}
                        onClick={() => !assigningDriver && setSelectedDriverId(driver.id)}
                      >
                        <div className="order-details-driver-info">
                          <div className="order-details-driver-main-info">
                            <UserCheck size={16} className="order-details-driver-icon" />
                            <div>
                              <h4 className="order-details-driver-name">{driver.full_name}</h4>
                              <p className="order-details-driver-id">رقم السائق: {driver.driver_id}</p>
                            </div>
                          </div>
                          
                          <div className="order-details-driver-details">
                            <div className="order-details-driver-detail">
                              <Phone size={14} />
                              <span>{driver.phone}</span>
                            </div>
                            <div className="order-details-driver-detail">
                              <Truck size={14} />
                              <span>{driver.vehicle_type}</span>
                            </div>
                            <div className="order-details-driver-detail">
                              <Package size={14} />
                              <span>طلبات حالية: {driver.orders_in_progress}</span>
                            </div>
                            {driver.vehicle_number && (
                              <div className="order-details-driver-detail">
                                <span>رقم المركبة: {driver.vehicle_number}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="order-details-driver-actions">
                          <button
                            className={`order-details-btn-select-driver ${selectedDriverId === driver.id ? 'order-details-btn-driver-selected' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!assigningDriver) {
                                setSelectedDriverId(driver.id);
                                assignDriverToOrder(driver.id);
                              }
                            }}
                            disabled={assigningDriver}
                          >
                            {assigningDriver && selectedDriverId === driver.id ? (
                              <>
                                <div className="order-details-spinner-small"></div>
                                جاري التعيين...
                              </>
                            ) : (
                              <>
                                <UserCheck size={16} />
                                {order.driver && order.driver.id === driver.id ? 'السائق الحالي' : 'اختيار هذا السائق'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="order-details-modal-footer">
              <button
                className="order-details-btn-secondary"
                onClick={() => setShowDriverModal(false)}
                disabled={assigningDriver}
              >
                إلغاء
              </button>
              <button
                className="order-details-btn-primary"
                onClick={() => selectedDriverId && assignDriverToOrder(selectedDriverId)}
                disabled={!selectedDriverId || assigningDriver}
              >
                {assigningDriver ? (
                  <>
                    <div className="order-details-spinner-small"></div>
                    جاري التعيين...
                  </>
                ) : (
                  <>
                    <Truck size={18} />
                    {order.driver ? 'تغيير السائق' : 'تعيين السائق'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

export default OrderDetailsPage;