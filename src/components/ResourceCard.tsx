import React from 'react';
import { Download, Calendar, Cpu, Sparkles, ExternalLink } from 'lucide-react';
import type { Resource } from '../types/index.ts';
import { sound } from '../utils/sound.ts';

interface ResourceCardProps {
  resource: Resource;
  onViewDetails: (res: Resource) => void;
  onQuickDownload?: (res: Resource) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onViewDetails }) => {
  const categoryColors: Record<string, string> = {
    mods: '#FF791F',
    shaders: '#8ADFFF',
    skins: '#9D72FF',
    maps: '#35D16F',
    versions: '#C5CBD5'
  };

  const categoryNames: Record<string, string> = {
    mods: 'مودات وإضافات',
    shaders: 'شيدرات',
    skins: 'سكنات',
    maps: 'خرائط',
    versions: 'إصدارات'
  };

  const accent = categoryColors[resource.category_id] || '#FF284A';
  const categoryName = categoryNames[resource.category_id] || resource.category_id;

  const formattedDate = new Date(resource.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div
      onClick={() => {
        sound.playClick();
        onViewDetails(resource);
      }}
      className="metallic-card metallic-card-hover rounded-2xl overflow-hidden cursor-pointer flex flex-col group relative transition-all duration-300"
      style={{
        borderColor: 'rgba(197, 203, 213, 0.12)'
      }}
    >
      {/* Cover Image */}
      <div className="relative w-full aspect-[16/9] bg-[#101018] overflow-hidden">
        <img
          src={resource.cover_image || '/assets/brand/creeper.png'}
          alt={resource.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Category Pill Tag */}
        <div
          className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md border flex items-center gap-1 shadow-md"
          style={{
            backgroundColor: 'rgba(7, 7, 11, 0.85)',
            borderColor: `${accent}60`,
            color: accent
          }}
        >
          <Sparkles size={12} />
          <span>{categoryName}</span>
        </div>

        {/* Download Type indicator */}
        <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/75 text-[#C5CBD5] border border-white/10 flex items-center gap-1">
          {resource.download_type === 'internal' ? (
            <>
              <Download size={10} className="text-[#35D16F]" />
              <span>ملف مباشر</span>
            </>
          ) : (
            <>
              <ExternalLink size={10} className="text-[#8ADFFF]" />
              <span>MediaFire / رابط خارجي</span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-heading text-base font-bold text-white group-hover:text-[#FF284A] transition-colors line-clamp-1">
            {resource.title}
          </h3>
          <p className="text-xs text-[#C5CBD5]/75 mt-1 line-clamp-2 leading-relaxed">
            {resource.short_desc}
          </p>
        </div>

        {/* Specs & Meta */}
        <div className="mt-4 pt-3 border-t border-[#C5CBD5]/10 flex flex-col gap-2">
          {/* Compatibility & Devices */}
          <div className="flex items-center justify-between text-[11px] text-[#C5CBD5]/70">
            <div className="flex items-center gap-1 bg-[#101018] px-2 py-0.5 rounded border border-[#C5CBD5]/10">
              <span className="text-[#35D16F] font-bold">بيدروك:</span>
              <span>{resource.minecraft_version}</span>
            </div>

            {resource.supported_devices?.length > 0 && (
              <div className="flex items-center gap-1">
                <Cpu size={12} className="text-[#C5CBD5]/50" />
                <span>{resource.supported_devices.slice(0, 2).join('، ')}</span>
              </div>
            )}
          </div>

          {/* Genuine Downloads count & Date */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-1 text-[#C5CBD5]/80">
              <Download size={13} className="text-[#35D16F]" />
              <span className="font-bold text-white">{resource.download_count}</span>
              <span className="text-[11px] text-[#C5CBD5]/60">تحميل معتمد</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-[#C5CBD5]/50">
              <Calendar size={11} />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Details Button */}
        <div className="mt-3">
          <button
            type="button"
            className="w-full py-2 rounded-xl text-xs font-bold text-white bg-[#101018] border border-[#C5CBD5]/20 group-hover:border-[#FF284A]/60 group-hover:bg-[#270B18]/50 transition-all active:scale-98 flex items-center justify-center gap-1.5"
          >
            <span>استعراض وتحميل المورد</span>
          </button>
        </div>
      </div>
    </div>
  );
};
