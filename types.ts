
export enum TaskStatus {
  PLANNING = 'Em planejamento',
  EXECUTION = 'Em execução',
  COMPLETED = 'Concluído',
  CANCELLED = 'Cancelado'
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  data: string; // base64
  size: number;
  description?: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  email?: string; // Novo campo de e-mail de contato
  logoData: string;
  loginBgData?: string;
  chatBotIconData?: string; // Novo ícone do ChatBot
  primaryColor?: string;
  appName: string;
  // Campos Legais
  privacyPolicy?: string;
  termsOfUse?: string;
  // Campos "Sobre o Sistema"
  systemManufacturer?: string;
  systemVersion?: string;
  systemLastUpdate?: string;
  status: 'active' | 'inactive';
  contractActive: boolean;
  contractStartDate?: string;
  contractEndDate?: string;
  contractValue?: number;
  contractAttachments: Attachment[];
  aiPersona?: string;
  aiDefinitions?: string;
  createdAt: number;
}

export interface UserPermission {
  viewDashboard: boolean;
  viewProjects: boolean;
  viewScheduler: boolean; // Nova permissão
  viewReports: boolean;
  viewCompanies: boolean;
  viewUsers: boolean;
  viewLogs: boolean;
  viewProfiles: boolean;
  viewHelp: boolean;
  viewSettings: boolean;
  canViewAllProjects: boolean;
  canUseChatBot: boolean;
}

export interface UserRole {
  id: 'admin' | 'user';
  name: string;
  permissions: UserPermission;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  firstAccessDone?: boolean;
  lgpdConsent?: boolean;
  lgpdConsentDate?: string;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'LOGIN' | 'PROJECT_CREATE' | 'PROJECT_DELETE' | 'TASK_CREATE' | 'TASK_STATUS' | 'TASK_DELETE' | 'USER_STATUS' | 'CONFIG_UPDATE' | 'COMPANY_CREATE' | 'SCHEDULER_UPDATE';
  details: string;
  ipAddress?: string;
  deviceInfo?: string;
  timestamp: number;
}

export interface Task {
  id: string;
  projectId: string;
  companyId: string;
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
  linkedObjectives?: string[]; // IDs das metas globais do projeto vinculadas
  budget?: number;
  involved: string[];
  targetAudience: string;
  status: TaskStatus;
  attachments: Attachment[];
  createdAt: number;
}

// Nova interface para tarefas acessórias do Scheduler
export interface AccessoryTask {
  id: string;
  companyId: string;
  projectId?: string; // Opcional, para vincular a um projeto se desejado
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  createdAt: number;
}

export interface ProjectObjective {
  id: string;
  description: string;
  deadline?: string;
}

export interface Project {
  id: string;
  companyId: string;
  name: string;
  logoData?: string; // Logo específico do projeto
  description: string;
  totalBudget?: number;
  objectives: ProjectObjective[];
  status?: 'active' | 'inactive'; // ✅ Status do projeto
  createdAt: number;
  startDate?: string;
  endDate?: string;
}

export interface HelpResource {
  id: string;
  title: string;
  description?: string;
  type: 'pdf' | 'youtube';
  url?: string;
  fileData?: string;
  fileName?: string;
  thumbnailData?: string;
  isFeatured?: boolean;
  createdAt: number;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export interface ProjectPulse {
  score: number;
  status: 'Saudável' | 'Alerta' | 'Crítico';
  summary: string;
  insights: string[];
  lastUpdated: number;
}

export type ViewType = 'dashboard' | 'project' | 'scheduler' | 'reports' | 'help' | 'users' | 'logs' | 'settings' | 'companies' | 'profiles';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Invitation {
  id: string;
  email: string;
  companyId: string;
  role: 'admin' | 'user';
  invitedBy: string;
  status: 'pending' | 'accepted';
  createdAt: number;
}
