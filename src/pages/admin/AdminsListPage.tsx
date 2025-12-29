import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, Edit, Trash2, Shield, Search, Filter,
  UserCheck, UserX, Eye, MoreVertical, Download,
  RefreshCw, AlertCircle, CheckCircle, XCircle,
  Mail, Phone, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import './AdminsListPage.css';

interface Admin {
  id: string;
  admin_id: string;
  full_name: string;
  username: string | null;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_login: string | null;
}

const AdminsListPage = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // فلترة وبحث
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalAdmins, setTotalAdmins] = useState(0);
  
  // Actions
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, [currentPage, itemsPerPage, sortBy, sortOrder]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError('');

      // بناء الاستعلام
      let query = supabase
        .from('admins')
        .select('*', { count: 'exact' });

      // تطبيق الفلترة
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active');
      }

      // تطبيق الترتيب
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // تطبيق Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setAdmins(data || []);
      setTotalAdmins(count || 0);
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      setError('حدث خطأ في تحميل بيانات المشرفين');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchAdmins();
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getRoleArabicName = (role: string) => {
    const roles: { [key: string]: string } = {
      'super_admin': 'مدير النظام',
      'admin': 'مشرف رئيسي',
      'support_supervisor': 'مشرف دعم',
      'orders_supervisor': 'مشرف طلبات',
      'customers_supervisor': 'مشرف عملاء',
      'drivers_supervisor': 'مشرف سائقين',
      'invoices_supervisor': 'مشرف فواتير'
    };
    return roles[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'super_admin': 'role-super-admin',
      'admin': 'role-admin',
      'support_supervisor': 'role-support',
      'orders_supervisor': 'role-orders',
      'customers_supervisor': 'role-customers',
      'drivers_supervisor': 'role-drivers',
      'invoices_supervisor': 'role-invoices'
    };
    return colors[role] || 'role-default';
  };

  const toggleAdminStatus = async (admin: Admin) => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('admins')
        .update({ 
          is_active: !admin.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', admin.id);

      if (error) throw error;

      setSuccess(`تم ${admin.is_active ? 'تعطيل' : 'تفعيل'} المشرف بنجاح`);
      fetchAdmins();
      setShowStatusModal(false);
      setSelectedAdmin(null);
    } catch (error: any) {
      console.error('Error updating admin status:', error);
      setError('حدث خطأ في تحديث حالة المشرف');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      setActionLoading(true);
      
      // 1. حذف المشرف من جدول admins
      const { error: adminError } = await supabase
        .from('admins')
        .delete()
        .eq('id', selectedAdmin.id);

      if (adminError) throw adminError;

      // 2. حذف المستخدم من المصادقة (اختياري)
      // يمكنك إزالة هذا الجزء إذا أردت الحفاظ على حساب المستخدم
      try {
        await supabase.auth.admin.deleteUser(selectedAdmin.admin_id);
      } catch (authError) {
        console.warn('Could not delete auth user:', authError);
      }

      setSuccess('تم حذف المشرف بنجاح');
      fetchAdmins();
      setShowDeleteModal(false);
      setSelectedAdmin(null);
    } catch (error: any) {
      console.error('Error deleting admin:', error);
      setError('حدث خطأ في حذف المشرف');
    } finally {
      setActionLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['الاسم', 'البريد الإلكتروني', 'الهاتف', 'الدور', 'الحالة', 'تاريخ الإنشاء'];
    const data = admins.map(admin => [
      admin.full_name,
      admin.email,
      admin.phone || 'غير محدد',
      getRoleArabicName(admin.role),
      admin.is_active ? 'نشط' : 'غير نشط',
      new Date(admin.created_at).toLocaleDateString('ar-IQ')
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `المشرفين_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalAdmins / itemsPerPage);

  if (loading && admins.length === 0) {
    return (
      <div className="admins-loading">
        <div className="admins-spinner"></div>
        <p>جاري تحميل بيانات المشرفين...</p>
      </div>
    );
  }

  return (
    <div className="admins-list-page">
      {/* رأس الصفحة */}
      <div className="admins-header">
        <div className="admins-header-left">
          <div className="admins-header-icon">
            <Users size={32} />
          </div>
          <div className="admins-header-title">
            <h1>إدارة المشرفين</h1>
            <p className="admins-header-subtitle">
              إدارة جميع حسابات المشرفين في النظام ({totalAdmins} مشرف)
            </p>
          </div>
        </div>

        <div className="admins-header-actions">
          <button
            className="admins-btn admins-btn-secondary"
            onClick={exportToCSV}
            disabled={admins.length === 0}
          >
            <Download size={18} />
            تصدير CSV
          </button>
          <button
            className="admins-btn admins-btn-primary"
            onClick={() => navigate('/admin/add')}
          >
            <Plus size={18} />
            إضافة مشرف جديد
          </button>
        </div>
      </div>

      {/* رسائل التنبيه */}
      {error && (
        <div className="admins-alert admins-alert-error">
          <AlertCircle size={20} />
          {error}
          <button onClick={() => setError('')} className="admins-alert-close">×</button>
        </div>
      )}

      {success && (
        <div className="admins-alert admins-alert-success">
          <CheckCircle size={20} />
          {success}
          <button onClick={() => setSuccess('')} className="admins-alert-close">×</button>
        </div>
      )}

      {/* شريط البحث والفلترة */}
      <div className="admins-controls">
        <form onSubmit={handleSearch} className="admins-search-form">
          <div className="admins-search-box">
            <Search size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم، البريد الإلكتروني أو الهاتف..."
              className="admins-search-input"
            />
            <button type="submit" className="admins-search-btn">
              بحث
            </button>
          </div>
        </form>

        <div className="admins-filters">
          <div className="admins-filter-group">
            <Filter size={16} />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="admins-filter-select"
            >
              <option value="all">جميع الأدوار</option>
              <option value="super_admin">مدير النظام</option>
              <option value="admin">مشرف رئيسي</option>
              <option value="support_supervisor">مشرف دعم</option>
              <option value="orders_supervisor">مشرف طلبات</option>
              <option value="customers_supervisor">مشرف عملاء</option>
              <option value="drivers_supervisor">مشرف سائقين</option>
              <option value="invoices_supervisor">مشرف فواتير</option>
            </select>
          </div>

          <div className="admins-filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admins-filter-select"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          <div className="admins-filter-group">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="admins-filter-select"
            >
              <option value="created_at">ترتيب حسب التاريخ</option>
              <option value="full_name">ترتيب حسب الاسم</option>
              <option value="role">ترتيب حسب الدور</option>
            </select>
          </div>

          <button
            className="admins-btn admins-btn-outline"
            onClick={fetchAdmins}
          >
            <RefreshCw size={18} />
            تحديث
          </button>
        </div>
      </div>

      {/* جدول المشرفين */}
      <div className="admins-table-container">
        <table className="admins-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('full_name')}>
                المشرف
                {sortBy === 'full_name' && (
                  <span className="sort-indicator">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th>معلومات الاتصال</th>
              <th onClick={() => handleSort('role')}>
                الدور
                {sortBy === 'role' && (
                  <span className="sort-indicator">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('is_active')}>
                الحالة
                {sortBy === 'is_active' && (
                  <span className="sort-indicator">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('created_at')}>
                تاريخ الإنشاء
                {sortBy === 'created_at' && (
                  <span className="sort-indicator">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="admins-empty">
                  <div className="admins-empty-content">
                    <Users size={48} />
                    <p>لا توجد مشرفين</p>
                    <p className="admins-empty-subtitle">
                      {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                        ? 'لا توجد نتائج تطابق معايير البحث'
                        : 'لم يتم إضافة أي مشرفين بعد'}
                    </p>
                    <button
                      className="admins-btn admins-btn-primary"
                      onClick={() => navigate('/admins/add')}
                    >
                      <Plus size={18} />
                      إضافة أول مشرف
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className={!admin.is_active ? 'admin-inactive' : ''}>
                  <td className="admin-info-cell">
                    <div className="admin-avatar">
                      {admin.full_name.charAt(0)}
                    </div>
                    <div className="admin-details">
                      <div className="admin-name">{admin.full_name}</div>
                      <div className="admin-username">
                        @{admin.username || 'لا يوجد'}
                      </div>
                    </div>
                  </td>
                  <td className="admin-contact-cell">
                    <div className="admin-contact-item">
                      <Mail size={14} />
                      <span>{admin.email}</span>
                    </div>
                    <div className="admin-contact-item">
                      <Phone size={14} />
                      <span>{admin.phone || 'غير محدد'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-role-badge ${getRoleBadgeColor(admin.role)}`}>
                      {getRoleArabicName(admin.role)}
                    </span>
                  </td>
                  <td>
                    <div className="admin-status-container">
                      <span className={`admin-status ${admin.is_active ? 'active' : 'inactive'}`}>
                        {admin.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                      <div className="admin-status-indicator"></div>
                    </div>
                  </td>
                  <td className="admin-date-cell">
                    <div className="admin-date">
                      <Calendar size={14} />
                      {new Date(admin.created_at).toLocaleDateString('ar-IQ')}
                    </div>
                    <div className="admin-time">
                      {new Date(admin.created_at).toLocaleTimeString('ar-IQ', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="admin-actions-cell">
                    <div className="admin-actions">
                      <button
                        className="admin-action-btn admin-action-view"
                        onClick={() => navigate(`/admin/profile/${admin.id}`)}
                        title="عرض التفاصيل"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="admin-action-btn admin-action-edit"
                        onClick={() => navigate(`/admins/edit/${admin.id}`)}
                        title="تعديل"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="admin-action-btn admin-action-status"
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setShowStatusModal(true);
                        }}
                        title={admin.is_active ? 'تعطيل' : 'تفعيل'}
                      >
                        {admin.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      <div className="admin-action-more">
                        <button
                          className="admin-action-btn admin-action-more-btn"
                          onClick={() => setShowActionsMenu(
                            showActionsMenu === admin.id ? null : admin.id
                          )}
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {showActionsMenu === admin.id && (
                          <div className="admin-action-dropdown">
                            <button
                              className="admin-dropdown-item"
                              onClick={() => {
                                navigate(`/admin/profile/${admin.id}`);
                                setShowActionsMenu(null);
                              }}
                            >
                              <Eye size={14} />
                              عرض التفاصيل
                            </button>
                            <button
                              className="admin-dropdown-item"
                              onClick={() => {
                                navigate(`/admins/edit/${admin.id}`);
                                setShowActionsMenu(null);
                              }}
                            >
                              <Edit size={14} />
                              تعديل البيانات
                            </button>
                            <button
                              className="admin-dropdown-item"
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowStatusModal(true);
                                setShowActionsMenu(null);
                              }}
                            >
                              {admin.is_active ? (
                                <>
                                  <UserX size={14} />
                                  تعطيل المشرف
                                </>
                              ) : (
                                <>
                                  <UserCheck size={14} />
                                  تفعيل المشرف
                                </>
                              )}
                            </button>
                            <button
                              className="admin-dropdown-item admin-dropdown-danger"
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowDeleteModal(true);
                                setShowActionsMenu(null);
                              }}
                            >
                              <Trash2 size={14} />
                              حذف المشرف
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
     {/* Pagination */}
{totalAdmins > 0 && (
  <div className="admins-pagination">
    <div className="admins-pagination-info">
      <span>
        عرض {Math.min((currentPage - 1) * itemsPerPage + 1, totalAdmins)} - {Math.min(currentPage * itemsPerPage, totalAdmins)} من {totalAdmins}
      </span>
      <select
        value={itemsPerPage}
        onChange={(e) => handleItemsPerPageChange(e)}
        className="admins-perpage-select"
      >
        <option value={5}>5 لكل صفحة</option>
        <option value={10}>10 لكل صفحة</option>
        <option value={20}>20 لكل صفحة</option>
        <option value={50}>50 لكل صفحة</option>
      </select>
    </div>

    <div className="admins-pagination-controls">
      <button
        className="admins-page-btn"
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
      >
        <ChevronRight size={18} />
        السابق
      </button>
      
      <div className="admins-page-numbers">
        {/* عرض الأرقام الأولى */}
        {currentPage > 3 && totalPages > 5 && (
          <>
            <button
              className="admins-page-number"
              onClick={() => setCurrentPage(1)}
            >
              1
            </button>
            {currentPage > 4 && <span className="admins-page-ellipsis">...</span>}
          </>
        )}
        
        {/* عرض الأرقام حول الصفحة الحالية */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }
          
          return (
            pageNum <= totalPages && (
              <button
                key={pageNum}
                className={`admins-page-number ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            )
          );
        })}
        
        {/* عرض الأرقام الأخيرة */}
        {currentPage < totalPages - 2 && totalPages > 5 && (
          <>
            {currentPage < totalPages - 3 && <span className="admins-page-ellipsis">...</span>}
            <button
              className="admins-page-number"
              onClick={() => setCurrentPage(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}
      </div>
      
      <button
        className="admins-page-btn"
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
      >
        التالي
        <ChevronLeft size={18} />
      </button>
    </div>
  </div>
)}

      {/* Modal لتغيير الحالة */}
      {showStatusModal && selectedAdmin && (
        <div className="admins-modal-overlay">
          <div className="admins-modal">
            <div className="admins-modal-header">
              <h3>{selectedAdmin.is_active ? 'تعطيل المشرف' : 'تفعيل المشرف'}</h3>
              <button
                className="admins-modal-close"
                onClick={() => setShowStatusModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admins-modal-body">
              <AlertCircle size={48} className="admins-modal-icon" />
              <p>
                هل أنت متأكد أنك تريد {selectedAdmin.is_active ? 'تعطيل' : 'تفعيل'} المشرف{' '}
                <strong>{selectedAdmin.full_name}</strong>؟
              </p>
              <p className="admins-modal-warning">
                {selectedAdmin.is_active 
                  ? 'لن يتمكن المشرف من الدخول إلى النظام بعد التعطيل.'
                  : 'سيتمكن المشرف من الدخول إلى النظام بعد التفعيل.'}
              </p>
            </div>
            <div className="admins-modal-footer">
              <button
                className="admins-btn admins-btn-secondary"
                onClick={() => setShowStatusModal(false)}
                disabled={actionLoading}
              >
                إلغاء
              </button>
              <button
                className={`admins-btn ${selectedAdmin.is_active ? 'admins-btn-warning' : 'admins-btn-success'}`}
                onClick={() => toggleAdminStatus(selectedAdmin)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <div className="admins-spinner-small"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    {selectedAdmin.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                    {selectedAdmin.is_active ? 'تعطيل' : 'تفعيل'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal للحذف */}
      {showDeleteModal && selectedAdmin && (
        <div className="admins-modal-overlay">
          <div className="admins-modal admins-modal-danger">
            <div className="admins-modal-header">
              <h3>حذف المشرف</h3>
              <button
                className="admins-modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admins-modal-body">
              <XCircle size={48} className="admins-modal-icon" />
              <p>
                هل أنت متأكد أنك تريد حذف المشرف{' '}
                <strong>{selectedAdmin.full_name}</strong>؟
              </p>
              <p className="admins-modal-warning">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه.<br />
                سيتم حذف جميع بيانات المشرف ولا يمكن استعادتها.
              </p>
            </div>
            <div className="admins-modal-footer">
              <button
                className="admins-btn admins-btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
              >
                إلغاء
              </button>
              <button
                className="admins-btn admins-btn-danger"
                onClick={deleteAdmin}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <div className="admins-spinner-small"></div>
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    حذف المشرف
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

export default AdminsListPage;