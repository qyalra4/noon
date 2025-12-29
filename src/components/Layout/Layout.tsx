import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="layout">
      <Header   />
      <div className="layout-body">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main className={`layout-content ${sidebarCollapsed ? 'expanded' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;