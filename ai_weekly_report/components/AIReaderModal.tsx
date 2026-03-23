import { Sparkle, X } from 'lucide-react';

/**
 * 弹窗字段与数据映射（用于内容关联）
 * ─────────────────────────────────────
 * | 字段名     | 数据来源        | 说明
 * |------------|-----------------|---------------------------
 * | 标题       | item.title      | 卡片标题
 * | 摘要       | item.ai_summary | 1-2 句简介，紧接标题后
 * | 影响评估   | item.ai_detail  | 解析 ②+①，先依据后结论，自然语言展示
 * | 建议动作   | item.ai_detail  | 解析 ③ 单独展示
 * | 查看原文   | item.source_url | 底部链接
 * ─────────────────────────────────────
 */

interface AIReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  insight: string;
  summary?: string | null;
  sourceUrl?: string | null;
}

/** 解析 ai_detail：① 影响/结论 ② 依据 ③ 建议动作；影响评估展示顺序：先依据，再结论 */
function parseAiDetail(detail: string): { impact: string; action: string } {
  const hasStructured = /①[\s\S]*②[\s\S]*③/.test(detail);
  if (!hasStructured) {
    const actionMatch = detail.match(/(?:^|\n)\s*[【\[]?(?:建议动作|可选动作)[】\]]?\s*\n([\s\S]*)$/i);
    const impactMatch = detail.match(/(?:^|\n)\s*[【\[]?(?:影响\s*[&与]\s*依据|影响与依据|设计影响)[】\]]?\s*\n([\s\S]*?)(?=(?:^|\n)\s*[【\[]?(?:建议动作|可选动作)[】\]]?|$)/i);
    return {
      impact: impactMatch?.[1]?.trim().replace(/^(?:影响|依据)[：:\s]*/gi, '').trim() ?? '',
      action: actionMatch?.[1]?.trim() ?? '',
    };
  }
  const m1 = detail.match(/①\s*([\s\S]*?)(?=②|$)/);
  const m2 = detail.match(/②\s*([\s\S]*?)(?=③|$)/);
  const m3 = detail.match(/③\s*([\s\S]*)$/);
  const conclusion = m1?.[1]?.replace(/^(?:影响|结论)[：:\s]*/gi, '').trim() ?? '';
  const basis = m2?.[1]?.replace(/^(?:依据)[：:\s]*/gi, '').trim() ?? '';
  const action = m3?.[1]?.replace(/^(?:③\s*)?(?:可选动作|建议动作)[：:\s]*/i, '').trim() ?? '';
  const impact = basis && conclusion ? `${basis}。${conclusion}` : basis || conclusion;
  return { impact, action };
}

export const AIReaderModal = ({ isOpen, onClose, title, insight, summary, sourceUrl }: AIReaderModalProps) => {
  if (!isOpen) return null;

  const detail = insight || '';
  const hasStructured = /①[\s\S]*②|【影响|【设计影响|建议动作|可选动作/.test(detail);
  const { impact, action } = hasStructured ? parseAiDetail(detail) : { impact: '', action: '' };
  const hasImpact = impact.length > 0;
  const hasAction = action.length > 0;
  const showPlain = !hasImpact && !hasAction;

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#202020] rounded-[8px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-[640px] max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-[#f1f1ef] dark:border-[#333333]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#f1f1ef] dark:border-[#333333] shrink-0">
          <div className="flex items-center gap-2 text-[#9b59b6] dark:text-[#c486dd] font-bold text-[17px]">
            <Sparkle className="w-5 h-5" />
            AI 解读
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#f1f1ef] dark:hover:bg-[#333333] rounded-full transition-colors text-[#999] dark:text-[#666]">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 md:px-8 py-5 overflow-y-auto flex-1 min-h-0">
          <h2 className="text-[20px] md:text-[22px] font-bold text-[#37352f] dark:text-[#d4d4d4] mb-4 leading-tight tracking-tight">{title}</h2>
          
          {(summary || showPlain) && (
            <p className="text-[15px] text-[#37352f] dark:text-[#d4d4d4] leading-relaxed mb-6 font-normal tracking-wide">
              {showPlain ? detail : (summary || '')}
            </p>
          )}
          
          <div className="space-y-5">
            {hasImpact && (
              <div>
                <h3 className="text-[14px] font-bold text-[#787774] dark:text-[#9e9e9e] mb-3">影响评估</h3>
                <p className="text-[15px] text-[#37352f] dark:text-[#d4d4d4] leading-relaxed pl-[13px] border-l-2 border-[#f1f1ef] dark:border-[#333333] ml-[3px] whitespace-pre-line">
                  {impact}
                </p>
              </div>
            )}
            
            {hasAction && (
              <div className="px-5 py-5 bg-gradient-to-br from-[#fbf9fc] to-[#f4f0f7] dark:from-[#2a262c] dark:to-[#221e24] rounded-[8px] border border-[#ebdff0] dark:border-[#3a323d]">
                <h3 className="text-[14px] font-bold text-[#212121] dark:text-white mb-2">建议动作</h3>
                <p className="text-[15px] text-[#37352f] dark:text-[#d4d4d4] leading-relaxed font-normal whitespace-pre-line">
                  {action}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#f1f1ef] dark:border-[#333333] flex justify-end items-center shrink-0">
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="dark:text-[#d4d4d4] font-medium text-[14px] hover:text-[#9b59b6] dark:hover:text-[#c486dd] transition-colors flex items-center gap-1.5 group text-[#171717]" onClick={e => e.stopPropagation()}>
              查看原文 
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          ) : (
            <span className="dark:text-[#d4d4d4] font-medium text-[14px] text-[#999] dark:text-[#666] flex items-center gap-1.5">
              查看原文 
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
