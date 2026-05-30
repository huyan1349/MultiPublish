import { useState, useEffect } from 'react';
import { Trash2, Check, AlertCircle, Zap, ExternalLink } from 'lucide-react';
import { useContentStore } from '../stores/contentStore';
import { setExtensionId, getExtensionId, isExtensionInstalled } from '../utils/extensionBridge';

const APP_VERSION = '2.2';

const CHANGELOG = [
  { version: '2.2', date: '2026-05-30', items: ['公众号一键自动发布（扩展通信）', '设置页扩展ID配置', '四平台统一真实发布流程'] },
  { version: '2.1', date: '2026-05-30', items: ['草稿自动保存', '灵感页逐步揭示结果', '发布记录与预览联动', '编辑式圆角视觉系统'] },
  { version: '2.0', date: '2026-05-28', items: ['四平台适配器', 'Tiptap 富文本编辑器', 'AI 标题与标签建议'] },
];

export default function Settings() {
  const { resetDraft, saveToStorage } = useContentStore();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [extIdInput, setExtIdInput] = useState(getExtensionId());
  const [extConnected, setExtConnected] = useState(isExtensionInstalled());

  useEffect(() => {
    const handler = ((e: CustomEvent) => {
      setExtIdInput(e.detail);
      setExtConnected(true);
    }) as EventListener;
    window.addEventListener('multipublish:extension-id', handler);
    const timer = setInterval(() => {
      const current = getExtensionId();
      if (current !== extIdInput) {
        setExtIdInput(current);
        setExtConnected(isExtensionInstalled());
      }
    }, 3000);
    return () => {
      window.removeEventListener('multipublish:extension-id', handler);
      clearInterval(timer);
    };
  }, [extIdInput]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2000);
  };

  const handleSaveExtId = () => {
    const trimmed = extIdInput.trim();
    setExtensionId(trimmed);
    setExtIdInput(trimmed);
    setExtConnected(isExtensionInstalled());
    showToast('success', trimmed ? '扩展 ID 已保存' : '扩展 ID 已清除');
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
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
        <section className="px-card px-paper p-6 md:p-7">
          <div className="px-label mb-4">设置与偏好</div>
          <h1 className="font-['Cormorant_Garamond'] text-[52px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
            管理草稿、查看版本，
            <br />
            保持工具状态清晰。
          </h1>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="px-card px-paper p-6">
              <div className="px-label mb-5">扩展连接</div>
              <div className="space-y-4">
                <div className="rounded-[24px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-5">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <div className="text-[14px] text-[var(--ink)] flex items-center gap-2">
                        <Zap size={14} />
                        Chrome 扩展状态
                      </div>
                      <p className="mt-2 text-[13px] leading-6 text-[var(--ink-soft)]">
                        安装 MultiPublish 扩展后自动检测连接，无需手动配置。
                      </p>
                    </div>
                    {extConnected ? (
                      <span className="px-tag"><Check size={10} className="text-green-600" /> 已连接</span>
                    ) : (
                      <span className="px-tag"><AlertCircle size={10} className="text-amber-500" /> 未检测到</span>
                    )}
                  </div>
                  {extConnected && extIdInput && (
                    <div className="mb-3 rounded-xl bg-green-50/60 px-3 py-2 text-[12px] text-green-700 font-mono break-all">
                      扩展 ID: {extIdInput}
                    </div>
                  )}
                  <details className="group">
                    <summary className="cursor-pointer text-[12px] text-[var(--ink-faint)] hover:text-[var(--ink-soft)] transition">
                      自动检测失败？手动输入扩展 ID
                    </summary>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={extIdInput}
                        onChange={(e) => setExtIdInput(e.target.value)}
                        placeholder="输入 Chrome 扩展 ID"
                        className="flex-1 px-3 py-2 rounded-xl border border-[rgba(49,56,45,0.12)] bg-white text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none focus:border-[var(--accent)]/40"
                      />
                      <button onClick={handleSaveExtId} className="px-btn-primary text-[13px] whitespace-nowrap">
                        保存
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <div className="px-card px-paper p-6">
              <div className="px-label mb-5">草稿管理</div>
              <div className="space-y-4">
                <div className="rounded-[24px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[14px] text-[var(--ink)]">自动保存</div>
                      <p className="mt-2 text-[13px] leading-6 text-[var(--ink-soft)]">编辑器内容会持续写入本地，避免误关页面导致内容丢失。</p>
                    </div>
                    <span className="px-tag"><Check size={10} className="text-[var(--accent-deep)]" /> 已开启</span>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[14px] text-[var(--ink)]">手动保存</div>
                      <p className="mt-2 text-[13px] leading-6 text-[var(--ink-soft)]">在切换任务前立即把当前草稿写入本地存储。</p>
                    </div>
                    <button onClick={handleForceSave} className="px-btn-secondary">立即保存</button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[14px] text-[var(--ink)]">清除草稿</div>
                      <p className="mt-2 text-[13px] leading-6 text-[var(--ink-soft)]">删除编辑器中的文本和本地缓存，适合完全开始一篇新稿件时使用。</p>
                    </div>
                    <button onClick={handleClearDraft} className="px-btn-danger">
                      <Trash2 size={12} />
                      清除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="px-card px-paper p-6">
              <div className="px-label mb-4">版本信息</div>
              <div className="font-['Cormorant_Garamond'] text-[42px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                {APP_VERSION}
              </div>
              <div className="mt-3 text-[13px] leading-6 text-[var(--ink-soft)]">当前是稳定版本，可继续用于真实发布演示。</div>
            </div>

            <div className="px-card px-paper p-6">
              <div className="px-label mb-4">更新记录</div>
              <div className="space-y-5">
                {CHANGELOG.map((log) => (
                  <div key={log.version} className="rounded-[22px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.16em] text-[var(--ink)]">V{log.version}</span>
                      <span className="text-[12px] text-[var(--ink-faint)]">{log.date}</span>
                    </div>
                    <div className="space-y-2 text-[13px] leading-6 text-[var(--ink-soft)]">
                      {log.items.map((item, index) => (
                        <div key={index}>{item}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {toast && (
          <div className="fixed bottom-6 right-6 px-fade-in">
            <div className={`px-card px-4 py-3 flex items-center gap-2 text-[12px] ${
              toast.type === 'success' ? 'text-[var(--accent-deep)] border-[var(--accent)]/25' : 'text-red-700 border-red-300/40'
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
