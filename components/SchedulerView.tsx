
import React, { useState, useMemo, useEffect } from 'react';
import { Project, Task, AccessoryTask, Company } from '../types';
import BaseModal from './BaseModal';

interface SchedulerViewProps {
  projects: Project[];
  tasks: Task[];
  accessoryTasks: AccessoryTask[];
  companies: Company[];
  currentCompanyId: string;
  isAdmin: boolean;
  onAddAccessoryTask: (task: AccessoryTask) => Promise<void>;
  onDeleteAccessoryTask: (id: string) => Promise<void>;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Paleta de cores para os projetos (Replicado do Sidebar para uso local)
const PROJECT_ICONS_COLORS = [
  'text-emerald-500',
  'text-amber-500',
  'text-rose-500',
  'text-cyan-500',
  'text-purple-500',
  'text-indigo-500',
  'text-pink-500',
  'text-orange-500',
  'text-teal-500',
  'text-lime-600'
];

const getProjectIconColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PROJECT_ICONS_COLORS.length;
  return PROJECT_ICONS_COLORS[index];
};

const SchedulerView: React.FC<SchedulerViewProps> = ({
  projects,
  tasks,
  accessoryTasks,
  companies,
  currentCompanyId,
  isAdmin,
  onAddAccessoryTask,
  onDeleteAccessoryTask
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCompanyId, setSelectedCompanyId] = useState(currentCompanyId);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado do Modal de Nova Tarefa Acessória
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState('');

  // Estado do Modal de Detalhes de Evento
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Estado do Modal de Todos os Eventos do Dia
  const [selectedDayForEvents, setSelectedDayForEvents] = useState<Date | null>(null);
  const [isDayEventsModalOpen, setIsDayEventsModalOpen] = useState(false);


  useEffect(() => {
    if (!isAdmin) {
      setSelectedCompanyId(currentCompanyId);
    }
  }, [isAdmin, currentCompanyId]);

  // Filtra projetos e tarefas pela empresa selecionada
  const filteredData = useMemo(() => {
    const proj = projects.filter(p => p.companyId === selectedCompanyId);
    const projIds = proj.map(p => p.id);
    const tsk = tasks.filter(t => projIds.includes(t.projectId) && t.endDate); // Apenas tarefas com data final
    const acc = accessoryTasks.filter(a => a.companyId === selectedCompanyId);
    return { projects: proj, tasks: tsk, accessoryTasks: acc };
  }, [projects, tasks, accessoryTasks, selectedCompanyId]);

  // Função centralizada para buscar eventos (definida antes dos useMemos para evitar crash)
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];

    // 1. Ações de Projeto (Marcação Vermelha)
    const projectEvents = filteredData.tasks
      .filter(t => t.endDate === dateStr)
      .map(t => {
        const project = filteredData.projects.find(p => p.id === t.projectId);
        return {
          id: t.id,
          type: 'deadline',
          title: `${project?.name || 'Projeto'} - ${t.title}`,
          desc: 'Prazo Final de Ação',
          color: 'bg-rose-500 text-white shadow-rose-200'
        };
      });

    // 2. Tarefas Acessórias
    const accessoryEvents = filteredData.accessoryTasks
      .filter(a => a.date === dateStr)
      .map(a => {
        const linkedProject = filteredData.projects.find(p => p.id === a.projectId);
        const textColor = a.projectId ? getProjectIconColor(a.projectId) : 'text-slate-600';
        const displayTitle = linkedProject ? `${linkedProject.name} - ${a.title}` : a.title;

        return {
          id: a.id,
          type: 'accessory',
          title: displayTitle,
          desc: a.description || 'Sem descrição',
          color: `bg-slate-100 ${textColor} border border-slate-200`,
          original: a
        };
      });

    return [...projectEvents, ...accessoryEvents];
  };

  // Calcula os eventos do dia selecionado dinamicamente para manter o modal atualizado
  const currentDayEvents = useMemo(() => {
    if (!selectedDayForEvents) return [];
    return getEventsForDate(selectedDayForEvents);
  }, [selectedDayForEvents, filteredData]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];

    // Dias do mês anterior para preencher
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Dias do mês atual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Dias do próximo mês
    const endPadding = 42 - days.length; // Grid de 6 semanas (7x6)
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };


  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date) => {

    setSelectedDay(date);
    setIsModalOpen(true);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskProjectId('');
  };

  const handleSaveAccessoryTask = async () => {
    if (!selectedDay) return;

    if (!newTaskTitle.trim() || !newTaskDesc.trim() || !newTaskProjectId) {
      alert("Todos os campos (Título, Descrição e Projeto) são obrigatórios.");
      return;
    }

    const newTask: AccessoryTask = {
      id: crypto.randomUUID(),
      companyId: selectedCompanyId,
      projectId: newTaskProjectId,
      date: selectedDay.toISOString().split('T')[0],
      title: newTaskTitle,
      description: newTaskDesc,
      createdAt: Date.now()
    };

    await onAddAccessoryTask(newTask);
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 h-full flex flex-col animate-apple bg-[#f5f5f7]">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shadow-sm">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-[#1d1d1f] tracking-tight">Scheduler Corporativo</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cronograma de Entregas & Atividades</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          {isAdmin && (
            <div className="border-r border-slate-100 pr-4">
              <select
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer hover:text-brand transition-colors"
              >
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors">
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="text-sm font-black text-slate-800 uppercase tracking-widest min-w-[140px] text-center">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={handleNextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Calendar Grid - Adjusted for scrolling */}
      <div className="flex-1 bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 shrink-0">
          {WEEK_DAYS.map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid - Scrollable Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-7 grid-rows-6 min-h-[600px] h-full">
            {calendarDays.map((dayObj, index) => {
              const events = getEventsForDate(dayObj.date);
              const isToday = new Date().toDateString() === dayObj.date.toDateString();

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(dayObj.date)}
                  className={`border-b border-r border-slate-50 p-2 relative group hover:bg-slate-50 transition-colors cursor-pointer flex flex-col gap-1 overflow-hidden ${!dayObj.isCurrentMonth ? 'bg-slate-50/30' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand text-white shadow-md' : dayObj.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'}`}>
                      {dayObj.date.getDate()}
                    </span>
                    <div className="flex gap-1">
                      {events.length > 2 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayForEvents(dayObj.date);
                            setIsDayEventsModalOpen(true);
                          }}
                          className="text-[8px] font-black bg-brand text-white px-1.5 py-0.5 rounded-full cursor-pointer hover:bg-brand/80 transition-all shadow-sm"
                          title={`${events.length} eventos (clique para ver todos)`}
                        >
                          +{events.length - 2}
                        </div>
                      )}
                      {dayObj.isCurrentMonth && (
                        <button className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-brand hover:text-white transition-all text-[8px]">
                          <i className="fas fa-plus"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-1 mt-1 max-h-[80px] overflow-hidden">
                    {events.slice(0, 2).map((evt, i) => (
                      <div
                        key={`${evt.type}-${evt.id}-${i}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(evt);
                          setIsDetailsModalOpen(true);
                        }}
                        className={`px-2 py-1 rounded-md text-[9px] font-bold truncate shadow-sm transition-all hover:scale-[1.02] relative cursor-pointer ${evt.color} h-[24px] flex items-center`}
                        title="Clique para ver detalhes"
                      >
                        <div className="flex-1 truncate pr-6">
                          {evt.type === 'deadline' && <i className="fas fa-flag mr-1 text-[8px] opacity-70"></i>}
                          {evt.title}
                        </div>

                        {evt.type === 'accessory' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Excluir esta tarefa?')) {
                                onDeleteAccessoryTask(evt.id);
                              }
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 flex w-5 h-5 bg-white text-rose-500 rounded-full items-center justify-center shadow-sm hover:bg-rose-50 opacity-30 hover:opacity-100 transition-opacity"
                            title="Excluir tarefa"
                          >
                            <i className="fas fa-times text-[8px]"></i>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-4 flex gap-6 items-center px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-rose-500 shadow-sm"></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Prazo Final de Ação (Projeto)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200 shadow-sm"></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tarefa Acessória</span>
        </div>
      </div>

      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-[#f8fafc] dark:bg-slate-900 border-b border-slate-100 dark:border-white/5 p-5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Nova Tarefa Acessória</h3>
            <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mt-3">
              {selectedDay?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Tarefa <span className="text-rose-500">*</span></label>
            <input
              type="text"
              autoFocus
              placeholder="Ex: Reunião de Alinhamento"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição (Obrigatório) <span className="text-rose-500">*</span></label>
            <textarea
              rows={3}
              placeholder="Detalhes adicionais e objetivos..."
              value={newTaskDesc}
              onChange={e => setNewTaskDesc(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-brand/20 resize-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular a Projeto (Obrigatório) <span className="text-rose-500">*</span></label>
            <div className="relative group">
              <select
                value={newTaskProjectId}
                onChange={e => setNewTaskProjectId(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-sm font-bold text-slate-600 dark:text-slate-400 outline-none focus:ring-2 focus:ring-brand/20 transition-all appearance-none cursor-pointer"
              >
                <option value="">Selecione um projeto...</option>
                {filteredData.projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <i className="fas fa-chevron-down text-xs"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-50 dark:border-white/5 flex gap-3 shrink-0">
          <button
            onClick={() => setIsModalOpen(false)}
            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveAccessoryTask}
            className="flex-1 py-3 rounded-2xl bg-brand text-white font-bold text-xs hover:shadow-xl hover:shadow-brand/20 transition-all active:scale-95"
          >
            Salvar na Agenda
          </button>
        </div>
      </BaseModal>

      {/* Modal de Detalhes do Evento */}
      <BaseModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)}>
        <div className="bg-[#f8fafc] dark:bg-slate-900 border-b border-slate-100 dark:border-white/5 p-5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Detalhes do Evento</h3>
            <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mt-3">
              {selectedEvent?.type === 'deadline' ? 'Prazo Final de Ação' : 'Tarefa Acessória'}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título</label>
            <div className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-sm font-bold text-slate-700 dark:text-white">
              {selectedEvent?.title}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
            <div className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-sm font-medium text-slate-700 dark:text-slate-300 min-h-[80px]">
              {selectedEvent?.desc}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-50 dark:border-white/5 flex gap-3 shrink-0">
          <button
            onClick={() => setIsDetailsModalOpen(false)}
            className="flex-1 py-3 rounded-2xl bg-brand text-white font-bold text-xs hover:shadow-xl hover:shadow-brand/20 transition-all active:scale-95"
          >
            Fechar
          </button>
        </div>
      </BaseModal>

      {/* Modal de Todos os Eventos do Dia */}
      <BaseModal isOpen={isDayEventsModalOpen} onClose={() => { setIsDayEventsModalOpen(false); setSelectedDayForEvents(null); }}>
        <div className="bg-[#f8fafc] dark:bg-slate-900 border-b border-slate-100 dark:border-white/5 p-5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Eventos do Dia</h3>
            <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mt-3">
              {currentDayEvents.length} {currentDayEvents.length === 1 ? 'evento' : 'eventos'}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto custom-scrollbar max-h-[400px]">
          {currentDayEvents.map((evt, i) => (
            <div
              key={`modal-evt-${i}`}
              onClick={() => {
                setSelectedEvent(evt);
                // Mantemos o modal de eventos aberto se quiser voltar? 
                // Geralmente detalhes fecha o anterior se for tela pequena, mas aqui vamos manter a lógica de troca
                setIsDetailsModalOpen(true);
              }}
              className={`px-4 py-3 rounded-xl ${evt.color} shadow-sm cursor-pointer hover:scale-[1.02] transition-transform relative`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-bold mb-1">
                    {evt.type === 'deadline' && <i className="fas fa-flag mr-2 text-xs opacity-70"></i>}
                    {evt.title}
                  </div>
                  <div className="text-[10px] font-medium opacity-80">
                    {evt.desc}
                  </div>
                </div>
                {evt.type === 'accessory' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Excluir esta tarefa?')) {
                        onDeleteAccessoryTask(evt.id);
                        // NÃO fecha o modal, a lista sincronizada irá remover o item automaticamente
                      }
                    }}
                    className="flex w-6 h-6 bg-white text-rose-500 rounded-full items-center justify-center shadow-sm hover:bg-rose-50 transition-colors"
                    title="Excluir tarefa"
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-slate-50 dark:border-white/5 flex gap-3 shrink-0">
          <button
            onClick={() => { setIsDayEventsModalOpen(false); setSelectedDayForEvents(null); }}
            className="flex-1 py-3 rounded-2xl bg-brand text-white font-bold text-xs hover:shadow-xl hover:shadow-brand/20 transition-all active:scale-95"
          >
            Fechar
          </button>
        </div>
      </BaseModal>
    </div>
  );
};

export default SchedulerView;
