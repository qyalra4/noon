import React, { useState } from 'react';
import { X, Download, FileText, Copy, FileSpreadsheet, FileCode } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface ExportModalProps {
  selectedUsers: string[];
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ selectedUsers, onClose }) => {
  const [exportType, setExportType] = useState<'csv' | 'json' | 'excel'>('csv');
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    id: true,
    name: true,
    email: true,
    phone: true,
    type: true,
    status: true,
    country: true,
    orders: true,
    total: true,
    created_at: true
  });
  const [loading, setLoading] = useState(false);

  const fieldLabels: Record<string, string> = {
    id: 'رقم المستخدم',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    type: 'نوع المستخدم',
    status: 'الحالة',
    country: 'الدولة',
    orders: 'عدد الطلبات',
    total: 'إجمالي المشتريات',
    created_at: 'تاريخ التسجيل'
  };

  const handleFieldToggle = (field: string) => {
    setSelectedFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    const newFields = Object.keys(selectedFields).reduce((acc, field) => {
      acc[field] = checked;
      return acc;
    }, {} as Record<string, boolean>);
    setSelectedFields(newFields);
  };

  const fetchUserData = async () => {
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        *,
        country:countries(name_ar),
        governorate:governorates(name_ar),
        area:areas(name_ar)
      `)
      .in('id', selectedUsers);

    if (error) throw error;
    return users || [];
  };

  const formatDataForExport = (users: any[]) => {
    const fields = Object.keys(selectedFields).filter(field => selectedFields[field]);
    
    return users.map(user => {
      const row: Record<string, any> = {};
      
      fields.forEach(field => {
        switch(field) {
          case 'id':
            row[fieldLabels[field]] = user.id.substring(0, 8);
            break;
          case 'name':
            row[fieldLabels[field]] = `${user.first_name} ${user.last_name}`;
            break;
          case 'email':
            row[fieldLabels[field]] = user.email;
            break;
          case 'phone':
            row[fieldLabels[field]] = user.phone || 'غير محدد';
            break;
          
          case 'status':
            row[fieldLabels[field]] = user.status === 'active' ? 'نشط' :
                                     user.status === 'inactive' ? 'غير نشط' : 'موقوف';
            break;
          case 'country':
            row[fieldLabels[field]] = user.country?.name_ar || 'غير محدد';
            break;
          case 'orders':
            row[fieldLabels[field]] = user.total_orders;
            break;
          case 'total':
            row[fieldLabels[field]] = `${user.total_spent.toLocaleString('ar-IQ')} دينار`;
            break;
          case 'created_at':
            row[fieldLabels[field]] = new Date(user.created_at).toLocaleDateString('ar-IQ');
            break;
        }
      });
      
      return row;
    });
  };

  const exportToCSV = (formattedData: any[]) => {
    // إنشاء محتوى CSV
    const headers = Object.keys(formattedData[0] || {}).join(',');
    const rows = formattedData.map(row => 
      Object.values(row).map(value => `"${value}"`).join(',')
    ).join('\n');
    const csvContent = `${headers}\n${rows}`;
    
    // تحميل الملف
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = (formattedData: any[]) => {
    const jsonContent = JSON.stringify(formattedData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = async (formattedData: any[]) => {
    try {
      // استيراد مكتبة XLSX بشكل ديناميكي لتجنب مشاكل الحجم
      const XLSX = await import('xlsx');
      
      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'المستخدمين');
      
      // تنسيق الأعمدة
      const maxWidth = formattedData.reduce((w, r) => Math.max(w, Object.values(r).join('').length), 10);
      ws['!cols'] = Array(Object.keys(formattedData[0] || {}).length).fill({ wch: maxWidth });
      
      XLSX.writeFile(wb, `users_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      throw error;
    }
  };

  const copyToClipboard = async () => {
    try {
      const users = await fetchUserData();
      const formattedData = formatDataForExport(users);
      
      const text = formattedData.map(row => 
        Object.entries(row).map(([key, value]) => `${key}: ${value}`).join('\n')
      ).join('\n\n');
      
      await navigator.clipboard.writeText(text);
      alert('تم نسخ البيانات إلى الحافظة');
    } catch (error) {
      console.error('Copy error:', error);
      alert('حدث خطأ أثناء النسخ');
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const users = await fetchUserData();
      const formattedData = formatDataForExport(users);

      switch(exportType) {
        case 'csv':
          exportToCSV(formattedData);
          break;
        case 'json':
          exportToJSON(formattedData);
          break;
        case 'excel':
          await exportToExcel(formattedData);
          break;
      }
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setLoading(false);
    }
  };

  const allSelected = Object.values(selectedFields).every(Boolean);
  const someSelected = Object.values(selectedFields).some(Boolean);

  return (
    <div className="modal-overlay">
      <div className="modal-content export-modal">
        <div className="modal-header">
          <h3>
            <Download size={20} /> تصدير بيانات المستخدمين
          </h3>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="export-info">
            <p>تم اختيار <strong>{selectedUsers.length}</strong> مستخدم للتصدير</p>
          </div>

          <div className="export-type-selection">
            <h4>نوع الملف:</h4>
            <div className="type-options">
              <label className={`type-option ${exportType === 'csv' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="exportType"
                  value="csv"
                  checked={exportType === 'csv'}
                  onChange={(e) => setExportType(e.target.value as any)}
                />
                <FileSpreadsheet size={20} />
                <span>CSV</span>
              </label>
              
              <label className={`type-option ${exportType === 'excel' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="exportType"
                  value="excel"
                  checked={exportType === 'excel'}
                  onChange={(e) => setExportType(e.target.value as any)}
                />
                <FileSpreadsheet size={20} />
                <span>Excel</span>
              </label>
              
              <label className={`type-option ${exportType === 'json' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="exportType"
                  value="json"
                  checked={exportType === 'json'}
                  onChange={(e) => setExportType(e.target.value as any)}
                />
                <FileCode size={20} />
                <span>JSON</span>
              </label>
            </div>
          </div>

          <div className="fields-selection">
            <div className="fields-header">
              <h4>اختر الحقول للتصدير:</h4>
              <label className="select-all-checkbox">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected && !allSelected;
                    }
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                اختيار الكل
              </label>
            </div>
            
            <div className="fields-grid">
              {Object.keys(selectedFields).map(field => (
                <label key={field} className="field-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedFields[field]}
                    onChange={() => handleFieldToggle(field)}
                  />
                  <span className="field-label">{fieldLabels[field]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            إلغاء
          </button>
          
          <button
            className="btn btn-info"
            onClick={copyToClipboard}
            disabled={loading}
          >
            <Copy size={16} /> نسخ البيانات
          </button>
          
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={loading || Object.values(selectedFields).filter(Boolean).length === 0}
          >
            {loading ? (
              <>
                <div className="spinner-small"></div>
                جاري التصدير...
              </>
            ) : (
              <>
                <Download size={16} />
                تصدير {exportType.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;