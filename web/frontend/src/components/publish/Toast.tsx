import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export interface ToastData {
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

const iconMap = { success: CheckCircle, error: XCircle, warning: AlertTriangle };
const colorMap = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    addToastFn = (t) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 4000);
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
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl ${colorMap[toast.type]} min-w-[320px]`}
              style={{ background: 'rgba(15, 23, 42, 0.9)' }}
            >
              <Icon size={18} className={
                toast.type === 'success' ? 'text-emerald-400' :
                toast.type === 'error' ? 'text-red-400' : 'text-amber-400'
              } />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100">{toast.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
