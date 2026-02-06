
import React from 'react';
import { useLanguage } from '../LanguageContext';
import BaseModal from './BaseModal';
import { Company } from '../types';

interface LegalModalsProps {
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
  company?: Company | null;
}

const LegalModals: React.FC<LegalModalsProps> = ({ type, onClose, company }) => {
  const { t } = useLanguage();

  const content = {
    privacy: {
      title: t('privacy_title'),
      body: company?.privacyPolicy || t('privacy_body_dynamic') || `A Innova4Up Enterprise reafirma seu compromisso com a transparência e a segurança...`
    },
    terms: {
      title: t('terms_title'),
      body: company?.termsOfUse || t('terms_body_dynamic') || `Ao interagir com este Ecossistema Digital, o usuário aceita integralmente...`
    }
  };

  const current = type ? content[type] : { title: '', body: '' };

  return (
    <BaseModal isOpen={!!type} onClose={onClose} maxWidth="max-w-2xl">
      <div className="h-[80vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-none shadow-none rounded-none">

        {/* Header de Governança */}
        <header className="px-10 py-10 border-b border-slate-100 dark:border-white/5 flex flex-col bg-slate-50/30 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Conformidade Legal</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{current.title}</h3>
        </header>

        {/* Corpo do Documento */}
        <div className="flex-1 overflow-y-auto p-12 space-y-6 custom-scrollbar bg-white dark:bg-slate-950">
          <div className="text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-6 whitespace-pre-wrap font-bold">
            {current.body}
          </div>
        </div>

        {/* Footer de Aceite */}
        <footer className="p-10 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center gap-6">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] max-w-md text-center">
            {t('legal_footer_notice')}
          </p>
          <button
            onClick={onClose}
            className="w-full md:w-auto px-16 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl transition-all active-scale"
          >
            {t('legal_accept_continue')}
          </button>
        </footer>
      </div>
    </BaseModal>
  );
};

export default LegalModals;
