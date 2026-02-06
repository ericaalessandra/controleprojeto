
import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import { STATUS_CONFIG } from '../constants';

interface TaskCardProps {
  task: Task;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onSelect: () => void;
  onEdit: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdateStatus, onDeleteTask, onSelect, onEdit }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canEdit = task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      onClick={onSelect}
      className={`group bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm transition-all relative cursor-pointer hover-lift ${isDragging ? 'opacity-30 border-dashed border-indigo-400 scale-95 shadow-none' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md'
        } ${showStatusMenu ? 'z-50 ring-2 ring-indigo-100 dark:ring-indigo-900' : 'z-0'}`}
    >
      <div className="flex justify-between items-start mb-2.5">
        {/* Título sem line-clamp para leitura completa */}
        <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-tight flex-1 mr-3 text-[13px]">{task.title}</h4>

        {/* Ações com Touch Targets maiores */}
        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
          {canEdit && (
            <button
              onClick={onEdit}
              className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all active:scale-95"
              aria-label="Editar"
            >
              <i className="fas fa-edit text-[11px]"></i>
            </button>
          )}
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${showStatusMenu ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
            aria-label="Opções"
          >
            <i className="fas fa-ellipsis-v text-[11px]"></i>
          </button>

          {showStatusMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[60] py-2 animate-apple">
              {Object.values(TaskStatus).map(s => (
                <button
                  key={s}
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus(task.id, s); setShowStatusMenu(false); }}
                  className={`w-full text-left px-4 py-3 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 ${task.status === s ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-600 dark:text-slate-300 font-medium'}`}
                >
                  <span className={STATUS_CONFIG[s].color}>{STATUS_CONFIG[s].icon}</span> {s}
                </button>
              ))}
              <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
              <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); setShowStatusMenu(false); }} className="w-full text-left px-4 py-3 text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-bold flex items-center gap-3">
                <i className="fas fa-trash-alt"></i> Excluir Ação
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 font-medium leading-relaxed">
        {task.description ? (task.description.length > 80 ? task.description.substring(0, 80) + '...' : task.description) : 'Sem descrição.'}
      </p>

      <div className="flex flex-col gap-2 mt-auto">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 w-fit">
          <i className="far fa-calendar-alt text-[10px] text-slate-400"></i>
          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
            {task.startDate ? `${task.startDate} » ${task.endDate}` : 'S/ Data'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-50 dark:border-slate-700 mt-1">
          {task.budget ? (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
              R$ {task.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          ) : <span className="text-[9px] text-slate-300 dark:text-slate-600 font-bold">--</span>}

          <div className="flex -space-x-2 pl-2">
            {task.involved && task.involved.slice(0, 3).map((name, i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-indigo-600 text-[8px] flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-white dark:ring-slate-800" title={name}>
                {name.charAt(0).toUpperCase()}
              </div>
            ))}
            {task.involved && task.involved.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 text-[8px] flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 shadow-sm">
                +{task.involved.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
