import { useState } from 'react';
import { Trash2, Check, AlertCircle, Wifi, WifiOff, Zap } from 'lucide-react';
import { useContentStore } from '../stores/contentStore';
import { isExtensionAvailable, checkExtensionHealth } from '../utils/extensionBridge';

const APP_VERSION = '2.2';

const CHANGELOG = [
  { version: '2.2', date: '2026-05-30', items: ['Refined Industrial Luxury 设计系统重构', 'Instrument Serif 展示字体 + JetBrains Mono + DM Sans 三字体体系', 'grain 噪点纹理叠加层', 'glass 毛玻璃效果', 'text-gradient 渐变文字', 'shadow-elevated 高级阴影', 'px-reveal-up / px-line-draw 高级动画', 'CSS 变量体系（:root）', 'ProseMirror h1 Instrument Serif 标题', '色板微调（更温暖的灰阶）'] },
  { version: '2.1', date: '2026-05-30', items: ['草稿自动保存（3秒防抖，localStorage 持久化）', '灵感页打字机效果（逐行揭示标题/大纲/标签）', '灵感页 REGENERATE 按钮', '灵感页话题建议 chips', '灵感页空状态 dot-grid 设计'] },
  { version: '2.0', date: '2026-05-28', items: ['Light Pixel 像素风 UI 重构', '四平台适配器架构', 'Tiptap 富文本编辑器', 'AI 标题/标签生成'] },
];

const platformDots = [
  { name: 'WeChat', color: '#07C160' },
  { name: 'Zhihu', color: '#0066FF' },
  { name: 'Bilibili', color: '#FB7299' },
  { name: 'Xiaohongshu', color: '#FF2442' },
];

export default function Settings() {
  const { resetDraft, saveToStorage } = useContentStore();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [extConnected, setExtConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

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

  const handleCheckExtension = async () => {
    setChecking(true);
    try {
      const health = await checkExtensionHealth();
      setExtConnected(health.connected);
    } catch {
      setExtConnected(false);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[640px] mx-auto px-12 py-16">
        <div className="flex items-center gap-3 mb-3">
          <div className="px-dot" style={{ backgroundColor: '#FF3B30' }} />
          <span className="px-label">SETTINGS</span>
        </div>
        <h1 className="font-serif font-bold text-[28px] text-tx tracking-tight mb-12">
          设置<span className="text-dot-red">.</span>偏好
        </h1>

        <div className="px-card p-5 mb-4">
          <div className="px-label mb-4">VERSION</div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-lg text-tx">MULTIPUBLISH V{APP_VERSION}</span>
            <span className="px-tag">STABLE</span>
          </div>
        </div>

        <div className="px-card p-5 mb-4">
          <div className="px-label mb-4">EXTENSION</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {extConnected === null ? (
                <WifiOff size={13} className="text-tx-faint" />
              ) : extConnected ? (
                <Wifi size={13} className="text-emerald-500" />
              ) : (
                <WifiOff size={13} className="text-dot-red" />
              )}
              <div>
                <p className="font-mono text-xs text-tx">
                  {extConnected === null ? '未检测' : extConnected ? '已连接' : '未连接'}
                </p>
                <p className="font-mono text-[10px] text-tx-mute mt-0.5">ContentBridge 扩展状态</p>
              </div>
            </div>
            <button
              onClick={handleCheckExtension}
              disabled={checking}
              className="px-btn-secondary text-[9px]"
            >
              {checking ? '检测中…' : 'CHECK'}
            </button>
          </div>
        </div>

        <div className="px-card p-5 mb-4">
          <div className="px-label mb-4">AI CONFIGURATION</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap size={13} className="text-amber-500" />
              <div>
                <p className="font-mono text-xs text-tx">DeepSeek API</p>
                <p className="font-mono text-[10px] text-tx-mute mt-0.5">AI 内容美化与灵感生成</p>
              </div>
            </div>
            <span className="flex items-center gap-1 px-tag">
              <Check size={9} className="text-emerald-500" /> ACTIVE
            </span>
          </div>
        </div>

        <div className="px-card p-5 mb-4">
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

        <div className="px-card p-5 mb-4">
          <div className="px-label mb-4">ABOUT</div>
          <p className="font-mono text-[11px] text-tx-dim leading-relaxed mb-4">
            MultiPublish — 一次编写，全平台触达。Chrome 浏览器扩展，多平台内容真实发布工具。
          </p>
          <div className="flex items-center gap-3">
            {platformDots.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <div className="px-dot" style={{ backgroundColor: p.color }} />
                <span className="font-mono text-[9px] text-tx-faint">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-card p-5">
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
          <div className="fixed bottom-6 right-6 px-fade-in" role="status" aria-live="polite">
            <div className={`px-card px-4 py-3 flex items-center gap-2 font-mono text-[11px] ${
              toast.type === 'success' ? 'text-emerald-600 border-emerald-200' : 'text-dot-red border-dot-red/30'
            }`}>
              {toast.type === 'success' ? <Check size={12} aria-hidden="true" /> : <AlertCircle size={12} aria-hidden="true" />}
              {toast.msg}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
