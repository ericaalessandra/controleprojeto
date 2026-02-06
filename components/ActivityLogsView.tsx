import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { applyProfessionalHeader, applyProfessionalFooter, generateIntegrityHash, generateQRCode } from '../pdfUtils';
import { ActivityLog, User, Company } from '../types';
import { db } from '../db';
import { useLanguage } from '../LanguageContext';
import BaseModal from './BaseModal';

interface ActivityLogsViewProps {
  logs?: ActivityLog[];
  users?: User[];
  currentCompany: Company | null;
}

const ACTION_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  LOGIN: { label: 'Acesso', icon: 'fa-sign-in-alt', color: 'bg-indigo-100 text-indigo-600' },
  PROJECT_CREATE: { label: 'Novo Projeto', icon: 'fa-folder-plus', color: 'bg-emerald-100 text-emerald-600' },
  PROJECT_DELETE: { label: 'Exclusão Projeto', icon: 'fa-folder-minus', color: 'bg-rose-100 text-rose-600' },
  TASK_CREATE: { label: 'Nova Atividade', icon: 'fa-tasks', color: 'bg-blue-100 text-blue-600' },
  TASK_STATUS: { label: 'Status Atividade', icon: 'fa-sync-alt', color: 'bg-amber-100 text-amber-600' },
  TASK_DELETE: { label: 'Exclusão Atividade', icon: 'fa-trash-alt', color: 'bg-rose-100 text-rose-600' },
  USER_STATUS: { label: 'Status Usuário', icon: 'fa-user-shield', color: 'bg-slate-100 text-slate-600' },
  CONFIG_UPDATE: { label: 'Configuração', icon: 'fa-cog', color: 'bg-purple-100 text-purple-600' },
  COMPANY_CREATE: { label: 'Nova Empresa', icon: 'fa-building', color: 'bg-cyan-100 text-cyan-600' },
  SCHEDULER_UPDATE: { label: 'Agenda', icon: 'fa-calendar', color: 'bg-teal-100 text-teal-600' }
};

const DEFAULT_ACTION = { label: 'Sistema', icon: 'fa-bolt', color: 'bg-slate-100 text-slate-400' };

