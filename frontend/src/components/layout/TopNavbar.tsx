import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, User, LogOut, Settings as SettingsIcon, Menu, Sparkles, CheckCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../lib/api.js';
import { NotificationItem } from '../../types/index.js';

interface TopNavbarProps {
  onMobileMenuToggle: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onMobileMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ questions: any[]; topics: any[] }>({
    questions: [],
    topics: [],
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {}
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Global search handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ questions: [], topics: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await api.get('/search', { q: searchQuery });
        setSearchResults(results);
      } catch {}
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const markNotificationAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch {}
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between shadow-xs">
      {/* Brand & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/home" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-brand-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-slate-900">ConceptTrace</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-brand-100 text-brand-700">AI</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">Learn • Improve • Succeed</p>
          </div>
        </Link>
      </div>

      {/* Global Search Bar (Trigger) */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-100/80 hover:bg-slate-200/70 text-slate-400 text-sm rounded-xl transition-all border border-transparent hover:border-slate-300"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search questions, topics, syllabus...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Actions: Search (Mobile), Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search Icon */}
        <button
          onClick={() => setSearchOpen(true)}
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="font-semibold text-sm text-slate-800">Notifications</h4>
                <span className="text-xs text-slate-400">{unreadCount} unread</span>
              </div>
              <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No notifications yet.</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs transition-colors ${
                        n.read_at
                          ? 'bg-white border-slate-100 text-slate-600'
                          : 'bg-brand-50/50 border-brand-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900">{n.title}</span>
                        {!n.read_at && (
                          <button
                            onClick={() => markNotificationAsRead(n.id)}
                            className="text-brand-600 hover:text-brand-800"
                            title="Mark as read"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 pl-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-semibold flex items-center justify-center text-xs shadow-xs">
              {user?.full_name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <span className="hidden md:inline-block text-xs font-semibold text-slate-700 max-w-[120px] truncate">
              {user?.full_name}
            </span>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>My Profile</span>
              </button>
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <SettingsIcon className="w-4 h-4 text-slate-400" />
                <span>Settings</span>
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-brand-600" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search doubts, explanations, syllabus topics..."
                className="w-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"
              >
                ESC
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-4 space-y-4">
              {searchResults.questions.length > 0 && (
                <div>
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Previous Questions ({searchResults.questions.length})
                  </h5>
                  <div className="space-y-1.5">
                    {searchResults.questions.map(q => (
                      <button
                        key={q.id}
                        onClick={() => {
                          setSearchOpen(false);
                          navigate(`/questions/${q.id}`);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-brand-50 text-xs transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-800 truncate mr-2">{q.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                          {q.subject}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.topics.length > 0 && (
                <div>
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Syllabus Topics ({searchResults.topics.length})
                  </h5>
                  <div className="space-y-1.5">
                    {searchResults.topics.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSearchOpen(false);
                          navigate(`/weak-topics/${t.id}`);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-brand-50 text-xs transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-800">{t.topic}</p>
                          <p className="text-[10px] text-slate-400">{t.chapter} • Class {t.class_level}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-brand-100 text-brand-700 font-semibold shrink-0">
                          {t.subject}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && searchResults.questions.length === 0 && searchResults.topics.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No matching questions or topics found for "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
