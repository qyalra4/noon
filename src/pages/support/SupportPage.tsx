import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Search, MessageSquare, User, Clock, CheckCircle, 
  AlertCircle, Send, Paperclip, MoreVertical, 
  RefreshCw, XCircle, ChevronLeft, 
  ChevronRight, Mail, Phone, Calendar
} from 'lucide-react';
import './SupportPage.css';
import type { 
  SupportConversation, 
  SupportMessage, 
  SupportFilters, 
  UserProfile, 
  AdminProfile 
} from '../../types/support';

const SupportPage: React.FC = () => {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filters, setFilters] = useState<SupportFilters>({
    status: 'all',
    search: ''
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userProfilesCache, setUserProfilesCache] = useState<Map<string, UserProfile>>(new Map());
  const [adminProfilesCache, setAdminProfilesCache] = useState<Map<string, AdminProfile>>(new Map());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ====================== وظائف مساعدة جديدة ======================

  // جلب معلومات المستخدم من جدول profiles مع التخزين المؤقت
  const getUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    // التحقق من التخزين المؤقت أولاً
    if (userProfilesCache.has(userId)) {
      return userProfilesCache.get(userId)!;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.log('لم يتم العثور على ملف تعريف للمستخدم:', userId, error);
        
        // جلب من auth.users إذا كان متاحاً
        const { data: authData } = await supabase.auth.admin.getUserById(userId)
          .catch(() => ({ data: null }));
        
        if (authData?.user) {
          const defaultProfile: UserProfile = {
            user_id: userId,
            first_name: 'مستخدم',
            last_name: '',
            email: authData.user.email || 'بريد غير معروف',
            phone: '',
            avatar_url: null,
            created_at: new Date().toISOString()
          };
          
          // تخزين في الكاش
          setUserProfilesCache(prev => new Map(prev).set(userId, defaultProfile));
          return defaultProfile;
        }
        
        return null;
      }

      // تخزين في الكاش
      setUserProfilesCache(prev => new Map(prev).set(userId, data));
      return data;
    } catch (error) {
      console.error('خطأ في جلب ملف تعريف المستخدم:', error);
      return null;
    }
  }, [userProfilesCache]);

  // جلب معلومات المسؤول من جدول admins مع التخزين المؤقت
  const getAdminProfile = useCallback(async (adminId: string): Promise<AdminProfile | null> => {
    // التحقق من التخزين المؤقت أولاً
    if (adminProfilesCache.has(adminId)) {
      return adminProfilesCache.get(adminId)!;
    }

    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('admin_id', adminId)
        .single();

      if (error) {
        console.log('لم يتم العثور على ملف تعريف للمسؤول:', adminId, error);
        return null;
      }

      // تخزين في الكاش
      setAdminProfilesCache(prev => new Map(prev).set(adminId, data));
      return data;
    } catch (error) {
      console.error('خطأ في جلب ملف تعريف المسؤول:', error);
      return null;
    }
  }, [adminProfilesCache]);

  // دالة لاستخراج الاسم الكامل من الملف الشخصي
  const getFullName = (profile: UserProfile | AdminProfile | null): string => {
    if (!profile) return 'مستخدم';
    
    if ('first_name' in profile) {
      // ملف تعريف مستخدم
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'مستخدم';
    } else {
      // ملف تعريف مسؤول
      return profile.full_name || profile.username || 'مسؤول';
    }
  };

  // دالة لاستخراج البريد الإلكتروني من الملف الشخصي
  const getEmail = (profile: UserProfile | AdminProfile | null): string => {
    if (!profile) return 'بريد غير معروف';
    return profile.email || 'بريد غير معروف';
  };

  // ====================== تحميل المحادثات (محدث) ======================

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      
      // جلب جميع المحادثات
      const { data: conversationsData, error: convError } = await supabase
        .from('support_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      // جلب معلومات إضافية لكل محادثة
      const enhancedConversations = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          try {
            // جلب ملف تعريف المستخدم
            const userProfile = await getUserProfile(conv.user_id);
            
            // جلب عدد الرسائل غير المقروءة
            const { count } = await supabase
              .from('support_messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('read', false)
              .neq('sender_type', 'admin');

            // جلب آخر رسالة
            const { data: lastMessageData } = await supabase
              .from('support_messages')
              .select('message')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            //   .catch(() => ({ data: null }));

            return {
              ...conv,
              user_email: getEmail(userProfile),
              user_name: getFullName(userProfile),
              user_phone: userProfile?.phone || '',
              unread_count: count || 0,
              last_message: lastMessageData?.message?.substring(0, 50) || '',
              user_profile: userProfile || undefined
            };
          } catch (error) {
            console.error('Error enhancing conversation:', error);
            return {
              ...conv,
              user_email: 'مستخدم',
              user_name: 'مستخدم',
              user_phone: '',
              unread_count: 0,
              last_message: ''
            };
          }
        })
      );

      // تطبيق الفلاتر
      let filteredConversations = enhancedConversations;
      
      if (filters.status !== 'all') {
        filteredConversations = filteredConversations.filter(
          conv => conv.status === filters.status
        );
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredConversations = filteredConversations.filter(
          conv => 
            conv.user_email?.toLowerCase().includes(searchTerm) ||
            conv.user_name?.toLowerCase().includes(searchTerm) ||
            conv.subject?.toLowerCase().includes(searchTerm) ||
            conv.last_message?.toLowerCase().includes(searchTerm)
        );
      }

      setConversations(filteredConversations);
    } catch (error) {
      console.error('خطأ في تحميل المحادثات:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, getUserProfile]);

  // ====================== تحميل الرسائل (محدث) ======================

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // إضافة معلومات المرسل لكل رسالة
      const enhancedMessages = await Promise.all(
        (messagesData || []).map(async (msg) => {
          try {
            if (msg.sender_type === 'admin') {
              // جلب معلومات المسؤول
              const adminProfile = await getAdminProfile(msg.sender_id);
              return {
                ...msg,
                sender_email: getEmail(adminProfile),
                sender_name: getFullName(adminProfile),
                sender_profile: adminProfile || undefined
              };
            } else {
              // جلب معلومات المستخدم
              const userProfile = await getUserProfile(msg.sender_id);
              return {
                ...msg,
                sender_email: getEmail(userProfile),
                sender_name: getFullName(userProfile),
                sender_profile: userProfile || undefined
              };
            }
          } catch (error) {
            console.error('Error enhancing message:', error);
            return {
              ...msg,
              sender_email: 'نظام',
              sender_name: 'نظام'
            };
          }
        })
      );

      setMessages(enhancedMessages);
    } catch (error) {
      console.error('خطأ في تحميل الرسائل:', error);
    }
  }, [getAdminProfile, getUserProfile]);

  // ====================== إرسال رسالة جديدة (محدث) ======================

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      
      // جلب المسؤول الحالي
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('يجب تسجيل الدخول أولاً');
        setSending(false);
        return;
      }

      // 1. إرسال الرسالة
      const { data: messageResult, error: messageError } = await supabase
        .from('support_messages')
        .insert([{
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          sender_type: 'admin',
          message: newMessage.trim(),
          read: true,
          read_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (messageError) {
        console.error('خطأ في إرسال الرسالة:', messageError);
        alert('فشل إرسال الرسالة: ' + messageError.message);
        setSending(false);
        return;
      }

      // 2. تحديث وقت آخر رسالة في المحادثة
      await supabase
        .from('support_conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConversation.id);

      // 3. جلب معلومات المسؤول
      const adminProfile = await getAdminProfile(user.id);

      // 4. تحديث الرسائل المحلية مباشرة (بدون انتظار اشتراك الوقت الحقيقي)
      const newMessageObj: SupportMessage = {
        ...messageResult,
        sender_email: getEmail(adminProfile),
        sender_name: getFullName(adminProfile),
        sender_profile: adminProfile || undefined
      };

      setMessages(prev => [...prev, newMessageObj]);
      setNewMessage('');
      
      // 5. تحديث المحادثة في القائمة
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === selectedConversation.id) {
            return {
              ...conv,
              last_message: newMessage.trim().substring(0, 30) + '...',
              last_message_at: new Date().toISOString(),
              unread_count: 0
            };
          }
          return conv;
        }).sort((a, b) => 
          new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        )
      );

    } catch (error: any) {
      console.error('خطأ غير متوقع:', error);
      alert(`خطأ غير متوقع: ${error.message || 'حدث خطأ غير معروف'}`);
    } finally {
      setSending(false);
    }
  };

  // ====================== تحديد الرسائل كمقروءة ======================

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('support_messages')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('conversation_id', conversationId)
        .eq('read', false)
        .neq('sender_type', 'admin');

      // تحديث المحادثة محلياً
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('خطأ في تحديد الرسائل كمقروءة:', error);
    }
  };

  // ====================== إعداد الاشتراك المباشر (محدث) ======================

  useEffect(() => {
    loadConversations();

    // اشتراك لتحديثات الرسائل (معدّل للعمل بشكل أفضل)
    const messagesSubscription = supabase
      .channel('support_messages_realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_messages' 
        },
        async (payload) => {
          console.log('📨 رسالة جديدة بالوقت الحقيقي:', payload.new);
          
          const newMsg = payload.new as SupportMessage;
          
          // تحديث قائمة المحادثات أولاً
          await loadConversations();
          
          // إذا كانت هذه الرسالة للمحادثة المحددة حالياً
          if (selectedConversation && newMsg.conversation_id === selectedConversation.id) {
            try {
              let senderProfile: UserProfile | AdminProfile | null = null;
              let senderName = 'نظام';
              let senderEmail = 'نظام';

              if (newMsg.sender_type === 'admin') {
                senderProfile = await getAdminProfile(newMsg.sender_id);
              } else {
                senderProfile = await getUserProfile(newMsg.sender_id);
              }

              if (senderProfile) {
                senderName = getFullName(senderProfile);
                senderEmail = getEmail(senderProfile);
              }

              // تحديث الرسائل المحلية
              setMessages(prev => [...prev, {
                ...newMsg,
                sender_email: senderEmail,
                sender_name: senderName,
                sender_profile: senderProfile || undefined
              }]);

              // إذا كانت الرسالة من مستخدم، حددها كمقروءة
              if (newMsg.sender_type === 'user') {
                await markMessagesAsRead(newMsg.conversation_id);
              }
            } catch (error) {
              console.error('Error handling realtime message:', error);
            }
          }
        }
      )
      .subscribe();

    // اشتراك لتحديثات المحادثات
    const conversationsSubscription = supabase
      .channel('support_conversations_realtime')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'support_conversations' 
        },
        () => {
          console.log('🔄 تحديث المحادثات بالوقت الحقيقي');
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      conversationsSubscription.unsubscribe();
    };
  }, [selectedConversation, loadConversations, getAdminProfile, getUserProfile]);

  // ====================== تحميل الرسائل عند اختيار محادثة ======================

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id);
    }
  }, [selectedConversation?.id, loadMessages]);

  // ====================== التمرير لآخر رسالة ======================

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  // ====================== تحديث حالة المحادثة ======================

  const updateConversationStatus = async (status: 'open' | 'closed' | 'pending') => {
    if (!selectedConversation) return;

    try {
      await supabase
        .from('support_conversations')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedConversation.id);

      // تحديث محلياً
      setSelectedConversation(prev => prev ? { ...prev, status } : null);
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, status }
            : conv
        )
      );
    } catch (error) {
      console.error('خطأ في تحديث الحالة:', error);
      alert('فشل تحديث حالة المحادثة');
    }
  };

  // ====================== وظائف مساعدة للعرض ======================

  const formatTime = (dateString: string) => {
    try {
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
    } catch {
      return '--';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle size={14} className="support-status-icon support-status-open" />;
      case 'closed': return <CheckCircle size={14} className="support-status-icon support-status-closed" />;
      case 'pending': return <Clock size={14} className="support-status-icon support-status-pending" />;
      default: return null;
    }
  };

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
    unread: conversations.reduce((sum, conv) => sum + conv.unread_count, 0)
  };

  return (
    <div className="support-page">
      {/* الشريط العلوي */}
      <div className="support-header">
        <div className="support-header-left">
          <button 
            className="support-toggle-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? "إغلاق الشريط الجانبي" : "فتح الشريط الجانبي"}
          >
            {isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          <MessageSquare size={24} className="support-header-icon" />
          <div className="support-header-title">
            <h1>دعم العملاء</h1>
            <p className="support-header-subtitle">إدارة محادثات الدعم الفوري</p>
          </div>
        </div>
        
        <div className="support-header-right">
          <button 
            className="support-refresh-btn"
            onClick={loadConversations}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'support-spinning' : ''} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="support-main">
        {/* الشريط الجانبي للمحادثات */}
        <div className={`support-sidebar ${isSidebarOpen ? 'support-sidebar-open' : 'support-sidebar-collapsed'}`}>
          {/* شريط البحث والفلاتر */}
          <div className="support-search-container">
            <div className="support-search-box">
              <Search size={18} className="support-search-icon" />
              <input
                type="text"
                placeholder="ابحث بالبريد أو الاسم..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="support-search-input"
              />
              {filters.search && (
                <button 
                  className="support-clear-btn"
                  onClick={() => setFilters({...filters, search: ''})}
                  title="مسح البحث"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>

            <div className="support-filter-tabs">
              <button
                className={`support-filter-tab ${filters.status === 'all' ? 'support-filter-active' : ''}`}
                onClick={() => setFilters({...filters, status: 'all'})}
              >
                الكل ({stats.total})
              </button>
              <button
                className={`support-filter-tab ${filters.status === 'open' ? 'support-filter-active' : ''}`}
                onClick={() => setFilters({...filters, status: 'open'})}
              >
                مفتوحة ({stats.open})
              </button>
              <button
                className={`support-filter-tab ${filters.status === 'pending' ? 'support-filter-active' : ''}`}
                onClick={() => setFilters({...filters, status: 'pending'})}
              >
                قيد الانتظار ({stats.pending})
              </button>
              <button
                className={`support-filter-tab ${filters.status === 'closed' ? 'support-filter-active' : ''}`}
                onClick={() => setFilters({...filters, status: 'closed'})}
              >
                مغلقة ({stats.closed})
              </button>
            </div>
          </div>

          {/* قائمة المحادثات */}
          <div className="support-conversations-container">
            {loading ? (
              <div className="support-loading">
                <div className="support-spinner"></div>
                <p>جاري تحميل المحادثات...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="support-empty">
                <MessageSquare size={48} className="support-empty-icon" />
                <p className="support-empty-text">لا توجد محادثات</p>
                <p className="support-empty-subtext">عند بدء محادثات جديدة ستظهر هنا</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`support-conversation-item ${
                    selectedConversation?.id === conversation.id ? 'support-conversation-active' : ''
                  } ${conversation.unread_count > 0 ? 'support-conversation-unread' : ''}`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="support-conversation-avatar">
                    <div className="support-avatar">
                      {conversation.user_name?.charAt(0) || 'م'}
                    </div>
                    {conversation.unread_count > 0 && (
                      <span className="support-unread-badge">{conversation.unread_count}</span>
                    )}
                  </div>

                  <div className="support-conversation-content">
                    <div className="support-conversation-header">
                      <div className="support-user-info">
                        <span className="support-user-name">
                          {conversation.user_name || 'مستخدم'}
                        </span>
                        <span className="support-conversation-time">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <div 
                        className="support-status-badge"
                        style={{ backgroundColor: getStatusColor(conversation.status) }}
                      >
                        {getStatusIcon(conversation.status)}
                        <span>
                          {conversation.status === 'open' ? 'مفتوحة' : 
                           conversation.status === 'closed' ? 'مغلقة' : 'قيد الانتظار'}
                        </span>
                      </div>
                    </div>

                    <div className="support-conversation-subject">
                      {conversation.subject || 'بدون موضوع'}
                    </div>

                    {conversation.last_message && (
                      <div className="support-last-message">
                        {conversation.last_message.length > 60
                          ? conversation.last_message.substring(0, 60) + '...'
                          : conversation.last_message}
                      </div>
                    )}

                    <div className="support-conversation-meta">
                      {conversation.user_email && (
                        <span className="support-meta-item">
                          <Mail size={12} className="support-meta-icon" />
                          <span className="support-meta-text">
                            {conversation.user_email}
                          </span>
                        </span>
                      )}
                      {conversation.user_phone && (
                        <span className="support-meta-item">
                          <Phone size={12} className="support-meta-icon" />
                          <span className="support-meta-text">
                            {conversation.user_phone}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* منطقة المحادثة */}
        <div className="support-chat-area">
          {selectedConversation ? (
            <>
              {/* رأس المحادثة */}
              <div className="support-chat-header">
                <div className="support-chat-user">
                  <div className="support-chat-avatar">
                    <div className="support-chat-avatar-img">
                      {selectedConversation.user_name?.charAt(0) || 'م'}
                    </div>
                  </div>
                  <div className="support-chat-user-info">
                    <h2 className="support-chat-user-name">
                      {selectedConversation.user_name || 'مستخدم'}
                    </h2>
                    <div className="support-chat-user-details">
                      {selectedConversation.user_email && (
                        <span className="support-chat-detail">
                          <Mail size={14} />
                          <span>{selectedConversation.user_email}</span>
                        </span>
                      )}
                      {selectedConversation.user_phone && (
                        <span className="support-chat-detail">
                          <Phone size={14} />
                          <span>{selectedConversation.user_phone}</span>
                        </span>
                      )}
                      <span className="support-chat-detail">
                        <Calendar size={14} />
                        <span>بدأت {formatTime(selectedConversation.created_at)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="support-chat-actions">
                  <div className="support-status-select">
                    <select
                      value={selectedConversation.status}
                      onChange={(e) => updateConversationStatus(e.target.value as 'open' | 'closed' | 'pending')}
                      className="support-status-select-input"
                      style={{ borderColor: getStatusColor(selectedConversation.status) }}
                    >
                      <option value="open">مفتوحة</option>
                      <option value="pending">قيد الانتظار</option>
                      <option value="closed">مغلقة</option>
                    </select>
                  </div>

                  <button className="support-more-btn" title="المزيد من الخيارات">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>

              {/* منطقة الرسائل */}
              <div className="support-messages-area">
                {messages.length === 0 ? (
                  <div className="support-no-messages">
                    <MessageSquare size={64} className="support-no-messages-icon" />
                    <h3 className="support-no-messages-title">لا توجد رسائل بعد</h3>
                    <p className="support-no-messages-text">ابدأ المحادثة مع المستخدم</p>
                  </div>
                ) : (
                  <div className="support-messages-list">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`support-message ${
                          message.sender_type === 'admin' ? 'support-message-outgoing' : 'support-message-incoming'
                        }`}
                      >
                        <div className="support-message-header">
                          <span className="support-message-sender">
                            {message.sender_type === 'admin' ? 'أنت' : (message.sender_name || 'مستخدم')}
                          </span>
                          <span className="support-message-time">
                            {new Date(message.created_at).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="support-message-content">
                          {message.message}
                        </div>
                        {message.sender_type === 'admin' && message.read && (
                          <div className="support-message-status">
                            <CheckCircle size={12} className="support-read-icon" />
                            <span className="support-read-text">تمت القراءة</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* حقل الإرسال */}
              <div className="support-input-area">
                <button className="support-attach-btn" title="إرفاق ملف">
                  <Paperclip size={20} />
                </button>
                
                <div className="support-textarea-wrapper">
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
                    className="support-message-input"
                  />
                </div>
                
                <button
                  className="support-send-btn"
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? (
                    <div className="support-send-spinner"></div>
                  ) : (
                    <>
                      <Send size={18} className="support-send-icon" />
                      <span className="support-send-text">إرسال</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="support-no-conversation">
              <MessageSquare size={96} className="support-no-conversation-icon" />
              <h2 className="support-no-conversation-title">اختر محادثة</h2>
              <p className="support-no-conversation-text">اختر محادثة من القائمة على اليسار لعرض الرسائل والرد</p>
            </div>
          )}
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="support-stats-bar">
        <div className="support-stat">
          <div className="support-stat-value">{stats.total}</div>
          <div className="support-stat-label">إجمالي المحادثات</div>
        </div>
        <div className="support-stat">
          <div className="support-stat-value support-stat-open-value">{stats.open}</div>
          <div className="support-stat-label support-stat-open-label">مفتوحة</div>
        </div>
        <div className="support-stat">
          <div className="support-stat-value support-stat-pending-value">{stats.pending}</div>
          <div className="support-stat-label support-stat-pending-label">قيد الانتظار</div>
        </div>
        <div className="support-stat">
          <div className="support-stat-value support-stat-closed-value">{stats.closed}</div>
          <div className="support-stat-label support-stat-closed-label">مغلقة</div>
        </div>
        <div className="support-stat">
          <div className="support-stat-value support-stat-unread-value">{stats.unread}</div>
          <div className="support-stat-label support-stat-unread-label">غير مقروءة</div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;