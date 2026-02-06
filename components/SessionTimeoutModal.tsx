
import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';

interface SessionTimeoutModalProps {
    isOpen: boolean;
    onExtend: () => void;
    onLogout: () => void;
    warningTimeInSeconds: number;
}

const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
    isOpen,
    onExtend,
    onLogout,
    warningTimeInSeconds
}) => {
    const [timeLeft, setTimeLeft] = useState(warningTimeInSeconds);

    useEffect(() => {
        if (!isOpen) {
            setTimeLeft(warningTimeInSeconds);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, onLogout, warningTimeInSeconds]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <BaseModal isOpen={isOpen} onClose={onLogout} maxWidth="max-w-sm" showCloseButton={false}>
            <div className="p-10 text-center">
                <div className="w-24 h-24 bg-amber-50 dark:bg-amber-900/10 text-amber-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner border border-amber-100 dark:border-amber-500/10">
                    <i className="fas fa-hourglass-half animate-pulse"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Sessão Expirando</h3>
                <p className="text-slate-400 dark:text-slate-400 text-sm leading-relaxed mb-10 font-bold px-4">
                    Sua sessão está prestes a expirar. Deseja manter sua conexão segura?
                </p>

                <div className="inline-flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-white/5 w-full">
                    <div className="text-6xl font-black text-amber-500 tracking-tighter mb-2">
                        {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Encerramento Automático</p>
                </div>
            </div>

            <div className="p-8 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4 border-t border-slate-100 dark:border-white/5">
                <button
                    type="button"
                    onClick={onLogout}
                    className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-white dark:hover:bg-slate-800 transition-all active-scale"
                >
                    Encerrar
                </button>
                <button
                    type="button"
                    onClick={onExtend}
                    className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-indigo-600/20 active-scale"
                >
                    Continuar
                </button>
            </div>
        </BaseModal>
    );
};

export default SessionTimeoutModal;
