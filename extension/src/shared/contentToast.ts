type ToastType = 'success' | 'error';

export function showContentBridgeToast(message: string, type: ToastType = 'success') {
  const existing = document.getElementById('contentbridge-toast');
  existing?.remove();

  const toast = document.createElement('div');
  toast.id = 'contentbridge-toast';
  toast.textContent = message;
  toast.style.cssText = [
    'position:fixed',
    'top:16px',
    'right:16px',
    'z-index:2147483647',
    'max-width:320px',
    'padding:10px 12px',
    'border-radius:8px',
    'font:13px/1.5 system-ui,-apple-system,Segoe UI,sans-serif',
    'box-shadow:0 10px 28px rgba(0,0,0,0.18)',
    'opacity:0',
    'transform:translateY(-6px)',
    'transition:opacity .18s ease,transform .18s ease',
    'pointer-events:none',
    type === 'success'
      ? 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0'
      : 'background:#fff1f2;color:#be123c;border:1px solid #fecdd3',
  ].join(';');

  document.documentElement.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    setTimeout(() => toast.remove(), 220);
  }, 3600);
}
