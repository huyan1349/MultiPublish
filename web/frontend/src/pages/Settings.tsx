import { useState } from 'react';
import { Trash2, Check, AlertCircle } from 'lucide-react';
import { useContentStore } from '../stores/contentStore';

const APP_VERSION = '2.1';

const CHANGELOG = [
  { version: '2.1', date: '2026-05-30', items: ['草稿自动保存（3秒防抖，localStorage 持久化）', '灵感页打字机效果（逐行揭示标题/大纲/标签）', '灵感页 REGENERATE 按钮', '灵感页话题建议 chips', '灵感页空状态 dot-grid 设计'] },
  { version: '2.0', date: '2026-05-28', items: ['Light Pixel 像素风 UI 重构', '四平台适配器架构', 'Tiptap 富文本编辑器', 'AI 标题/标签生成'] },
];

export default function Settings() {
  const { resetDraft, saveToStorage } = useContentStore();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2000);
  };

  const handleClearDraft = () => {
    resetDraft();
    localStorage.removeItem('multipublish_draft');
    showToast('success', '草稿已清除');
  };

  const handleForceSave = () => {
    saveToStorage();
    showToast('success', '草稿已保存');
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[640px] mx-auto px-12 py-16">
        <div className="flex items-center gap-3 mb-3">
          <div className="px-dot" style={{ backgroundColor: '#FF3B30' }} />
          <span className="px-label">SETTINGS</span>
        </div>
        <h1 className="font-mono font-bold text-[28px] text-tx tracking-tight mb-12">
          设置<span className="text-dot-red">.</span>偏好
        </h1>

        <div className="px-card p-6 mb-6">
          <div className="px-label mb-4">DRAFT</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-tx">自动保存</p>
                <p className="font-mono text-[10px] text-tx-mute mt-1">编辑器内容每 3 秒自动保存到本地</p>
              </div>
              <span className="flex items-center gap-1 px-tag">
                <Check size={9} className="text-emerald-500" /> ON
              </span>
            </div>
            <div className="px-divider" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-tx">手动保存</p>
                <p className="font-mono text-[10px] text-tx-mute mt-1">立即将当前草稿保存到本地存储</p>
              </div>
              <button onClick={handleForceSave} className="px-btn-secondary text-[9px]">
                SAVE NOW
              </button>
            </div>
            <div className="px-divider" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-tx">清除草稿</p>
                <p className="font-mono text-[10px] text-tx-mute mt-1">清空编辑器内容和本地缓存</p>
              </div>
              <button onClick={handleClearDraft} className="px-btn-danger text-[9px]">
                <Trash2 size={11} /> CLEAR
              </button>
            </div>
          </div>
        </div>

        <div className="px-card p-6 mb-6">
          <div className="px-label mb-4">VERSION</div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-lg text-tx">{APP_VERSION}</span>
            <span className="px-tag">STABLE</span>
          </div>
        </div>

        <div className="px-card p-6">
          <div className="px-label mb-5">CHANGELOG</div>
          <div className="space-y-6">
            {CHANGELOG.map((log) => (
              <div key={log.version}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono font-bold text-xs text-tx">V{log.version}</span>
                  <span className="font-mono text-[10px] text-tx-faint">{log.date}</span>
                </div>
                <ul className="space-y-1.5 pl-4">
                  {log.items.map((item, i) => (
                    <li key={i} className="font-mono text-[11px] text-tx-dim flex items-start gap-2">
                      <span className="text-tx-faint mt-px">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-6 right-6 px-fade-in">
            <div className={`px-card px-4 py-3 flex items-center gap-2 font-mono text-[11px] ${
              toast.type === 'success' ? 'text-emerald-600 border-emerald-200' : 'text-dot-red border-dot-red/30'
            }`}>
              {toast.type === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
              {toast.msg}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
