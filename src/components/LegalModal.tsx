import React from 'react';
import { X, Shield, FileText, Mail, Info, AlertTriangle } from 'lucide-react';
import { sound } from '../utils/sound.ts';

export type LegalPageId = 'about' | 'contact' | 'privacy' | 'terms' | 'copyright';

interface LegalModalProps {
  pageId: LegalPageId | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ pageId, onClose }) => {
  if (!pageId) return null;

  const handleClose = () => {
    sound.playClick();
    onClose();
  };

  const pages: Record<LegalPageId, { title: string; icon: any; content: React.ReactNode }> = {
    about: {
      title: 'من نحن — عن ZORK CRAFT',
      icon: Info,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-[#C5CBD5]/90 leading-relaxed">
          <p>
            منصة <strong className="text-white">ZORK CRAFT</strong> هي منصة مجتمعية عربية متخصصة ومستقلة تمامًا موجهة لعشاق ومطوري لعبة Minecraft Bedrock في العالم العربي.
          </p>
          <p>
            تهدف المنصة إلى تقديم بيئة نظيفة وآمنة لاكتشاف وتحميل المودات (Mods & Add-ons)، الشيدرات وحزم الموارد (Shaders & Resource Packs)، السكنات، الخرائط والعوالم المخصصة، إضافة إلى توفير روابط رسمية ومباشرة وموثوقة دون إعلانات مضللة أو روابط احتيالية.
          </p>
          <div className="p-3 bg-[#270B18]/40 border border-[#FF284A]/30 rounded-xl text-xs text-[#C5CBD5]">
            <strong className="text-[#FF284A]">إخلاء مسؤولية رسمي:</strong>
            <p className="mt-1">ZORK CRAFT مشروع مجتمعي مستقل، وليس تابعًا رسميًا لشركة Mojang أو Microsoft.</p>
          </div>
        </div>
      )
    },
    contact: {
      title: 'تواصل معنا',
      icon: Mail,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-[#C5CBD5]/90 leading-relaxed">
          <p>نسعد بتواصلكم معنا للاقتراحات أو الاستفسارات التقنية أو التنسيق حول المحتوى:</p>
          <div className="bg-[#07070B] p-4 rounded-xl border border-[#C5CBD5]/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#C5CBD5]/70">قناة اليوتيوب الرسمية:</span>
              <a
                href="https://youtube.com/@zork_al3ab?si=VOP34dCv3OlP1bTr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF284A] font-bold hover:underline"
              >
                @zork_al3ab
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#C5CBD5]/70">بريد المالك والإدارة:</span>
              <span className="text-white font-mono text-xs">zorkal3ab@gmail.com</span>
            </div>
          </div>
        </div>
      )
    },
    privacy: {
      title: 'سياسة الخصوصية',
      icon: Shield,
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-[#C5CBD5]/90 leading-relaxed">
          <p>
            نحن نحترم خصوصية الزوار بأعلى معايير الأمان:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs text-[#C5CBD5]/80">
            <li>لا نجمع بيانات شخصية أو حسابات خاصة من الزوار العاديين دون علمهم.</li>
            <li>التحميلات يتم احتسابها بدقة عبر الخادم بناءً على طلبات التنزيل المعتمدة دون بيع البيانات لأي طرف ثالث.</li>
            <li>تفضيلات واجهة المستخدم كحالة الاشتراك أو كتم الصوت تُحفظ محليًا داخل متصفح المستخدم فقط.</li>
            <li>لا نستخدم ملفات تعريف ارتباط تجسسية أو برمجيات تتبع خبيثة.</li>
          </ul>
        </div>
      )
    },
    terms: {
      title: 'شروط الاستخدام',
      icon: FileText,
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-[#C5CBD5]/90 leading-relaxed">
          <p>باستخدامك لمنصة ZORK CRAFT، فإنك توافق على الشروط التالية:</p>
          <ul className="list-disc list-inside space-y-2 text-xs text-[#C5CBD5]/80">
            <li>استخدام الموارد المحملة يكون للأغراض الشخصية وفق شروط وتراخيص منشئيها الأصليين.</li>
            <li>يُحظر استغلال المنصة لأي محاولات اختراق أو إغراق أو إلحاق الضرر بخوادم التحميل.</li>
            <li>كافة العلامات التجارية الخاصة بـ Minecraft مملوكة لشركة Mojang AB وMicrosoft Corporation.</li>
          </ul>
        </div>
      )
    },
    copyright: {
      title: 'بلاغ حقوق النشر والملكية الفكرية',
      icon: AlertTriangle,
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-[#C5CBD5]/90 leading-relaxed">
          <p>
            تحرص منصة ZORK CRAFT على احترام حقوق الملكية الفكرية لكافة المطورين والمصممين في مجتمع Minecraft Bedrock.
          </p>
          <p>
            إذا كنت صاحب حق ملكية لمورد معروض وتعتقد أنه تم نشره بدون تصريح مناسب، يرجى مراسلتنا فورًا مع إثبات الملكية عبر البريد الإلكتروني للمالك:
          </p>
          <div className="p-3 bg-[#101018] rounded-lg border border-[#C5CBD5]/15 text-center font-mono text-xs text-[#FF284A]">
            zorkal3ab@gmail.com
          </div>
          <p className="text-xs text-[#C5CBD5]/70">
            سيتم مراجعة الطلب وحذف المورد أو تعديل نسبته خلال 24-48 ساعة عمل.
          </p>
        </div>
      )
    }
  };

  const current = pages[pageId];
  const Icon = current.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07070B]/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
    >
      <div className="relative w-full max-w-lg bg-[#101018] border border-[#C5CBD5]/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#C5CBD5]/15 flex items-center justify-between bg-[#07070B]/80">
          <div className="flex items-center gap-2 text-white">
            <Icon size={18} className="text-[#FF284A]" />
            <h3 className="font-heading text-sm sm:text-base font-bold">{current.title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#C5CBD5]/70 hover:text-white bg-[#101018] border border-[#C5CBD5]/15 transition-colors"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">{current.content}</div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#C5CBD5]/10 bg-[#07070B]/60 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#101018] border border-[#C5CBD5]/20 hover:border-[#FF284A]/50 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
