import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Search, MessageSquare, User, Clock, CheckCircle, 
  AlertCircle, Send, Paperclip, MoreVertical, 
  RefreshCw, Filter, XCircle, ChevronLeft, 
  ChevronRight, Mail, Phone, Calendar, Shield, Truck
} from 'lucide-react';
import './DriverSupportPage.css';

interface Driver {
  id: string;
  driver_id: string;
  full_name: string;
  phone: string;
  email?: string;
  vehicle_type?: string;
  status?: string;
}

interface DriverSupportConversation {
  id: string;
  driver_id: string;
  admin_id: string | null;
  status: 'open' | 'closed' | 'pending';
  subject: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  driver?: Driver;
  unread_count: number;
  last_message?: string;
  driver_email?: string;
  driver_name?: string;
  driver_phone?: string;
}

interface DriverSupportMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'driver' | 'admin';
  message: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
  sender_email?: string;
  sender_name?: string;
}

interface DriverSupportFilters {
  status: 'all' | 'open' | 'closed' | 'pending';
  search: string;
}

const DriverSupportPage: React.FC = () => {
  const [conversations, setConversations] = useState<DriverSupportConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DriverSupportConversation | null>(null);
  const [messages, setMessages] = useState<DriverSupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filters, setFilters] = useState<DriverSupportFilters>({
    status: 'all',
    search: ''
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // تحميل المحادثات
  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // جلب المحادثات مع معلومات السائق
      const { data: conversationsData, error: convError } = await supabase
        .from('driver_support_conversations')
        .select(`
          *,
          driver:drivers(*)
        `)
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      // معالجة البيانات
      const conversationsWithData = await Promise.all(
        (conversationsData || []).map(async (conv: any) => {
          const driver = conv.driver;
          
          // جلب عدد الرسائل غير المقروءة
          const { count } = await supabase
            .from('driver_support_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('read', false)
            .eq('sender_type', 'driver');

          // جلب آخر رسالة
          const { data: lastMessageData } = await supabase
            .from('driver_support_messages')
            .select('message')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            driver_name: driver?.full_name || 'سائق',
            driver_email: driver?.email,
            driver_phone: driver?.phone,
            unread_count: count || 0,
            last_message: lastMessageData?.message || ''
          };
        })
      );

      // تطبيق الفلاتر
      let filteredConversations = conversationsWithData;
      
      if (filters.status !== 'all') {
        filteredConversations = filteredConversations.filter(
          conv => conv.status === filters.status
        );
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredConversations = filteredConversations.filter(
          conv => 
            conv.driver_name?.toLowerCase().includes(searchTerm) ||
            conv.driver?.driver_id?.toLowerCase().includes(searchTerm) ||
            conv.subject?.toLowerCase().includes(searchTerm) ||
            conv.last_message?.toLowerCase().includes(searchTerm)
        );
      }

      setConversations(filteredConversations);
    } catch (error) {
      console.error('خطأ في تحميل محادثات السواق:', error);
      alert('حدث خطأ في تحميل محادثات السواق');
    } finally {
      setLoading(false);
    }
  };

  // تحميل الرسائل لمحادثة محددة
  const loadMessages = async (conversationId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('driver_support_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // إضافة معلومات المرسل لكل رسالة
      const messagesWithSenders = await Promise.all(
        (messagesData || []).map(async (msg) => {
          let sender_name = 'نظام';

          if (msg.sender_type === 'admin') {
            const { data: adminData } = await supabase
              .from('admins')
              .select('full_name')
              .eq('admin_id', msg.sender_id)
              .single();
            
            sender_name = adminData?.full_name || 'مسؤول';
          } else {
            const { data: driverData } = await supabase
              .from('drivers')
              .select('full_name')
              .eq('id', msg.sender_id)
              .single();
            
            sender_name = driverData?.full_name || 'سائق';
          }

          return {
            ...msg,
            sender_name
          };
        })
      );

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('خطأ في تحميل رسائل السواق:', error);
    }
  };

  // إرسال رسالة جديدة
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      
      // جلب معلومات المسؤول الحالي
      const { data: { user } } = await supabase.auth.getUser();
      const { data: adminData } = await supabase
        .from('admins')
        .select('full_name')
        .eq('admin_id', user?.id)
        .single();

      // إنشاء الرسالة
      const newMsg = {
        conversation_id: selectedConversation.id,
        sender_id: user?.id,
        sender_type: 'admin',
        message: newMessage.trim(),
        read: false
      };

      const { data, error } = await supabase
        .from('driver_support_messages')
        .insert([newMsg])
        .select()
        .single();

      if (error) throw error;

      // تحديث وقت آخر رسالة في المحادثة
      await supabase
        .from('driver_support_conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConversation.id);

      setNewMessage('');
      
      // إضافة الرسالة الجديدة مع معلومات المرسل
      setMessages(prev => [...prev, {
        ...data,
        sender_name: adminData?.full_name || 'مسؤول'
      }]);
      
      // تحديث قائمة المحادثات
      loadConversations();

    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      alert('فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  // تحديد الرسائل كـ مقروءة
  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('driver_support_messages')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('conversation_id', conversationId)
        .eq('read', false)
        .eq('sender_type', 'driver');

      // تحديث المحادثة محلياً
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('خطأ في تحديد رسائل السواق كمقروءة:', error);
    }
  };

  // إعداد الاشتراك المباشر
  useEffect(() => {
    loadConversations();

    // اشتراك لتحديثات الرسائل
    const messagesSubscription = supabase
      .channel('driver_support_messages_channel')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'driver_support_messages' 
        }, 
        async (payload) => {
          const newMsg = payload.new as DriverSupportMessage;
          
          if (selectedConversation && newMsg.conversation_id === selectedConversation.id) {
            // جلب معلومات المرسل
            let sender_name = 'نظام';

            if (newMsg.sender_type === 'admin') {
              const { data: adminData } = await supabase
                .from('admins')
                .select('full_name')
                .eq('admin_id', newMsg.sender_id)
                .single();
              
              sender_name = adminData?.full_name || 'مسؤول';
            } else {
              const { data: driverData } = await supabase
                .from('drivers')
                .select('full_name')
                .eq('id', newMsg.sender_id)
                .single();
              
              sender_name = driverData?.full_name || 'سائق';
            }

            setMessages(prev => [...prev, {
              ...newMsg,
              sender_name
            }]);

            if (newMsg.sender_type === 'driver') {
              markMessagesAsRead(newMsg.conversation_id);
            }
          }

          loadConversations();
        }
      )
      .subscribe();

    // اشتراك لتحديثات المحادثات
    const conversationsSubscription = supabase
      .channel('driver_support_conversations_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'driver_support_conversations' 
        }, 
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      conversationsSubscription.unsubscribe();
    };
  }, [selectedConversation?.id]);

  // تحميل الرسائل عند اختيار محادثة
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  // التمرير لآخر رسالة
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // تحديث حالة المحادثة
  const updateConversationStatus = async (status: 'open' | 'closed' | 'pending') => {
    if (!selectedConversation) return;

    try {
      await supabase
        .from('driver_support_conversations')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedConversation.id);

      setSelectedConversation(prev => prev ? { ...prev, status } : null);
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, status }
            : conv
        )
      );

      alert('تم تحديث حالة محادثة السائق بنجاح');
    } catch (error) {
      console.error('خطأ في تحديث حالة محادثة السائق:', error);
      alert('فشل تحديث حالة محادثة السائق');
    }
  };

  // تنسيق الوقت
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
    if (diffHours < 24) return `قبل ${diffHours} ساعة`;
    if (diffDays < 7) return `قبل ${diffDays} يوم`;
    return date.toLocaleDateString('ar-SA');
  };

  // أيقونة الحالة
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle size={14} className="driver-status-icon driver-icon-open" />;
      case 'closed': return <CheckCircle size={14} className="driver-status-icon driver-icon-closed" />;
      case 'pending': return <Clock size={14} className="driver-status-icon driver-icon-pending" />;
      default: return null;
    }
  };

  // لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#10b981';
      case 'closed': return '#6b7280';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // إحصائيات المحادثات
  const stats = {
    total: conversations.length,
    open: conversations.filter(c => c.status === 'open').length,
    pending: conversations.filter(c => c.status === 'pending').length,
    closed: conversations.filter(c => c.status === 'closed').length,
    unread: conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
  };

  return (
    <div className="driver-support-container">

        <div className="driver-support-stats">
        <div className="driver-stat-card">
          <div className="driver-stat-value">{stats.total}</div>
          <div className="driver-stat-label">إجمالي المحادثات</div>
        </div>
        <div className="driver-stat-card">
          <div className="driver-stat-value">{stats.open}</div>
          <div className="driver-stat-label stat-open">مفتوحة</div>
        </div>
        <div className="driver-stat-card">
          <div className="driver-stat-value">{stats.pending}</div>
          <div className="driver-stat-label stat-pending">قيد الانتظار</div>
        </div>
        <div className="driver-stat-card">
          <div className="driver-stat-value">{stats.closed}</div>
          <div className="driver-stat-label stat-closed">مغلقة</div>
        </div>
        <div className="driver-stat-card">
          <div className="driver-stat-value">{stats.unread}</div>
          <div className="driver-stat-label stat-unread">رسائل غير مقروءة</div>
        </div>
      </div>
      
      {/* الشريط العلوي */}
      <div className="driver-support-header">
        <div className="driver-header-left-section">
          <button 
            className="driver-sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          <Truck size={24} className="driver-header-icon" />
          <div>
            <h1 className="driver-page-title">دعم السواق</h1>
            <p className="driver-page-subtitle">إدارة محادثات الدعم مع السائقين</p>
          </div>
        </div>
        
        <div className="driver-header-right-section">
          <button 
            className="driver-refresh-btn"
            onClick={loadConversations}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'driver-spinning' : ''} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="driver-support-main-content">
        {/* العمود الأول: قائمة المحادثات */}
        <div className={`driver-conversations-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
          {/* شريط البحث والفلاتر */}
          <div className="driver-sidebar-top">
            <div className="driver-search-container">
              <Search size={18} />
              <input
                type="text"
                placeholder="ابحث باسم السائق أو رقمه..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="driver-search-input"
              />
              {filters.search && (
                <button 
                  className="driver-clear-search-btn"
                  onClick={() => setFilters({...filters, search: ''})}
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>

            <div className="driver-filter-tabs">
              <button
                className={`driver-filter-btn ${filters.status === 'all' ? 'active' : ''}`}
                onClick={() => setFilters({...filters, status: 'all'})}
              >
                الكل ({stats.total})
              </button>
              <button
                className={`driver-filter-btn ${filters.status === 'open' ? 'active' : ''}`}
                onClick={() => setFilters({...filters, status: 'open'})}
              >
                مفتوحة ({stats.open})
              </button>
              <button
                className={`driver-filter-btn ${filters.status === 'pending' ? 'active' : ''}`}
                onClick={() => setFilters({...filters, status: 'pending'})}
              >
                قيد الانتظار ({stats.pending})
              </button>
              <button
                className={`driver-filter-btn ${filters.status === 'closed' ? 'active' : ''}`}
                onClick={() => setFilters({...filters, status: 'closed'})}
              >
                مغلقة ({stats.closed})
              </button>
            </div>
          </div>

          {/* قائمة المحادثات */}
          <div className="driver-conversations-list">
            {loading ? (
              <div className="driver-loading-state">
                <div className="driver-spinner"></div>
                <p>جاري تحميل محادثات السواق...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="driver-empty-state">
                <MessageSquare size={48} />
                <p>لا توجد محادثات للعرض</p>
                <p className="driver-empty-message">عند بدء محادثات جديدة مع السواق ستظهر هنا</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`driver-conversation-item ${
                    selectedConversation?.id === conversation.id ? 'active' : ''
                  } ${conversation.unread_count > 0 ? 'has-unread' : ''}`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="driver-avatar-container">
                    <div className="driver-avatar">
                      <Shield size={16} />
                    </div>
                    {conversation.unread_count > 0 && (
                      <span className="driver-unread-badge">{conversation.unread_count}</span>
                    )}
                  </div>

                  <div className="driver-conversation-details">
                    <div className="driver-conversation-top">
                      <div className="driver-driver-info">
                        <span className="driver-name">{conversation.driver_name}</span>
                        <span className="driver-conversation-time">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <div className="driver-status-indicator" style={{ backgroundColor: getStatusColor(conversation.status) }}>
                        {getStatusIcon(conversation.status)}
                        <span>
                          {conversation.status === 'open' ? 'مفتوحة' : 
                           conversation.status === 'closed' ? 'مغلقة' : 'قيد الانتظار'}
                        </span>
                      </div>
                    </div>

                    <div className="driver-conversation-subject">
                      {conversation.subject || 'دعم فني للسائق'}
                    </div>

                    {conversation.last_message && (
                      <div className="driver-last-message-preview">
                        {conversation.last_message.length > 60
                          ? conversation.last_message.substring(0, 60) + '...'
                          : conversation.last_message}
                      </div>
                    )}

                    <div className="driver-conversation-footer">
                      {conversation.driver?.driver_id && (
                        <span className="driver-footer-item">
                          <User size={12} />
                          ID: {conversation.driver.driver_id}
                        </span>
                      )}
                      {conversation.driver_phone && (
                        <span className="driver-footer-item">
                          <Phone size={12} />
                          {conversation.driver_phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* العمود الثاني: واجهة المحادثة */}
        <div className="driver-chat-interface">
          {selectedConversation ? (
            <>
              {/* رأس المحادثة */}
              <div className="driver-chat-header">
                <div className="driver-chat-user-info">
                  <div className="driver-chat-avatar">
                    <div className="driver-large-avatar">
                      <Truck size={24} />
                    </div>
                    <div className="driver-chat-details">
                      <h2>{selectedConversation.driver_name}</h2>
                      <div className="driver-contact-info">
                        {selectedConversation.driver?.driver_id && (
                          <span className="driver-contact-detail">
                            <User size={14} />
                            ID: {selectedConversation.driver.driver_id}
                          </span>
                        )}
                        {selectedConversation.driver_phone && (
                          <span className="driver-contact-detail">
                            <Phone size={14} />
                            {selectedConversation.driver_phone}
                          </span>
                        )}
                        <span className="driver-contact-detail">
                          <Calendar size={14} />
                          بدأت {formatTime(selectedConversation.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="driver-chat-actions">
                  <div className="driver-status-selector">
                    <select
                      value={selectedConversation.status}
                      onChange={(e) => updateConversationStatus(e.target.value as 'open' | 'closed' | 'pending')}
                      style={{ borderColor: getStatusColor(selectedConversation.status) }}
                      className="driver-status-dropdown"
                    >
                      <option value="open">مفتوحة</option>
                      <option value="pending">قيد الانتظار</option>
                      <option value="closed">مغلقة</option>
                    </select>
                  </div>

                  <button className="driver-more-btn" title="المزيد">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>

              {/* الرسائل */}
              <div className="driver-messages-container">
                {messages.length === 0 ? (
                  <div className="driver-no-messages">
                    <MessageSquare size={64} />
                    <h3>لا توجد رسائل بعد</h3>
                    <p>ابدأ المحادثة مع السائق</p>
                  </div>
                ) : (
                  <div className="driver-messages-list">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`driver-message-bubble ${message.sender_type === 'admin' ? 'outgoing' : 'incoming'}`}
                      >
                        <div className="driver-message-header">
                          <span className="driver-sender-name">
                            {message.sender_type === 'admin' ? 'أنت' : message.sender_name}
                          </span>
                          <span className="driver-message-time">
                            {new Date(message.created_at).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="driver-message-content">
                          {message.message}
                        </div>
                        {message.sender_type === 'admin' && message.read && (
                          <div className="driver-message-status">
                            <CheckCircle size={12} />
                            <span>تمت القراءة</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* حقل الإرسال */}
              <div className="driver-message-input-container">
                <button className="driver-attach-btn" title="إرفاق ملف">
                  <Paperclip size={20} />
                </button>
                
                <div className="driver-input-wrapper">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={2}
                    className="driver-message-input"
                  />
                </div>
                
                <button
                  className="driver-send-button"
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? (
                    <div className="driver-sending-spinner"></div>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>إرسال</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="driver-no-conversation-selected">
              <MessageSquare size={96} />
              <h2>اختر محادثة</h2>
              <p>اختر محادثة من القائمة على اليسار لعرض الرسائل والرد</p>
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
};

export default DriverSupportPage;