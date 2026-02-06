
import React, { useEffect } from 'react';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string; // e.g., 'max-w-md', 'max-w-4xl'
    showCloseButton?: boolean;
}

const BaseModal: React.FC<BaseModalProps> = ({
    isOpen,
    onClose,
    children,
    maxWidth = 'max-w-md',
    showCloseButton = true
}) => {
    // Trava o scroll do body quando o modal está aberto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Fecha ao pressionar ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop com Blur Profissional */}
            <div
                className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Container do Modal */}
            <div className={`
        relative w-full ${maxWidth} 
        max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-5rem)]
        bg-white dark:bg-slate-900 
        rounded-[32px] sm:rounded-[40px] 
        shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] 
        dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] 
        border border-slate-100 dark:border-white/5 
        overflow-hidden flex flex-col min-h-0
        animate-in zoom-in-95 fade-in duration-300 ease-out-expo
      `}>

                {/* Botão de Fechar Inteligente */}
                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all flex items-center justify-center z-10 hover:rotate-90 active:scale-90 border border-slate-100 dark:border-white/5"
                        aria-label="Fechar"
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                )}

                {children}
            </div>

            <style>{`
        @keyframes zoom-in-95 {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .ease-out-expo {
          transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
        }
      `}</style>
        </div>
    );
};

export default BaseModal;
