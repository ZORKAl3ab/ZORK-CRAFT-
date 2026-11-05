import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  Image as ImageIcon,
  Layers,
  Settings,
  ShieldAlert,
  LogOut,
  Upload,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Download,
  ExternalLink,
  RefreshCw,
  Loader2,
  X,
  FileCheck
} from 'lucide-react';
import type { Resource, CategoryId, WebsiteSettings, AuditLog } from '../../types/index.ts';
import { sound } from '../../utils/sound.ts';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onViewSite: () => void;
}

type TabId = 'overview' | 'add_resource' | 'manage_content' | 'media' | 'categories' | 'settings' | 'security';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onLogout, onViewSite }) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<any>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Editing or Creating Resource Form state
  const [editingResource, setEditingResource] = useState<Partial<Resource> | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);

  // Security tab state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');

  // Initial resource form template
  const defaultResourceTemplate: Partial<Resource> = {
    title: '',
    short_desc: '',
    full_desc: '',
    category_id: 'mods',
    minecraft_version: '1.21.50',
    supported_devices: ['Android', 'iOS', 'Windows'],
    compatibility_notes: '',
    creator: 'ZORK Studio',
    original_source_url: '',
    attribution: '',
    license: 'مجاني للاستخدام الشخصي',
    cover_image: '',
    gallery_images: [],
    download_type: 'external',
    internal_file_path: '',
    internal_file_name: '',
    internal_file_size: 0,
    external_url: '',
    verified_features: [],
    installation_steps: ['قم بتحميل الملف', 'انقر على الملف لفتحه تلقائياً في لعبة Minecraft Bedrock', 'قم بتفعيل المورد من إعدادات العالم'],
    changelog: ['الإصدار الأول والتدشين الرسمي'],
    is_featured: false,
    is_published: true
  };

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setFeedbackMessage({ text, type });
    if (type === 'success') sound.playSuccess();
    else sound.playError();
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Fetch all admin data
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, resRes, catRes, setRes, logsRes] = await Promise.all([
        fetch('/api/stats', { headers }),
        fetch('/api/resources?includeDrafts=true', { headers }),
        fetch('/api/categories'),
        fetch('/api/settings'),
        fetch('/api/audit-logs', { headers })
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
      if (resRes.ok) {
        const d = await resRes.json();
        setResources(d.resources || []);
      }
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.categories || []);
      }
      if (setRes.ok) {
        const d = await setRes.json();
        setSettings(d.settings);
      }
      if (logsRes.ok) {
        const d = await logsRes.json();
        setAuditLogs(d.logs || []);
      }
    } catch (err: any) {
      showFeedback('فشل تحميل بيانات لوحة التحكم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle Image Upload with Real Progress & Android File Picker
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    sound.playClick();
    const formData = new FormData();
    formData.append('image', file);

    const key = isCover ? 'cover' : 'gallery';
    setUploadProgress(prev => ({ ...prev, [key]: 10 }));

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload/image');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => ({ ...prev, [key]: percent }));
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            showFeedback('تم رفع الصورة بنجاح وتأكيد حفظها بالخادم', 'success');
            if (isCover) {
              setEditingResource(prev => ({ ...prev, cover_image: res.url }));
            } else {
              setEditingResource(prev => ({
                ...prev,
                gallery_images: [...(prev?.gallery_images || []), res.url]
              }));
            }
          } else {
            showFeedback(res.error || 'فشل رفع الصورة', 'error');
          }
        } else {
          showFeedback('حدث خطأ أثناء رفع الصورة', 'error');
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        showFeedback('انقطع الاتصال أثناء الرفع، حاول ثانية', 'error');
      };

      xhr.send(formData);
    } catch (err: any) {
      setIsUploading(false);
      showFeedback(err.message, 'error');
    }
  };

  // Handle Resource File (.mcpack, .mcaddon, .mcworld, .zip) Upload
  const handleResourceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    sound.playClick();
    const formData = new FormData();
    formData.append('file', file);

    setUploadProgress(prev => ({ ...prev, file: 15 }));

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload/file');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => ({ ...prev, file: percent }));
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            showFeedback(`تم رفع ملف المورد بنجاح: ${res.fileName}`, 'success');
            setEditingResource(prev => ({
              ...prev,
              download_type: 'internal',
              internal_file_path: res.filePath,
              internal_file_name: res.fileName,
              internal_file_size: res.fileSize
            }));
          } else {
            showFeedback(res.error || 'فشل رفع ملف المورد', 'error');
          }
        } else {
          showFeedback('خطأ في معالجة الملف على الخادم', 'error');
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        showFeedback('انقطع الاتصال أثناء رفع الملف، حاول ثانية', 'error');
      };

      xhr.send(formData);
    } catch (err: any) {
      setIsUploading(false);
      showFeedback(err.message, 'error');
    }
  };

  // Save or Update Resource
  const handleSaveResource = async (isDraft: boolean = false) => {
    if (!editingResource) return;
    if (!editingResource.title?.trim()) {
      showFeedback('يرجى كتابة عنوان المورد', 'error');
      return;
    }
    if (!editingResource.cover_image?.trim()) {
      showFeedback('يرجى اختيار أو رفع صورة الغلاف للمورد', 'error');
      return;
    }
    if (editingResource.download_type === 'external' && !editingResource.external_url?.trim()) {
      showFeedback('يرجى إدخال رابط التحميل الخارجي (MediaFire)', 'error');
      return;
    }
    if (editingResource.download_type === 'internal' && !editingResource.internal_file_path) {
      showFeedback('يرجى رفع ملف المورد من جهازك', 'error');
      return;
    }

    setLoading(true);
    sound.playClick();

    const payload = {
      ...editingResource,
      is_published: !isDraft
    };

    try {
      const isEditingExisting = !!editingResource.id;
      const url = isEditingExisting ? `/api/resources/${editingResource.id}` : '/api/resources';
      const method = isEditingExisting ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل حفظ المورد.');
      }

      showFeedback(
        isDraft ? 'تم حفظ المورد كمسودة بنجاح' : 'تم نشر المورد بنجاح في الموقع!',
        'success'
      );
      setEditingResource(null);
      setActiveTab('manage_content');
      fetchData();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle publish state
  const handleTogglePublish = async (id: string) => {
    sound.playClick();
    try {
      const res = await fetch(`/api/resources/${id}/toggle-publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(
          data.resource.is_published ? 'تم نشر المورد للزوار' : 'تم تحويل المورد إلى مسودة',
          'success'
        );
        fetchData();
      }
    } catch (_) {
      showFeedback('فشل تعديل حالة النشر', 'error');
    }
  };

  // Delete resource
  const handleDeleteResource = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المورد نهائياً؟')) return;
    sound.playClick();
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('تم حذف المورد بنجاح', 'success');
        fetchData();
      }
    } catch (_) {
      showFeedback('فشل حذف المورد', 'error');
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 8) {
      showFeedback('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل', 'error');
      return;
    }
    if (newPass !== confirmNewPass) {
      showFeedback('كلمة المرور وتأكيدها غير متطابقين', 'error');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('تم تحديث كلمة المرور بنجاح!', 'success');
        setCurrentPass('');
        setNewPass('');
        setConfirmNewPass('');
        fetchData();
      } else {
        showFeedback(data.error || 'فشل تحديث كلمة المرور', 'error');
      }
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Revoke other sessions
  const handleRevokeSessions = async () => {
    try {
      const res = await fetch('/api/auth/revoke-sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(`تم إنهاء ${data.revokedCount} جلسات نشطة أخرى بأمان`, 'success');
        fetchData();
      }
    } catch (_) {
      showFeedback('فشل إنهاء الجلسات', 'error');
    }
  };

  // Update Settings
  const handleUpdateSettings = async (updates: Partial<WebsiteSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        showFeedback('تم حفظ الإعدادات بنجاح', 'success');
      }
    } catch (_) {
      showFeedback('فشل تحديث الإعدادات', 'error');
    }
  };

  const navItems = [
    { id: 'overview', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'add_resource', label: 'إضافة مورد', icon: PlusCircle },
    { id: 'manage_content', label: 'إدارة المحتوى', icon: FolderKanban },
    { id: 'media', label: 'الصور والملفات', icon: ImageIcon },
    { id: 'categories', label: 'الأقسام', icon: Layers },
    { id: 'settings', label: 'إعدادات الموقع', icon: Settings },
    { id: 'security', label: 'حماية الحساب', icon: ShieldAlert }
  ];

  return (
    <div className="min-h-screen bg-[#07070B] text-[#C5CBD5] pb-24 font-sans select-none" dir="rtl">
      {/* Top Admin App Bar */}
      <header className="sticky top-0 z-30 bg-[#101018]/95 backdrop-blur-md border-b border-[#C5CBD5]/15 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#270B18] border border-[#FF284A]/40 flex items-center justify-center text-[#FF284A]">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h1 className="font-heading text-sm font-bold text-white flex items-center gap-1.5">
              <span>لوحة تحكم المالك</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#35D16F]/20 text-[#35D16F] font-mono">
                محمية
              </span>
            </h1>
            <p className="text-[11px] text-[#C5CBD5]/60 font-mono">zorkal3ab@gmail.com</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onViewSite();
            }}
            className="px-3 py-1.5 rounded-xl bg-[#101018] border border-[#C5CBD5]/20 hover:border-[#8ADFFF]/50 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
          >
            <Eye size={14} />
            <span className="hidden sm:inline">معاينة الموقع</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onLogout();
            }}
            className="p-2 rounded-xl bg-[#270B18] border border-[#FF284A]/30 text-[#FF284A] hover:bg-[#FF284A] hover:text-white transition-all"
            title="تسجيل الخروج"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Android Horizontal Navigation Strip */}
      <div className="bg-[#101018] border-b border-[#C5CBD5]/10 px-2 py-2 overflow-x-auto no-scrollbar sticky top-[61px] z-20">
        <div className="flex items-center gap-1.5 min-w-max">
          {navItems.map(item => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(item.id as TabId);
                  if (item.id === 'add_resource' && !editingResource) {
                    setEditingResource({ ...defaultResourceTemplate });
                    setActiveStep(1);
                  }
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-[#FF284A] to-[#FF791F] text-white shadow-md'
                    : 'text-[#C5CBD5]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification Toast */}
      {feedbackMessage && (
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2 text-xs font-bold transition-all max-w-[90vw] ${
            feedbackMessage.type === 'success'
              ? 'bg-[#0D381D] text-[#35D16F] border-[#35D16F]/50 shadow-[0_0_20px_rgba(53,209,111,0.3)]'
              : 'bg-[#270B18] text-[#FF284A] border-[#FF284A]/50 shadow-[0_0_20px_rgba(255,40,74,0.3)]'
          }`}
        >
          {feedbackMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Main Tab Views */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* --- TAB 1: OVERVIEW & STATS --- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-white">إحصائيات المنصة الحية</h2>
              <button
                onClick={fetchData}
                className="p-1.5 rounded-lg border border-[#C5CBD5]/15 text-[#C5CBD5]/70 hover:text-white"
                title="تحديث البيانات"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Android 2-cards-per-row Compact Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="metallic-card p-3.5 rounded-xl flex flex-col justify-between">
                <span className="text-[11px] text-[#C5CBD5]/70">إجمالي الموارد</span>
                <span className="text-xl font-heading font-bold text-white mt-2">
                  {stats?.totalResources || 0}
                </span>
                <span className="text-[10px] text-[#35D16F] mt-1 font-semibold">
                  {stats?.publishedResources || 0} منشور | {stats?.draftResources || 0} مسودة
                </span>
              </div>

              <div className="metallic-card p-3.5 rounded-xl flex flex-col justify-between">
                <span className="text-[11px] text-[#C5CBD5]/70">التحميلات المعتمدة</span>
                <span className="text-xl font-heading font-bold text-[#35D16F] mt-2">
                  {stats?.totalDownloads || 0}
                </span>
                <span className="text-[10px] text-[#C5CBD5]/60 mt-1">تنزيلات موثقة</span>
              </div>

              <div className="metallic-card p-3.5 rounded-xl flex flex-col justify-between">
                <span className="text-[11px] text-[#C5CBD5]/70">تحميلات مباشرة</span>
                <span className="text-xl font-heading font-bold text-[#8ADFFF] mt-2">
                  {stats?.internalDownloads || 0}
                </span>
                <span className="text-[10px] text-[#C5CBD5]/60 mt-1">من خادم ZORK</span>
              </div>

              <div className="metallic-card p-3.5 rounded-xl flex flex-col justify-between">
                <span className="text-[11px] text-[#C5CBD5]/70">تحويلات MediaFire</span>
                <span className="text-xl font-heading font-bold text-[#FF791F] mt-2">
                  {stats?.externalHandoffs || 0}
                </span>
                <span className="text-[10px] text-[#C5CBD5]/60 mt-1">روابط خارجية معتمدة</span>
              </div>

              <div className="metallic-card p-3.5 rounded-xl flex flex-col justify-between">
                <span className="text-[11px] text-[#C5CBD5]/70">جلسات نشطة للمالك</span>
                <span className="text-xl font-heading font-bold text-white mt-2">
                  {stats?.activeSessions || 1}
                </span>
                <span className="text-[10px] text-[#35D16F] mt-1">مؤمنة بالكامل</span>
              </div>

              <div className="metallic-card p-3.5 rounded-xl flex flex-col justify-between">
                <span className="text-[11px] text-[#C5CBD5]/70">حالة الإعلانات</span>
                <span className="text-sm font-heading font-bold text-[#FF284A] mt-2">
                  {settings?.ads_enabled ? 'مفعلة' : 'معطلة افتراضياً'}
                </span>
                <span className="text-[10px] text-[#C5CBD5]/60 mt-1">تحكم المالك</span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setEditingResource({ ...defaultResourceTemplate });
                  setActiveStep(1);
                  setActiveTab('add_resource');
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF284A] to-[#FF791F] text-white font-heading font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98"
              >
                <PlusCircle size={16} />
                <span>إضافة مورد ماينكرافت جديد</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('manage_content');
                }}
                className="py-3 px-4 rounded-xl bg-[#101018] border border-[#C5CBD5]/20 text-white font-heading font-bold text-xs flex items-center gap-2 active:scale-98"
              >
                <FolderKanban size={16} />
                <span>إدارة الموارد المنشورة</span>
              </button>
            </div>
          </div>
        )}

        {/* --- TAB 2: GUIDED 7-STEP RESOURCE CREATION & EDITING --- */}
        {(activeTab === 'add_resource' || editingResource) && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-bold text-white">
                  {editingResource?.id ? 'تعديل المورد' : 'إضافة مورد ماينكرافت جديد'}
                </h2>
                <p className="text-xs text-[#C5CBD5]/60">
                  تصميم مخصص للهواتف الذكية مع تنسيق أفقي مريح
                </p>
              </div>

              {editingResource?.id && (
                <button
                  onClick={() => {
                    setEditingResource(null);
                    setActiveTab('manage_content');
                  }}
                  className="p-1.5 rounded-lg border border-[#C5CBD5]/20 text-xs text-[#C5CBD5] hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Step Indicators Horizontal Scroller */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                '1. البيانات الأساسية',
                '2. التوافق والأجهزة',
                '3. المنشئ والنسبة',
                '4. صور الغلاف والمعرض',
                '5. مصدر التحميل',
                '6. التثبيت والمميزات',
                '7. النشر'
              ].map((stepName, idx) => {
                const stepNum = idx + 1;
                const isCurrent = activeStep === stepNum;
                const isPassed = activeStep > stepNum;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setActiveStep(stepNum);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      isCurrent
                        ? 'bg-[#FF284A] text-white shadow-[0_0_12px_rgba(255,40,74,0.4)]'
                        : isPassed
                        ? 'bg-[#0D381D] text-[#35D16F] border border-[#35D16F]/30'
                        : 'bg-[#101018] text-[#C5CBD5]/50 border border-[#C5CBD5]/10'
                    }`}
                  >
                    {stepName}
                  </button>
                );
              })}
            </div>

            {/* Step Form Content - Android Horizontal Rows */}
            <div className="metallic-card p-4 sm:p-6 rounded-2xl space-y-4">
              {/* STEP 1: Basic Info */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  {/* Row: Title */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                      عنوان المورد:
                    </label>
                    <input
                      type="text"
                      value={editingResource?.title || ''}
                      onChange={e => setEditingResource(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="مثال: مود الأسلحة الأسطورية ثلاثية الأبعاد"
                      className="sm:w-[68%] bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#FF284A] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  {/* Row: Category */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                      القسم:
                    </label>
                    <select
                      value={editingResource?.category_id || 'mods'}
                      onChange={e =>
                        setEditingResource(prev => ({ ...prev, category_id: e.target.value as CategoryId }))
                      }
                      className="sm:w-[68%] bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#FF284A] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    >
                      <option value="mods">مودات وإضافات (Mods & Add-ons)</option>
                      <option value="shaders">شيدرات وريـسورس باك (Shaders)</option>
                      <option value="skins">سكنات (Skins)</option>
                      <option value="maps">خرائط وعوالم (Maps & Worlds)</option>
                      <option value="versions">إصدارات ماينكرافت (Versions)</option>
                    </select>
                  </div>

                  {/* Row: Short Description */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                      وصف مختصر:
                    </label>
                    <input
                      type="text"
                      value={editingResource?.short_desc || ''}
                      onChange={e =>
                        setEditingResource(prev => ({ ...prev, short_desc: e.target.value }))
                      }
                      placeholder="وصف سريع يظهر في بطاقات البحث والواجهة الرئيسية"
                      className="sm:w-[68%] bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#FF284A] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  {/* Row: Full Description (Multi-line) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-white">
                      الوصف الكامل للمورد:
                    </label>
                    <textarea
                      rows={4}
                      value={editingResource?.full_desc || ''}
                      onChange={e =>
                        setEditingResource(prev => ({ ...prev, full_desc: e.target.value }))
                      }
                      placeholder="اكتب شرحاً تفصيلياً للمورد ومميزاته وكيفية اللعب به..."
                      className="w-full bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#FF284A] rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Compatibility */}
              {activeStep === 2 && (
                <div className="space-y-4">
                  {/* Row: Minecraft Version */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                      إصدار Minecraft Bedrock:
                    </label>
                    <input
                      type="text"
                      value={editingResource?.minecraft_version || '1.21.50'}
                      onChange={e =>
                        setEditingResource(prev => ({ ...prev, minecraft_version: e.target.value }))
                      }
                      placeholder="مثال: 1.21.50 أو 1.21.0+"
                      className="sm:w-[68%] bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#35D16F] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  {/* Row: Supported Devices */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                      الأجهزة المدعومة:
                    </label>
                    <input
                      type="text"
                      value={editingResource?.supported_devices?.join('، ') || ''}
                      onChange={e =>
                        setEditingResource(prev => ({
                          ...prev,
                          supported_devices: e.target.value.split(/[,،]/).map(s => s.trim()).filter(Boolean)
                        }))
                      }
                      placeholder="Android, Windows, iOS (مفصولة بفاصلة)"
                      className="sm:w-[68%] bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#35D16F] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  {/* Row: Compatibility Notes */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-white">
                      ملاحظات التوافق المؤكدة:
                    </label>
                    <textarea
                      rows={3}
                      value={editingResource?.compatibility_notes || ''}
                      onChange={e =>
                        setEditingResource(prev => ({ ...prev, compatibility_notes: e.target.value }))
                      }
                      placeholder="مثال: يتطلب تفعيل خيار التجارب (Experimental Gameplay) في إعدادات الخريطة"
                      className="w-full bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#35D16F] rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Creator & Source */}
              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                      اسم المنشئ / المطور:
                    </label>
                    <input
                      type="text"
                      value={editingResource?.creator || ''}
                      onChange={e => setEditingResource(prev => ({ ...prev, creator: e.target.value }))}
                      placeholder="مثال: ZORK Studio أو اسم المطور الأصلي"
                      className="sm:w-[68%] bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#FF791F] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                      رابط المصدر الأصلي:
                    </label>
                    <input
                      type="url"
                      value={editingResource?.original_source_url || ''}
                      onChange={e =>
                        setEditingResource(prev => ({ ...prev, original_source_url: e.target.value }))
                      }
                      placeholder="https://..."
                      className="sm:w-[68%] bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#FF791F] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                      الترخيص أو الإذن:
                    </label>
                    <input
                      type="text"
                      value={editingResource?.license || ''}
                      onChange={e => setEditingResource(prev => ({ ...prev, license: e.target.value }))}
                      placeholder="مجاني للاستخدام الشخصي / تصريح رسمي"
                      className="sm:w-[68%] bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#FF791F] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Images & Gallery Uploads */}
              {activeStep === 4 && (
                <div className="space-y-5">
                  {/* Cover Image Upload (Horizontal Row) */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-2">
                      صورة الغلاف الرئيسية (JPG, PNG, WEBP):
                    </label>

                    <div className="flex items-center gap-3 bg-[#07070B] p-3 rounded-xl border border-[#C5CBD5]/15">
                      {editingResource?.cover_image ? (
                        <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-white/20">
                          <img
                            src={editingResource.cover_image}
                            alt="الغلاف"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-12 rounded-lg bg-[#101018] flex items-center justify-center text-[#C5CBD5]/40 shrink-0 border border-[#C5CBD5]/10">
                          <ImageIcon size={20} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium truncate">
                          {editingResource?.cover_image ? 'تم تحديد صورة الغلاف' : 'لم يتم اختيار صورة'}
                        </p>
                        {uploadProgress['cover'] && uploadProgress['cover'] < 100 && (
                          <div className="w-full bg-[#101018] h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="bg-[#35D16F] h-full transition-all"
                              style={{ width: `${uploadProgress['cover']}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <label className="cursor-pointer px-3 py-2 rounded-xl bg-[#270B18] text-[#FF284A] border border-[#FF284A]/30 text-xs font-bold active:scale-95 shrink-0 flex items-center gap-1">
                        <Upload size={14} />
                        <span>اختيار صورة من الهاتف</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleImageUpload(e, true)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Gallery Images Upload */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-white">
                        صور المعرض الإضافية (حتى 10 صور):
                      </label>
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#101018] border border-[#C5CBD5]/20 text-xs font-bold text-white active:scale-95 flex items-center gap-1">
                        <Upload size={13} />
                        <span>إضافة صورة للمعرض</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleImageUpload(e, false)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {editingResource?.gallery_images && editingResource.gallery_images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {editingResource.gallery_images.map((img, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden border border-[#C5CBD5]/20 aspect-[16/9] bg-black">
                            <img src={img} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setEditingResource(prev => ({
                                  ...prev,
                                  gallery_images: prev?.gallery_images?.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="absolute top-1 left-1 p-1 rounded-md bg-[#270B18]/80 text-[#FF284A] hover:bg-[#FF284A] hover:text-white"
                              title="حذف الصورة"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#C5CBD5]/50 bg-[#07070B] p-3 rounded-xl border border-dashed border-[#C5CBD5]/15 text-center">
                        لا توجد صور معرض مضافة بعد. انقر على الزر أعلاه لإضافة لقطات شاشة من هاتفك.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: Download Source (Internal File or External MediaFire) */}
              {activeStep === 5 && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                      مصدر التحميل:
                    </span>
                    <div className="flex gap-2 sm:w-[68%]">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setEditingResource(prev => ({ ...prev, download_type: 'external' }));
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          editingResource?.download_type === 'external'
                            ? 'bg-[#101018] border-[#8ADFFF] text-[#8ADFFF] shadow-md'
                            : 'bg-[#07070B] border-[#C5CBD5]/15 text-[#C5CBD5]/60'
                        }`}
                      >
                        إضافة رابط MediaFire أو خارجي
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setEditingResource(prev => ({ ...prev, download_type: 'internal' }));
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          editingResource?.download_type === 'internal'
                            ? 'bg-[#101018] border-[#35D16F] text-[#35D16F] shadow-md'
                            : 'bg-[#07070B] border-[#C5CBD5]/15 text-[#C5CBD5]/60'
                        }`}
                      >
                        رفع ملف المورد من الهاتف
                      </button>
                    </div>
                  </div>

                  {/* Option A: External Link (MediaFire) */}
                  {editingResource?.download_type === 'external' && (
                    <div className="bg-[#07070B] p-4 rounded-xl border border-[#8ADFFF]/20 space-y-3">
                      <label className="block text-xs font-bold text-white">
                        رابط التحميل الخارجي (MediaFire):
                      </label>
                      <input
                        type="url"
                        value={editingResource?.external_url || ''}
                        onChange={e =>
                          setEditingResource(prev => ({ ...prev, external_url: e.target.value }))
                        }
                        placeholder="https://www.mediafire.com/file/..."
                        className="w-full bg-[#101018] border border-[#C5CBD5]/20 focus:border-[#8ADFFF] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                      />
                      <p className="text-[11px] text-[#C5CBD5]/60">
                        سيتم توجيه المستخدم المعتمد بأمان إلى صفحة التحميل الرسمية على MediaFire عند النقر.
                      </p>
                    </div>
                  )}

                  {/* Option B: Internal Resource File Upload */}
                  {editingResource?.download_type === 'internal' && (
                    <div className="bg-[#07070B] p-4 rounded-xl border border-[#35D16F]/20 space-y-3">
                      <label className="block text-xs font-bold text-white">
                        رفع ملف ماينكرافت (.mcpack, .mcaddon, .mcworld, .zip):
                      </label>

                      <div className="flex items-center gap-3 bg-[#101018] p-3 rounded-xl border border-[#C5CBD5]/15">
                        <FileCode size={24} className="text-[#35D16F] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {editingResource?.internal_file_name || 'لم يتم رفع ملف مورد بعد'}
                          </p>
                          {editingResource?.internal_file_size ? (
                            <p className="text-[10px] text-[#C5CBD5]/60">
                              الحجم: {(editingResource.internal_file_size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          ) : null}

                          {uploadProgress['file'] && uploadProgress['file'] < 100 && (
                            <div className="w-full bg-[#07070B] h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className="bg-[#35D16F] h-full transition-all"
                                style={{ width: `${uploadProgress['file']}%` }}
                              />
                            </div>
                          )}
                        </div>

                        <label className="cursor-pointer px-3 py-2 rounded-xl bg-[#0D381D] text-[#35D16F] border border-[#35D16F]/30 text-xs font-bold active:scale-95 shrink-0 flex items-center gap-1">
                          <Upload size={14} />
                          <span>رفع ملف من الهاتف</span>
                          <input
                            type="file"
                            accept=".mcpack,.mcaddon,.mcworld,.zip,application/zip"
                            onChange={handleResourceFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: Installation & Verified Features */}
              {activeStep === 6 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      المميزات المؤكدة (سطر لكل ميزة):
                    </label>
                    <textarea
                      rows={3}
                      value={editingResource?.verified_features?.join('\n') || ''}
                      onChange={e =>
                        setEditingResource(prev => ({
                          ...prev,
                          verified_features: e.target.value.split('\n').filter(Boolean)
                        }))
                      }
                      placeholder="مود ثلاثي الأبعاد بالكامل&#10;متوافق مع الهواتف الذكية&#10;بدون لاق"
                      className="w-full bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#35D16F] rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      خطوات التثبيت (سطر لكل خطوة):
                    </label>
                    <textarea
                      rows={3}
                      value={editingResource?.installation_steps?.join('\n') || ''}
                      onChange={e =>
                        setEditingResource(prev => ({
                          ...prev,
                          installation_steps: e.target.value.split('\n').filter(Boolean)
                        }))
                      }
                      placeholder="1. تحميل الملف&#10;2. فتحه في ماينكرافت&#10;3. تفعيله في إعدادات اللعبة"
                      className="w-full bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#FF791F] rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 7: Publishing & Confirmation */}
              {activeStep === 7 && (
                <div className="space-y-4">
                  <div className="bg-[#07070B] p-4 rounded-xl border border-[#C5CBD5]/15 space-y-2">
                    <h4 className="font-heading text-sm font-bold text-white">ملخص المورد قبل الحفظ</h4>
                    <p className="text-xs text-[#C5CBD5]">
                      العنوان: <strong className="text-white">{editingResource?.title || '—'}</strong>
                    </p>
                    <p className="text-xs text-[#C5CBD5]">
                      القسم: <strong className="text-[#35D16F]">{editingResource?.category_id || '—'}</strong>
                    </p>
                    <p className="text-xs text-[#C5CBD5]">
                      نوع التحميل:{' '}
                      <strong className="text-[#8ADFFF]">
                        {editingResource?.download_type === 'internal' ? 'ملف مباشر' : 'رابط MediaFire'}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={!!editingResource?.is_featured}
                      onChange={e =>
                        setEditingResource(prev => ({ ...prev, is_featured: e.target.checked }))
                      }
                      className="w-4 h-4 accent-[#FF284A]"
                    />
                    <label htmlFor="isFeatured" className="text-xs text-white font-medium cursor-pointer">
                      تثبيت المورد في قسم "المحتوى المميز" بالواجهة الرئيسية
                    </label>
                  </div>
                </div>
              )}

              {/* Wizard Navigation Action Bar */}
              <div className="pt-4 border-t border-[#C5CBD5]/10 flex items-center justify-between gap-3">
                {activeStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setActiveStep(prev => prev - 1);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#101018] border border-[#C5CBD5]/20 text-xs font-bold text-white"
                  >
                    السابق
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveResource(true)}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-[#101018] border border-[#C5CBD5]/20 text-xs font-bold text-[#C5CBD5] hover:text-white"
                  >
                    حفظ كمسودة
                  </button>

                  {activeStep < 7 ? (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setActiveStep(prev => prev + 1);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF284A] to-[#FF791F] text-xs font-bold text-white"
                    >
                      التالي
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSaveResource(false)}
                      disabled={loading}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#35D16F] to-[#24A855] text-xs font-bold text-white shadow-lg active:scale-95"
                    >
                      {loading ? 'جاري الحفظ...' : 'نشر المورد الآن'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: CONTENT MANAGEMENT (Resources list) --- */}
        {activeTab === 'manage_content' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-white">إدارة الموارد</h2>
              <button
                onClick={() => {
                  sound.playClick();
                  setEditingResource({ ...defaultResourceTemplate });
                  setActiveStep(1);
                  setActiveTab('add_resource');
                }}
                className="px-3 py-1.5 rounded-xl bg-[#FF284A] text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <PlusCircle size={14} />
                <span>إضافة مورد جديد</span>
              </button>
            </div>

            {resources.length === 0 ? (
              <div className="metallic-card p-8 rounded-2xl text-center space-y-3">
                <p className="text-sm text-[#C5CBD5]/70">لا توجد موارد منشورة حالياً في المنصة.</p>
                <p className="text-xs text-[#C5CBD5]/40">
                  يمكنك البدء بإضافة المود أو الشيدر الأول من خلال زر إضافة مورد.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {resources.map(res => (
                  <div
                    key={res.id}
                    className="metallic-card p-3 rounded-xl flex items-center justify-between gap-3"
                  >
                    {/* Thumbnail & Title */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-11 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                        <img
                          src={res.cover_image || '/assets/brand/creeper.png'}
                          alt={res.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{res.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#C5CBD5]/60">
                          <span>{res.category_id}</span>
                          <span>•</span>
                          <span className="text-[#35D16F]">{res.download_count} تحميل</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions & Status */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTogglePublish(res.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                          res.is_published
                            ? 'bg-[#0D381D] text-[#35D16F] border-[#35D16F]/40'
                            : 'bg-[#270B18] text-[#FF284A] border-[#FF284A]/40'
                        }`}
                      >
                        {res.is_published ? 'منشور' : 'مسودة'}
                      </button>

                      <button
                        onClick={() => {
                          sound.playClick();
                          setEditingResource(res);
                          setActiveStep(1);
                          setActiveTab('add_resource');
                        }}
                        className="p-1.5 rounded-lg bg-[#101018] border border-[#C5CBD5]/20 text-[#C5CBD5] hover:text-white"
                        title="تعديل"
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteResource(res.id)}
                        className="p-1.5 rounded-lg bg-[#270B18] border border-[#FF284A]/30 text-[#FF284A] hover:bg-[#FF284A] hover:text-white"
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 4: MEDIA MANAGER --- */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-bold text-white">مدير الصور والملفات</h2>
            <div className="metallic-card p-4 rounded-2xl space-y-4">
              <p className="text-xs text-[#C5CBD5]/80">
                يمكنك رفع صور أغلفة وملفات الموارد مباشرة من هاتفك الأندرويد. كافة الملفات تُحفظ بأمان في الخادم.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#07070B] p-4 rounded-xl border border-[#C5CBD5]/15 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">رفع صورة جديدة</h4>
                    <p className="text-[10px] text-[#C5CBD5]/50">JPG, PNG, WEBP (حتى 20MB)</p>
                  </div>
                  <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-[#270B18] text-[#FF284A] border border-[#FF284A]/30 text-xs font-bold active:scale-95">
                    اختيار صورة
                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, false)} className="hidden" />
                  </label>
                </div>

                <div className="bg-[#07070B] p-4 rounded-xl border border-[#C5CBD5]/15 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">رفع ملف مورد</h4>
                    <p className="text-[10px] text-[#C5CBD5]/50">.mcpack, .mcaddon, .zip (حتى 250MB)</p>
                  </div>
                  <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-[#0D381D] text-[#35D16F] border border-[#35D16F]/30 text-xs font-bold active:scale-95">
                    اختيار ملف
                    <input
                      type="file"
                      accept=".mcpack,.mcaddon,.mcworld,.zip,application/zip"
                      onChange={handleResourceFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: CATEGORIES --- */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-bold text-white">أقسام المحتوى الرسمية</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat: any) => (
                <div
                  key={cat.id}
                  className="metallic-card p-4 rounded-xl flex items-center justify-between"
                  style={{ borderColor: `${cat.accent_color}30` }}
                >
                  <div>
                    <h4 className="text-sm font-bold text-white" style={{ color: cat.accent_color }}>
                      {cat.name_ar}
                    </h4>
                    <p className="text-xs text-[#C5CBD5]/60 mt-0.5">{cat.description_ar}</p>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-[#07070B] border border-white/10 text-xs font-mono font-bold text-white">
                    {cat.count} مورد
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 6: WEBSITE & ADS SETTINGS --- */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            <h2 className="font-heading text-lg font-bold text-white">إعدادات المنصة والإعلانات</h2>

            <div className="metallic-card p-4 sm:p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white border-r-2 border-[#FF284A] pr-2">
                نظام الإعلانات الاختياري (معطل افتراضياً)
              </h3>
              <p className="text-xs text-[#C5CBD5]/70">
                وفقاً لسياسة ZORK CRAFT، الإعلانات معطلة افتراضياً لحماية تجربة المستخدم. يمكن تفعيلها حصراً برغبة المالك.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between bg-[#07070B] p-3 rounded-xl border border-[#C5CBD5]/10">
                  <span className="text-xs font-bold text-white">تفعيل مواضع الإعلانات بالمنصة:</span>
                  <input
                    type="checkbox"
                    checked={!!settings?.ads_enabled}
                    onChange={e => handleUpdateSettings({ ads_enabled: e.target.checked })}
                    className="w-5 h-5 accent-[#FF284A]"
                  />
                </div>

                <div className="flex items-center justify-between bg-[#07070B] p-3 rounded-xl border border-[#C5CBD5]/10">
                  <span className="text-xs font-bold text-white">إعلان البانر في الواجهة الرئيسية:</span>
                  <input
                    type="checkbox"
                    checked={!!settings?.ads_banner_home}
                    onChange={e => handleUpdateSettings({ ads_banner_home: e.target.checked })}
                    className="w-5 h-5 accent-[#FF284A]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 7: ACCOUNT PROTECTION & AUDIT LOGS --- */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="font-heading text-lg font-bold text-white">حماية الحساب وسجل الأمان</h2>

            {/* Change Password Horizontal Card */}
            <div className="metallic-card p-4 sm:p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white border-r-2 border-[#FF284A] pr-2">
                تغيير كلمة مرور المالك
              </h3>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                    كلمة المرور الحالية:
                  </label>
                  <input
                    type="password"
                    value={currentPass}
                    onChange={e => setCurrentPass(e.target.value)}
                    required
                    className="sm:w-[68%] bg-[#07070B] border border-[#C5CBD5]/20 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                    كلمة المرور الجديدة:
                  </label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    required
                    className="sm:w-[68%] bg-[#07070B] border border-[#C5CBD5]/20 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="sm:w-[32%] text-xs font-bold text-white shrink-0">
                    تأكيد كلمة المرور الجديدة:
                  </label>
                  <input
                    type="password"
                    value={confirmNewPass}
                    onChange={e => setConfirmNewPass(e.target.value)}
                    required
                    className="sm:w-[68%] bg-[#07070B] border border-[#C5CBD5]/20 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#FF284A] text-xs font-bold text-white hover:opacity-90 active:scale-95"
                  >
                    حفظ كلمة المرور الجديدة
                  </button>
                </div>
              </form>
            </div>

            {/* Session Revocation */}
            <div className="metallic-card p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">الجلسات النشطة</h4>
                <p className="text-[11px] text-[#C5CBD5]/60 mt-0.5">
                  إنهاء أي جلسات قديمة أو مسجلة من أجهزة أخرى
                </p>
              </div>

              <button
                onClick={handleRevokeSessions}
                className="px-3.5 py-2 rounded-xl bg-[#270B18] text-[#FF284A] border border-[#FF284A]/30 text-xs font-bold hover:bg-[#FF284A] hover:text-white transition-all active:scale-95"
              >
                إنهاء الجلسات الأخرى
              </button>
            </div>

            {/* Audit Logs */}
            <div className="metallic-card p-4 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-white">سجل العمليات والأمان (Audit Log)</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {auditLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-[#07070B] border border-[#C5CBD5]/10 flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <span className="font-bold text-white">{log.event_type}</span>
                      <p className="text-[#C5CBD5]/70 text-[10px]">{log.details}</p>
                    </div>
                    <span className="text-[#C5CBD5]/40 text-[10px] font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('ar-EG')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
