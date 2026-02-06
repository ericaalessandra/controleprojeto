
import React from 'react';
import { TaskStatus } from './types';

export const STATUS_CONFIG: Record<TaskStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  [TaskStatus.PLANNING]: {
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    icon: <i className="fas fa-lightbulb"></i>
  },
  [TaskStatus.EXECUTION]: {
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    icon: <i className="fas fa-spinner fa-spin"></i>
  },
  [TaskStatus.COMPLETED]: {
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    icon: <i className="fas fa-check-circle"></i>
  },
  [TaskStatus.CANCELLED]: {
    color: 'text-rose-600',
    bg: 'bg-rose-100',
    icon: <i className="fas fa-times-circle"></i>
  }
};
