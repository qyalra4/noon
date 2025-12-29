import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import UsersTable from './components/UsersTable';
import ExportModal from './components/ExportModal';
import UserFilters from './components/UserFilters';
import { Download, RefreshCw, UserPlus, Filter, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './styles/Users.css';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  
  status: string;
  created_at: string;
  
  country?: {
    name_ar: string;
  };
  governorate?: {
    name_ar: string;
  };
  area?: {
    name_ar: string;
  };
}

const Users: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    
    status: 'all',
    date_from: '',
    date_to: '',
    country_id: '',
  });
  const itemsPerPage = 40;

  // جلب المستخدمين
  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          country:countries(name_ar),
          governorate:governorates(name_ar),
          area:areas(name_ar)
        `, { count: 'exact' });

      
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.country_id) {
        query = query.eq('country_id', filters.country_id);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // البحث
      if (searchTerm) {
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        );
      }

      // الترقيم
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      setUsers(data || []);
      setFilteredUsers(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('حدث خطأ أثناء جلب بيانات المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const handleSearch = () => {
    fetchUsers(1);
  };

  const handleRefresh = () => {
    setSelectedUsers([]);
    fetchUsers(1);
  };

  const handleSelectUser = (userId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleDeleteUsers = async () => {
    if (!window.confirm(`هل تريد حذف ${selectedUsers.length} مستخدم؟`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', selectedUsers);

      if (error) throw error;

      alert(`تم حذف ${selectedUsers.length} مستخدم بنجاح`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting users:', error);
      alert('حدث خطأ أثناء حذف المستخدمين');
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      fetchUsers(currentPage);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('حدث خطأ أثناء تحديث حالة المستخدم');
    }
  };

  return (
    <div className="users-management">
      <div className="page-header">
        <div className="header-left">
          <h1>إدارة العملاء</h1>
          <p>إجمالي العملاء: {users.length}</p>
        </div>
        
        <div className="header-actions">
          {selectedUsers.length > 0 && (
            <div className="selection-actions">
              <span className="selection-count">
                تم اختيار {selectedUsers.length} مستخدم
              </span>
              <button 
                className="btn btn-danger"
                onClick={handleDeleteUsers}
              >
                حذف المحدد
              </button>
              <button 
                className="btn btn-export"
                onClick={handleExport}
              >
                <Download size={16} /> تصدير
              </button>
            </div>
          )}
          
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/users/add')}
          >
            <UserPlus size={16} /> إضافة مستخدم
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} /> تحديث
          </button>
        </div>
      </div>

      <div className="search-filters-section">
        <div className="search-box">
          <div className="search-input-group">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="ابحث بالاسم، البريد، أو الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
            />
            <button 
              className="btn btn-search"
              onClick={handleSearch}
              disabled={loading}
            >
              بحث
            </button>
          </div>
        </div>

        <UserFilters
          filters={filters}
          onFilterChange={setFilters}
          onApplyFilters={() => fetchUsers(1)}
        />
      </div>

      <UsersTable
        users={users}
        loading={loading}
        selectedUsers={selectedUsers}
        onSelectUser={handleSelectUser}
        onSelectAll={handleSelectAll}
        onStatusChange={handleStatusChange}
        onViewUser={(id) => navigate(`/users/${id}`)}
        onEditUser={(id) => navigate(`/users/edit/${id}`)}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
      />

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => fetchUsers(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="pagination-btn"
          >
            السابق
          </button>
          
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
              <button
                key={pageNum}
                onClick={() => fetchUsers(pageNum)}
                className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                disabled={loading}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => fetchUsers(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="pagination-btn"
          >
            التالي
          </button>
          
          <div className="pagination-info">
            صفحة {currentPage} من {totalPages}
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportModal
          selectedUsers={selectedUsers}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default Users;