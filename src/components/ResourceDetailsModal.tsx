import React, { useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Calendar,
  User,
  ShieldCheck,
  Cpu,
  FileCode,
  CheckCircle2,
  Maximize2,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import type { Resource } from '../types/index.ts';
import { sound } from '../utils/sound.ts';

interface ResourceDetailsModalProps {
  resource: Resource | null;
  onClose: () => void;
  onDownloadCompleted: (resId: string) => void;
}

export const ResourceDetailsModal: React.FC<ResourceDetailsModalProps> = ({
  resource,
  onClose,
  onDownloadCompleted
}) => {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!resource) return null;

  const allImages = [resource.cover_image, ...(resource.gallery_images || [])].filter(Boolean);
  const activeImage = selectedImage || resource.cover_image || '/assets/brand/creeper.png';

  const categoryNames: Record<string, string> = {
    mods: 'مودات وإضافات',
    shaders: 'شيدرات وريـسورس باك',
    skins: 'سكنات',
    maps: 'خرائط وعوالم',
    versions: 'إصدارات ماينكرافت'
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    sound.playClick();

    try {
      const res = await fetch(`/api/download/${resource.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر بدء عملية التحميل.');
      }

      sound.playSuccess();
      onDownloadCompleted(resource.id);

      if (data.downloadType === 'internal') {
        // Direct file download trigger via browser navigation
        const downloadLink = document.createElement('a');
        downloadLink.href = data.downloadUrl;
        downloadLink.download = data.fileName || 'zork_resource.mcpack';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        // Genuine external handoff (e.g. MediaFire)
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      sound.playError();
      setDownloadError(err.message || 'حدث خطأ أثناء معالجة التحميل.');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#07070B]/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={resource.title}
    >
      <div className="relative w-full max-w-3xl bg-[#101018] border border-[#C5CBD5]/20 rounded-2xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal Bar */}
        <div className="px-4 py-3 border-b border-[#C5CBD5]/15 flex items-center justify-between bg-[#07070B]/70 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-md bg-[#270B18] text-[#FF284A] font-bold border border-[#FF284A]/30">
              {categoryNames[resource.category_id] || resource.category_id}
            </span>
            <h2 className="font-heading text-sm sm:text-base font-bold text-white line-clamp-1">
              {resource.title}
            </h2>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#C5CBD5]/70 hover:text-white bg-[#101018] border border-[#C5CBD5]/15 hover:border-[#FF284A]/40 transition-colors"
            aria-label="إغلاق النافذة"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Visual Image & Gallery */}
          <div className="space-y-3">
            <div className="relative w-full aspect-[16/9] bg-black rounded-xl overflow-hidden border border-[#C5CBD5]/15 group">
              <img
                src={activeImage}
                alt={resource.title}
                className="w-full h-full object-contain bg-black"
              />

              {/* Fullscreen Trigger */}
              <button
                onClick={() => setFullscreenImage(activeImage)}
                className="absolute top-3 left-3 p-2 rounded-lg bg-black/75 border border-white/20 text-white opacity-80 hover:opacity-100 transition-opacity"
                title="عرض الصورة بملء الشاشة"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            {/* Gallery Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      sound.playClick();
                      setSelectedImage(img);
                    }}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      activeImage === img ? 'border-[#FF284A] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`صورة ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Specs Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#07070B]/80 p-3 rounded-xl border border-[#C5CBD5]/10 flex flex-col">
              <span className="text-[11px] text-[#C5CBD5]/60 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-[#35D16F]" />
                إصدار البيدروك
              </span>
              <span className="text-sm font-bold text-white mt-1">{resource.minecraft_version}</span>
            </div>

            <div className="bg-[#07070B]/80 p-3 rounded-xl border border-[#C5CBD5]/10 flex flex-col">
              <span className="text-[11px] text-[#C5CBD5]/60 flex items-center gap-1">
                <Cpu size={12} className="text-[#8ADFFF]" />
                الأجهزة المدعومة
              </span>
              <span className="text-xs font-semibold text-white mt-1 line-clamp-1">
                {resource.supported_devices?.join('، ') || 'جميع أجهزة البيدروك'}
              </span>
            </div>

            <div className="bg-[#07070B]/80 p-3 rounded-xl border border-[#C5CBD5]/10 flex flex-col">
              <span className="text-[11px] text-[#C5CBD5]/60 flex items-center gap-1">
                <User size={12} className="text-[#FF791F]" />
                المنشئ / المطور
              </span>
              <span className="text-xs font-semibold text-white mt-1 line-clamp-1">{resource.creator}</span>
            </div>

            <div className="bg-[#07070B]/80 p-3 rounded-xl border border-[#C5CBD5]/10 flex flex-col">
              <span className="text-[11px] text-[#C5CBD5]/60 flex items-center gap-1">
                <Download size={12} className="text-[#35D16F]" />
                التحميلات المعتمدة
              </span>
              <span className="text-sm font-bold text-[#35D16F] mt-1">{resource.download_count}</span>
            </div>
          </div>

          {/* Complete Description */}
          <div className="space-y-2">
            <h4 className="font-heading text-sm font-bold text-white border-r-2 border-[#FF284A] pr-2">
              الوصف الكامل
            </h4>
            <p className="text-xs sm:text-sm text-[#C5CBD5]/90 leading-relaxed whitespace-pre-line bg-[#07070B]/40 p-4 rounded-xl border border-[#C5CBD5]/10">
              {resource.full_desc || resource.short_desc}
            </p>
          </div>

          {/* Verified Features */}
          {resource.verified_features && resource.verified_features.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-heading text-sm font-bold text-white border-r-2 border-[#35D16F] pr-2">
                المميزات المؤكدة
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {resource.verified_features.map((feat, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 bg-[#07070B]/60 p-2.5 rounded-lg border border-[#35D16F]/20 text-[#C5CBD5]"
                  >
                    <CheckCircle2 size={14} className="text-[#35D16F] shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Installation Steps */}
          {resource.installation_steps && resource.installation_steps.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-heading text-sm font-bold text-white border-r-2 border-[#FF791F] pr-2">
                خطوات التثبيت على Minecraft Bedrock
              </h4>
              <ol className="space-y-2 text-xs">
                {resource.installation_steps.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 bg-[#07070B]/60 p-3 rounded-lg border border-[#C5CBD5]/10"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#FF791F]/20 text-[#FF791F] font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="text-[#C5CBD5] leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Changelog */}
          {resource.changelog && resource.changelog.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-heading text-sm font-bold text-white border-r-2 border-[#8ADFFF] pr-2">
                سجل التغييرات
              </h4>
              <div className="bg-[#07070B]/40 p-3 rounded-xl border border-[#C5CBD5]/10 space-y-1 text-xs text-[#C5CBD5]/80">
                {resource.changelog.map((entry, idx) => (
                  <p key={idx}>• {entry}</p>
                ))}
              </div>
            </div>
          )}

          {/* Attribution & Rights */}
          <div className="p-3 rounded-xl bg-[#07070B]/60 border border-[#C5CBD5]/10 text-[11px] text-[#C5CBD5]/60 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <span>الناشر: </span>
              <span className="text-white font-medium">{resource.creator}</span>
              {resource.license && <span> | الترخيص: {resource.license}</span>}
            </div>

            {resource.original_source_url && (
              <a
                href={resource.original_source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8ADFFF] hover:underline flex items-center gap-1"
              >
                <span>المصدر الأصلي للمطور</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {/* Footer Action Bar with Genuine Download */}
        <div className="p-4 border-t border-[#C5CBD5]/15 bg-[#07070B]/90 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="text-xs text-[#C5CBD5]/70 flex items-center gap-2">
            <span>نوع التحميل:</span>
            <span className="font-bold text-white">
              {resource.download_type === 'internal'
                ? `ملف مباشر (${formatFileSize(resource.internal_file_size) || 'جاهز'})`
                : 'رابط خارجي معتمد (MediaFire)'}
            </span>
          </div>

          <div className="w-full sm:w-auto flex flex-col items-center">
            {downloadError && (
              <p className="text-xs text-[#FF284A] mb-2">{downloadError}</p>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-heading font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #FF284A 0%, #FF791F 100%)',
                boxShadow: '0 4px 20px rgba(255, 40, 74, 0.4)'
              }}
            >
              {isDownloading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري تجهيز التحميل...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>
                    {resource.download_type === 'internal'
                      ? 'تحميل الملف المباشر الآن'
                      : 'الانتقال لرابط التحميل الخارجي'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Lightbox */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="إغلاق العرض الكامل"
          >
            <X size={22} />
          </button>
          <img
            src={fullscreenImage}
            alt="تكبير الصورة"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
};
