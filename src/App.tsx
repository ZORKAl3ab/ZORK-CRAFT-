import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Compass,
  Package,
  Sparkles,
  User,
  Layers,
  Lock,
  ExternalLink,
  ChevronDown,
  Sparkle,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import type { Resource, CategoryId, Category } from './types/index.ts';
import { sound } from './utils/sound.ts';
import { Header } from './components/Header.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { SubscriptionModal } from './components/SubscriptionModal.tsx';
import { CreeperEasterEgg, CreeperActivationZone } from './components/CreeperEasterEgg.tsx';
import { ResourceCard } from './components/ResourceCard.tsx';
import { ResourceDetailsModal } from './components/ResourceDetailsModal.tsx';
import { LegalModal, LegalPageId } from './components/LegalModal.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | CategoryId>('home');
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'newest' | 'downloads' | 'featured'>('newest');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [legalPage, setLegalPage] = useState<LegalPageId | null>(null);
  const [loading, setLoading] = useState(true);

  // Real URL pathname routing
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [adminToken, setAdminToken] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('zork_admin_token') : null
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Sync routing with browser history (back / forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Verify existing admin session on mount
  useEffect(() => {
    const token = localStorage.getItem('zork_admin_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.authenticated) {
            setAdminToken(token);
          } else {
            localStorage.removeItem('zork_admin_token');
            setAdminToken(null);
            // If on /admin unauthenticated, redirect to login
            if (window.location.pathname === '/admin') {
              navigate('/admin/login');
            }
          }
        })
        .catch(() => {});
    } else if (currentPath === '/admin') {
      // Direct unauthenticated visit to /admin must redirect to /admin/login
      navigate('/admin/login');
    }
  }, [currentPath]);

  // Fetch public data
  const loadPublicData = async () => {
    setLoading(true);
    try {
      const [resRes, catRes] = await Promise.all([
        fetch('/api/resources'),
        fetch('/api/categories')
      ]);

      if (resRes.ok) {
        const d = await resRes.json();
        setResources(d.resources || []);
      }
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.categories || []);
      }
    } catch (err) {
      console.error('Error loading public data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublicData();
  }, []);

  // Filter and sort resources
  const filteredResources = resources
    .filter(res => {
      if (activeTab !== 'home' && res.category_id !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = res.title.toLowerCase().includes(q);
        const matchDesc = res.short_desc?.toLowerCase().includes(q) || res.full_desc?.toLowerCase().includes(q);
        const matchVer = res.minecraft_version?.toLowerCase().includes(q);
        const matchCreator = res.creator?.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchVer || matchCreator;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOption === 'downloads') {
        return b.download_count - a.download_count;
      }
      if (sortOption === 'featured') {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleFocusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const scrollToCategories = () => {
    sound.playClick();
    categoriesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ROUTE 1: Protected Owner Administration Dashboard (/admin)
  if (currentPath === '/admin' && adminToken) {
    return (
      <div className="animate-modal-spring min-h-screen bg-[#07070B]">
        <AdminDashboard
          token={adminToken}
          onLogout={() => {
            localStorage.removeItem('zork_admin_token');
            setAdminToken(null);
            navigate('/');
            loadPublicData();
          }}
          onViewSite={() => {
            navigate('/');
            loadPublicData();
          }}
        />
      </div>
    );
  }

  // ROUTE 2: Secure Owner Login (/admin/login)
  if (currentPath === '/admin/login' || (currentPath === '/admin' && !adminToken)) {
    return (
      <div className="min-h-screen bg-[#07070B] text-[#C5CBD5] animate-modal-spring">
        <AdminLogin
          onLoginSuccess={token => {
            setAdminToken(token);
            navigate('/admin');
          }}
          onBackToSite={() => navigate('/')}
        />
      </div>
    );
  }

  // ROUTE 3: Public Gaming Platform Homepage (/)
  return (
    <div className="min-h-screen bg-[#07070B] text-[#C5CBD5] flex flex-col font-sans selection:bg-[#FF284A] selection:text-white pb-24 transition-opacity duration-300">
      {/* Floating Subscription Modal */}
      <SubscriptionModal onSubscribed={() => {}} />

      {/* Cinematic Creeper Explosion Easter Egg V2 */}
      <CreeperEasterEgg />

      {/* Premium Header */}
      <Header
        onSearchClick={handleFocusSearch}
        isAdminLoggedIn={!!adminToken}
        onAdminClick={() => navigate('/admin')}
      />

      {/* Main Homepage Flow */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-6 sm:pt-10 space-y-10">
        {/* Brand & Identity Hero Section */}
        <div className="flex flex-col items-center text-center space-y-5">
          {/* Circular ZORK Mascot in Glowing Ring */}
          <div
            className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-full p-[3px] transition-transform duration-300 hover:scale-105 active:scale-95 group"
            style={{
              background: 'linear-gradient(135deg, #FF284A 0%, #270B18 60%, #FF791F 100%)',
              boxShadow: '0 0 32px rgba(255, 40, 74, 0.45)'
            }}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center border-2 border-black">
              <img
                src="/assets/brand/zork-mascot.jpg"
                alt="ZORK Mascot"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </div>

          {/* Authentic Metallic ZORK Wordmark inside Generous Creeper Activation Zone */}
          <CreeperActivationZone>
            <div className="relative py-2 px-4 transition-transform duration-300 group-hover:scale-102 flex items-center justify-center">
              {/* Soft green ambient glow pulsing behind Creeper inside O */}
              <div
                className="absolute w-16 h-16 rounded-full bg-[#35D16F]/30 blur-xl pointer-events-none -translate-x-1 sm:-translate-x-2 animate-pulse"
                aria-hidden="true"
              />

              {/* Metallic Logo with subtle metallic shimmer sweep */}
              <div className="relative metallic-shimmer-sweep rounded-2xl">
                <img
                  src="/assets/brand/zork-logo.png"
                  alt="ZORK Logo"
                  className="w-[250px] sm:w-[330px] h-auto object-contain select-none drop-shadow-[0_8px_25px_rgba(0,0,0,0.85)] filter transition-all duration-300 group-hover:drop-shadow-[0_12px_32px_rgba(53,209,111,0.35)]"
                  draggable={false}
                />
              </div>
            </div>
          </CreeperActivationZone>

          {/* Official Arabic Description */}
          <p className="font-heading text-sm sm:text-base text-white/95 max-w-md">
            منصتك لاكتشاف إضافات ومحتوى Minecraft Bedrock.
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-xl relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مود، شيدر، سكن، خريطة، أو إصدار..."
              className="w-full bg-[#101018] border border-[#C5CBD5]/20 focus:border-[#FF284A] focus:shadow-[0_0_22px_rgba(255,40,74,0.3)] rounded-2xl py-3.5 pr-12 pl-4 text-xs sm:text-sm text-white placeholder-[#C5CBD5]/40 outline-none transition-all duration-200"
            />
            <Search
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C5CBD5]/40 pointer-events-none"
            />
          </div>

          {/* Explore Categories Action Button */}
          <button
            type="button"
            onClick={scrollToCategories}
            className="px-6 py-3 rounded-2xl font-heading font-bold text-xs sm:text-sm text-white flex items-center gap-2 shadow-lg transition-all duration-200 hover:scale-102 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #FF284A 0%, #FF791F 100%)',
              boxShadow: '0 6px 25px rgba(255, 40, 74, 0.4)'
            }}
          >
            <Compass size={17} />
            <span>استعراض الأقسام</span>
          </button>
        </div>

        {/* Five Category Cards Section */}
        <section ref={categoriesRef} className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF284A] animate-pulse" />
              <span>أقسام المحتوى</span>
            </h2>
            <span className="text-xs text-[#C5CBD5]/60">تصنيفات معتمدة</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { id: 'mods', title: 'مودات وإضافات', color: '#FF791F', icon: Package, count: categories.find(c => c.id === 'mods')?.count || 0 },
              { id: 'shaders', title: 'شيدرات وريـسورس باك', color: '#8ADFFF', icon: Sparkles, count: categories.find(c => c.id === 'shaders')?.count || 0 },
              { id: 'skins', title: 'سكنات', color: '#9D72FF', icon: User, count: categories.find(c => c.id === 'skins')?.count || 0 },
              { id: 'maps', title: 'خرائط وعوالم', color: '#35D16F', icon: Compass, count: categories.find(c => c.id === 'maps')?.count || 0 },
              { id: 'versions', title: 'إصدارات ماينكرافت', color: '#C5CBD5', icon: Layers, count: categories.find(c => c.id === 'versions')?.count || 0 }
            ].map(cat => {
              const Icon = cat.icon;
              const isSelected = activeTab === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab(isSelected ? 'home' : (cat.id as CategoryId));
                  }}
                  className={`metallic-card p-4 rounded-2xl flex flex-col items-center text-center justify-between transition-all duration-250 active:scale-95 group relative ${
                    isSelected ? 'ring-2 ring-offset-2 ring-offset-[#07070B]' : 'hover:-translate-y-1'
                  }`}
                  style={{
                    borderColor: isSelected ? cat.color : 'rgba(197, 203, 213, 0.14)',
                    boxShadow: isSelected ? `0 0 25px ${cat.color}40` : undefined
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110"
                    style={{
                      backgroundColor: `${cat.color}15`,
                      color: cat.color,
                      border: `1px solid ${cat.color}35`
                    }}
                  >
                    <Icon size={22} />
                  </div>

                  <h3 className="font-heading text-xs font-bold text-white group-hover:text-[#FF284A] transition-colors">
                    {cat.title}
                  </h3>

                  <span
                    className="text-[11px] font-semibold mt-1 px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'rgba(7, 7, 11, 0.65)',
                      color: cat.color
                    }}
                  >
                    {cat.count} موارد
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Resources Listing Section */}
        <section className="space-y-4 pt-2">
          {/* Filter and Sort Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101018]/85 p-3 rounded-2xl border border-[#C5CBD5]/15">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                {activeTab === 'home' ? 'كافة الموارد' : categories.find(c => c.id === activeTab)?.name_ar}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#270B18] text-[#FF284A] font-bold">
                {filteredResources.length}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSortOption('newest');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  sortOption === 'newest'
                    ? 'bg-[#FF284A] text-white shadow-sm'
                    : 'bg-[#07070B] text-[#C5CBD5]/70 hover:text-white border border-[#C5CBD5]/10'
                }`}
              >
                الأحدث
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSortOption('downloads');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  sortOption === 'downloads'
                    ? 'bg-[#35D16F] text-white shadow-sm'
                    : 'bg-[#07070B] text-[#C5CBD5]/70 hover:text-white border border-[#C5CBD5]/10'
                }`}
              >
                الأكثر تحميلاً
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSortOption('featured');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  sortOption === 'featured'
                    ? 'bg-[#FF791F] text-white shadow-sm'
                    : 'bg-[#07070B] text-[#C5CBD5]/70 hover:text-white border border-[#C5CBD5]/10'
                }`}
              >
                المميز
              </button>
            </div>
          </div>

          {/* Resources Grid or Premium Empty States */}
          {loading ? (
            <div className="py-16 text-center text-xs text-[#C5CBD5]/60 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#FF284A] border-t-transparent rounded-full animate-spin" />
              <span>جاري تحميل الموارد الموثقة...</span>
            </div>
          ) : filteredResources.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map(res => (
                <ResourceCard
                  key={res.id}
                  resource={res}
                  onViewDetails={resObj => {
                    setSelectedResource(resObj);
                  }}
                />
              ))}
            </div>
          ) : (
            /* Premium Empty State */
            <div className="metallic-card p-10 sm:p-14 rounded-2xl text-center space-y-4 max-w-md mx-auto my-6">
              <div className="w-14 h-14 rounded-2xl bg-[#101018] border border-[#C5CBD5]/15 flex items-center justify-center mx-auto text-[#C5CBD5]/40 animate-pulse">
                <Package size={26} />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-white">
                  {searchQuery.trim() ? 'لم يتم العثور على نتائج' : 'لا توجد موارد منشورة حاليًا'}
                </h3>
                <p className="text-xs text-[#C5CBD5]/60 mt-1.5 leading-relaxed">
                  {searchQuery.trim()
                    ? `لا توجد مودات أو إضافات تطابق بحثك عن "${searchQuery}". جرب كلمة بحث أخرى.`
                    : 'سيتم إضافة ونشر مودات وشيدرات وسكنات وخرائط جديدة ومحدثة قريباً من قِبل المالك.'}
                </p>
              </div>

              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-[#101018] border border-[#C5CBD5]/20 text-xs font-bold text-white hover:border-[#FF284A]/50 transition-colors"
                >
                  مسح كلمة البحث
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[#C5CBD5]/15 bg-[#07070B] pt-10 pb-32 sm:pb-24 px-4 text-center space-y-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Legal Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-[#C5CBD5]/80 font-medium">
            <button
              onClick={() => {
                sound.playClick();
                setLegalPage('about');
              }}
              className="hover:text-white transition-colors"
            >
              من نحن
            </button>
            <span className="text-[#C5CBD5]/20">•</span>
            <button
              onClick={() => {
                sound.playClick();
                setLegalPage('contact');
              }}
              className="hover:text-white transition-colors"
            >
              تواصل معنا
            </button>
            <span className="text-[#C5CBD5]/20">•</span>
            <button
              onClick={() => {
                sound.playClick();
                setLegalPage('privacy');
              }}
              className="hover:text-white transition-colors"
            >
              سياسة الخصوصية
            </button>
            <span className="text-[#C5CBD5]/20">•</span>
            <button
              onClick={() => {
                sound.playClick();
                setLegalPage('terms');
              }}
              className="hover:text-white transition-colors"
            >
              شروط الاستخدام
            </button>
            <span className="text-[#C5CBD5]/20">•</span>
            <button
              onClick={() => {
                sound.playClick();
                setLegalPage('copyright');
              }}
              className="hover:text-white transition-colors"
            >
              بلاغ حقوق النشر
            </button>
          </div>

          {/* Social YouTube Channel Link */}
          <div className="flex items-center justify-center gap-2">
            <a
              href="https://youtube.com/@zork_al3ab?si=VOP34dCv3OlP1bTr"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-[#270B18] border border-[#FF284A]/30 text-xs font-bold text-[#FF284A] hover:bg-[#FF284A] hover:text-white transition-all flex items-center gap-1.5"
            >
              <span>قناة ZORK الرسمية على يوتيوب</span>
              <ArrowUpRight size={14} />
            </a>
          </div>

          {/* Official Independence Disclaimer */}
          <p className="text-[11px] text-[#C5CBD5]/50 max-w-lg mx-auto leading-relaxed">
            ZORK CRAFT مشروع مجتمعي مستقل، وليس تابعًا رسميًا لشركة Mojang أو Microsoft.
          </p>

          {/* Copyright notice */}
          <p className="text-[11px] text-[#C5CBD5]/40 font-mono">
            © {new Date().getFullYear()} ZORK CRAFT — جميع الحقوق محفوظة
          </p>

          {/* Closing Message Exclusively at the very bottom */}
          <p className="text-xs text-[#FF284A] font-semibold pt-2">
            شكرًا لزيارتك، نورت عالم ZORK CRAFT.
          </p>

          {/* FIXED & ENHANCED: Private Owner Entry Lock at the Absolute Bottom */}
          <div className="pt-4 pb-2 flex justify-center relative z-30">
            <a
              href="/admin/login"
              onClick={e => {
                e.preventDefault();
                sound.playClick();
                if (adminToken) {
                  navigate('/admin');
                } else {
                  navigate('/admin/login');
                }
              }}
              className="touch-target-lock group relative px-4 py-2.5 rounded-xl border border-[#C5CBD5]/20 bg-[#101018]/80 hover:border-[#FF284A]/60 hover:bg-[#270B18]/60 transition-all duration-200 text-xs font-semibold text-[#C5CBD5]/75 hover:text-white shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#FF284A]"
              aria-label="دخول المالك"
              title="دخول المالك"
            >
              <Lock
                size={14}
                className="text-[#C5CBD5]/70 group-hover:text-[#FF284A] transition-colors"
              />
              <span>دخول المالك</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Fixed Bottom Mobile Navigation with safe-area spacing */}
      <BottomNav activeTab={activeTab} onTabChange={tab => setActiveTab(tab)} />

      {/* Resource Details Modal */}
      <ResourceDetailsModal
        resource={selectedResource}
        onClose={() => setSelectedResource(null)}
        onDownloadCompleted={resId => {
          setResources(prev =>
            prev.map(r => (r.id === resId ? { ...r, download_count: r.download_count + 1 } : r))
          );
          if (selectedResource && selectedResource.id === resId) {
            setSelectedResource(prev => (prev ? { ...prev, download_count: prev.download_count + 1 } : null));
          }
        }}
      />

      {/* Legal Pages Modal */}
      <LegalModal pageId={legalPage} onClose={() => setLegalPage(null)} />
    </div>
  );
}
