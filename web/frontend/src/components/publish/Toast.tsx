import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ToastData {
  id: number;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

let toastId = 0;
let addToastFn: ((t: Omit<ToastData, 'id'>) => void) | null = null;

export function showToast(type: ToastData['type'], title: string, message: string) {
  addToastFn?.({ type, title, message });
}

const iconMap: Record<string, typeof XCircle> = { success: CheckCircle2, error: XCircle, warning: AlertTriangle };
const iconColor: Record<string, string> = { success: 'text-emerald-500', error: 'text-dot-red', warning: 'text-amber-500' };
const borderColor: Record<string, string> = { success: 'border-emerald-500/30', error: 'border-dot-red/30', warning: 'border-amber-500/30' };

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    addToastFn = (t) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
    };
    return () => { addToastFn = null; };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.12 }}
              className={`pointer-events-auto flex items-start gap-3 p-3 bg-px-card border min-w-[280px] ${borderColor[toast.type]}`}
              style={{ borderRadius: 0 }}
            >
              <Icon size={14} className={iconColor[toast.type]} />
              <div className="flex-1 min-w-0">
                <p className="font-mono font-bold text-[10px] text-tx tracking-wide">{toast.title}</p>
                <p className="font-mono text-[9px] text-tx-dim mt-0.5">{toast.message}</p>
              </div>
              <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} className="text-tx-faint hover:text-tx transition-colors">
                <X size={11} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
