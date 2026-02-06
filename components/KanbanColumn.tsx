
import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import { STATUS_CONFIG } from '../constants';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onUpdateStatus,
  onDeleteTask,
  onSelectTask,
  onEditTask
}) => {
  const config = STATUS_CONFIG[status];
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onUpdateStatus(taskId, status);
    }
  };

  return (
    <div
      className={`w-[85vw] sm:w-80 shrink-0 flex flex-col rounded-2xl border transition-all duration-300 ${isOver ? 'bg-indigo-50/50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 ring-4 ring-indigo-500/5 shadow-inner scale-[1.02]' : 'bg-slate-100/30 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-t-2xl z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-lg ${config.bg} dark:bg-opacity-20 ${config.color} flex items-center justify-center text-sm shadow-sm`}>
            {config.icon}
          </span>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{status}</h3>
        </div>
        <span className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
          {tasks.length}
        </span>
      </div>

      <div className="p-3 space-y-3 min-h-[200px]">
        {tasks.length === 0 ? (
          <div className="h-full min-h-[150px] border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50/30 dark:bg-slate-900/30">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Vazio</p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdateStatus={onUpdateStatus}
              onDeleteTask={onDeleteTask}
              onSelect={() => onSelectTask(task)}
              onEdit={() => onEditTask(task)}
            />
          ))
        )}
        {/* Espaço extra no final para facilitar o drop em listas longas */}
        <div className="h-10 w-full"></div>
      </div>
    </div>
  );
};

export default KanbanColumn;
