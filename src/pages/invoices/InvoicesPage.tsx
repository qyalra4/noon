import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Search, Filter, Download, Plus, Eye, Edit, Trash2, 
  FileText, FileSpreadsheet, File, User, Calendar,
  DollarSign, CheckCircle, XCircle, AlertCircle, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './InvoicesPage.css';

interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string; // هذا هو  المخزن في جدول invoices
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  profile?: {
    id: string;
    first_name: string;
    phone: string;
    email?: string;
  };
  items_count?: number;
}

interface Profile {
  id: string;
  first_name: string;
  phone: string;
  email?: string;
}

interface InvoiceItem {
  id: string;
  invoice_id: string;
  order_id: string;
  order_number: string;
  product_price: number;
  delivery_price: number;
  total_price: number;
}

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. جلب جميع الفواتير
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
        throw invoicesError;
      }

      // 2. جلب جميع العملاء (profiles)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // 3. جلب جميع عناصر الفواتير
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*');

      if (itemsError) {
        console.error('Error fetching invoice items:', itemsError);
        throw itemsError;
      }

      // 4. تخزين البيانات الأساسية
      setProfiles(profilesData || []);
      setInvoiceItems(itemsData || []);

      // 5. دمج البيانات يدوياً
      const processedInvoices: Invoice[] = (invoicesData || []).map(invoice => {
        // البحث عن بيانات العميل باستخدام user_id
        const profile = (profilesData || []).find(p => p.id === invoice.user_id);
        
        // حساب عدد الطلبات (items) المرتبطة بهذه الفاتورة
        const itemsCount = (itemsData || []).filter(item => 
          item.invoice_id === invoice.id
        ).length;

        return {
          ...invoice,
          profile: profile ? {
            id: profile.id,
            first_name: profile.first_name,
            phone: profile.phone,
            email: profile.email
          } : undefined,
          items_count: itemsCount
        };
      });

      setInvoices(processedInvoices);

    } catch (error: any) {
      console.error('Error in fetchAllData:', error);
      alert(`حدث خطأ في تحميل البيانات: ${error.message || 'غير معروف'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.profile?.first_name && invoice.profile.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.profile?.phone && invoice.profile.phone.includes(searchTerm));
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesProfile = profileFilter === 'all' || invoice.user_id === profileFilter;
    
    // تصفية حسب التاريخ
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const invoiceDate = new Date(invoice.created_at);
      const today = new Date();
      
      switch(dateFilter) {
        case 'today':
          matchesDate = invoiceDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = invoiceDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = invoiceDate >= monthAgo;
          break;
        case 'overdue':
          const isOverdue = invoice.status === 'pending' && new Date(invoice.due_date) < today;
          matchesDate = isOverdue;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesProfile && matchesDate;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم حذف جميع الطلبات المرتبطة بها أيضاً.')) {
      try {
        // 1. حذف عناصر الفاتورة أولاً
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id);

        if (itemsError) throw itemsError;

        // 2. حذف الفاتورة
        const { error: invoiceError } = await supabase
          .from('invoices')
          .delete()
          .eq('id', id);

        if (invoiceError) throw invoiceError;
        
        // 3. تحديث البيانات المحلية
        setInvoices(invoices.filter(invoice => invoice.id !== id));
        alert('تم حذف الفاتورة بنجاح');
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('حدث خطأ أثناء حذف الفاتورة');
      }
    }
  };

  // تصدير إلى Excel
  const exportToExcel = () => {
    const XLSX = require('xlsx');
    
    try {
      const data = filteredInvoices.map(invoice => ({
        'رقم الفاتورة': invoice.invoice_number,
        'اسم العميل': invoice.profile?.first_name || 'غير معروف',
        'هاتف العميل': invoice.profile?.phone || 'غير معروف',
        'المبلغ الإجمالي': invoice.total_amount,
        'الحالة': getStatusText(invoice.status),
        'تاريخ الإصدار': new Date(invoice.issue_date).toLocaleDateString('ar-IQ'),
        'تاريخ الاستحقاق': new Date(invoice.due_date).toLocaleDateString('ar-IQ'),
        'عدد الطلبات': invoice.items_count || 0,
        'ملاحظات': invoice.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الفواتير");
      XLSX.writeFile(wb, `الفواتير_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      alert('تم تصدير البيانات إلى Excel بنجاح');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('حدث خطأ أثناء التصدير إلى Excel');
    }
  };

  // تصدير إلى Word (DOC)
  const exportToWord = () => {
    const selectedInvoicesData = invoices.filter(invoice => selectedInvoices.includes(invoice.id));
    
    if (selectedInvoicesData.length === 0) {
      alert('يرجى اختيار فواتير للتصدير');
      return;
    }

    try {
      // إنشاء محتوى نصي للتصدير
      let textContent = `
      فواتير العملاء
      =============
      
      تاريخ التصدير: ${new Date().toLocaleString('ar-IQ')}
      عدد الفواتير: ${selectedInvoicesData.length}
      
      `;

      selectedInvoicesData.forEach((invoice, index) => {
        textContent += `
      ${index + 1}. الفاتورة رقم: ${invoice.invoice_number}
         اسم العميل: ${invoice.profile?.first_name || 'غير معروف'}
         هاتف العميل: ${invoice.profile?.phone || 'غير معروف'}
         المبلغ: ${invoice.total_amount} د.ع
         الحالة: ${getStatusText(invoice.status)}
         تاريخ الإصدار: ${new Date(invoice.issue_date).toLocaleDateString('ar-IQ')}
         تاريخ الاستحقاق: ${new Date(invoice.due_date).toLocaleDateString('ar-IQ')}
         عدد الطلبات: ${invoice.items_count || 0}
         ${invoice.notes ? `ملاحظات: ${invoice.notes}` : ''}
         
        `;
      });

      textContent += `
      =============
      نهاية التقرير
      `;
      
      // إنشاء ملف نصي (يمكن استيراده إلى Word)
      const blob = new Blob([textContent], { 
        type: 'application/msword;charset=utf-8' 
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `الفواتير_${new Date().toISOString().split('T')[0]}.doc`);
      link.click();
      
      alert('تم تصدير البيانات إلى ملف Word بنجاح');
    } catch (error) {
      console.error('Error exporting to Word:', error);
      alert('حدث خطأ أثناء التصدير إلى Word');
    }
  };

  // تغيير حالة الفاتورة
  const updateInvoiceStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      // تحديث البيانات المحلية
      setInvoices(invoices.map(invoice => 
        invoice.id === id ? { 
          ...invoice, 
          status: newStatus,
          updated_at: new Date().toISOString()
        } : invoice
      ));
      alert(`تم تغيير حالة الفاتورة إلى: ${getStatusText(newStatus)}`);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      alert('حدث خطأ أثناء تحديث حالة الفاتورة');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>جاري تحميل الفواتير...</p>
      </div>
    );
  }

  return (
    <div className="invoices-page">
      <div className="page-header">
        <div>
          <h1>إدارة فواتير العملاء</h1>
          <p className="page-subtitle">إجمالي الفواتير: {invoices.length}</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => navigate('/invoices/new')}
        >
          <Plus size={18} />
          إنشاء فاتورة جديدة
        </button>
      </div>

      {/* شريط الفلاتر */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة أو اسم العميل أو الهاتف..."
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
            <option value="pending">معلقة</option>
            <option value="paid">مدفوعة</option>
            <option value="overdue">متأخرة</option>
            <option value="cancelled">ملغاة</option>
          </select>

          <select 
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
          >
            <option value="all">جميع العملاء</option>
            {profiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.first_name} - {profile.phone}
              </option>
            ))}
          </select>

          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">كل التواريخ</option>
            <option value="today">اليوم</option>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="overdue">متأخرة</option>
          </select>
        </div>

        <div className="export-buttons">
          <button className="btn-export" onClick={exportToExcel}>
            <FileSpreadsheet size={16} />
            تصدير Excel
          </button>
          <button className="btn-export" onClick={exportToWord}>
            <File size={16} />
            تصدير Word
          </button>
          <button className="btn-secondary" onClick={fetchAllData}>
            تحديث القائمة
          </button>
        </div>
      </div>

      {/* جدول الفواتير */}
      <div className="table-container">
        <table className="invoices-table">
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedInvoices(filteredInvoices.map(i => i.id));
                    } else {
                      setSelectedInvoices([]);
                    }
                  }}
                />
              </th>
              <th>رقم الفاتورة</th>
              <th>العميل</th>
              <th>المبلغ</th>
              <th>الحالة</th>
              <th>التواريخ</th>
              <th>عدد الطلبات</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(invoice => (
              <tr key={invoice.id}>
                <td>
                  <input 
                    type="checkbox"
                    checked={selectedInvoices.includes(invoice.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInvoices([...selectedInvoices, invoice.id]);
                      } else {
                        setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id));
                      }
                    }}
                  />
                </td>
                <td className="invoice-number">
                  <strong>{invoice.invoice_number}</strong>
                </td>
                <td>
                  <div className="customer-cell">
                    <div className="customer-info">
                      <User size={14} />
                      <strong>{invoice.profile?.first_name || 'غير معروف'}</strong>
                    </div>
                    <div className="customer-contact">
                      <Phone size={12} />
                      {invoice.profile?.phone || '-'}
                    </div>
                  </div>
                </td>
                <td className="amount-cell">
                  <strong>{invoice.total_amount.toLocaleString()} د.ع</strong>
                </td>
                <td>
                  <div className="status-cell">
                    <span className={`status-badge status-${invoice.status}`}>
                      {getStatusText(invoice.status)}
                    </span>
                    <select
                      value={invoice.status}
                      onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="pending">معلقة</option>
                      <option value="paid">مدفوعة</option>
                      <option value="overdue">متأخرة</option>
                      <option value="cancelled">ملغاة</option>
                    </select>
                  </div>
                </td>
                <td>
                  <div className="dates-cell">
                    <div>
                      <Calendar size={12} />
                      الإصدار: {new Date(invoice.issue_date).toLocaleDateString('ar-IQ')}
                    </div>
                    <div className={`due-date ${new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' ? 'overdue' : ''}`}>
                      الاستحقاق: {new Date(invoice.due_date).toLocaleDateString('ar-IQ')}
                    </div>
                  </div>
                </td>
                <td className="items-count">
                  <span className="items-badge">
                    {invoice.items_count || 0} طلب
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-view"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                      title="عرض التفاصيل"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn-edit"
                      onClick={() => navigate(`/invoices/edit/${invoice.id}`)}
                      title="تعديل"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn-download"
                      onClick={() => downloadInvoicePDF(invoice.id)}
                      title="تحميل الفاتورة"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(invoice.id)}
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
        
        {filteredInvoices.length === 0 && (
          <div className="no-data">
            <FileText size={48} />
            <p>لا توجد فواتير تطابق معايير البحث</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/invoices/new')}
            >
              <Plus size={16} />
              إنشاء فاتورة جديدة
            </button>
          </div>
        )}
      </div>

      {/* إحصائيات */}
      <div className="stats-container">
        <div className="stat-card stat-pending">
          <h3>الفواتير المعلقة</h3>
          <p className="stat-number">
            {invoices.filter(i => i.status === 'pending').length}
          </p>
          <div className="stat-icon">
            <AlertCircle size={24} />
          </div>
        </div>
        <div className="stat-card stat-paid">
          <h3>الفواتير المدفوعة</h3>
          <p className="stat-number">
            {invoices.filter(i => i.status === 'paid').length}
          </p>
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
        </div>
        <div className="stat-card stat-overdue">
          <h3>الفواتير المتأخرة</h3>
          <p className="stat-number">
            {invoices.filter(i => i.status === 'overdue').length}
          </p>
          <div className="stat-icon">
            <XCircle size={24} />
          </div>
        </div>
        <div className="stat-card stat-total">
          <h3>إجمالي المبالغ</h3>
          <p className="stat-number">
            {invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0).toLocaleString()} د.ع
          </p>
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
        </div>
      </div>
    </div>
  );
};

// دالة لتحميل الفاتورة كملف PDF (تطوير لاحق)
const downloadInvoicePDF = async (invoiceId: string) => {
  alert(`سيتم تحميل الفاتورة بصيغة PDF`);
  // يمكن تنفيذ هذه الوظيفة لاحقاً
};

// دوال مساعدة
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'معلقة',
    paid: 'مدفوعة',
    overdue: 'متأخرة',
    cancelled: 'ملغاة'
  };
  return statusMap[status] || status;
};

export default InvoicesPage;