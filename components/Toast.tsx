import React, { useEffect } from 'react';
import { Notification } from '../types';

interface ToastProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ notifications, onRemove }) => {
  return (
    <div 
      className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      role="region"
      aria-live="polite"
    >
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ notification: Notification; onRemove: (id: string) => void }> = ({ notification, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(notification.id), 5000);
    return () => clearTimeout(timer);
  }, [notification, onRemove]);

  const config = {
    success: { icon: 'fa-check-circle', color: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-50' },
    error: { icon: 'fa-times-circle', color: 'bg-rose-500', text: 'text-rose-500', bg: 'bg-rose-50' },
    warning: { icon: 'fa-exclamation-triangle', color: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-50' },
    info: { icon: 'fa-info-circle', color: 'bg-blue-500', text: 'text-blue-500', bg: 'bg-blue-50' }
  }[notification.type];

  return (
    <div 
      className="pointer-events-auto w-80 glass rounded-2xl shadow-2xl border border-white/40 overflow-hidden animate-apple flex"
      role="alert"
    >
      <div className={`w-1.5 ${config.color} shrink-0`}></div>
      <div className="p-4 flex gap-3 flex-1 items-start">
        <div className={`${config.bg} ${config.text} w-8 h-8 rounded-lg flex items-center justify-center shrink-0`}>
          <i className={`fas ${config.icon}`}></i>
        </div>
        <div className="flex-1">
          <p className="text-xs font-black text-slate-800 uppercase tracking-widest">{notification.title}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{notification.message}</p>
        </div>
        <button 
          onClick={() => onRemove(notification.id)}
          className="text-slate-300 hover:text-slate-500 transition-colors p-1"
          aria-label="Fechar notificação"
        >
          <i className="fas fa-times text-[10px]"></i>
        </button>
      </div>
    </div>
  );
};

export default Toast;