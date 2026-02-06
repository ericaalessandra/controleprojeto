import React, { useMemo, useEffect, useRef } from 'react';
import { Task, TaskStatus } from '../types';
import { STATUS_CONFIG } from '../constants';

interface GanttChartProps {
  tasks: Task[];
  projectStartDate?: string;
  projectEndDate?: string;
  onSelectTask: (task: Task) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, projectStartDate, projectEndDate, onSelectTask }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tasksWithDates = useMemo(() => tasks.filter(t => t.startDate && t.endDate), [tasks]);

  const timelineRange = useMemo(() => {
    if (tasksWithDates.length === 0 && !projectStartDate) return null;

    const dates = tasksWithDates.flatMap(t => [new Date(t.startDate!), new Date(t.endDate!)]);
    if (projectStartDate) dates.push(new Date(projectStartDate));
    if (projectEndDate) dates.push(new Date(projectEndDate));

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 10); // Margem de respiro no final

    const days: Date[] = [];
    let current = new Date(minDate);
    while (current <= maxDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return { days, minDate, maxDate };
  }, [tasksWithDates, projectStartDate, projectEndDate]);

  const monthSegments = useMemo(() => {
    if (!timelineRange) return [];
    const segments: { month: string; year: number; dayCount: number; monthKey: string }[] = [];
    let currentSegment: { month: string; year: number; dayCount: number; monthKey: string } | null = null;

    timelineRange.days.forEach(day => {
      const monthName = day.toLocaleString('pt-BR', { month: 'long' });
      const year = day.getFullYear();
      const monthKey = `${year}-${day.getMonth()}`;

      if (!currentSegment || currentSegment.monthKey !== monthKey) {
        currentSegment = { month: monthName, year, dayCount: 1, monthKey };
        segments.push(currentSegment);
      } else {
        currentSegment.dayCount++;
      }
    });
    return segments;
  }, [timelineRange]);

  if (!timelineRange || tasksWithDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-slate-900 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800 p-10 text-center transition-colors">
        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <i className="fas fa-calendar-alt text-slate-200 dark:text-slate-700 text-3xl"></i>
        </div>
        <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Cronograma de Atividades</h3>
        <p className="text-sm text-slate-300 dark:text-slate-600 max-w-xs mt-2 font-medium">Defina períodos de execução nas ações para habilitar a visualização de Gantt.</p>
      </div>
    );
  }

  const { days, minDate } = timelineRange;
  const todayStr = new Date().toISOString().split('T')[0];

  const calculatePosition = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffTime = date.getTime() - minDate.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      const todayIdx = calculatePosition(todayStr);
      // Cada dia tem 40px. Subtraímos 100px para o "Hoje" não ficar colado na borda esquerda e dar contexto
      const scrollPos = Math.max(0, (todayIdx * 40) - 100);
      scrollContainerRef.current.scrollLeft = scrollPos;
    }
  }, [todayStr, minDate]); // Executa quando o range do cronograma é definido

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col w-full max-w-full min-w-0 box-border animate-apple">
      <div ref={scrollContainerRef} className="overflow-x-auto custom-scrollbar">
        <div className="min-w-max pr-10">
          {/* Cabeçalho de Meses */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 bg-white dark:bg-slate-900">
            <div className="w-52 shrink-0 p-4 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-100 dark:border-slate-800 sticky left-0 z-50 shadow-[4px_0_10px_rgba(0,0,0,0.02)]"></div>
            <div className="flex">
              {monthSegments.map((segment, i) => (
                <div key={i} className={`h-10 border-r border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shrink-0 ${i % 2 === 0 ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50'}`} style={{ width: `${segment.dayCount * 40}px` }}>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{segment.month} {segment.year}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex border-b border-slate-100 dark:border-slate-800 sticky top-10 z-30 bg-white dark:bg-slate-900">
            <div className="w-52 shrink-0 p-4 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 sticky left-0 z-40 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Iniciativas / Ações</span>
            </div>
            <div className="flex">
              {days.map((day, i) => {
                const dayKey = day.toISOString().split('T')[0];
                const isToday = dayKey === todayStr;
                return (
                  <div key={i} className={`w-10 h-14 flex flex-col items-center justify-center border-r border-slate-50 dark:border-slate-800 shrink-0 ${isToday ? 'bg-brand/5 dark:bg-brand/10' : ''}`}>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][day.getDay()]}</span>
                    <span className={`text-[11px] font-black mt-1 ${isToday ? 'text-brand dark:text-brand-light' : 'text-slate-600 dark:text-slate-300'}`}>{day.getDate()}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative">
            {tasksWithDates.map((task) => {
              const startIdx = calculatePosition(task.startDate!);
              const endIdx = calculatePosition(task.endDate!);
              const duration = Math.max(1, endIdx - startIdx + 1);
              const config = STATUS_CONFIG[task.status];
              return (
                <div key={task.id} className="flex border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                  <div
                    className="w-52 shrink-0 p-4 border-r border-slate-100 dark:border-slate-800 sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors cursor-pointer shadow-[4px_0_10px_rgba(0,0,0,0.02)]"
                    onClick={() => onSelectTask(task)}
                  >
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate" title={task.title}>{task.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${config.bg.replace('bg-', 'bg-')}`}></span>
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{task.status}</span>
                    </div>
                  </div>
                  <div className="flex relative items-center py-4">
                    {days.map((_, i) => (
                      <div key={i} className="w-10 h-full border-r border-slate-50 shrink-0 pointer-events-none"></div>
                    ))}
                    <div
                      onClick={() => onSelectTask(task)}
                      className={`absolute h-8 rounded-full shadow-sm cursor-pointer hover:shadow-md transition-all flex items-center px-4 overflow-hidden border border-white/50 dark:border-slate-700/50 z-10 ${config.bg} hover:scale-[1.02] active:scale-95`}
                      style={{ left: `${startIdx * 40}px`, width: `${duration * 40}px`, marginLeft: '4px' }}
                    >
                      <div className={`w-2 h-2 rounded-full mr-2 shrink-0 ${config.color.replace('text-', 'bg-')}`}></div>
                      <span className={`text-[10px] font-bold truncate whitespace-nowrap ${config.color}`}>{task.title}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legenda do Gráfico */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 shrink-0 rounded-b-[32px]">
        <div className="flex flex-wrap gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${config.bg.replace('100', '500')}`}></span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{status}</span>
            </div>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand dark:bg-brand-light"></span>
          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Interação em Tempo Real</p>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