const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ logs = [], users = [], currentCompany }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'activity' | 'lgpd'>('activity');

  // Estados para Filtros
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Estado para Ordenação
  const [sortConfig, setSortConfig] = useState<{ key: 'timestamp' | 'userName' | 'action', direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc'
  });

  // Estado para Modal de Expurgo
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeAction, setPurgeAction] = useState('all');
  const [isPurging, setIsPurging] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const requestSort = (key: 'timestamp' | 'userName' | 'action') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const formatDate = (ts: any) => {
    if (!ts) return { d: '--/--/--', t: '--:--' };
    try {
      // Aceitar tanto timestamps numéricos quanto strings ISO
      let date: Date;
      if (typeof ts === 'number') {
        date = new Date(ts);
      } else if (typeof ts === 'string') {
        date = new Date(ts);
      } else {
        return { d: '--/--/--', t: '--:--' };
      }

      if (isNaN(date.getTime())) return { d: '--/--/--', t: '--:--' };
      return {
        d: date.toLocaleDateString('pt-BR'),
        t: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { d: '--/--/--', t: '--:--' };
    }
  };

  // Filtragem e Ordenação
  const filteredLogs = useMemo(() => {
    let safeLogs = [...(Array.isArray(logs) ? logs : [])];

    if (filterStartDate) {
      const start = new Date(filterStartDate).getTime();
      safeLogs = safeLogs.filter(l => new Date(l.timestamp).getTime() >= start);
    }

    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      safeLogs = safeLogs.filter(l => new Date(l.timestamp).getTime() <= end.getTime());
    }

    // Aplicar Ordenação
    safeLogs.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      // Caso especial para timestamp que pode vir como string do Supabase
      if (sortConfig.key === 'timestamp') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return safeLogs;
  }, [logs, filterStartDate, filterEndDate, sortConfig]);

  const handleExportPDF = async () => {
    const doc = new jsPDF();

    if (activeTab === 'activity') {
      const tableData = filteredLogs.map(log => {
        const dt = formatDate(log.timestamp);
        const action = ACTION_CONFIG[log.action]?.label || log.action;
        return [
          `${dt.d} ${dt.t}`,
          log.userName,
          action,
          log.details
        ];
      });

      (doc as any).autoTable({
        startY: 35,
        margin: { top: 35 },
        head: [['Data/Hora', 'Usuário', 'Operação', 'Detalhes']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [55, 65, 81], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 }
      });

      // --- ASSINATURA DIGITAL ---
      const hashData = `Auditoria-${currentCompany?.id || 'system'}-${logs.length}-${new Date().getTime()}`;
      const hash = await generateIntegrityHash(hashData);
      const qrCode = await generateQRCode(hash);

      applyProfessionalHeader(doc, 'Trilha de Auditoria e Operações', currentCompany);
      applyProfessionalFooter(doc, hash, qrCode);
      doc.save('Auditoria_Innova4Up.pdf');
    } else {
      const tableData = users.map(u => [
        u.name,
        u.email,
        u.lgpdConsent ? t('lgpd_accepted') : t('lgpd_pending'),
        u.lgpdConsentDate ? new Date(u.lgpdConsentDate).toLocaleString('pt-BR') : '-'
      ]);

      (doc as any).autoTable({
        startY: 35,
        margin: { top: 35 },
        head: [['Usuário', 'E-mail', 'Consentimento', 'Data do Aceite']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [55, 65, 81], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 }
      });

      // --- ASSINATURA DIGITAL ---
      const hashData = `LGPD-${currentCompany?.id || 'system'}-${users.length}-${new Date().getTime()}`;
      const hash = await generateIntegrityHash(hashData);
      const qrCode = await generateQRCode(hash);

      applyProfessionalHeader(doc, t('lgpd_audit_map'), currentCompany);
      applyProfessionalFooter(doc, hash, qrCode);
      doc.save('Mapa_Consentimento_LGPD.pdf');
    }
  };

  const handlePurgeLogs = async () => {
    // Validação: Exigir que pelo menos uma data seja definida
    if (!filterStartDate && !filterEndDate) {
      alert('Por favor, defina um período (Data Início e/ou Data Fim) antes de expurgar registros.');
      return;
    }

    if (!confirm('Atenção: Esta ação é irreversível. Deseja realmente excluir os registros selecionados?')) return;

    setIsPurging(true);
    try {
      const criteria: any = {};

      // Define filtros de expurgo baseados na tela, mas respeitando a lógica do modal se implementada separada
      // Aqui usaremos os filtros da tela principal + filtro de ação do modal
      if (filterStartDate) criteria.startDate = new Date(filterStartDate).getTime();
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        criteria.endDate = end.getTime();
      }
      if (purgeAction !== 'all') criteria.action = purgeAction;

      console.log('[AUDIT] Purging logs with criteria:', criteria);
      await db.deleteLogs(criteria);
      alert('Registros removidos com sucesso. A página será recarregada.');
      window.location.reload();
    } catch (e: any) {
      console.error('[AUDIT] Purge error:', e);
      alert(`Erro ao expurgar registros: ${e.message || 'Erro desconhecido'}`);
    } finally {
      setIsPurging(false);
      setIsPurgeModalOpen(false);
    }
  };

  const handleCleanupInvalidLogs = async () => {
    if (!confirm('Esta ação irá DELETAR permanentemente todos os logs sem data/hora válida. Deseja continuar?')) return;

    setIsCleaningUp(true);
    try {
      const result = await db.cleanupLogsWithoutTimestamp();
      alert(`Limpeza concluída!\n\nLogs deletados: ${result.deleted}\n\nA página será recarregada.`);
      window.location.reload();
    } catch (e) {
      alert('Erro ao limpar registros inválidos.');
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-apple h-full flex flex-col overflow-hidden">
      <header className="mb-8 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
              <i className={`fas ${activeTab === 'activity' ? 'fa-history' : 'fa-shield-check'} text-lg`}></i>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {activeTab === 'activity' ? 'Trilha de Auditoria' : t('lgpd_governance_title')}
              </h2>
              <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em]">Rastreabilidade e Governança</p>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-slate-100/50 dark:bg-slate-800 rounded-2xl w-fit mb-4">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'activity' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Logs de Atividade
            </button>
            <button
              onClick={() => setActiveTab('lgpd')}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'lgpd' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t('lgpd_governance_title')}
            </button>
          </div>

          <p className="text-slate-500 font-medium max-w-xl text-sm">
            {activeTab === 'activity'
              ? 'Histórico consolidado de transações. Utilize os filtros para gerar relatórios ou realizar a manutenção dos dados.'
              : 'Mapa detalhado de consentimentos digitais da equipe, garantindo conformidade total com a LGPD.'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          {activeTab === 'activity' && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex flex-col px-2">
                <label className="text-[8px] font-bold text-slate-400 uppercase">De</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="text-xs font-bold text-slate-700 dark:text-slate-200 outline-none bg-transparent" />
              </div>
              <div className="w-px h-8 bg-slate-100 dark:bg-slate-700"></div>
              <div className="flex flex-col px-2">
                <label className="text-[8px] font-bold text-slate-400 uppercase">Até</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="text-xs font-bold text-slate-700 dark:text-slate-200 outline-none bg-transparent" />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2"
            >
              <i className="fas fa-file-pdf"></i> Exportar
            </button>
            {activeTab === 'activity' && (
              <button
                onClick={() => setIsPurgeModalOpen(true)}
                className="px-4 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-trash-alt"></i> Expurgar
              </button>
            )}
            {activeTab === 'activity' && (
              <button
                onClick={handleCleanupInvalidLogs}
                disabled={isCleaningUp}
                className="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                title="Deletar logs sem data/hora válida"
              >
                <i className="fas fa-broom"></i> {isCleaningUp ? 'Limpando...' : 'Limpar Inválidos'}
              </button>
            )}
          </div>
        </div>
      </header>

      {activeTab === 'activity' ? (
        filteredLogs.length === 0 ? (
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-[40px] border-2 border-dashed border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center p-20 text-center">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <i className="fas fa-filter text-slate-200 dark:text-slate-700 text-4xl"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-400">Nenhum registro encontrado</h3>
            <p className="text-slate-300 max-w-xs mt-2 font-medium">Tente ajustar os filtros de data para visualizar o histórico.</p>
          </div>
        ) : (
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col min-h-0">
            <div className="overflow-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white dark:bg-slate-800">
                  <tr className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
                    <th
                      onClick={() => requestSort('timestamp')}
                      className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group/h"
                    >
                      <div className="flex items-center gap-2">
                        Cronologia
                        <i className={`fas fa-sort text-[8px] transition-opacity ${sortConfig.key === 'timestamp' ? 'opacity-100 text-brand' : 'opacity-30 group-hover/h:opacity-100'}`}></i>
                      </div>
                    </th>
                    <th
                      onClick={() => requestSort('userName')}
                      className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group/h"
                    >
                      <div className="flex items-center gap-2">
                        Agente
                        <i className={`fas fa-sort text-[8px] transition-opacity ${sortConfig.key === 'userName' ? 'opacity-100 text-brand' : 'opacity-30 group-hover/h:opacity-100'}`}></i>
                      </div>
                    </th>
                    <th
                      onClick={() => requestSort('action')}
                      className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group/h"
                    >
                      <div className="flex items-center justify-center gap-2">
                        Operação
                        <i className={`fas fa-sort text-[8px] transition-opacity ${sortConfig.key === 'action' ? 'opacity-100 text-brand' : 'opacity-30 group-hover/h:opacity-100'}`}></i>
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">Transação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {filteredLogs.map((log) => {
                    if (!log) return null;
                    const config = ACTION_CONFIG[log.action] || DEFAULT_ACTION;
                    const { d, t } = formatDate(log.timestamp);

                    return (
                      <tr key={log.id || Math.random().toString()} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="text-xs font-black text-slate-800 dark:text-white tracking-tight">{d}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t}h</div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-black border border-slate-200 dark:border-slate-600 group-hover:bg-white dark:group-hover:bg-slate-600 transition-all shadow-sm">
                              {log.userName?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[140px]">{log.userName || 'Sistema'}</p>
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter truncate max-w-[140px]">{log.userEmail || 'auto-gen'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-current bg-opacity-10 transition-transform group-hover:scale-105 ${config.color}`}>
                            <i className={`fas ${config.icon} text-[8px]`}></i>
                            {config.label}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-start gap-2">
                            <span className="text-slate-200 mt-1"><i className="fas fa-angle-right"></i></span>
                            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                              {log.details || 'Evento processado com sucesso.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <footer className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 shrink-0 flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Exibindo {filteredLogs.length} eventos</span>
              <span className="text-[9px] font-black text-brand uppercase tracking-widest">Innova4Up Security Module</span>
            </footer>
          </div>
        )
      ) : (
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col min-h-0">
          <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-white dark:bg-slate-800">
                <tr className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">Usuário</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">E-mail</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-center">{t('lgpd_consent_status')}</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-right">Data do Aceite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-[10px] font-black">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white tracking-tight">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{u.email}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${u.lgpdConsent ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-amber-100 text-amber-600 border border-amber-200'}`}>
                        {u.lgpdConsent ? t('lgpd_accepted') : t('lgpd_pending')}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right whitespace-nowrap">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        {u.lgpdConsentDate ? new Date(u.lgpdConsentDate).toLocaleString('pt-BR') : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 shrink-0 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                {users.filter(u => u.lgpdConsent).length} {t('lgpd_accepted')}
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                {users.filter(u => !u.lgpdConsent).length} {t('lgpd_pending')}
              </span>
            </div>
            <span>Innova4Up Compliance Engine</span>
          </footer>
        </div>
      )}

      <BaseModal isOpen={isPurgeModalOpen} onClose={() => setIsPurgeModalOpen(false)} maxWidth="max-w-sm">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm border border-rose-100 dark:border-rose-900/50">
              <i className="fas fa-trash-alt"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Expurgar Auditoria</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium px-4">Esta ação é definitiva e removerá os dados do banco local e na nuvem.</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-white/5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">Período de Corte</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {filterStartDate ? formatDate(new Date(filterStartDate).getTime()).d : 'Início'}
                {' '} — {' '}
                {filterEndDate ? formatDate(new Date(filterEndDate).getTime()).d : 'Hoje'}
              </p>
            </div>

            <div className="space-y-1.5 px-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5 block">Categorização</label>
              <select
                value={purgeAction}
                onChange={e => setPurgeAction(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all appearance-none cursor-pointer"
              >
                <option value="all">Todas as Operações</option>
                {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsPurgeModalOpen(false)}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handlePurgeLogs}
              disabled={isPurging}
              className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 dark:shadow-rose-900/20 active:scale-95 disabled:opacity-50"
            >
              {isPurging ? 'Processando...' : 'Expurgar Agora'}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default ActivityLogsView;
