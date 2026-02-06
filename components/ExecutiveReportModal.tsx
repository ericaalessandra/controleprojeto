
import React, { useState } from 'react';
import { Project, Task, TaskStatus, Company } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { applyProfessionalHeader, applyProfessionalFooter, generateIntegrityHash, generateQRCode } from '../pdfUtils';
import BaseModal from './BaseModal';

interface ExecutiveReportModalProps {
  project: Project;
  tasks: Task[];
  company: Company | null;
  onClose: () => void;
}

const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({ project, tasks, company, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalAllocated = tasks.reduce((sum, task) => sum + (task.budget || 0), 0);
  const completionRate = tasks.length > 0
    ? Math.round((tasks.filter(t => t.status === TaskStatus.COMPLETED).length / tasks.length) * 100)
    : 0;

  const getObjectiveStatus = (deadline?: string) => {
    if (!deadline) return { colorClass: 'text-slate-400', pdfColor: [100, 100, 100] as [number, number, number], label: 'Sem prazo' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = deadline.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { colorClass: 'text-rose-500', pdfColor: [225, 29, 72] as [number, number, number], label: 'Atrasado' };
    } else if (diffDays <= 2) {
      return { colorClass: 'text-amber-500', pdfColor: [245, 158, 11] as [number, number, number], label: 'Vence em breve' };
    } else {
      return { colorClass: 'text-indigo-500', pdfColor: [79, 70, 229] as [number, number, number], label: 'No prazo' };
    }
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(33, 33, 33);
      doc.text(project.name, 14, 40);

      doc.setFontSize(12);
      doc.setTextColor(0, 113, 227);
      doc.text('Resumo Executivo', 14, 50);

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Orçamento Planejado: ${formatCurrency(project.totalBudget || 0)}`, 14, 58);
      doc.text(`Total Alocado em Ações: ${formatCurrency(totalAllocated)}`, 14, 64);
      doc.text(`Progresso Físico: ${completionRate}%`, 14, 70);
      doc.text(`Total de Ações Cadastradas: ${tasks.length}`, 14, 76);

      let currentY = 90;
      if (project.objectives && project.objectives.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 113, 227);
        doc.text('Objetivos e Metas Estratégicas:', 14, currentY);
        currentY += 10;

        project.objectives.forEach(obj => {
          const status = getObjectiveStatus(obj.deadline);
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50);
          const splitText = doc.splitTextToSize(`• ${obj.description}`, 170);
          doc.text(splitText, 14, currentY);
          currentY += (splitText.length * 5);

          doc.setFontSize(9);
          const [r, g, b] = status.pdfColor;
          doc.setTextColor(r, g, b);
          doc.text(`  Prazo: ${obj.deadline || 'N/D'} - Status: ${status.label}`, 14, currentY);
          currentY += 8;

          if (currentY > 260) {
            doc.addPage();
            currentY = 30;
          }
        });
      }

      const tableData = tasks.map(t => [
        t.title,
        t.status,
        `${t.startDate || ''} - ${t.endDate || ''}`,
        formatCurrency(t.budget || 0),
        t.involved.join(', ') || 'N/D'
      ]);

      (doc as any).autoTable({
        startY: currentY + 10,
        margin: { top: 35 },
        head: [['Ação', 'Status', 'Período', 'Custo', 'Responsáveis']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 113, 227], fontSize: 10 },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 50 }
        }
      });

      const reportTitle = 'Relatório Executivo de Projeto';
      const hashData = `${reportTitle}-${project.id}-${new Date().getTime()}-${tasks.length}`;
      const hash = await generateIntegrityHash(hashData);
      const qrCode = await generateQRCode(hash);


      // --- LOGO DO PROJETO NO CORPO (LADO DIREITO) ---
      if (project.logoData) {
        try {
          const logoData = project.logoData;
          const header = logoData.split(',')[0].toLowerCase();
          let format: 'PNG' | 'JPEG' | 'WEBP' = 'PNG';
          if (header.includes('image/jpeg') || header.includes('image/jpg')) format = 'JPEG';
          else if (header.includes('image/webp')) format = 'WEBP';

          let oW = 100, oH = 100;
          try {
            const imgProps = doc.getImageProperties(logoData);
            oW = imgProps.width || 100;
            oH = imgProps.height || 100;
          } catch (err) { }

          const ratio = oW / oH;

          // Definir área disponível no canto direito
          // x = 140, y = 40 (mesma altura do título)
          const maxW = 50;
          const maxH = 30;

          let finalW, finalH;
          if (ratio > maxW / maxH) {
            finalW = maxW;
            finalH = maxW / ratio;
          } else {
            finalH = maxH;
            finalW = maxH * ratio;
          }

          const renderFormat = (format === 'WEBP') ? 'PNG' : format;
          doc.addImage(logoData, renderFormat, 145, 40, finalW, finalH, undefined, 'SLOW');
        } catch (e) {
          console.error("Project Logo Render Error:", e);
        }
      }

      applyProfessionalHeader(doc, reportTitle, company); // Removemos o 4º argumento (logo do projeto no header)
      applyProfessionalFooter(doc, hash, qrCode);

      doc.save(`Relatorio_${project.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} maxWidth="max-w-5xl">
      <div className="h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900">

        {/* Header Executive */}
        <header className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-6">
            {company?.logoData && (
              <div className="h-14 w-auto min-w-[56px] max-w-[160px] px-3 bg-white border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                <img src={company.logoData} className="max-w-full max-h-full object-contain p-2" alt="Logo" />
              </div>
            )}
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] block">Governança Corporativa</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Painel de Execução Estratégica</h3>
            </div>
          </div>
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="px-8 py-3 bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl transition-all active-scale flex items-center gap-3"
          >
            {isGenerating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
            {isGenerating ? 'Processando...' : 'Exportar PDF'}
          </button>
        </header>

        {/* Relatório Dinâmico */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white dark:bg-slate-950">

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex items-start gap-6">
              {project.logoData && (
                <div className="w-24 h-24 shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/10 p-2 shadow-sm flex items-center justify-center">
                  <img src={project.logoData} alt={project.name} className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div className="space-y-4">
                <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{project.name}</h4>
                <p className="text-base text-slate-400 font-bold leading-relaxed">{project.description}</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-inner space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Taxa de Conclusão</span>
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{completionRate}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-1000 ease-out-expo" style={{ width: `${completionRate}%` }}></div>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 dark:border-white/10">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ações Totais</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{tasks.length}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Entregas</p>
                  <p className="text-xl font-black text-emerald-500">{tasks.filter(t => t.status === TaskStatus.COMPLETED).length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financeiro Corporativo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-white/5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Budget Reservado</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(project.totalBudget || 0)}</p>
            </div>
            <div className="p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-[32px] border border-indigo-100 dark:border-indigo-500/10">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Alocação Atual</p>
              <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{formatCurrency(totalAllocated)}</p>
            </div>
            <div className="p-8 bg-emerald-50 dark:bg-emerald-900/10 rounded-[32px] border border-emerald-100 dark:border-emerald-500/10">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Recurso Disponível</p>
              <p className={`text-3xl font-black tracking-tight ${(project.totalBudget || 0) - totalAllocated >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {formatCurrency((project.totalBudget || 0) - totalAllocated)}
              </p>
            </div>
          </div>

          {/* Metas Proativas */}
          {project.objectives && project.objectives.length > 0 && (
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Marcos de Sucesso</h5>
                <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {project.objectives.map((obj, i) => {
                  const status = getObjectiveStatus(obj.deadline);
                  return (
                    <div key={obj.id} className="p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[32px] flex items-start gap-6 hover:shadow-xl transition-all group">
                      <span className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs flex items-center justify-center font-black shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-base font-black text-slate-800 dark:text-slate-200 leading-snug tracking-tight mb-4">{obj.description}</p>
                        {obj.deadline && (
                          <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 ${status.colorClass}`}>
                            <i className="far fa-clock"></i> Prazo: {obj.deadline}
                            <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                            {status.label}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Ledger de Atividades */}
          <section className="space-y-8 pb-10">
            <div className="flex items-center gap-4">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Auditoria de Ações</h5>
              <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-inner overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/40 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividade Auditada</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ciclo</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valoração</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {tasks.map(task => (
                    <tr key={task.id} className="hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight line-clamp-1">{task.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 line-clamp-1">{task.description}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${task.status === TaskStatus.COMPLETED ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 border-emerald-100 dark:border-emerald-500/20' :
                          task.status === TaskStatus.EXECUTION ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 border-amber-100 dark:border-amber-500/20' :
                            task.status === TaskStatus.CANCELLED ? 'bg-rose-50 dark:bg-rose-900/10 text-rose-600 border-rose-100 dark:border-rose-500/20' :
                              'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 border-indigo-100 dark:border-indigo-500/20'
                          }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-widest whitespace-nowrap">
                          {task.startDate || 'N/D'} <i className="fas fa-chevron-right mx-2 text-[8px] opacity-30"></i> {task.endDate || 'N/D'}
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-indigo-400">{formatCurrency(task.budget || 0)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </BaseModal>
  );
};

export default ExecutiveReportModal;
