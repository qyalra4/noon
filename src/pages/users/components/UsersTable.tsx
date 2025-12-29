import React, { useState } from 'react';
import { 
  Eye, EyeOff, Copy, User, Check, X, MoreVertical, 
  Edit, Trash2, Shield, ShieldOff, Mail, Phone, MapPin 
} from 'lucide-react';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
  country?: { name_ar: string };
  governorate?: { name_ar: string };
  area?: { name_ar: string };
}

interface UsersTableProps {
  users: User[];
  loading: boolean;
  selectedUsers: string[];
  onSelectUser: (userId: string, isSelected: boolean) => void;
  onSelectAll: (isSelected: boolean) => void;
  onStatusChange: (userId: string, newStatus: string) => void;
  onViewUser: (userId: string) => void;
  onEditUser: (userId: string) => void;
  currentPage: number;
  itemsPerPage: number;
}

const UsersTable: React.FC<UsersTableProps> = ({
  users,
  loading,
  selectedUsers,
  onSelectUser,
  onSelectAll,
  onStatusChange,
  onViewUser,
  onEditUser,
  currentPage,
  itemsPerPage
}) => {
  const [visibleEmails, setVisibleEmails] = useState<{ [key: string]: boolean }>({});
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const toggleEmailVisibility = (userId: string) => {
    setVisibleEmails(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`تم نسخ ${type} إلى الحافظة`);
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD'
    }).format(amount);
  };

  const getUserTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      customer: 'عميل',
      delivery: 'سائق',
      admin: 'مسؤول'
    };
    return types[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string, color: string } } = {
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
        <p>جاري تحميل المستخدمين...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="empty-table">
        <div className="empty-icon">
          <User size={48} />
        </div>
        <h3>لا يوجد مستخدمين</h3>
        <p>لم يتم العثور على مستخدمين مطابقين للبحث أو الفلاتر</p>
      </div>
    );
  }

  const allSelected = users.length > 0 && selectedUsers.length === users.length;

  return (
    <div className="table-responsive">
      <table className="users-table">
        <thead>
          <tr>
            <th style={{ width: '50px' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </th>
            <th style={{ width: '60px' }}>#</th>
            <th>المستخدم</th>
            <th>البريد الإلكتروني</th>
            <th>الهاتف</th>
            <th>الدولة/المحافظة</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id} className={selectedUsers.includes(user.id) ? 'selected' : ''}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={(e) => onSelectUser(user.id, e.target.checked)}
                />
              </td>
              <td className="text-center">
                {(currentPage - 1) * itemsPerPage + index + 1}
              </td>
              <td>
                <div className="user-info-cell">
                  <div className="user-avatar">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.first_name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.first_name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="user-details">
                    <div className="user-namePage">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="user-idPage">ID: {user.id.substring(0, 8)}</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="email-cell">
                  <div className="email-display">
                    <span className="email-text">
                      {visibleEmails[user.id] ? user.email : '••••••••••'}
                    </span>
                    <div className="email-actions">
                      <button
                        className="icon-btn"
                        onClick={() => toggleEmailVisibility(user.id)}
                        title={visibleEmails[user.id] ? 'إخفاء البريد' : 'إظهار البريد'}
                      >
                        {visibleEmails[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => copyToClipboard(user.email, 'البريد الإلكتروني')}
                        title="نسخ البريد"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                {user.phone ? (
                  <div className="phone-cell">
                    <span>{user.phone}</span>
                    <button
                      className="icon-btn"
                      onClick={() => copyToClipboard(user.phone!, 'رقم الهاتف')}
                      title="نسخ الهاتف"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="text-muted">غير محدد</span>
                )}
              </td>
              
              <td>
                <div className="location-cell">
                  <MapPin size={12} />
                  <span>
                    {user.country?.name_ar || 'غير محدد'}
                    {user.governorate && ` - ${user.governorate.name_ar}`}
                  </span>
                </div>
              </td>
              <td>
                {getStatusBadge(user.status)}
                <div className="status-actions">
                  <button
                    className="status-btn"
                    onClick={() => onStatusChange(user.id, 'active')}
                    title="تفعيل"
                    disabled={user.status === 'active'}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    className="status-btn"
                    onClick={() => onStatusChange(user.id, 'inactive')}
                    title="تعطيل"
                    disabled={user.status === 'inactive'}
                  >
                    <X size={12} />
                  </button>
                </div>
              </td>
              
             
              <td>
                <div className="actions-cell">
                  <div className="dropdown">
                    <button
                      className="action-menu-btn"
                      onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {actionMenu === user.id && (
                      <div className="dropdown-menu">
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            onViewUser(user.id);
                            setActionMenu(null);
                          }}
                        >
                          <Eye size={14} /> عرض التفاصيل
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            onEditUser(user.id);
                            setActionMenu(null);
                          }}
                        >
                          <Edit size={14} /> تعديل
                        </button>
                       
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              onStatusChange(
                                user.id,
                                user.status === 'active' ? 'inactive' : 'active'
                              );
                              setActionMenu(null);
                            }}
                          >
                            {user.status === 'active' ? (
                              <>
                                <ShieldOff size={14} /> تعطيل
                              </>
                            ) : (
                              <>
                                <Shield size={14} /> تفعيل
                              </>
                            )}
                          </button>
                       
                        <button
                          className="dropdown-item text-danger"
                          onClick={() => {
                            if (window.confirm(`هل تريد حذف المستخدم ${user.first_name} ${user.last_name}؟`)) {
                              // سيتم تنفيذ الحذف في المكون الرئيسي
                            }
                            setActionMenu(null);
                          }}
                        >
                          <Trash2 size={14} /> حذف
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="quick-actions">
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => onViewUser(user.id)}
                      title="عرض"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => onEditUser(user.id)}
                      title="تعديل"
                    >
                      <Edit size={12} />
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTable;