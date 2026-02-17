
import React from 'react';
import { Task, TaskStatus } from '../types';
import { STATUS_CONFIG } from '../constants';
import { useLanguage } from '../LanguageContext';
import BaseModal from './BaseModal';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onUpdateStatus }) => {
  const { t } = useLanguage();
  const config = STATUS_CONFIG[task.status];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const downloadAttachment = (attachment: any) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} maxWidth="max-w-5xl">
      <div className="h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-none shadow-none rounded-none">

        {/* Header Elegante com Status */}
        <header className="px-10 py-6 border-b border-slate-100 dark:border-white/5 flex flex-col bg-slate-50/30 dark:bg-slate-900/50">
          <div className="flex items-center gap-4 mb-3">
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${config.bg} ${config.color} dark:bg-opacity-20`}>
              {config.icon} {task.status}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Criado em {new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{task.title}</h3>
        </header>

        {/* Conteúdo com Scroll Premium */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-white dark:bg-slate-950">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Coluna 1: Escopo e Objetivos */}
            <div className="space-y-8">
              <section>
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Escopo Detalhado</h4>
                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-white/5 text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed min-h-[120px]">
                  {task.description || "Nenhum resumo técnico definido."}
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Meta Estratégica</h4>
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[32px] border border-indigo-100/30 dark:border-indigo-500/10 text-sm font-black text-indigo-600 dark:text-indigo-400 italic mb-4">
                  "{task.goal || "Sem meta formalizada."}"
                </div>
              </section>

              {task.specificGoals && task.specificGoals.length > 0 && (
                <section>
                  <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Metas Específicas da Ação</h4>
                  <div className="space-y-3">
                    {task.specificGoals.map((g, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-4">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[10px] flex items-center justify-center font-black shrink-0">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{g.description}</p>
                          {g.deadline && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Prazo: {g.deadline}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Coluna 2: Métricas e Responsáveis */}
            <div className="space-y-8">
              <section>
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Indicadores e Verba</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 shadow-inner">
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cronograma</p>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200">{task.startDate || '?'} — {task.endDate || '?'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/30 dark:border-emerald-500/10">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 shadow-inner">
                      <i className="fas fa-wallet text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Investimento Alocado</p>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(task.budget || 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                      <i className="fas fa-users"></i>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Público Alvo</p>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200">{task.targetAudience || "Público Geral"}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Stakeholders / Envolvidos</h4>
                <div className="flex flex-wrap gap-2">
                  {task.involved.map((person, i) => (
                    <span key={i} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                      {person}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* Anexos em Destaque */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Evidências de Execução ({task.attachments.length})</h4>
              <div className="flex items-center gap-2 text-[9px] font-black text-amber-500 uppercase tracking-widest">
                <i className="fas fa-fingerprint"></i> Auditoria Innova4Up
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100/30 dark:border-amber-500/10 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fas fa-shield-alt"></i> {t('lgpd_attachment_warning')}
            </div>

            {task.driveLink && (
              <div className="mb-6">
                <a
                  href={task.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[28px] border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between group hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <i className="fab fa-google-drive text-2xl text-indigo-600 dark:text-indigo-400"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none mb-1">Diretório de Evidências</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Abrir pasta no Google Drive</p>
                    </div>
                  </div>
                  <i className="fas fa-external-link-alt text-indigo-300 group-hover:text-indigo-500 transition-colors"></i>
                </a>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {task.attachments.map(file => (
                <div key={file.id} className="group p-5 bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-white/5 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all hover:shadow-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                      <i className={`fas ${file.type.includes('image') ? 'fa-file-image text-amber-500' : 'fa-file-pdf text-rose-500'} text-xl opacity-80`}></i>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate pr-2 tracking-tight uppercase" title={file.name}>{file.name}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB — Auditado</p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadAttachment(file)}
                    className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 hover:rotate-12 transition-all shadow-lg shadow-indigo-600/20 active:scale-90"
                    title="Transferir arquivo"
                  >
                    <i className="fas fa-arrow-down text-xs"></i>
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer de Governança de Status */}
        <footer className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {Object.values(TaskStatus).map(s => (
              <button
                key={s}
                onClick={() => onUpdateStatus(task.id, s)}
                className={`
                  px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] transition-all 
                  ${task.status === s
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 active-scale ring-2 ring-indigo-500/10'
                    : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-white/5 active-scale'
                  }
                `}
              >
                {s}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="w-full md:w-auto px-12 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active-scale active:opacity-80">
            Fechar Painel
          </button>
        </footer>
      </div>
    </BaseModal>
  );
};

export default TaskDetailModal;
