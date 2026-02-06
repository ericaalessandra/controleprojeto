
import React, { useState, useMemo } from 'react';
import { Project, Task, Company, TaskStatus } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { applyProfessionalHeader, applyProfessionalFooter, generateIntegrityHash, generateQRCode } from '../pdfUtils';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface ReportsViewProps {
    projects: Project[];
    tasks: Task[];
    companies: Company[];
    currentCompany: Company | null;
}

type TabType = 'overview' | 'accountability' | 'consultation' | 'project_consolidated';

const STATUS_COLORS = {
    [TaskStatus.PLANNING]: '#3b82f6',  // Blue
    [TaskStatus.EXECUTION]: '#f59e0b', // Amber
    [TaskStatus.COMPLETED]: '#10b981', // Emerald
    [TaskStatus.CANCELLED]: '#ef4444'  // Rose
};

// Cores para o gráfico de pizza de gastos
const CHART_COLORS = ['#0071e3', '#34d399', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold font-sans">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const isDateLate = (dateString?: string, status?: string) => {
    if (!dateString || status === TaskStatus.COMPLETED || status === TaskStatus.CANCELLED) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateString < today;
};

// Helper simples para verificar se uma data é passada (usado para projetos e tarefas)
const isPastDate = (dateString?: string) => {
    if (!dateString) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateString < today;
};

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case TaskStatus.COMPLETED: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case TaskStatus.EXECUTION: return 'bg-amber-50 text-amber-600 border-amber-100';
        case TaskStatus.CANCELLED: return 'bg-rose-50 text-rose-600 border-rose-100';
        default: return 'bg-blue-50 text-blue-600 border-blue-100'; // Planning
    }
};

const CustomLegend = ({ data }: { data: { name: string; count?: number; value?: number }[] }) => {
    return (
        <div className="flex flex-wrap justify-center gap-3 mt-4 pt-3 border-t border-slate-50 w-full">
            {data.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <span
                        className="w-2.5 h-2.5 rounded-full shadow-sm"
                        style={{ backgroundColor: STATUS_COLORS[entry.name as TaskStatus] || CHART_COLORS[0] }} // Fallback color
                    ></span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                        {entry.name} <span className="text-slate-400">({entry.count !== undefined ? entry.count : entry.value})</span>
                    </span>
                </div>
            ))}
        </div>
    );
};

