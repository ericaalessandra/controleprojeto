
import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task, ViewType, TaskStatus, HelpResource, User, ActivityLog, Company, ProjectObjective, UserRole, Notification, AccessoryTask, Invitation } from './types';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import ReportsView from './components/ReportsView';
import ResourcesView from './components/ResourcesView';
import UserManagement from './components/UserManagement';
import ActivityLogsView from './components/ActivityLogsView';
import SettingsView from './components/SettingsView';
import CompanyManagement from './components/CompanyManagement';
import AccessProfileManagement from './components/AccessProfileManagement';
import AIConfigView from './components/AIConfigView';
import NewProjectModal from './components/NewProjectModal';
import ConsolidatedReportModal from './components/ConsolidatedReportModal';
import SchedulerView from './components/SchedulerView';
import Login from './components/Login';
import ChatBot from './components/ChatBot';
import Toast from './components/Toast';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import { db } from './db';
import { supabase } from './supabase';
import { ensureContrast } from './colorUtils';

// Configurações de Sessão e Inatividade
const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutos
const WARNING_THRESHOLD_MS = 60 * 1000; // 1 minuto de aviso
const SESSION_CHECK_INTERVAL_MS = 10 * 1000; // Checar a cada 10 segundos

const DEFAULT_ROLES: UserRole[] = [
  {
    id: 'admin',
    name: 'Administrador',
    permissions: {
      viewDashboard: true,
      viewProjects: true,
      viewScheduler: true,
      viewReports: true,
      viewCompanies: true,
      viewUsers: true,
      viewLogs: true,
      viewProfiles: true,
      viewHelp: true,
      viewSettings: true,
      canViewAllProjects: true,
      canUseChatBot: true
    }
  },
  {
    id: 'user',
    name: 'Colaborador',
    permissions: {
      viewDashboard: true,
      viewProjects: true,
      viewScheduler: true,
      viewReports: true,
      viewCompanies: false,
      viewUsers: false,
      viewLogs: false,
      viewProfiles: false,
      viewHelp: true,
      viewSettings: true,
      canViewAllProjects: false,
      canUseChatBot: true
    }
  }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [accessoryTasks, setAccessoryTasks] = useState<AccessoryTask[]>([]);
  const [resources, setResources] = useState<HelpResource[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [clientIp, setClientIp] = useState<string>('0.0.0.0');
  const [roles, setRoles] = useState<UserRole[]>(DEFAULT_ROLES);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isConsolidatedReportOpen, setIsConsolidatedReportOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editingAICompanyId, setEditingAICompanyId] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [dashboardSelectedCompanyId, setDashboardSelectedCompanyId] = useState<string>('all');

  // Global Chatbot Icon (Master Company Logic)
  const globalChatBotIcon = React.useMemo(() => {
    const master = companies.find(c => c.name?.toLowerCase().includes('innova') || c.appName?.toLowerCase().includes('innova'));
    return master?.chatBotIconData || companies[0]?.chatBotIconData;
  }, [companies]);

  // Dynamic Favicon Effect
  useEffect(() => {
    const updateFavicon = (iconUrl: string | undefined) => {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      if (iconUrl) {
        link.href = iconUrl;
      }
    };

    updateFavicon(globalChatBotIcon);
  }, [globalChatBotIcon]);
  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Theme Management
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Session Inactivity States
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [isSessionWarningOpen, setIsSessionWarningOpen] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const notify = useCallback((type: Notification['type'], title: string, message: string) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    setNotifications(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    // Buscar IP para auditoria
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIp(data.ip))
      .catch(() => setClientIp('Offline/Local'));
  }, []);

  const logAction = useCallback(async (action: ActivityLog['action'], details: string) => {
    if (!currentUser) return;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    const newLog: ActivityLog = {
      id: id,
      companyId: currentUser.companyId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action,
      details,
      ipAddress: clientIp,
      deviceInfo: navigator.userAgent,
      timestamp: Date.now()
    };

    console.log('[AUDIT] Saving log:', { action, details, timestamp: newLog.timestamp });

    try {
      await db.saveLog(newLog);
      console.log('[AUDIT] Log saved successfully');
      setLogs(prev => [newLog, ...prev]);
    } catch (error) {
      console.error('[AUDIT] Failed to save log:', error);
    }
  }, [currentUser, clientIp]);

  const performLegacyMigration = useCallback(async (user: User) => {
    const migrationKey = `migration_done_${user.id}`;
    if (localStorage.getItem(migrationKey)) return;

    try {
      notify('info', 'Sincronizando Dados', 'Otimizando e enviando seus dados locais para a nuvem segura...');

      const [localProjects, localTasks, localAccessory] = await Promise.all([
        db.getProjectsByCompany(user.companyId),
        db.getTasksByCompany(user.companyId),
        db.getAccessoryTasksByCompany(user.companyId)
      ]);

      if (localProjects.length === 0) {
        localStorage.setItem(migrationKey, 'true');
        return;
      }

      // Upsert em lote (agora com status padrão)
      await supabase.from('projects').upsert(localProjects.map(p => ({
        id: p.id, company_id: p.companyId, name: p.name, description: p.description,
        total_budget: p.totalBudget, objectives: p.objectives, start_date: p.startDate,
        end_date: p.endDate, status: p.status || 'active', created_at: new Date(p.createdAt).toISOString(),
        logo_data: p.logoData
      })));

      await supabase.from('tasks').upsert(localTasks.map(t => ({
        id: t.id, project_id: t.projectId, company_id: t.companyId, title: t.title || (t as any).name,
        description: t.description, budget: t.budget, status: t.status, start_date: t.startDate,
        end_date: t.endDate, goal: t.goal, linked_objectives: t.linkedObjectives,
        involved: t.involved, target_audience: t.targetAudience, attachments: t.attachments,
        created_at: new Date(t.createdAt).toISOString()
      })));

      await supabase.from('accessory_tasks').upsert(localAccessory.map(at => ({
        id: at.id, company_id: at.companyId, project_id: at.projectId, title: at.title || (at as any).name,
        description: at.description, date: at.date, created_at: new Date(at.createdAt).toISOString()
      })));

      localStorage.setItem(migrationKey, 'true');
      notify('success', 'Migração Concluída', 'Seus dados foram sincronizados com sucesso.');

      setProjects(localProjects);
      setTasks(localTasks);
      setAccessoryTasks(localAccessory);

    } catch (error: any) {
      console.error("Migration Error:", error);
      notify('danger', 'Erro na Migração', 'Falha ao subir dados locais. Tente recarregar.');
    }
  }, [notify]);

  const loadEssentialData = useCallback(async (user: User | null) => {
    try {
      // 1. Carregar dados locais IMEDIATAMENTE para evitar tela em branco ou perda de branding
      const localCompanies = await db.getStoreData('COMPANIES');
      if (localCompanies.length > 0) {
        setCompanies(localCompanies as Company[]);
      }

      if (!user) {
        // Busca do Supabase para usuários não logados (branding) com RETRY
        let companiesData = null;
        let retries = 0;
        while (retries < 3) {
          const { data, error } = await supabase.from('companies').select('*');
          if (data && data.length > 0) {
            companiesData = data;
            break;
          }
          if (error) console.warn(`[Branding] Fetch attempt ${retries + 1} failed:`, error);
          retries++;
          if (retries < 3) await new Promise(r => setTimeout(r, 1000)); // Espera 1s entre retentativas
        }

        if (companiesData && companiesData.length > 0) {
          const mapped = companiesData.map(c => ({
            id: c.id,
            name: c.name,
            cnpj: c.cnpj,
            email: c.email,
            logoData: c.logo_data,
            loginBgData: c.login_bg_data,
            chatBotIconData: c.chatbot_icon_data,
            primaryColor: c.primary_color,
            appName: c.app_name,
            status: c.status,
            contractActive: c.contract_active,
            privacyPolicy: c.privacy_policy,
            termsOfUse: c.terms_of_use,
            aiPersona: c.ai_persona,
            aiDefinitions: c.ai_definitions,
            createdAt: new Date(c.created_at).getTime(),
            contractAttachments: []
          })) as Company[];

          // PRE-LOAD: Garantir que a imagem de fundo esteja no cache do navegador 
          // ANTES de liberar a tela de login. Isso evita o "flash" da imagem antiga.
          const master = mapped.find(c => c.name?.toLowerCase().includes('innova') || c.appName?.toLowerCase().includes('innova')) || mapped[0];
          if (master?.loginBgData && master.loginBgData.length > 500) {
            try {
              const img = new Image();
              const preloadPromise = new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
                // Timeout de 2s para não travar o app se a imagem falhar
                setTimeout(resolve, 2000);
              });
              img.src = master.loginBgData;
              await preloadPromise;
            } catch (e) {
              console.warn("[Branding] Preload failed, continuing...", e);
            }
          }

          setCompanies(mapped);
          for (const c of mapped) await db.saveCompanyLocally(c);
        } else {
          console.error("[Branding] Could not load branding data after 3 attempts.");
        }
        return;
      }

      // 2. Busca completa para usuários autenticados
      const [
        { data: sCompanies },
        { data: sProjects },
        { data: sTasks },
        { data: sAccessory },
        { data: sUsers },
        { data: sLogs },
        { data: sRoles },
        { data: sInvitations },
        { data: sResources }
      ] = await Promise.all([
        supabase.from('companies').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('accessory_tasks').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(200),
        supabase.from('roles').select('*'),
        supabase.from('invitations').select('*').eq('company_id', user.companyId),
        supabase.from('resources').select('*')
      ]);

      if (sCompanies) {
        const mapped = sCompanies.map(c => ({
          id: c.id,
          name: c.name,
          cnpj: c.cnpj,
          email: c.email,
          logoData: c.logo_data,
          loginBgData: c.login_bg_data,
          chatBotIconData: c.chatbot_icon_data,
          primaryColor: c.primary_color,
          appName: c.app_name,
          status: c.status,
          contractActive: c.contract_active,
          privacyPolicy: c.privacy_policy,
          termsOfUse: c.terms_of_use,
          aiPersona: c.ai_persona,
          aiDefinitions: c.ai_definitions,
          createdAt: new Date(c.created_at).getTime(),
          contractAttachments: []
        })) as Company[];
        setCompanies(mapped);
        const company = mapped.find(c => c.id === user.companyId) || null;
        setCurrentCompany(company);
        // Sincroniza localmente
        for (const c of mapped) await db.saveCompanyLocally(c);
      }

      if (sProjects) {
        const mapped = sProjects.map(p => ({
          id: p.id,
          companyId: p.company_id,
          name: p.name,
          description: p.description,
          totalBudget: Number(p.total_budget),
          objectives: p.objectives || [],
          createdAt: new Date(p.created_at).getTime(),
          startDate: p.start_date,
          endDate: p.end_date,
          logoData: p.logo_data
        })) as Project[];
        setProjects(mapped);

        if (mapped.length === 0 && user) {
          await performLegacyMigration(user);
        }
      }

      if (sTasks) {
        const mapped = sTasks.map(t => ({
          id: t.id,
          projectId: t.project_id,
          companyId: t.company_id,
          title: t.title || t.name,
          description: t.description,
          startDate: t.start_date,
          endDate: t.end_date,
          goal: t.goal,
          linkedObjectives: t.linked_objectives as string[],
          budget: Number(t.budget),
          involved: t.involved as string[],
          targetAudience: t.target_audience,
          status: t.status as TaskStatus,
          attachments: t.attachments as any[],
          createdAt: new Date(t.created_at).getTime()
        })) as Task[];
        setTasks(mapped);
      }

      if (sAccessory) {
        const mapped = sAccessory.map(at => ({
          id: at.id,
          companyId: at.company_id,
          projectId: at.project_id,
          date: at.date,
          title: at.title || at.name,
          description: at.description,
          createdAt: new Date(at.created_at).getTime()
        })) as AccessoryTask[];
        setAccessoryTasks(mapped);
      }

      if (sUsers) {
        const mapped = sUsers.map(u => ({
          id: u.id,
          companyId: u.company_id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          firstAccessDone: u.first_access_done,
          lgpdConsent: u.lgpd_consent,
          lgpdConsentDate: u.lgpd_consent_date,
          createdAt: new Date(u.created_at).getTime()
        })) as User[];
        setUsers(mapped);
        const targetUser = mapped.find(u => u.id === user.id);
        if (targetUser) setCurrentUser(targetUser);
      }

      if (sLogs) {
        const mapped = sLogs.map(l => ({
          id: l.id,
          companyId: l.company_id,
          userId: l.user_id,
          userName: l.user_name,
          userEmail: l.user_email,
          action: l.action,
          details: l.details,
          ipAddress: l.ip_address,
          deviceInfo: l.device_info,
          timestamp: l.timestamp ? (typeof l.timestamp === 'string' ? new Date(l.timestamp).getTime() : l.timestamp) : Date.now()
        })) as ActivityLog[];
        setLogs(mapped);
      }

      if (sRoles) {
        const mapped = sRoles.map(r => ({
          id: r.id,
          name: r.name,
          permissions: r.permissions
        })) as UserRole[];
        setRoles(mapped);
      }

      if (sInvitations) {
        const mapped = sInvitations.map(i => ({
          id: i.id,
          email: i.email,
          companyId: i.company_id,
          role: i.role,
          invitedBy: i.invited_by,
          status: i.status,
          createdAt: new Date(i.created_at).getTime()
        })) as Invitation[];
        setInvitations(mapped);
      }

      if (sResources) {
        const mapped = sResources.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
          type: r.type,
          url: r.url,
          fileData: r.file_data,
          fileName: r.file_name,
          createdAt: new Date(r.created_at).getTime()
        })) as HelpResource[];
        setResources(mapped);
      }

    } catch (error: any) {
      console.error("Critical Data Load Error:", error);
      notify('error', 'Erro de Sincronização', `Falha ao carregar dados: ${error.message}`);
    }
  }, [notify, performLegacyMigration]);

  const handleLogout = useCallback(async () => {
    if (!currentUser) return; // Guard para evitar loop infinito

    try {
      await logAction('LOGIN', 'Logout efetuado. Sessão encerrada.');
      // Tentamos deslogar do Supabase, mas não deixamos falhas travarem o app
      await supabase.auth.signOut().catch(e => console.error("Supabase SignOut Error:", e));
    } catch (err) {
      console.error("Logout Error:", err);
    } finally {
      // Limpeza local OBRIGATÓRIA (sempre ocorre independente do Supabase)
      setCurrentUser(null);
      setCurrentCompany(null);
      setProjects([]);
      setTasks([]);
      setAccessoryTasks([]);
      setUsers([]);
      setLogs([]);
      localStorage.removeItem('tf_user');
      setCurrentView('dashboard');
      setActiveProjectId(null);
      notify('info', 'Sessão Encerrada', 'Você saiu com segurança.');
    }
  }, [currentUser, logAction, notify]);

  useEffect(() => {
    let subscription: any = null;
    const initApp = async () => {
      try {
        await db.init();

        const existingCompanies = await db.getAllCompanies();
        setCompanies(existingCompanies);

        // Garantir que os papéis padrão existam localmente para cache
        const allRoles = await db.getAllRoles();
        if (allRoles.length === 0) {
          for (const role of DEFAULT_ROLES) await db.saveRole(role);
        }

        // 3. Tentar recuperar sessão de forma robusta
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Se temos uma sessão no Supabase, buscamos o perfil mais atualizado
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && profile.status === 'active') {
            // Mapear para interface User
            const user: User = {
              id: profile.id,
              companyId: profile.company_id,
              name: profile.name,
              email: profile.email,
              role: profile.role,
              status: profile.status,
              firstAccessDone: profile.first_access_done,
              lgpdConsent: profile.lgpd_consent,
              lgpdConsentDate: profile.lgpd_consent_date,
              createdAt: new Date(profile.created_at).getTime()
            };
            await loadEssentialData(user);
            setIsReady(true);
            return;
          }
        }

        await loadEssentialData(null);

        // Adiciona listener do Supabase
        const { data: authData } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
          } else if (event === 'SIGNED_OUT' && currentUser) {
            handleLogout();
          }
        });
        subscription = authData.subscription;

        setIsReady(true);
      } catch (error) {
        console.error("Critical Init Error:", error);
        notify('error', 'Falha no Sistema', 'O banco de dados local falhou ao iniciar. O sistema pode estar instável.');
      } finally {
        setIsReady(true);
      }
    };
    initApp();
    return () => { if (subscription) subscription.unsubscribe(); };
  }, []); // Removido deps que causavam loop (loadEssentialData, notify, handleLogout)

  // --- IDLE TIMER LOGIC ---
  useEffect(() => {
    if (!currentUser) {
      setIsSessionWarningOpen(false);
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const updateActivity = () => setLastActivity(Date.now());

    events.forEach(event => window.addEventListener(event, updateActivity));

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const diff = now - lastActivity;

      if (diff >= IDLE_TIMEOUT_MS - WARNING_THRESHOLD_MS && !isSessionWarningOpen) {
        setIsSessionWarningOpen(true);
      } else if (diff >= IDLE_TIMEOUT_MS) {
        handleLogout();
        setIsSessionWarningOpen(false);
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(checkInterval);
    };
  }, [currentUser, lastActivity, handleLogout, isSessionWarningOpen]);

  // Filter projects for Sidebar based on Dashboard company selection
  const filteredSidebarProjects = React.useMemo(() => {
    const isAdmin = currentUser?.role === 'admin';
    if (dashboardSelectedCompanyId === 'all' || !isAdmin) {
      return projects;
    }
    return projects.filter(p => p.companyId === dashboardSelectedCompanyId);
  }, [projects, dashboardSelectedCompanyId, currentUser]);

  const handleLogin = async (user: User) => {
    setIsReady(false);
    await loadEssentialData(user);
    await logAction('LOGIN', 'Acesso realizado com sucesso.');
    setIsReady(true);
    notify('success', `Bem-vindo, ${(user.name || 'Usuário').split(' ')[0]}`, 'Seu painel corporativo está pronto.');
  };


  const handleSaveProject = async (name: string, description: string, totalBudget?: number, objectives: ProjectObjective[] = [], startDate?: string, endDate?: string, logoData?: string) => {
    if (!currentUser) return '';
    try {
      const projectData: Project = projectToEdit
        ? { ...projectToEdit, name, description, totalBudget, objectives, startDate, endDate, logoData }
        : {
          id: crypto.randomUUID(),
          companyId: currentUser.companyId,
          name,
          description,
          totalBudget,
          objectives,
          startDate,
          endDate,
          logoData,
          status: 'active', // ✅ FIX CRÍTICO: Novo projeto sempre começa como 'active'
          createdAt: Date.now(),
        };

      await db.saveProject(projectData);

      if (projectToEdit) {
        setProjects(prev => prev.map(p => p.id === projectData.id ? projectData : p));
        notify('success', 'Projeto Atualizado', `"${name}" foi salvo.`);
        await logAction('CONFIG_UPDATE', `Editou o projeto: ${name}`);
      } else {
        setProjects(prev => [...prev, projectData]);
        setActiveProjectId(projectData.id);
        setCurrentView('project');
        notify('success', 'Iniciativa Criada', `"${name}" já está disponível.`);
        await logAction('PROJECT_CREATE', `Criou o projeto estratégico: ${name}`);
      }

      setProjectToEdit(null);
      return projectData.id;
    } catch (err) {
      notify('error', 'Erro', 'Falha ao gravar dados do projeto.');
      return '';
    }
  };

  if (!isReady) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f5f5f7] dark:bg-slate-900 gap-4">
      <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando Ecossistema...</p>
    </div>
  );

  // Se estiver em modo de recuperação de senha, força a tela de Login (Primeiro Acesso step 2)
  if (!currentUser || isPasswordRecovery) {
    return <Login onLogin={handleLogin} onRegister={async () => { }} companies={companies} notify={notify} forceRecovery={isPasswordRecovery} />;
  }

  const userRoleConfig = roles.find(r => r.id === (currentUser?.role || 'user')) || DEFAULT_ROLES[1];
  const perms = userRoleConfig.permissions;
  const brandColor = currentCompany?.primaryColor || '#0071e3';

  return (
    <div className="flex flex-col h-screen overflow-hidden dark:bg-slate-900 dark:text-white">
      <style>{`
        :root {
          --brand-primary: ${ensureContrast(brandColor, isDarkMode ? '#f8fafc' : '#ffffff')};
          --brand-primary-hover: ${ensureContrast(brandColor, isDarkMode ? '#f8fafc' : '#ffffff')}dd;
          --brand-primary-light: ${ensureContrast(brandColor, isDarkMode ? '#f8fafc' : '#ffffff')}1a;
        }
      `}</style>

      <Toast notifications={notifications} onRemove={removeNotification} />

      <SessionTimeoutModal
        isOpen={isSessionWarningOpen}
        warningTimeInSeconds={60}
        onExtend={() => {
          setLastActivity(Date.now());
          setIsSessionWarningOpen(false);
        }}
        onLogout={handleLogout}
      />

      <TopBar
        currentUser={currentUser}
        company={currentCompany}
        tasks={tasks}
        isSidebarVisible={!isSidebarCollapsed}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => {
          if (window.innerWidth < 1024) {
            setIsMobileMenuOpen(!isMobileMenuOpen);
          } else {
            setIsSidebarCollapsed(!isSidebarCollapsed);
          }
        }}
        onLogout={handleLogout}
        onSelectProject={(id) => { setActiveProjectId(id); setCurrentView('project'); setIsMobileMenuOpen(false); }}
        onGoSettings={() => { setCurrentView('settings'); setActiveProjectId(null); setIsMobileMenuOpen(false); }}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          projects={filteredSidebarProjects}
          activeProjectId={activeProjectId}
          currentView={currentView}
          currentUser={currentUser}
          userPermissions={perms}
          company={currentCompany}
          isCollapsed={isSidebarCollapsed}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
          onSelectProject={(id) => { setActiveProjectId(id); setCurrentView('project'); setIsMobileMenuOpen(false); }}
          onGoHome={() => { setCurrentView('dashboard'); setActiveProjectId(null); setIsMobileMenuOpen(false); }}
          onGoScheduler={() => { setCurrentView('scheduler'); setActiveProjectId(null); setIsMobileMenuOpen(false); }}
          onGoReports={() => { setCurrentView('reports'); setActiveProjectId(null); setIsMobileMenuOpen(false); }}
          onGoHelp={() => { setCurrentView('help'); setActiveProjectId(null); setIsMobileMenuOpen(false); }}
          onGoUsers={() => { setCurrentView('users'); setActiveProjectId(null); setIsMobileMenuOpen(false); }}
          onGoLogs={() => { setCurrentView('logs'); setActiveProjectId(null); setIsMobileMenuOpen(false); }}
          onGoSettings={() => { setCurrentView('settings'); setActiveProjectId(null); setIsMobileMenuOpen(false); }}
          onGoCompanies={() => { setCurrentView('companies'); setActiveProjectId(null); setIsMobileMenuOpen(false); }}
          onGoProfiles={() => { setCurrentView('profiles'); setActiveProjectId(null); setIsMobileMenuOpen(false); }}
          onNewProject={() => { setProjectToEdit(null); setIsProjectModalOpen(true); setIsMobileMenuOpen(false); }}
          onGoAIConfig={() => {
            setCurrentView('ai-config');
            setActiveProjectId(null);
            setIsMobileMenuOpen(false);
            setEditingAICompanyId(currentCompany?.id || companies[0]?.id || null);
          }}
          onLogout={handleLogout}
        />

        <main id="main-content" className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-slate-950 relative custom-scrollbar transition-all duration-300">
          {currentView === 'dashboard' && perms.viewDashboard && (
            <Dashboard
              projects={projects}
              tasks={tasks}
              companies={companies}
              isAdmin={perms.canViewAllProjects}
              isDarkMode={isDarkMode}
              selectedCompanyId={dashboardSelectedCompanyId}
              onSelectCompany={setDashboardSelectedCompanyId}
              onOpenProject={(id) => { setActiveProjectId(id); setCurrentView('project'); }}
              onDeleteProject={async (id) => {
                const p = projects.find(x => x.id === id);
                if (p) {
                  await db.deleteProject(id);
                  setProjects(prev => prev.filter(x => x.id !== id));
                  setTasks(prev => prev.filter(t => t.projectId !== id));
                  notify('warning', 'Removido', `Projeto "${p.name}" excluído.`);
                  await logAction('PROJECT_DELETE', `Excluiu o projeto: ${p.name}`);
                }
              }}
              onNewProject={() => { setProjectToEdit(null); setIsProjectModalOpen(true); }}
              onGenerateConsolidatedReport={() => setCurrentView('reports')}
            />
          )}

          {currentView === 'scheduler' && perms.viewScheduler && (
            <SchedulerView
              projects={projects}
              tasks={tasks}
              accessoryTasks={accessoryTasks}
              companies={companies}
              currentCompanyId={currentUser?.companyId || ''}
              isAdmin={perms.canViewAllProjects}
              onAddAccessoryTask={async (t) => {
                await db.saveAccessoryTask(t);
                setAccessoryTasks(prev => [...prev, t]);
                await logAction('SCHEDULER_UPDATE', `Adicionou tarefa acessória: ${t.title}`);
                notify('success', 'Agenda', 'Tarefa adicionada ao scheduler.');
              }}
              onDeleteAccessoryTask={async (id) => {
                await db.deleteAccessoryTask(id);
                setAccessoryTasks(prev => prev.filter(x => x.id !== id));
                notify('info', 'Agenda', 'Tarefa removida.');
              }}
            />
          )}

          {currentView === 'reports' && perms.viewReports && (
            <ReportsView
              projects={projects}
              tasks={tasks}
              companies={companies}
              currentCompany={currentCompany}
            />
          )}

          {currentView === 'companies' && perms.viewCompanies && (
            <CompanyManagement
              companies={companies}
              projects={projects}
              onSave={async (c) => {
                await db.saveCompany(c);
                setCompanies(prev => {
                  const exists = prev.some(old => old.id === c.id);
                  return exists ? prev.map(old => old.id === c.id ? c : old) : [...prev, c];
                });
                if (currentCompany?.id === c.id) setCurrentCompany(c);
                await logAction('COMPANY_CREATE', `Configurou/Atualizou unidade: ${c.name}`);
              }}
              onDelete={async (id) => {
                const c = companies.find(x => x.id === id);
                if (c) {
                  await db.deleteCompany(id);
                  setCompanies(prev => prev.filter(x => x.id !== id));
                  setProjects(prev => prev.filter(p => p.companyId !== id));
                  setTasks(prev => prev.filter(t => t.companyId !== id));
                  setAccessoryTasks(prev => prev.filter(t => t.companyId !== id));
                  notify('warning', 'Unidade Excluída', `A unidade "${c.name}" e todos os seus dados vinculados foram removidos.`);
                  await logAction('COMPANY_DELETE', `Excluiu a unidade e dependências: ${c.name}`);
                }
              }}
            />
          )}

          {currentView === 'users' && perms.viewUsers && (
            <UserManagement
              users={users}
              companies={companies}
              onUpdateUser={async (u) => {
                await db.saveUser(u);
                setUsers(prev => prev.map(old => old.id === u.id ? u : old));
                await logAction('CONFIG_UPDATE', `Atualizou dados do usuário: ${u.name}`);
              }}
              onDeleteUser={async (id) => {
                const u = users.find(x => x.id === id);
                await db.deleteUser(id);
                setUsers(prev => prev.filter(u => u.id !== id));
                if (u) await logAction('USER_STATUS', `Removeu o usuário: ${u.name}`);
              }}
              onToggleStatus={async (id) => {
                const u = users.find(x => x.id === id);
                if (u && u.id !== currentUser?.id) {
                  const updated = { ...u, status: u.status === 'active' ? 'inactive' : 'active' } as User;
                  await db.saveUser(updated);
                  setUsers(prev => prev.map(x => x.id === id ? updated : x));
                  await logAction('USER_STATUS', `Alterou status do usuário ${u.name} para ${updated.status}`);
                }
              }}
              onAddUser={async (u) => {
                await db.saveUser(u);
                setUsers(prev => [...prev, u]);
                await logAction('USER_STATUS', `Cadastrou novo usuário: ${u.name}`);
              }}
              invitations={invitations}
              onAddInvitation={async (invite) => {
                if (!currentUser) return;
                try {
                  const newInvite = { ...invite, invitedBy: currentUser.id };
                  await db.saveInvitation(newInvite);
                  setInvitations(prev => [...prev, newInvite]);
                  notify('success', 'Convite Enviado', `O e-mail ${invite.email} foi autorizado.`);
                  await logAction('USER_STATUS', `Autorizou e-mail: ${invite.email}`);
                } catch (err: any) {
                  console.error(err);
                  notify('danger', 'Erro ao Autorizar', `Não foi possível salvar o convite: ${err.message || 'Erro de rede ou permissão'}`);
                }
              }}
              onDeleteInvitation={async (id) => {
                await db.deleteInvitation(id);
                setInvitations(prev => prev.filter(i => i.id !== id));
                notify('info', 'Convite Removido', 'A autorização foi revogada.');
              }}
            />
          )}

          {currentView === 'logs' && perms.viewLogs && <ActivityLogsView logs={logs} users={users} currentCompany={currentCompany} />}

          {currentView === 'ai-config' && perms.viewSettings && (
            <AIConfigView
              currentCompanyId={editingAICompanyId || currentCompany?.id || ''}
              companies={companies}
              onChangeCompany={(id) => setEditingAICompanyId(id)}
              onSave={async (c, applyToAll) => {
                if (applyToAll) {
                  const updates = companies.map(comp => ({
                    ...comp,
                    aiPersona: c.aiPersona,
                    aiDefinitions: c.aiDefinitions
                  }));

                  setCompanies(updates);
                  if (currentCompany) setCurrentCompany(updates.find(u => u.id === currentCompany.id) || null);

                  for (const comp of updates) {
                    await db.saveCompany(comp);
                  }
                  await logAction('CONFIG_UPDATE', 'Replicou regras de IA para TODAS as empresas');
                  notify('success', 'IA Global Atualizada', 'Regras aplicadas a todo o ecossistema.');
                } else {
                  await db.saveCompany(c);
                  setCompanies(prev => prev.map(old => old.id === c.id ? c : old));
                  if (currentCompany?.id === c.id) setCurrentCompany(c);
                  await logAction('CONFIG_UPDATE', `Atualizou IA da empresa: ${c.name}`);
                  notify('success', 'IA Atualizada', 'Cérebro reconfigurado com sucesso.');
                }
              }}
            />
          )}

          {currentView === 'profiles' && perms.viewProfiles && (
            <AccessProfileManagement
              roles={roles}
              onSaveRole={async (role) => {
                await db.saveRole(role);
                setRoles(prev => prev.map(r => r.id === role.id ? role : r));
                await logAction('CONFIG_UPDATE', `Alterou permissões do perfil: ${role.name}`);
              }}
            />
          )}

          {currentView === 'settings' && perms.viewSettings && (
            <SettingsView
              user={currentUser}
              company={currentCompany!}
              onUpdateUser={async (u) => {
                await db.saveUser(u);
                setCurrentUser(u);
                await logAction('CONFIG_UPDATE', 'Atualizou configurações de perfil pessoal.');
              }}
              onUpdateCompany={async (c) => {
                // Se o fundo de tela mudou, tratamos como configuração GLOBAL do sistema
                const bgChanged = c.loginBgData !== currentCompany?.loginBgData;

                if (bgChanged && c.loginBgData) {
                  const updatedCompanies = companies.map(comp => {
                    if (comp.id === c.id) {
                      // Para a empresa editada, mantém TODOS os dados novos (Logo, Nome, etc)
                      return c;
                    }
                    // Para as outras empresas, propaga APENAS o fundo de tela
                    return {
                      ...comp,
                      loginBgData: c.loginBgData
                    };
                  });

                  // 1. Atualizar Estado em Memória IMEDIATAMENTE (Reatividade Instantânea)
                  setCompanies(updatedCompanies);
                  const updatedCurrent = updatedCompanies.find(comp => comp.id === c.id) || c;
                  setCurrentCompany(updatedCurrent);

                  // 2. Persistência em Segundo Plano (Paralela)
                  // Usamos um loop para garantir que cada empresa seja salva corretamente
                  // Para performance futura, poderíamos usar um bulk upsert no db.ts
                  for (const comp of updatedCompanies) {
                    await db.saveCompany(comp);
                  }

                  await logAction('CONFIG_UPDATE', 'Atualizou Fundo de Tela do Sistema (Global)');
                  notify('success', 'Wallpaper Atualizado', 'A nova imagem será aplicada a todo o sistema.');
                } else {
                  await db.saveCompany(c);
                  setCompanies(prev => prev.map(old => old.id === c.id ? c : old));
                  setCurrentCompany(c);
                  await logAction('CONFIG_UPDATE', 'Atualizou configurações da unidade.');
                }
              }}
            />
          )}

          {currentView === 'project' && activeProjectId && (
            <ProjectView
              project={projects.find(p => p.id === activeProjectId)!}
              company={companies.find(c => c.id === projects.find(p => p.id === activeProjectId)?.companyId) || null}
              tasks={tasks.filter(t => t.projectId === activeProjectId)}
              onAddTask={async (taskData) => {
                const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
                const newTask: Task = { ...taskData, id: safeId, companyId: currentUser.companyId, createdAt: Date.now() };
                await db.saveTask(newTask);
                setTasks(prev => [...prev, newTask]);
                await logAction('TASK_CREATE', `Adicionou nova ação: ${taskData.title}`);
              }}
              onUpdateTask={async (task) => {
                await db.saveTask(task);
                setTasks(prev => prev.map(t => t.id === task.id ? task : t));
                await logAction('CONFIG_UPDATE', `Editou detalhes da ação: ${task.title}`);
              }}
              onUpdateStatus={async (id, s) => {
                const t = tasks.find(x => x.id === id);
                if (t) {
                  const updated = { ...t, status: s };
                  await db.saveTask(updated);
                  setTasks(prev => prev.map(x => x.id === id ? updated : x));
                  await logAction('TASK_STATUS', `Alterou status da ação "${t.title}" para ${s}`);
                }
              }}
              onDeleteTask={async (id) => {
                const t = tasks.find(x => x.id === id);
                await db.deleteTask(id);
                setTasks(prev => prev.filter(x => x.id !== id));
                if (t) await logAction('TASK_DELETE', `Removeu a ação: ${t.title}`);
              }}
              onEditProject={(p) => { setProjectToEdit(p); setIsProjectModalOpen(true); }}
              onDeleteProject={async (id) => {
                const p = projects.find(x => x.id === id);
                await db.deleteProject(id);
                setProjects(prev => prev.filter(x => x.id !== id));
                setCurrentView('dashboard');
                if (p) await logAction('PROJECT_DELETE', `Excluiu o projeto: ${p.name}`);
              }}
            />
          )}

          {currentView === 'help' && perms.viewHelp && (
            <ResourcesView
              currentUser={currentUser!}
              resources={resources}
              onAddResource={async (res) => {
                await db.saveResource(res);
                setResources(prev => [...prev, res]);
                await logAction('CONFIG_UPDATE', `Adicionou recurso de ajuda: ${res.title}`);
              }}
              onUpdateResource={async (res) => {
                await db.saveResource(res);
                setResources(prev => prev.map(r => r.id === res.id ? res : r));
                await logAction('CONFIG_UPDATE', `Editou recurso de ajuda: ${res.title}`);
              }}
              onDeleteResource={async (id) => {
                const res = resources.find(x => x.id === id);
                await db.deleteResource(id);
                setResources(prev => prev.filter(r => r.id !== id));
                if (res) await logAction('CONFIG_UPDATE', `Removeu recurso de ajuda: ${res.title}`);
              }}
            />
          )}
        </main>
      </div>

      {perms.canUseChatBot && currentUser && (
        <ChatBot projects={projects} tasks={tasks} accessoryTasks={accessoryTasks} userName={currentUser.name || 'Usuário'} company={currentCompany} customIcon={globalChatBotIcon} />
      )}

      {isProjectModalOpen && (
        <NewProjectModal
          projectToEdit={projectToEdit || undefined}
          company={currentCompany}
          onClose={() => { setIsProjectModalOpen(false); setProjectToEdit(null); }}
          onSave={handleSaveProject}
        />
      )}

      {isConsolidatedReportOpen && (
        <ConsolidatedReportModal
          projects={projects}
          tasks={tasks}
          companies={companies}
          currentCompany={currentCompany}
          onClose={() => setIsConsolidatedReportOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
