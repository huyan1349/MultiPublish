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

const iconMap = { success: CheckCircle2, error: XCircle, warning: AlertTriangle };
const borderColor = {
  success: '#07C160',
  error: '#FF3B30',
  warning: '#F59E0B',
};
const iconColor = {
  success: '#07C160',
  error: '#FF3B30',
  warning: '#F59E0B',
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    addToastFn = (t) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
    };
    return () => { addToastFn = null; };
  }, []);

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-start gap-3 p-4 bg-white border min-w-[300px] shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
              style={{ borderLeftWidth: 3, borderLeftColor: borderColor[toast.type], borderColor: '#E2E2E0' }}
            >
              <Icon size={16} style={{ color: iconColor[toast.type] }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-tx">{toast.title}</p>
                <p className="text-[11px] text-tx-dim mt-0.5">{toast.message}</p>
              </div>
              <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} className="text-tx-faint hover:text-tx transition-colors">
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
