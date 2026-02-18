
import React, { useState, useEffect } from 'react';
import { Project, Task, TaskStatus, Company, ProjectPulse } from '../types';
import KanbanColumn from './KanbanColumn';
import GanttChart from './GanttChart';
import TaskModal from './TaskModal';
import TaskDetailModal from './TaskDetailModal';
import ConfirmationModal from './ConfirmationModal';
import ExecutiveReportModal from './ExecutiveReportModal';
import BaseModal from './BaseModal';
import { getProjectPulse } from '../geminiService';
import { useLanguage } from '../LanguageContext';

interface ProjectViewProps {
  project: Project;
  company: Company | null;
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'companyId'>) => void;
  onUpdateTask: (task: Task) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

const ProjectView: React.FC<ProjectViewProps> = ({
  project, company, tasks, onAddTask, onUpdateTask, onUpdateStatus, onDeleteTask, onEditProject, onDeleteProject
}) => {
  const { t } = useLanguage();

  const LOADING_STEPS = [
    t('pulse_loading_step_0'),
    t('pulse_loading_step_1'),
    t('pulse_loading_step_2'),
    t('pulse_loading_step_3')
  ];
  const [viewMode, setViewMode] = useState<'kanban' | 'gantt'>('kanban');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const [pulse, setPulse] = useState<ProjectPulse | null>(null);
  const [isAnalyzingPulse, setIsAnalyzingPulse] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isPulseModalOpen, setIsPulseModalOpen] = useState(false);
  const [pulseError, setPulseError] = useState<string | null>(null);

  const statusColumns: TaskStatus[] = [TaskStatus.PLANNING, TaskStatus.EXECUTION, TaskStatus.COMPLETED, TaskStatus.CANCELLED];

  // Efeito para ciclar mensagens de carregamento
  useEffect(() => {
    let interval: any;
    if (isAnalyzingPulse) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 1500); // Muda a mensagem a cada 1.5s
    }
    return () => clearInterval(interval);
  }, [isAnalyzingPulse]);

  const handlePulseAnalysis = async () => {
    setIsPulseModalOpen(true);
    if (!pulse) {
      runPulseAnalysis();
    }
  };

  const runPulseAnalysis = async () => {
    setIsAnalyzingPulse(true);
    setPulseError(null);
    try {
      const result = await getProjectPulse(project, tasks);
      if (result) {
        setPulse(result);
      } else {
        setPulseError(t('analysis_failure_title'));
      }
    } catch (err) {
      setPulseError(t('server_error') || "Erro de conexão.");
    } finally {
      setIsAnalyzingPulse(false);
    }
  };

  const closePulseModal = () => {
    setIsPulseModalOpen(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Emerald-500
    if (score >= 50) return '#f59e0b'; // Amber-500
    return '#ef4444'; // Rose-500
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'Saudável': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'Alerta': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'Crítico': return 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      default: return 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600';
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col min-w-full w-fit">
      {/* Header Responsivo */}
      <header className="mb-6 flex flex-col xl:flex-row xl:items-start justify-between gap-6 shrink-0">
        <div className="flex-1 flex gap-4 md:gap-6 items-start">
          <div className="h-16 md:h-20 w-auto min-w-[64px] max-w-[220px] px-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] shadow-sm flex items-center justify-center shrink-0 overflow-hidden transition-all">
            {project.logoData || company?.logoData ? (
              <img src={project.logoData || company?.logoData} className="max-w-full max-h-full object-contain p-2" alt="Logo" />
            ) : (
              <i className="fas fa-folder-open text-slate-300 text-2xl"></i>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight truncate">{project.name}</h2>
              <div className="flex gap-2">
                <button onClick={() => onEditProject(project)} className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-brand transition-all flex items-center justify-center shadow-sm active:scale-95">
                  <i className="fas fa-edit text-xs"></i>
                </button>
                <button onClick={() => setConfirmDeleteProject(true)} className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-all flex items-center justify-center shadow-sm active:scale-95">
                  <i className="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em]">{company?.name || 'Unidade Geral'}</p>
              {project.startDate && (
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded whitespace-nowrap">
                  <i className="far fa-calendar-alt mr-1"></i> {project.startDate} a {project.endDate || '...'}
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-2xl font-medium mb-2 line-clamp-2">{project.description}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row xl:flex-col items-start sm:items-center xl:items-end gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePulseAnalysis}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl font-bold shadow-sm border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center gap-2 transition-all active:scale-95 group"
            >
              <i className="fas fa-bolt group-hover:animate-pulse"></i> {t('pulse_ai_title')}
            </button>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl font-bold shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <i className="fas fa-file-invoice"></i> <span className="hidden sm:inline">{t('report_btn')}</span>
            </button>
            <button onClick={() => setIsCreateModalOpen(true)} className="flex-1 sm:flex-none px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
              <i className="fas fa-plus"></i> <span className="hidden sm:inline">{t('new_action_btn')}</span>
            </button>
          </div>

          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex gap-1 shadow-inner w-full sm:w-auto">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active-press ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <i className="fas fa-columns"></i> {t('view_kanban')}
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active-press ${viewMode === 'gantt' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <i className="fas fa-stream"></i> {t('view_gantt')}
            </button>
          </div>
        </div>
      </header>

      <div className="pb-6 mb-12">
        {viewMode === 'kanban' ? (
          <div className="flex gap-4 md:gap-6 items-start min-w-max">
            {statusColumns.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasks.filter(t => t.status === status)}
                onUpdateStatus={onUpdateStatus}
                onDeleteTask={setTaskToDelete}
                onSelectTask={setSelectedTask}
                onEditTask={setTaskToEdit}
              />
            ))}
          </div>
        ) : (
          <GanttChart
            tasks={tasks}
            projectStartDate={project.startDate}
            projectEndDate={project.endDate}
            onSelectTask={setSelectedTask}
          />
        )}
      </div>

      {/* Modais */}
      {(isCreateModalOpen || taskToEdit) && (
        <TaskModal
          project={project}
          company={company}
          initialTask={taskToEdit || undefined}
          onClose={() => { setIsCreateModalOpen(false); setTaskToEdit(null); }}
          onSave={(taskData) => { if (taskToEdit) onUpdateTask({ ...taskToEdit, ...taskData } as Task); else onAddTask(taskData); setIsCreateModalOpen(false); setTaskToEdit(null); }}
        />
      )}

      <BaseModal isOpen={isPulseModalOpen} onClose={closePulseModal} maxWidth="max-w-5xl">
        <div className="bg-[#f8fafc] dark:bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <header className="bg-white dark:bg-slate-800 px-8 py-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-sm shrink-0">
                <i className="fas fa-brain text-indigo-600 dark:text-indigo-400 text-xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">{t('pulse_ai_title')}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('innova_intelligence_ai')}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-[#f8fafc] dark:bg-slate-900">
            {isAnalyzingPulse ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-center space-y-8 animate-apple">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-bolt text-indigo-500 text-2xl"></i>
                  </div>
                </div>
                <div className="max-w-xs">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2 transition-all duration-300">
                    {t(`pulse_loading_step_${loadingStep}` as any) || LOADING_STEPS[loadingStep]}
                  </h4>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            ) : pulseError ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-center">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-6 text-rose-500 text-3xl shadow-sm border border-rose-100 dark:border-rose-900/50">
                  <i className="fas fa-server"></i>
                </div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t('analysis_failure_title')}</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mb-6">{pulseError}</p>
                <button onClick={runPulseAnalysis} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:shadow-xl transition-all active:scale-95">
                  {t('try_again')}
                </button>
              </div>
            ) : pulse ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Esquerda: Score Card */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-[40px] p-10 flex flex-col items-center border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">{t('health_score')}</h4>

                  <div className="relative w-48 h-48 mb-10 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="85" stroke="#f1f5f9" className="dark:stroke-slate-700" strokeWidth="14" fill="transparent" />
                      <circle cx="100" cy="100" r="85" stroke={getScoreColor(pulse.score)} strokeWidth="14" fill="transparent" strokeDasharray={534} strokeDashoffset={534 - (534 * pulse.score) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-7xl font-black text-slate-800 dark:text-white tracking-tighter">{pulse.score}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">{t('points')}</span>
                    </div>
                  </div>

                  <div className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] border shadow-sm ${getStatusBadgeStyles(pulse.status)}`}>
                    {pulse.status}
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-50 dark:border-white/5 w-full text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      {t('updated_at')}: {new Date(pulse.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Coluna Direita: Conteúdo Estratégico */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white dark:bg-slate-800 p-10 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full blur-3xl"></div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                      <i className="fas fa-stethoscope text-indigo-500"></i> {t('executive_diagnosis')}
                    </h4>
                    <p className="text-xl font-bold text-slate-700 dark:text-slate-200 leading-relaxed relative z-10">
                      "{pulse.summary}"
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                      <i className="fas fa-lightbulb text-amber-400"></i> {t('strategic_recommendations')}
                    </h4>
                    {pulse.insights.map((insight, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm flex gap-6 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group items-center">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-400 flex items-center justify-center font-black text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                          {idx + 1}
                        </div>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </BaseModal>

      <ConfirmationModal isOpen={!!taskToDelete} title={t('confirm_delete_action_title')} message={t('confirm_delete_action_msg')} onConfirm={() => { if (taskToDelete) onDeleteTask(taskToDelete); setTaskToDelete(null); }} onCancel={() => setTaskToDelete(null)} />
      <ConfirmationModal isOpen={confirmDeleteProject} title={t('confirm_delete_project_title')} message={t('confirm_delete_project_msg')} confirmText={t('confirm_delete_definitively')} onConfirm={() => onDeleteProject(project.id)} onCancel={() => setConfirmDeleteProject(false)} />
      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdateStatus={onUpdateStatus} />}
      {isReportModalOpen && <ExecutiveReportModal project={project} tasks={tasks} company={company} onClose={() => setIsReportModalOpen(false)} />}
    </div>
  );
};

export default ProjectView;
