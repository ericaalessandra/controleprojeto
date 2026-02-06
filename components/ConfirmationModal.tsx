
import React from 'react';
import BaseModal from './BaseModal';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'danger'
}) => {
  const typeConfig = {
    danger: {
      icon: 'fa-exclamation-triangle',
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      btnBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
    },
    warning: {
      icon: 'fa-exclamation-circle',
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      btnBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
    },
    info: {
      icon: 'fa-info-circle',
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      btnBg: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
    }
  };

  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.danger;

  return (
    <BaseModal isOpen={isOpen} onClose={onCancel} maxWidth="max-w-sm" showCloseButton={false}>
      <div className="p-8 text-center">
        <div className={`w-20 h-20 ${config.iconBg} ${config.iconColor} rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner animate-pulse`}>
          <i className={`fas ${config.icon}`}></i>
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-bold">
          {message}
        </p>
      </div>
      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex gap-3 border-t border-slate-100 dark:border-white/5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-white dark:hover:bg-slate-700 hover:text-slate-600 transition-all active:scale-95"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`flex-1 py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${config.btnBg}`}
        >
          {confirmText}
        </button>
      </div>
    </BaseModal>
  );
};

export default ConfirmationModal;
