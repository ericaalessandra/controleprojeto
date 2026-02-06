
import React, { useState } from 'react';
import { Company } from '../types';
import BaseModal from './BaseModal';

interface DeleteCompanyModalProps {
    isOpen: boolean;
    company: Company | null;
    projectCount: number;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const DeleteCompanyModal: React.FC<DeleteCompanyModalProps> = ({
    isOpen,
    company,
    projectCount,
    onConfirm,
    onCancel,
    isLoading = false
}) => {
    const [confirmationText, setConfirmationText] = useState('');

    const handleConfirm = () => {
        if (confirmationText.toUpperCase() === 'EXCLUIR') {
            onConfirm();
        }
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onCancel} maxWidth="max-w-lg" showCloseButton={true}>
            <div className="flex flex-col bg-white dark:bg-slate-900 overflow-hidden">

                {/* Header de Alerta Máximo */}
                <header className="p-10 text-center bg-rose-50/30 dark:bg-rose-900/10 border-b border-rose-100 dark:border-rose-900/20">
                    <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner border border-rose-200 dark:border-rose-800">
                        <i className="fas fa-radiation-alt animate-pulse"></i>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Protocolo de Exclusão</h3>
                    <p className="text-sm text-slate-500 font-bold mt-2">
                        Unidade: <span className="text-rose-600 dark:text-rose-400">"{company?.name}"</span>
                    </p>
                </header>

                <div className="p-10 space-y-8 bg-white dark:bg-slate-950">
                    {/* Sumário de Impacto */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[32px] p-8 border border-slate-100 dark:border-white/5 shadow-inner">
                        <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <i className="fas fa-exclamation-triangle"></i> Impactos Irreversíveis no Ecossistema:
                        </h4>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-4 text-xs font-black text-slate-700 dark:text-slate-300">
                                <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px]"><i className="fas fa-times"></i></div>
                                {projectCount} Iniciativas Estratégicas
                            </li>
                            <li className="flex items-center gap-4 text-xs font-black text-slate-700 dark:text-slate-300">
                                <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px]"><i className="fas fa-times"></i></div>
                                Todos os Projetos e Cronogramas
                            </li>
                            <li className="flex items-center gap-4 text-xs font-black text-slate-700 dark:text-slate-300">
                                <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px]"><i className="fas fa-times"></i></div>
                                Usuários e Logs de Atividade
                            </li>
                        </ul>
                    </div>

                    {/* Validação de Segurança */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Para confirmar, digite as letras abaixo:</label>
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">EXCLUIR</span>
                        </div>
                        <input
                            type="text"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            placeholder="Ação necessita confirmação explícita"
                            className="w-full px-6 py-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-4 focus:ring-rose-500/10 text-center font-black tracking-[0.4em] text-rose-600 dark:text-rose-400 uppercase transition-all text-sm shadow-inner"
                        />
                    </div>
                </div>

                {/* Ações de Governança */}
                <footer className="p-10 bg-slate-50 dark:bg-slate-900/50 flex gap-4 border-t border-slate-100 dark:border-white/5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-white dark:hover:bg-slate-800 transition-all active-scale"
                    >
                        Abortar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={confirmationText.toUpperCase() !== 'EXCLUIR' || isLoading}
                        className={`flex-[1.5] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active-scale ${confirmationText.toUpperCase() === 'EXCLUIR'
                                ? 'bg-rose-600 text-white shadow-rose-600/20 hover:bg-rose-700'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                            }`}
                    >
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-skull"></i>}
                        Eliminar Registro Permanentemente
                    </button>
                </footer>
            </div>
        </BaseModal>
    );
};

export default DeleteCompanyModal;