const ReportsView: React.FC<ReportsViewProps> = ({ projects, tasks, companies, currentCompany }) => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Filtros Gerais
    const [filterProjectId, setFilterProjectId] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    // Filtros Específicos para Consolidado por Projeto
    const [selectedProjectReportId, setSelectedProjectReportId] = useState<string>('');

    // Estado para loading do PDF
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Estado para seleção de projetos (Prestação de Contas)
    const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

    // Funções de seleção de projetos
    const toggleProjectSelection = (projectId: string) => {
        setSelectedProjectIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(projectId)) {
                newSet.delete(projectId);
            } else {
                newSet.add(projectId);
            }
            return newSet;
        });
    };

    const selectAllProjects = () => {
        setSelectedProjectIds(new Set(filteredData.flat.map(item => item.project.id)));
    };

    const deselectAllProjects = () => {
        setSelectedProjectIds(new Set());
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('pt-BR');
    };

    // 🆕 Função para Exportar PDF do Consolidado por Projeto
    const handleExportConsolidatedPDF = async () => {
        if (!consolidatedProjectData) return;

        setIsGeneratingPDF(true);
        try {
            const doc = new jsPDF();

            // Buscar a empresa do projeto (não a empresa do usuário atual)
            const projectCompany = companies.find(c => c.id === consolidatedProjectData.project.companyId) || null;

            // Título mais curto para o header
            const headerTitle = 'Relatório Consolidado';
            await applyProfessionalHeader(doc, headerTitle, projectCompany);

            // Título completo do relatório (com quebra de linha se necessário)
            doc.setFontSize(14);
            doc.setTextColor(33, 33, 33);
            const fullTitle = `Relatório Consolidado: ${consolidatedProjectData.project.name}`;
            const splitTitle = doc.splitTextToSize(fullTitle, 180);
            doc.text(splitTitle, 14, 45);

            // Período do Relatório (ajustar posição Y se título quebrou linha)
            const titleHeight = splitTitle.length * 7;
            const periodY = 45 + titleHeight + 2;
            if (filterStartDate || filterEndDate) {
                doc.setFontSize(9);
                doc.setTextColor(120, 120, 120);
                const periodo = `Período: ${filterStartDate ? formatDate(filterStartDate) : 'Início'} até ${filterEndDate ? formatDate(filterEndDate) : 'Atual'}`;
                doc.text(periodo, 14, periodY);
            }

            // KPIs (linha única) - ajustar baseado no título e período
            const kpiY = filterStartDate || filterEndDate ? periodY + 8 : 45 + titleHeight + 5;
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('Investimento Total:', 14, kpiY);
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.text(formatCurrency(consolidatedProjectData.stats.totalBudget), 14, kpiY + 6);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('Orçamento Alocado:', 70, kpiY);
            doc.setTextColor(0, 113, 227);
            doc.setFontSize(11);
            doc.text(formatCurrency(consolidatedProjectData.stats.allocatedBudget), 70, kpiY + 6);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('Progresso:', 135, kpiY);
            doc.setTextColor(52, 199, 89);
            doc.setFontSize(11);
            doc.text(`${consolidatedProjectData.stats.completionRate}%`, 135, kpiY + 6);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('Dias Restantes:', 170, kpiY);
            if (consolidatedProjectData.stats.daysRemaining < 0) {
                doc.setTextColor(239, 68, 68);
            } else {
                doc.setTextColor(120, 120, 120);
            }
            doc.setFontSize(11);
            doc.text(
                consolidatedProjectData.stats.daysRemaining < 0
                    ? `${Math.abs(consolidatedProjectData.stats.daysRemaining)} (atraso)`
                    : consolidatedProjectData.stats.daysRemaining.toString(),
                170,
                kpiY + 6
            );

            // --- GRÁFICOS VISUAIS ---
            const chartsY = kpiY + 15;

            // 1. Gráfico de Saúde Financeira (Pizza/Donut) - Esquerda
            doc.setFontSize(10);
            doc.setTextColor(33, 33, 33);
            doc.text('Saúde Financeira', 14, chartsY);

            const financialData = consolidatedProjectData.charts.financial;
            const totalVal = financialData.reduce((acc, cur) => acc + cur.value, 0);

            let startAngle = 0;
            const pieX = 40;
            const pieY = chartsY + 25;
            const radius = 18;

            // Cores: Alocado (Azul), Disponível (Verde)
            const finColors = ['#0071e3', '#10b981'];

            if (totalVal > 0) {
                financialData.forEach((entry, index) => {
                    const angle = (entry.value / totalVal) * 2 * Math.PI;
                    doc.setFillColor(finColors[index]);

                    // Desenhar fatia com múltiplos triângulos para suavidade
                    const segments = Math.max(2, Math.floor(angle * 10)); // Mais segmentos para ângulos maiores
                    const segmentAngle = angle / segments;

                    for (let i = 0; i < segments; i++) {
                        const a1 = startAngle + (i * segmentAngle);
                        const a2 = startAngle + ((i + 1) * segmentAngle);

                        const x1 = pieX + radius * Math.cos(a1);
                        const y1 = pieY + radius * Math.sin(a1);
                        const x2 = pieX + radius * Math.cos(a2);
                        const y2 = pieY + radius * Math.sin(a2);

                        doc.triangle(pieX, pieY, x1, y1, x2, y2, 'F');
                    }
                    startAngle += angle;
                });

                // Buraco do Donut (Círculo Branco no meio)
                doc.setFillColor(255, 255, 255);
                doc.circle(pieX, pieY, radius * 0.6, 'F');

                // Texto Total no Meio
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Total', pieX, pieY - 2, { align: 'center' });
                doc.setFontSize(9);
                doc.setTextColor(33, 33, 33);
                doc.text(formatCurrency(totalVal), pieX, pieY + 3, { align: 'center' }); // Simplificado para caber
            }

            // Legenda Financeira
            doc.setFontSize(8);
            let legY = chartsY + 50;
            financialData.forEach((entry, index) => {
                doc.setFillColor(finColors[index]);
                doc.rect(14, legY - 3, 3, 3, 'F');
                doc.setTextColor(60, 60, 60);
                doc.text(`${entry.name}: ${formatCurrency(entry.value)}`, 20, legY);
                legY += 5;
            });


            // 2. Gráfico de Status das Ações (Barras) - Direita
            const barChartX = 100;
            doc.setFontSize(10);
            doc.setTextColor(33, 33, 33);
            doc.text('Status das Ações', barChartX, chartsY);

            const statusData = consolidatedProjectData.charts.status;
            const maxVal = Math.max(...statusData.map(d => d.count)) || 1;
            const barWidth = 10;
            const maxBarHeight = 35;
            let currentBarX = barChartX;

            // Linha base
            doc.setDrawColor(200, 200, 200);
            doc.line(barChartX, chartsY + 45, barChartX + 90, chartsY + 45);

            statusData.forEach((entry) => {
                if (entry.count > 0) {
                    const barHeight = (entry.count / maxVal) * maxBarHeight;
                    const color = STATUS_COLORS[entry.name as TaskStatus] || '#cbd5e1';

                    // Converter cor hex para RGB para o jspdf (simplificado, assumindo hex)
                    // ... ou usar setFillColor(cor) se o jspdf suportar hex (versões recentes suportam)
                    doc.setFillColor(color);

                    // Barra
                    doc.rect(currentBarX, chartsY + 45 - barHeight, barWidth, barHeight, 'F');

                    // Valor em cima da barra
                    doc.setFontSize(8);
                    doc.setTextColor(60, 60, 60);
                    doc.text(entry.count.toString(), currentBarX + barWidth / 2, chartsY + 45 - barHeight - 2, { align: 'center' });

                    // Label embaixo (abreviado se necessário)
                    doc.setFontSize(6); // Pequeno para caber
                    const label = entry.name.length > 8 ? entry.name.substring(0, 6) + '..' : entry.name;
                    doc.text(label, currentBarX + barWidth / 2, chartsY + 49, { align: 'center' });
                }
                currentBarX += 14; // Espaçamento
            });

            // Ajustar o início da tabela para depois dos gráficos
            const tableStartY = Math.max(legY, chartsY + 60) + 10;
            // Tabela de Ações
            const tableData = consolidatedProjectData.tasks.map(t => {
                const late = isDateLate(t.endDate, t.status);
                return [
                    t.title,
                    t.goal || '-',
                    t.status,
                    `${formatDate(t.startDate)} - ${formatDate(t.endDate)}`,
                    t.involved && t.involved.length > 0 ? t.involved.join(', ') : '-',
                    t.targetAudience || '-',
                    formatCurrency(t.budget || 0)
                ];
            });

            (doc as any).autoTable({
                startY: tableStartY,
                margin: { top: 35 },
                head: [['Ação', 'Objetivo', 'Status', 'Cronograma', 'Responsáveis', 'Público-Alvo', 'Custo']],
                body: tableData,
                foot: [[{ content: 'Custo Total:', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 245, 247], textColor: [0, 0, 0] } }, { content: formatCurrency(consolidatedProjectData.stats.allocatedBudget), styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 113, 227], fillColor: [245, 245, 247] } }]],
                theme: 'striped',
                headStyles: { fillColor: [0, 113, 227], fontSize: 9, fontStyle: 'bold' },
                footStyles: { fillColor: [245, 245, 247], fontSize: 10, fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 32 },
                    1: { cellWidth: 28 },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 28, fontSize: 7 },
                    4: { cellWidth: 24 },
                    5: { cellWidth: 24 },
                    6: { cellWidth: 28, halign: 'right' }
                }
            });

            // Rodapé profissional
            const hashData = `Consolidado-${consolidatedProjectData.project.id}-${new Date().getTime()}-${consolidatedProjectData.tasks.length}`;
            const hash = await generateIntegrityHash(hashData);
            const qrCode = await generateQRCode(hash);
            applyProfessionalFooter(doc, hash, qrCode);

            // Download
            doc.save(`Relatorio_Consolidado_${consolidatedProjectData.project.name.replace(/\s/g, '_')}.pdf`);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Falha ao gerar relatório PDF.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    // ⚠️ ANTIGA função simples (DEPREC ADA - manter para referência)
    const handleExportAccountabilityPDF_DEPRECATED = async () => {
        setIsGeneratingPDF(true);
        try {
            const doc = new jsPDF();

            // Título do relatório
            const headerTitle = 'Prestação de Contas por Projeto';

            // Buscar a empresa do primeiro projeto (ou atual)
            const firstCompany = filteredData.grouped.length > 0 ? filteredData.grouped[0].company : currentCompany;
            await applyProfessionalHeader(doc, headerTitle, firstCompany);

            // Título completo
            doc.setFontSize(14);
            doc.setTextColor(33, 33, 33);
            const fullTitle = 'Prestação de Contas por Projeto';
            doc.text(fullTitle, 14, 45);

            // Período do Relatório
            let currentY = 52;
            if (filterStartDate || filterEndDate) {
                doc.setFontSize(9);
                doc.setTextColor(120, 120, 120);
                const periodo = `Período: ${filterStartDate ? formatDate(filterStartDate) : 'Início'} até ${filterEndDate ? formatDate(filterEndDate) : 'Atual'}`;
                doc.text(periodo, 14, currentY);
                currentY += 10;
            } else {
                currentY += 5;
            }

            // Criar dados da tabela agrupados por empresa
            const tableData: any[] = [];
            filteredData.grouped.forEach(({ company, projects }) => {
                // Linha de cabeçalho da empresa
                tableData.push([
                    { content: company.name.toUpperCase(), colSpan: 7, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [71, 85, 105] } }
                ]);

                // Adicionar projetos da empresa
                projects.forEach(({ project, tasks, tasksInPeriod, executedInPeriod }) => {
                    const comp = tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.status === 'Concluído').length / tasks.length) * 100) : 0;
                    const allInvolved = Array.from(new Set(tasks.flatMap((t: any) => t.involved))).slice(0, 3).join(', ');

                    tableData.push([
                        project.name,
                        `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`,
                        `${comp}%`,
                        tasksInPeriod.length.toString(),
                        executedInPeriod.toString(),
                        formatCurrency(project.totalBudget || 0),
                        allInvolved || '-'
                    ]);
                });
            });

            (doc as any).autoTable({
                startY: currentY,
                margin: { top: 35 },
                head: [['Projeto', 'Período', 'Progresso', 'Previstas', 'Executadas', 'Orçamento', 'Responsáveis']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [0, 113, 227], fontSize: 9, fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 40 },
                    1: { cellWidth: 32, fontSize: 7 },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 18, halign: 'center' },
                    4: { cellWidth: 20, halign: 'center' },
                    5: { cellWidth: 28, halign: 'right' },
                    6: { cellWidth: 28 }
                }
            });

            // Rodapé profissional
            const hashData = `Prestacao-Contas-${new Date().getTime()}-${tableData.length}`;
            const hash = await generateIntegrityHash(hashData);
            const qrCode = await generateQRCode(hash);
            applyProfessionalFooter(doc, hash, qrCode);

            // Download
            doc.save(`Prestacao_Contas_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Falha ao gerar relatório PDF.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };


    // Função DETALHADA para Exportação de PDF (com gráficos visuais)
    // Função DETALHADA para Exportação de PDF (Versão Visual Textual)
    const handleExportAccountabilityPDF = async () => {
        if (selectedProjectIds.size === 0) {
            alert('Selecione pelo menos um projeto para exportar.');
            return;
        }

        setIsGeneratingPDF(true);
        try {
            const doc = new jsPDF();
            const selectedProjects = filteredData.flat.filter(({ project }) => selectedProjectIds.has(project.id));

            for (let idx = 0; idx < selectedProjects.length; idx++) {
                const { project, tasks } = selectedProjects[idx];

                if (idx > 0) doc.addPage();

                const projectCompany = companies.find(c => c.id === project.companyId) || null;
                await applyProfessionalHeader(doc, 'Prestação de Contas', projectCompany);

                let currentY = 45;

                doc.setFontSize(16);
                doc.setTextColor(33, 33, 33);
                doc.text(project.name, 14, currentY);
                currentY += 7;

                if (project.description) {
                    doc.setFontSize(9);
                    doc.setTextColor(120, 120, 120);
                    const descLines = doc.splitTextToSize(project.description, 180);
                    doc.text(descLines, 14, currentY);
                    currentY += descLines.length * 4 + 5;
                }

                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(`Período: ${formatDate(project.startDate)} até ${formatDate(project.endDate)}`, 14, currentY);
                currentY += 8;

                const totalBudget = project.totalBudget || 0;
                const allocatedBudget = tasks.reduce((acc, t) => acc + (t.budget || 0), 0);
                const completedTasks = tasks.filter(t => t.status === 'Concluído').length;
                const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

                doc.setFillColor(245, 247, 250);
                doc.roundedRect(14, currentY, 180, 28, 3, 3, 'F');

                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Orçamento Total', 18, currentY + 5);
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                doc.text(formatCurrency(totalBudget), 18, currentY + 12);

                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Orçamento Alocado', 70, currentY + 5);
                doc.setFontSize(12);
                doc.setTextColor(0, 113, 227);
                doc.text(formatCurrency(allocatedBudget), 70, currentY + 12);

                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Progresso', 122, currentY + 5);
                doc.setFontSize(12);
                const progressColor = progressPercent >= 75 ? [16, 185, 129] : progressPercent >= 25 ? [251, 146, 60] : [100, 100, 100];
                doc.setTextColor(progressColor[0], progressColor[1], progressColor[2]);
                doc.text(`${progressPercent}%`, 122, currentY + 12);

                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Tarefas', 162, currentY + 5);
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                doc.text(`${completedTasks}/${tasks.length}`, 162, currentY + 12);

                currentY += 35;

                // --- Seção Visual Textual ---
                const colWidth = 85;
                const rightColX = 110;

                // Coluna 1: Distribuição por Status
                doc.setFontSize(10);
                doc.setTextColor(33, 43, 54);
                doc.setFont('helvetica', 'bold');
                doc.text('Distribuição por Status', 18, currentY);
                doc.setFont('helvetica', 'normal');

                doc.setDrawColor(226, 232, 240);
                doc.line(18, currentY + 2, 90, currentY + 2);

                let statsY = currentY + 10;
                const statusCounts: Record<string, number> = {};
                tasks.forEach(t => {
                    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
                });

                const statusColorsMap = {
                    'Planejamento': [148, 163, 184],
                    'Em Planejamento': [148, 163, 184],
                    'Em Execução': [251, 146, 60],
                    'Concluído': [16, 185, 129],
                    'Atrasado': [239, 68, 68],
                    'Cancelado': [203, 213, 225]
                };

                Object.entries(statusCounts).forEach(([status, count]) => {
                    const percentage = Math.round((count / tasks.length) * 100);
                    // @ts-ignore
                    const color = statusColorsMap[status] || [148, 163, 184];

                    // Badge Colorido
                    doc.setFillColor(color[0], color[1], color[2]);
                    doc.roundedRect(18, statsY - 3, 3, 10, 1, 1, 'F');

                    // Texto
                    doc.setFontSize(9);
                    doc.setTextColor(71, 85, 105);
                    doc.text(status, 25, statsY + 3);

                    // Valor
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${count}`, 85, statsY + 3, { align: 'right' });
                    doc.setFont('helvetica', 'normal');

                    // Barra de fundo cinza
                    doc.setFillColor(241, 245, 249);
                    doc.rect(25, statsY + 5, 60, 2, 'F');

                    // Barra de progresso colorida
                    doc.setFillColor(color[0], color[1], color[2]);
                    doc.rect(25, statsY + 5, 60 * (percentage / 100), 2, 'F');

                    statsY += 14;
                });

                // Coluna 2: Maiores Gastos (Top 5)
                doc.setFontSize(10);
                doc.setTextColor(33, 43, 54);
                doc.setFont('helvetica', 'bold');
                doc.text('Maiores Gastos por Ação', rightColX, currentY);
                doc.setFont('helvetica', 'normal');

                doc.setDrawColor(226, 232, 240);
                doc.line(rightColX, currentY + 2, rightColX + colWidth, currentY + 2);

                let expenseY = currentY + 10;
                const topExpenses = tasks
                    .filter(t => (t.budget || 0) > 0)
                    .sort((a, b) => (b.budget || 0) - (a.budget || 0))
                    .slice(0, 5);

                const maxExpense = topExpenses.length > 0 ? (topExpenses[0].budget || 0) : 1;

                if (topExpenses.length > 0) {
                    topExpenses.forEach(t => {
                        const budget = t.budget || 0;
                        const percentageOfMax = budget / maxExpense;

                        // Título truncado
                        doc.setFontSize(8);
                        doc.setTextColor(71, 85, 105);
                        const cleanTitle = t.title.length > 25 ? t.title.substring(0, 25) + '...' : t.title;
                        doc.text(cleanTitle, rightColX, expenseY);

                        // Valor
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(0, 113, 227); // Azul brand
                        doc.text(formatCurrency(budget), rightColX + colWidth, expenseY, { align: 'right' });
                        doc.setFont('helvetica', 'normal');

                        // Barra visual
                        doc.setFillColor(241, 245, 249);
                        doc.roundedRect(rightColX, expenseY + 2, colWidth, 4, 1, 1, 'F');

                        doc.setFillColor(0, 113, 227);
                        doc.roundedRect(rightColX, expenseY + 2, colWidth * percentageOfMax, 4, 1, 1, 'F');

                        expenseY += 12;
                    });
                } else {
                    doc.setFontSize(9);
                    doc.setTextColor(148, 163, 184);
                    doc.text('Nenhum gasto registrado.', rightColX, expenseY + 5);
                }

                // Ajustar Y para a tabela (pegar o maior Y das duas colunas)
                currentY = Math.max(statsY, expenseY) + 15;

                // Tabela de Tarefas
                const tableData = tasks.map(t => [
                    t.title,
                    t.objective || '-',
                    t.status,
                    `${formatDate(t.startDate)} - ${formatDate(t.endDate)}`,
                    t.involved && t.involved.length > 0 ? t.involved.slice(0, 2).join(', ') : '-',
                    formatCurrency(t.budget || 0)
                ]);

                (doc as any).autoTable({
                    startY: currentY,
                    margin: { top: 35, bottom: 20 },
                    head: [['Ação', 'Objetivo', 'Status', 'Período', 'Responsáveis', 'Custo']],
                    body: tableData,
                    foot: [[{ content: 'Total Alocado:', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', textColor: [50, 50, 50] } },
                    { content: formatCurrency(allocatedBudget), styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 113, 227] } }]],
                    theme: 'striped',
                    headStyles: { fillColor: [0, 113, 227], fontSize: 8, fontStyle: 'bold' },
                    footStyles: { fillColor: [245, 247, 250], fontSize: 9, fontStyle: 'bold' },
                    styles: { fontSize: 7, cellPadding: 2 },
                    columnStyles: {
                        0: { cellWidth: 40 },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 25, halign: 'center' },
                        3: { cellWidth: 30, fontSize: 6 },
                        4: { cellWidth: 25 },
                        5: { cellWidth: 32, halign: 'right' }
                    }
                });
            }

            const hashData = `Prestacao-Contas-Detalhada-${selectedProjectIds.size}-${new Date().getTime()}`;
            const hash = await generateIntegrityHash(hashData);
            const qrCode = await generateQRCode(hash);
            applyProfessionalFooter(doc, hash, qrCode);

            const filename = selectedProjects.length === 1
                ? `Prestacao_Contas_${selectedProjects[0].project.name.replace(/\s/g, '_')}.pdf`
                : `Prestacao_Contas_${selectedProjects.length}_Projetos.pdf`;
            doc.save(filename);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Falha ao gerar relatório PDF. Detalhes: ' + (error as Error).message);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleExportAccountabilityPDF_OLD = async () => {
        if (selectedProjectIds.size === 0) {
            alert('Selecione pelo menos um projeto para exportar.');
            return;
        }

        setIsGeneratingPDF(true);
        try {
            const doc = new jsPDF();
            const selectedProjects = filteredData.flat.filter(({ project }) => selectedProjectIds.has(project.id));

            for (let idx = 0; idx < selectedProjects.length; idx++) {
                const { project, tasks } = selectedProjects[idx];

                if (idx > 0) doc.addPage();

                const projectCompany = companies.find(c => c.id === project.companyId) || null;
                await applyProfessionalHeader(doc, 'Prestação de Contas', projectCompany);

                let currentY = 45;

                doc.setFontSize(16);
                doc.setTextColor(33, 33, 33);
                doc.text(project.name, 14, currentY);
                currentY += 7;

                if (project.description) {
                    doc.setFontSize(9);
                    doc.setTextColor(120, 120, 120);
                    const descLines = doc.splitTextToSize(project.description, 180);
                    doc.text(descLines, 14, currentY);
                    currentY += descLines.length * 4 + 5;
                }

                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(`Período: ${formatDate(project.startDate)} até ${formatDate(project.endDate)}`, 14, currentY);
                currentY += 8;

                const totalBudget = project.totalBudget || 0;
                const allocatedBudget = tasks.reduce((acc, t) => acc + (t.budget || 0), 0);
                const completedTasks = tasks.filter(t => t.status === 'Concluído').length;
                const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

                doc.setFillColor(245, 247, 250);
                doc.roundedRect(14, currentY, 180, 28, 3, 3, 'F');

                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Orçamento Total', 18, currentY + 5);
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                doc.text(formatCurrency(totalBudget), 18, currentY + 12);

                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Orçamento Alocado', 70, currentY + 5);
                doc.setFontSize(12);
                doc.setTextColor(0, 113, 227);
                doc.text(formatCurrency(allocatedBudget), 70, currentY + 12);

                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Progresso', 122, currentY + 5);
                doc.setFontSize(12);
                const progressColor = progressPercent >= 75 ? [16, 185, 129] : progressPercent >= 25 ? [251, 146, 60] : [100, 100, 100];
                doc.setTextColor(progressColor[0], progressColor[1], progressColor[2]);
                doc.text(`${progressPercent}%`, 122, currentY + 12);

                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Tarefas', 162, currentY + 5);
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                doc.text(`${completedTasks}/${tasks.length}`, 162, currentY + 12);

                currentY += 22;

                // Gráfico de Pizza - Distribuição por Status
                doc.setFontSize(10);
                doc.setTextColor(71, 85, 105);
                doc.text('Distribuição por Status:', 18, currentY);
                currentY += 8;

                const statusCounts: Record<string, number> = {};
                tasks.forEach(t => {
                    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
                });

                // Desenhar gráfico de pizza
                const pieX = 50;
                const pieY = currentY + 25;
                const radius = 20;
                let startAngle = 0;

                const statusColors: Record<string, [number, number, number]> = {
                    'Planejamento': [100, 116, 139],
                    'Em Planejamento': [100, 116, 139],
                    'Em Execução': [251, 146, 60],
                    'Concluído': [16, 185, 129],
                    'Atrasado': [239, 68, 68],
                    'Cancelado': [156, 163, 175]
                };

                // Desenhar cada fatia
                Object.entries(statusCounts).forEach(([status, count]) => {
                    const angle = (count / tasks.length) * 2 * Math.PI;
                    const color = statusColors[status] || [100, 100, 100];

                    doc.setFillColor(color[0], color[1], color[2]);

                    // Desenhar fatia (aproximação com polígono)
                    const segments = 20;
                    const segmentAngle = angle / segments;

                    for (let i = 0; i < segments; i++) {
                        const a1 = startAngle + (i * segmentAngle);
                        const a2 = startAngle + ((i + 1) * segmentAngle);

                        const x1 = pieX + radius * Math.cos(a1);
                        const y1 = pieY + radius * Math.sin(a1);
                        const x2 = pieX + radius * Math.cos(a2);
                        const y2 = pieY + radius * Math.sin(a2);

                        doc.triangle(pieX, pieY, x1, y1, x2, y2, 'F');
                    }

                    startAngle += angle;
                });

                // Legenda
                let legendY = currentY + 5;
                let legendIndex = 0;
                Object.entries(statusCounts).forEach(([status, count]) => {
                    const percentage = Math.round((count / tasks.length) * 100);
                    const color = statusColors[status] || [100, 100, 100];
                    const legendX = legendIndex % 2 === 0 ? 90 : 140;

                    // Quadrado de cor
                    doc.setFillColor(color[0], color[1], color[2]);
                    doc.rect(legendX, legendY - 2, 3, 3, 'F');

                    // Texto
                    doc.setFontSize(7);
                    doc.setTextColor(60, 60, 60);
                    doc.text(`${status}: ${count} (${percentage}%)`, legendX + 5, legendY);

                    if (legendIndex % 2 === 1) legendY += 5;
                    legendIndex++;
                });

                currentY += 55;

                const tableData = tasks.map(t => [
                    t.title,
                    t.objective || '-',
                    t.status,
                    `${formatDate(t.startDate)} - ${formatDate(t.endDate)}`,
                    t.involved && t.involved.length > 0 ? t.involved.slice(0, 2).join(', ') : '-',
                    formatCurrency(t.budget || 0)
                ]);

                (doc as any).autoTable({
                    startY: currentY,
                    margin: { top: 35, bottom: 20 },
                    head: [['Ação', 'Objetivo', 'Status', 'Período', 'Responsáveis', 'Custo']],
                    body: tableData,
                    foot: [[{ content: 'Total Alocado:', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: formatCurrency(allocatedBudget), styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 113, 227] } }]],
                    theme: 'striped',
                    headStyles: { fillColor: [0, 113, 227], fontSize: 8, fontStyle: 'bold' },
                    footStyles: { fillColor: [245, 247, 250], fontSize: 9, fontStyle: 'bold' },
                    styles: { fontSize: 7, cellPadding: 2 },
                    columnStyles: {
                        0: { cellWidth: 45 },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 25, halign: 'center' },
                        3: { cellWidth: 30, fontSize: 6 },
                        4: { cellWidth: 30 },
                        5: { cellWidth: 22, halign: 'right' }
                    }
                });
            }

            const hashData = `Prestacao-Contas-Detalhada-${selectedProjectIds.size}-${new Date().getTime()}`;
            const hash = await generateIntegrityHash(hashData);
            const qrCode = await generateQRCode(hash);
            applyProfessionalFooter(doc, hash, qrCode);

            const filename = selectedProjects.length === 1
                ? `Prestacao_Contas_${selectedProjects[0].project.name.replace(/\s/g, '_')}.pdf`
                : `Prestacao_Contas_${selectedProjects.length}_Projetos.pdf`;
            doc.save(filename);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Falha ao gerar relatório PDF.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    // --- Lógica para "Consolidado por Projeto" ---
    const consolidatedProjectData = useMemo(() => {
        if (!selectedProjectReportId) return null;

        const project = projects.find(p => p.id === selectedProjectReportId);
        if (!project) return null;

        let pTasks = tasks.filter(t => t.projectId === project.id);

        if (filterStartDate) {
            pTasks = pTasks.filter(t => t.startDate && t.startDate >= filterStartDate);
        }
        if (filterEndDate) {
            pTasks = pTasks.filter(t => t.endDate && t.endDate <= filterEndDate);
        }

        const totalBudget = project.totalBudget || 0;
        const allocatedBudget = pTasks.reduce((acc, t) => acc + (t.budget || 0), 0);
        const remainingBudget = Math.max(0, totalBudget - allocatedBudget);

        const financialChartData = [
            { name: 'Alocado', value: allocatedBudget },
            { name: 'Disponível', value: remainingBudget }
        ];

        const statusCounts = pTasks.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const statusChartData = Object.keys(STATUS_COLORS).map(status => ({
            name: status,
            count: statusCounts[status] || 0
        }));

        const today = new Date().toISOString().split('T')[0];
        const daysRemaining = project.endDate
            ? Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        const overdueTasks = pTasks.filter(t => t.endDate && t.endDate < today && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED).length;

        return {
            project,
            tasks: pTasks,
            stats: {
                totalBudget,
                allocatedBudget,
                remainingBudget,
                completionRate: pTasks.length > 0
                    ? Math.round((pTasks.filter(t => t.status === TaskStatus.COMPLETED).length / pTasks.length) * 100)
                    : 0,
                daysRemaining,
                overdueTasks
            },
            charts: {
                financial: financialChartData,
                status: statusChartData
            }
        };
    }, [projects, tasks, selectedProjectReportId, filterStartDate, filterEndDate]);


    // Lógica de Filtragem Centralizada
    const filteredData = useMemo(() => {
        let filteredProjs = projects;
        let filteredTasks = tasks;

        if (filterProjectId) {
            filteredProjs = filteredProjs.filter(p => p.id === filterProjectId);
        }

        const tasksInDateRange = filteredTasks.filter(t => {
            let valid = true;
            if (filterStartDate) valid = valid && (t.startDate || '') >= filterStartDate;
            if (filterEndDate) valid = valid && (t.endDate || '') <= filterEndDate;
            if (filterStatus !== 'all') valid = valid && t.status === filterStatus;
            return valid;
        });

        const groupedByCompany = new Map<string, { company: Company, projects: any[] }>();

        companies.forEach(c => {
            groupedByCompany.set(c.id, { company: c, projects: [] });
        });

        filteredProjs.forEach(p => {
            const pTasks = tasks.filter(t => t.projectId === p.id);
            const pTasksFiltered = tasksInDateRange.filter(t => t.projectId === p.id);

            const data = {
                project: p,
                tasks: pTasks,
                tasksInPeriod: pTasksFiltered,
                executedInPeriod: pTasksFiltered.filter(t => t.status === TaskStatus.COMPLETED).length
            };

            const group = groupedByCompany.get(p.companyId);
            if (group) {
                group.projects.push(data);
            }
        });

        const flatProjectsWithTasks = filteredProjs.map(p => {
            const pTasks = tasksInDateRange.filter(t => t.projectId === p.id);
            return { project: p, tasks: pTasks };
        }).filter(item => {
            if (filterStatus !== 'all') return item.tasks.length > 0;
            return true;
        });

        return {
            flat: flatProjectsWithTasks,
            grouped: Array.from(groupedByCompany.values()).filter(g => g.projects.length > 0)
        };
    }, [projects, tasks, companies, filterProjectId, filterStatus, filterStartDate, filterEndDate]);

    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#f5f5f7] font-sans">

            {/* Header com Seletor de Relatório */}
            <header className="px-8 py-6 border-b border-slate-200 bg-white dark:bg-slate-900 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 shadow-sm">
                <div className="flex items-center gap-6">
                    {currentCompany?.logoData && (
                        <div className="h-12 md:h-16 w-auto min-w-[64px] max-w-[200px] px-3 bg-white border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-center shrink-0 overflow-hidden transition-all">
                            <img src={currentCompany.logoData} className="max-w-full max-h-full object-contain p-2" alt="Logo" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">Central de Inteligência</h2>
                        <p className="text-sm text-[#86868b] dark:text-slate-400 mt-1 font-medium">Análise estratégica e prestação de contas.</p>
                    </div>
                </div>

                <div className="relative min-w-[280px]">
                    <i className="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-brand"></i>
                    <select
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value as TabType)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-brand appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                        <option value="overview">Visão Geral do Portfólio</option>
                        <option value="project_consolidated">Consolidado por Projeto</option>
                        <option value="accountability">Prestação de Contas</option>
                        <option value="consultation">Consulta Detalhada</option>
                    </select>
                    <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                </div>
            </header>

            {/* Container Principal com Scroll */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">

                {/* --- CONSOLIDADO POR PROJETO --- */}
                {activeTab === 'project_consolidated' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

                        {/* Barra de Filtros */}
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[300px]">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Selecionar Projeto</label>
                                <div className="relative">
                                    <i className="fas fa-folder absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                    <select
                                        value={selectedProjectReportId}
                                        onChange={e => setSelectedProjectReportId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:ring-2 focus:ring-brand text-slate-700 appearance-none transition-all"
                                    >
                                        <option value="">Selecione um projeto para analisar...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">De</label>
                                    <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:ring-2 focus:ring-brand transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Até</label>
                                    <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:ring-2 focus:ring-brand transition-all" />
                                </div>
                            </div>
                            {/* Botão Exportar PDF */}
                            {consolidatedProjectData && (
                                <button
                                    onClick={handleExportConsolidatedPDF}
                                    disabled={isGeneratingPDF}
                                    className="px-6 py-3 rounded-2xl bg-brand text-white font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                >
                                    <i className={`fas ${isGeneratingPDF ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                                    {isGeneratingPDF ? 'Gerando...' : 'Exportar PDF'}
                                </button>
                            )}
                        </div>

                        {!consolidatedProjectData ? (
                            <div className="flex flex-col items-center justify-center text-center opacity-50 py-20">
                                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                    <i className="fas fa-chart-pie text-4xl text-slate-300"></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-500">Selecione um projeto acima para visualizar a análise estratégica.</h3>
                            </div>
                        ) : (
                            <div className="space-y-6">

                                {/* Dashboard Financeiro e Operacional */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Gráfico Financeiro */}
                                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col h-[380px]">
                                        <div className="flex justify-between items-center mb-4 px-2">
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Saúde Financeira</h4>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center items-center relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={consolidatedProjectData.charts.financial}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={85}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        <Cell key="cell-alloc" fill="#0071e3" />
                                                        <Cell key="cell-remain" fill="#10b981" />
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(val: number) => formatCurrency(val)}
                                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                                                <span className="text-sm font-black text-slate-800">{formatCurrency(consolidatedProjectData.stats.totalBudget)}</span>
                                            </div>
                                        </div>
                                        {/* Legenda Customizada Financeira */}
                                        <div className="mt-4 px-4 pb-2 w-full">
                                            <div className="flex justify-between items-center border-b border-slate-50 pb-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-[#0071e3]"></div>
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Alocado</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-800">{formatCurrency(consolidatedProjectData.stats.allocatedBudget)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Disponível</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-800">{formatCurrency(consolidatedProjectData.stats.remainingBudget)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gráfico Status das Ações - Ajustado visualmente */}
                                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col h-[380px]">
                                        <div className="flex justify-between items-center mb-6 px-2">
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Status das Ações</h4>
                                            <span className="text-[9px] font-bold bg-indigo-50 px-2 py-1 rounded-full text-indigo-600 border border-indigo-100">Progresso: {consolidatedProjectData.stats.completionRate}%</span>
                                        </div>
                                        <div className="flex-1 w-full min-h-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={consolidatedProjectData.charts.status} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={false} height={10} />
                                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} width={25} />
                                                    <Tooltip
                                                        cursor={{ fill: '#f8fafc' }}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '11px' }}
                                                    />
                                                    <Bar dataKey="count" name="Quantidade" radius={[6, 6, 0, 0]} barSize={35}>
                                                        {consolidatedProjectData.charts.status.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as TaskStatus] || '#cbd5e1'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <CustomLegend data={consolidatedProjectData.charts.status} />
                                    </div>

                                    {/* Cards KPIs Compactos e Lado a Lado */}
                                    <div className="grid grid-rows-2 gap-4 h-[380px]">
                                        <div className={`p-6 rounded-[32px] border shadow-sm flex flex-col justify-center items-center text-center h-full transition-all hover:scale-[1.02] ${consolidatedProjectData.stats.daysRemaining < 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
                                            <div className="mb-3 p-3 rounded-full bg-white border border-slate-100 shadow-sm">
                                                <i className={`fas ${consolidatedProjectData.stats.daysRemaining < 0 ? 'fa-hourglass-end text-rose-500' : 'fa-hourglass-half text-slate-300'} text-2xl`}></i>
                                            </div>
                                            <p className="text-4xl font-black text-slate-800 leading-none mb-2">{Math.abs(consolidatedProjectData.stats.daysRemaining)}</p>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                {consolidatedProjectData.stats.daysRemaining < 0 ? 'Dias Atraso' : 'Dias Restantes'}
                                            </p>
                                        </div>
                                        <div className={`p-6 rounded-[32px] border shadow-sm flex flex-col justify-center items-center text-center h-full transition-all hover:scale-[1.02] ${consolidatedProjectData.stats.overdueTasks > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
                                            <div className="mb-3 p-3 rounded-full bg-white border border-slate-100 shadow-sm">
                                                <i className={`fas ${consolidatedProjectData.stats.overdueTasks > 0 ? 'fa-triangle-exclamation text-amber-500' : 'fa-check-circle text-emerald-500'} text-2xl`}></i>
                                            </div>
                                            <p className="text-4xl font-black text-slate-800 leading-none mb-2">{consolidatedProjectData.stats.overdueTasks}</p>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ações em Atraso</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabela de Ações - PADRONIZADA */}
                                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                        <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Detalhamento de Ações</h4>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{consolidatedProjectData.tasks.length} Registros</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50/30">
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Objetivo Específico</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cronograma</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsáveis</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Público-Alvo</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Custo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {consolidatedProjectData.tasks.map(t => {
                                                    const isLate = isDateLate(t.endDate, t.status);
                                                    return (
                                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-3">
                                                                <p className="text-xs font-bold text-slate-700">{t.title}</p>
                                                            </td>
                                                            <td className="px-6 py-3 text-xs text-slate-500 font-medium">
                                                                {t.goal || '-'}
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${getStatusBadgeClass(t.status)}`}>{t.status}</span>
                                                            </td>
                                                            <td className="px-6 py-3 text-[10px] text-slate-500 whitespace-nowrap font-medium font-mono">
                                                                <span>{formatDate(t.startDate)} - </span>
                                                                <span className={isLate ? 'text-rose-600 font-black' : 'text-slate-500'}>
                                                                    {formatDate(t.endDate)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3 text-[10px] font-bold text-indigo-600">
                                                                {t.involved && t.involved.length > 0 ? t.involved.join(', ') : '-'}
                                                            </td>
                                                            <td className="px-6 py-3 text-xs text-slate-500 font-medium">
                                                                {t.targetAudience || '-'}
                                                            </td>
                                                            <td className="px-6 py-3 text-right text-xs font-bold text-slate-700">
                                                                {formatCurrency(t.budget || 0)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            {/* Rodapé com Custo Total */}
                                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-4 text-right text-sm font-black text-slate-700 uppercase tracking-wide">
                                                        Custo Total:
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-sm font-black text-brand">
                                                        {formatCurrency(consolidatedProjectData.stats.allocatedBudget)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- VISÃO GERAL --- */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                        {/* Cards Gerais mantidos */}

                        {/* Tabela Agrupada por Empresa */}
                        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Performance por Empresa</h3>
                                {(filterStartDate || filterEndDate) && <span className="text-[9px] bg-brand text-white px-2 py-1 rounded font-bold">Filtro de Período Ativo</span>}
                            </div>
                            <div className="overflow-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-white shadow-sm z-10 sticky top-0">
                                        <tr className="border-b border-slate-100 bg-slate-50/30">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Projeto</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Período de Execução</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Progresso</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Previstas (Período)</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Executadas (Período)</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Orçamento</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsáveis</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredData.grouped.map(({ company, projects }) => (
                                            <React.Fragment key={company.id}>
                                                <tr className="bg-slate-50/50">
                                                    <td colSpan={7} className="px-6 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <i className="fas fa-building text-slate-400"></i>
                                                            <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{company.name}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {projects.map(({ project, tasks, tasksInPeriod, executedInPeriod }) => {
                                                    const comp = tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.status === 'Concluído').length / tasks.length) * 100) : 0;
                                                    const allInvolved = Array.from(new Set(tasks.flatMap((t: any) => t.involved))).join(', ');
                                                    const isProjectOverdue = isPastDate(project.endDate);

                                                    return (
                                                        <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <span className="font-bold text-slate-800 text-xs">{project.name}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-[10px] font-medium text-slate-500 whitespace-nowrap font-mono">
                                                                <span>{formatDate(project.startDate)} - </span>
                                                                <span className={isProjectOverdue ? 'text-rose-600 font-black' : 'text-slate-500'}>
                                                                    {formatDate(project.endDate)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black ${comp > 75 ? 'bg-emerald-100 text-emerald-600' : comp > 25 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                    {comp}%
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-700">
                                                                {tasksInPeriod.length}
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-xs font-bold text-emerald-600">
                                                                {executedInPeriod}
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-mono text-xs font-bold text-slate-700">
                                                                {formatCurrency(project.totalBudget || 0)}
                                                            </td>
                                                            <td className="px-6 py-4 text-[10px] text-slate-500 max-w-[200px] truncate" title={allInvolved}>
                                                                {allInvolved || '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PRESTAÇÃO DE CONTAS E CONSULTA (PADRONIZADO) --- */}
                {(activeTab === 'accountability' || activeTab === 'consultation') && (
                    <div className="flex-1 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                        {/* Header com Botão Exportar e Seleção (apenas para Accountability) */}
                        {activeTab === 'accountability' && (
                            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="text-lg font-extrabold text-slate-900">Prestação de Contas por Projeto</h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {filterStartDate || filterEndDate
                                                ? `Período: ${filterStartDate ? formatDate(filterStartDate) : 'Início'} até ${filterEndDate ? formatDate(filterEndDate) : 'Atual'}`
                                                : 'Todos os projetos'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleExportAccountabilityPDF}
                                        disabled={isGeneratingPDF || selectedProjectIds.size === 0}
                                        className="px-6 py-3 rounded-2xl bg-brand text-white font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    >
                                        <i className={`fas ${isGeneratingPDF ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                                        {isGeneratingPDF ? 'Gerando...' : `Exportar ${selectedProjectIds.size > 0 ? `(${selectedProjectIds.size})` : 'PDF'}`}
                                    </button>
                                </div>

                                {/* Controles de Seleção */}
                                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                    <span className="text-xs font-bold text-slate-600">
                                        <i className="fas fa-check-circle text-brand mr-2"></i>
                                        {selectedProjectIds.size} projeto{selectedProjectIds.size !== 1 ? 's' : ''} selecionado{selectedProjectIds.size !== 1 ? 's' : ''}
                                    </span>
                                    <button
                                        onClick={selectAllProjects}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-brand bg-blue-50 hover:bg-blue-100 transition-colors"
                                    >
                                        <i className="fas fa-check-double mr-1"></i>
                                        Selecionar Todos
                                    </button>
                                    <button
                                        onClick={deselectAllProjects}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                    >
                                        <i className="fas fa-times mr-1"></i>
                                        Limpar
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'accountability' && filteredData.flat.map(({ project, tasks }) => {
                            const statusCounts = tasks.reduce((acc, t) => {
                                acc[t.status] = (acc[t.status] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>);

                            const statusChartData = Object.keys(statusCounts).map(status => ({
                                name: status,
                                value: statusCounts[status]
                            }));

                            const expensesData = tasks
                                .filter(t => (t.budget || 0) > 0)
                                .map(t => ({ name: t.title, value: t.budget || 0 }));

                            return (
                                <div key={project.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 break-inside-avoid">
                                    {/* Header do Projeto com Checkbox */}
                                    <div className="mb-6 border-b border-slate-100 pb-6 flex items-start gap-4">
                                        <label className="flex items-start gap-3 cursor-pointer flex-1">
                                            <input
                                                type="checkbox"
                                                checked={selectedProjectIds.has(project.id)}
                                                onChange={() => toggleProjectSelection(project.id)}
                                                className="mt-1 w-5 h-5 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand focus:ring-2 cursor-pointer"
                                            />
                                            <div className="flex-1">
                                                <h3 className="text-lg font-extrabold text-slate-900 mb-1">{project.name}</h3>
                                                <p className="text-xs text-slate-500">{project.description}</p>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="overflow-x-auto mb-8">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-50 bg-slate-50/30">
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Tarefa / Ação</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Período</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Custo</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsáveis</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {tasks.map(t => {
                                                    const late = isDateLate(t.endDate, t.status);
                                                    return (
                                                        <React.Fragment key={t.id}>
                                                            <tr className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-4 py-3 text-xs font-bold text-slate-700">{t.title}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getStatusBadgeClass(t.status)}`}>{t.status}</span>
                                                                </td>
                                                                <td className="px-4 py-3 text-[10px] font-medium font-mono">
                                                                    <span className="text-slate-500">{formatDate(t.startDate)} - </span>
                                                                    <span className={late ? 'text-rose-600 font-black' : 'text-slate-500'}>
                                                                        {formatDate(t.endDate)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-[10px] font-bold text-slate-600 text-right">{formatCurrency(t.budget || 0)}</td>
                                                                <td className="px-4 py-3 text-[9px] font-bold text-indigo-600">{t.involved.join(', ')}</td>
                                                            </tr>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Gráficos Refatorados - Sem Cortes e com Legenda Clara */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                                        <div className="flex flex-col h-[400px]">
                                            <h4 className="text-[12px] font-bold text-slate-800 uppercase tracking-widest mb-4">Detalhamento de Gastos Alocados por Ação</h4>
                                            <div className="flex-1 w-full bg-slate-50/50 rounded-[24px] border border-slate-100 p-4 relative">
                                                {expensesData.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={expensesData}
                                                                cx="50%"
                                                                cy="50%"
                                                                labelLine={false}
                                                                label={renderCustomizedLabel}
                                                                outerRadius={100}
                                                                fill="#8884d8"
                                                                dataKey="value"
                                                            >
                                                                {expensesData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                                            <Legend
                                                                layout="horizontal"
                                                                verticalAlign="bottom"
                                                                align="center"
                                                                wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-slate-400 font-bold text-xs uppercase tracking-widest">
                                                        Sem gastos registrados
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col h-[400px]">
                                            <h4 className="text-[12px] font-bold text-slate-800 uppercase tracking-widest mb-4">Demandas por Status</h4>
                                            <div className="flex-1 w-full bg-slate-50/50 rounded-[24px] border border-slate-100 p-4 flex flex-col">
                                                {statusChartData.length > 0 ? (
                                                    <>
                                                        <div className="flex-1 w-full">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <BarChart data={statusChartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                                    <XAxis dataKey="name" hide />
                                                                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                                                    <Bar dataKey="value" name="Quantidade" radius={[8, 8, 0, 0]} barSize={40}>
                                                                        {statusChartData.map((entry, index) => (
                                                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as TaskStatus] || '#cbd5e1'} />
                                                                        ))}
                                                                    </Bar>
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                        <CustomLegend data={statusChartData} />
                                                    </>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-slate-400 font-bold text-xs uppercase tracking-widest">
                                                        Sem demandas registradas
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {activeTab === 'consultation' && (
                            <div className="flex-1 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                                <div className="flex-1 overflow-auto custom-scrollbar">
                                    {/* ... Tabela Consulta Detalhada Mantida ... */}
                                    <table className="w-full text-left border-collapse">
                                        {/* ... Cabeçalho ... */}
                                        <thead className="bg-slate-50 z-10 shadow-sm sticky top-0">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Projeto / Tarefa</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Status</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Prazo</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-right">Orçamento</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Responsáveis</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.flat.map(({ project, tasks }) => (
                                                <React.Fragment key={project.id}>
                                                    <tr className="bg-slate-100/50 hover:bg-slate-100 transition-colors">
                                                        <td colSpan={5} className="px-6 py-3 border-b border-slate-100">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-extrabold text-slate-800">{project.name}</span>
                                                                <span className="text-[10px] font-bold text-slate-500">Total: {formatCurrency(project.totalBudget || 0)}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {tasks.map(t => {
                                                        const late = isDateLate(t.endDate, t.status);
                                                        return (
                                                            <tr key={t.id} className="group hover:bg-brand-light/10 transition-colors border-b border-slate-50 last:border-0">
                                                                <td className="px-6 py-3 pl-10">
                                                                    <span className="text-xs font-medium text-slate-700 group-hover:text-brand transition-colors">{t.title}</span>
                                                                </td>
                                                                <td className="px-6 py-3">
                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getStatusBadgeClass(t.status)}`}>{t.status}</span>
                                                                </td>
                                                                <td className="px-6 py-3 text-[10px] font-medium text-slate-500 font-mono">
                                                                    <span className={late ? 'text-rose-600 font-black' : ''}>
                                                                        {t.endDate ? new Date(t.endDate).toLocaleDateString('pt-BR') : '-'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-3 text-right text-xs font-bold text-slate-600">
                                                                    {formatCurrency(t.budget || 0)}
                                                                </td>
                                                                <td className="px-6 py-3 text-[10px] font-bold text-slate-500">
                                                                    {t.involved.length > 0 ? t.involved.join(', ') : '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsView;
