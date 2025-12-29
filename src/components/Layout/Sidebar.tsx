// FILE: src/components/Sidebar.tsx
import React from 'react';
import { 
  Menu, Home, Settings, LogOut, Layers, Bike, IdCard,
  FileText, Users, ListOrdered, ChevronDown, FolderKanban, MessageSquare, ChartBarStacked,
  ChevronLeft, User, Key, Image, Megaphone,LayoutPanelLeft,ScanBarcode, Map,
  BookOpen, FolderOpen, ShoppingCart, Bell, Package, Logs,Cable, CircleDollarSign, 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

// تعريف الـ Props interface
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [hovering, setHovering] = React.useState<boolean>(false);
  const [productsDropdown, setProductsDropdown] = React.useState<boolean>(false);
  const [contentDropdown, setContentDropdown] = React.useState<boolean>(false);
  const navigate = useNavigate();

  // استخدام الـ prop collapsed بدلاً من manualOpen
  const isOpen = !collapsed || hovering;

  return (
    <aside
      className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="sidebar-top">
        <div className="sidebar-title">
          {isOpen && <span className="title-text">لوحة التحكم</span>}
        </div>

        <button
          className="toggle-btn"
          onClick={(e) => { 
            e.stopPropagation(); 
            onToggle(); 
          }}
          aria-label="Toggle sidebar"
        >
          {isOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {/* 📊 القسم الرئيسي */}
          <li className="nav-section">
            {isOpen && <span className="section-label">الرئيسية</span>}
            <button className="nav-btn" onClick={() => navigate('/dashboard')}>
              <Home size={18} />
              {isOpen && <span>لوحة التحكم</span>}
            </button>
          </li>

          <li className="nav-section">
            {isOpen && <span className="section-label">العملاء</span>}
            <button className="nav-btn" onClick={() => navigate('/users')}>
              <Users size={18} />
              {isOpen && <span>إدارة العملاء</span>}
            </button>
          </li>

          <li className="nav-section">
            {isOpen && <span className="section-label">الطلبات </span>}
            
            <button className="nav-btn" onClick={() => navigate('/orders')}>
              <ShoppingCart size={18} />
              {isOpen && <span>إدارة الطلبات</span>}
            </button>
          </li>

         

           {/* السواق  */}
          <li className="nav-section">
            {isOpen && <span className="section-label">السواق</span>}
            <button className="nav-btn" onClick={() => navigate('/drivers')}>
              <Bike  size={18} />
              {isOpen && <span>ادارة سواق</span>}
            </button>

            <button className="nav-btn" onClick={() => navigate('/drivers/add')}>
              <IdCard size={18} />
              {isOpen && <span>أظافة سائق</span>}
            </button>

            <button className="nav-btn" onClick={() => navigate('/invoices')}>
              <CircleDollarSign  size={18} />
              {isOpen && <span>ادارة الفواتير</span>}
            </button>

          </li>
        
          <li className="nav-section">
            {isOpen && <span className="section-label">إدارة </span>}
            <button className="nav-btn" onClick={() => navigate('/areas')}>
             <Map size={18} />
             {isOpen && <span>إدارة المناطق</span>}
            </button>
            {/* <button className="nav-btn" onClick={() => navigate('/categories')}>
              <ChartBarStacked size={18} />
              {isOpen && <span>إدارة ألفئات</span>}
            </button> */}
          </li>

           <li className="nav-section">
            {isOpen && <span className="section-label">الدعم المباشر</span>}
            <button className="nav-btn" onClick={() => navigate('/support')}>
             <MessageSquare size={18} />
             {isOpen && <span>دعم العملاء</span>}
            </button>
            <button className="nav-btn" onClick={() => navigate('/support-drivers')}>
              <MessageSquare size={18} />
              {isOpen && <span>دعم السواق </span>}
            </button>
          </li>

        

          <li className="nav-section">
            {isOpen && <span className="section-label">الإشعارات</span>}
            <button className="nav-btn" onClick={() => navigate('/notifications')}>
              <Bell size={18} />
              {isOpen && <span>إدارة الإشعارات</span>}
            </button>

            <button className="nav-btn" onClick={() => navigate('/notifications-log')}>
              <Logs size={18} />
              {isOpen && <span>سجل الإشعارات</span>}
            </button>
          </li>

         

          {/* <li className="nav-section">
            {isOpen && <span className="section-label">مصادقة التطبيق</span>}
              <button className="nav-btn" onClick={() => navigate('/app-updates')}>
              <Cable size={18} />
              {isOpen && <span>تحديثات التطبيق</span>}
            </button>
          </li> */}

         

          {/* الإعدادات العامة */}
          <li className="nav-section">
            {isOpen && <span className="section-label">عام</span>}

            <button className="nav-btn" onClick={() => navigate('/AllAdmins')}>
              <User size={18} />
              {isOpen && <span>جميع المشرفين</span>}
            </button>

            <button className="nav-btn" onClick={() => navigate('/admin/add')}>
              <Settings size={18} />
              {isOpen && <span>أضافة مشرف جديد</span>}
            </button>

            <button className="nav-btn" onClick={() => navigate('/profile')}>
              <User size={18} />
              {isOpen && <span>الملف الشخصي</span>}
            </button>

         
          </li>

          <li className="nav-section">
            {isOpen && <span className="section-label">تسجيل الخروج</span>}
            <button className="nav-btn nav-logout">
              <LogOut size={18} />
              {isOpen && <span>تسجيل الخروج</span>}
            </button>
          </li>
        </ul>
      </nav>

      <div className="sidebar-foot">
        {isOpen ? (
          <div className="foot-text">لوحة التحكم</div>
        ) : (
          <div className="foot-text">v-1.0.0</div>
        )}
      </div>
    </aside>
  );
}