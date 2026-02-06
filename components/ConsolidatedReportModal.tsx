
import React, { useState } from 'react';
import { Project, Task, Company } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { applyProfessionalHeader, applyProfessionalFooter, generateIntegrityHash, generateQRCode } from '../pdfUtils';
import BaseModal from './BaseModal';

interface ConsolidatedReportModalProps {
  projects: Project[];
  tasks: Task[];
  companies: Company[];
  currentCompany: Company | null;
  onClose: () => void;
}

const ConsolidatedReportModal: React.FC<ConsolidatedReportModalProps> = ({ projects, tasks, companies, currentCompany, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const stats = {
    totalBudget: projects.reduce((sum, p) => sum + (p.totalBudget || 0), 0),
    totalAllocated: tasks.reduce((sum, t) => sum + (t.budget || 0), 0),
    avgCompletion: projects.length > 0
      ? Math.round(projects.reduce((acc, p) => {
        const pTasks = tasks.filter(t => t.projectId === p.id);
        if (pTasks.length === 0) return acc;
        return acc + (pTasks.filter(t => t.status === 'Concluído').length / pTasks.length) * 100;
      }, 0) / projects.length)
      : 0
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const reportCompany = currentCompany || (companies.length > 0 ? companies[0] : null);

      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text('Resumo Executivo do Portfólio', 14, 45);

      const kpiY = 55;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Investimento Global:', 14, kpiY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(formatCurrency(stats.totalBudget), 14, kpiY + 6);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Total Alocado em Ações:', 80, kpiY);
      doc.setTextColor(0, 113, 227);
      doc.setFontSize(11);
      doc.text(formatCurrency(stats.totalAllocated), 80, kpiY + 6);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Progresso Médio:', 150, kpiY);
      doc.setTextColor(52, 199, 89);
      doc.setFontSize(11);
      doc.text(`${stats.avgCompletion}%`, 150, kpiY + 6);

      const tableData = projects.map(p => {
        const pTasks = tasks.filter(t => t.projectId === p.id);
        const comp = pTasks.length > 0
          ? Math.round((pTasks.filter(t => t.status === 'Concluído').length / pTasks.length) * 100)
          : 0;
        const company = companies.find(c => c.id === p.companyId)?.name || 'N/A';

        return [
          p.name,
          company,
          `${comp}%`,
          formatCurrency(p.totalBudget || 0),
          pTasks.length.toString()
        ];
      });

      (doc as any).autoTable({
        startY: 75,
        margin: { top: 35 },
        head: [['Projeto', 'Unidade', 'Execução', 'Investimento', 'Ações']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 113, 227], fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
          2: { halign: 'center' },
          3: { halign: 'right' },
          4: { halign: 'center' }
        }
      });

      const reportTitle = 'Relatório Consolidado de Portfólio';
      const hashData = `${reportTitle}-${reportCompany?.id || 'system'}-${new Date().getTime()}-${projects.length}`;
      const hash = await generateIntegrityHash(hashData);
      const qrCode = await generateQRCode(hash);

      applyProfessionalHeader(doc, reportTitle, reportCompany);
      applyProfessionalFooter(doc, hash, qrCode);

      doc.save(`Portfólio_Consolidado_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} maxWidth="max-w-4xl">
      <div className="h-[85vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900">

        {/* Header do Modal Otimizado */}
        <header className="px-10 py-10 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/50">
          <div className="flex items-center gap-6">
            {currentCompany?.logoData && (
              <div className="h-16 w-auto min-w-[64px] max-w-[180px] px-3 bg-white border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                <img src={currentCompany.logoData} className="max-w-full max-h-full object-contain p-2" alt="Logo" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-1 bg-indigo-500 rounded-full" />
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Insights Estratégicos</span>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Portfólio de Iniciativas</h3>
              <p className="text-sm text-slate-400 font-bold mt-1">Consolidação de dados operacionais e financeiros das unidades.</p>
            </div>
          </div>
        </header>

        {/* Conteúdo com Scroll Inteligente */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar bg-white dark:bg-slate-950">

          {/* Dashboard Interno */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-[32px] hover:scale-[1.02] transition-transform">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Projetos Ativos</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-slate-900 dark:text-white">{projects.length}</span>
                <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Unidades</span>
              </div>
            </div>

            <div className="p-8 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100/30 dark:border-indigo-500/10 rounded-[32px] hover:scale-[1.02] transition-transform">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Ações Totais</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-indigo-600 dark:text-indigo-400">{tasks.length}</span>
                <span className="text-[10px] font-bold text-indigo-400 mb-2 uppercase">Tarefas</span>
              </div>
            </div>

            <div className="p-8 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100/30 dark:border-emerald-500/10 rounded-[32px] hover:scale-[1.02] transition-transform">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Média Execução</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-emerald-600 dark:text-emerald-400">{stats.avgCompletion}%</span>
                <span className="text-[10px] font-bold text-emerald-400 mb-2 uppercase">Concluído</span>
              </div>
            </div>
          </div>

          {/* Listagem de Projetos */}
          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-[40px] p-8 border border-slate-100 dark:border-white/5">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <i className="fas fa-list-ul text-indigo-500"></i> Detalhamento de Portfólio
            </h4>
            <div className="grid grid-cols-1 gap-4">
              {projects.map(p => {
                const pTasks = tasks.filter(t => t.projectId === p.id);
                const comp = pTasks.length > 0 ? Math.round((pTasks.filter(t => t.status === 'Concluído').length / pTasks.length) * 100) : 0;
                return (
                  <div key={p.id} className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:shadow-lg transition-all">
                    <div>
                      <p className="font-black text-slate-800 dark:text-white mb-1 group-hover:text-indigo-500 transition-colors uppercase text-xs tracking-tight">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatCurrency(p.totalBudget || 0)} investidos</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className={`text-xl font-black ${comp > 70 ? 'text-emerald-500' : 'text-indigo-600'}`}>{comp}%</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Execução</p>
                      </div>
                      <div className="w-1.5 h-10 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex flex-col justify-end">
                        <div
                          className={`w-full transition-all duration-1000 ${comp > 70 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ height: `${comp}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer de Ação Otimizado */}
        <footer className="p-10 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 text-slate-300">
            <i className="fas fa-shield-alt text-xl"></i>
            <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">Relatório assinado digitalmente<br />Auditoria de integridade Innova4Up</p>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <button onClick={onClose} className="flex-1 sm:flex-none px-10 py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-white dark:hover:bg-slate-700 transition-all">Cancelar</button>
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="flex-1 sm:flex-none px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
              {isGenerating ? 'Processando...' : 'Exportar Relatório'}
            </button>
          </div>
        </footer>
      </div>
    </BaseModal>
  );
};

export default ConsolidatedReportModal;
