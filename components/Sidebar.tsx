
import React from 'react';
import { Project, ViewType, User, Company, UserPermission } from '../types';
import { useLanguage } from '../LanguageContext';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  currentView: ViewType;
  currentUser: User;
  userPermissions: UserPermission;
  company: Company | null;
  isCollapsed: boolean;
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  onSelectProject: (id: string) => void;
  onGoHome: () => void;
  onGoScheduler: () => void;
  onGoReports: () => void;
  onGoHelp: () => void;
  onGoUsers: () => void;
  onGoLogs: () => void;
  onGoSettings: () => void;
  onGoCompanies: () => void;
  onGoProfiles: () => void;
  onLogout: () => void;
  onNewProject: () => void;
  onGoAIConfig: () => void;
}

const NavItem = ({ label, icon, active, onClick, color = "text-slate-500", isCollapsed }: any) => (
  <button
    onClick={onClick}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    title={isCollapsed ? label : undefined}
    className={`w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 rounded-xl transition-all duration-300 group focus:ring-inset active-press ${active
      ? 'bg-brand text-white shadow-lg shadow-brand'
      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[#1d1d1f] dark:text-slate-300 hover-glow'
      } ${isCollapsed ? 'justify-center px-2' : ''}`}
  >
    <i className={`fas ${icon} w-5 text-center ${active ? 'text-white' : color} group-hover:scale-110 transition-transform`} aria-hidden="true"></i>
    {!isCollapsed && (
      <span className="text-[13px] font-semibold truncate animate-apple">{label}</span>
    )}
  </button>
);

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

const Sidebar: React.FC<SidebarProps> = ({
  projects,
  activeProjectId,
  currentView,
  currentUser,
  userPermissions,
  company,
  isCollapsed,
  isMobileMenuOpen,
  onCloseMobileMenu,
  onSelectProject,
  onGoHome,
  onGoScheduler,
  onGoReports,
  onGoHelp,
  onGoUsers,
  onGoLogs,
  onGoSettings,
  onGoCompanies,
  onGoProfiles,
  onLogout,
  onNewProject,
  onGoAIConfig
}) => {
  const { t } = useLanguage();

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] lg:hidden"
          onClick={onCloseMobileMenu}
        />
      )}

      <aside
        role="navigation"
        aria-label="Menu principal"
        className={`
          fixed lg:relative inset-y-0 left-0 z-[200]
          bg-white dark:bg-slate-900 flex flex-col h-full border-r border-slate-200 dark:border-slate-800 shrink-0 shadow-sm overflow-hidden
          transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed && !isMobileMenuOpen ? 'lg:w-20' : 'lg:w-72'}
        `}
      >
        <div className={`${isCollapsed && !isMobileMenuOpen ? 'p-4' : 'p-8 pb-4'}`}>
          <div className="flex items-center justify-between lg:hidden mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-sm">
              <i className="fas fa-cube text-xs"></i>
            </div>
            <button onClick={onCloseMobileMenu} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 active-press">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
          <div className="space-y-1.5">
            {userPermissions.viewDashboard && (
              <NavItem
                label={t('menu_dashboard')}
                icon="fa-chart-pie"
                active={currentView === 'dashboard'}
                onClick={onGoHome}
                color="text-brand"
                isCollapsed={isCollapsed && !isMobileMenuOpen}
              />
            )}
          </div>
        </div>

        <nav className={`flex-1 overflow-y-auto custom-scrollbar ${isCollapsed && !isMobileMenuOpen ? 'px-2' : 'px-6'} space-y-8 pb-10`}>
          {userPermissions.viewProjects && (
            <div>
              <div className={`flex items-center mb-4 px-2 ${isCollapsed && !isMobileMenuOpen ? 'justify-center' : 'justify-between'}`}>
                {!(isCollapsed && !isMobileMenuOpen) && (
                  <h3 className="text-[11px] font-bold text-[#86868b] dark:text-slate-500 uppercase tracking-[0.15em] animate-apple">{t('menu_projects')}</h3>
                )}
                <button
                  onClick={onNewProject}
                  aria-label={t('new_project_btn')}
                  title={t('new_project_btn')}
                  className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-brand hover:text-white flex items-center justify-center text-[10px] transition-all"
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              <div className="space-y-1">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    aria-label={`Abrir projeto ${project.name}`}
                    title={isCollapsed && !isMobileMenuOpen ? project.name : undefined}
                    className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all truncate group active-press ${activeProjectId === project.id ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover-glow'
                      } ${isCollapsed && !isMobileMenuOpen ? 'justify-center px-2' : ''}`}
                  >
                    <i
                      className={`fas fa-folder-open text-xs shrink-0 transition-opacity ${activeProjectId === project.id
                        ? 'text-brand'
                        : `${getProjectIconColor(project.id)} opacity-80 group-hover:opacity-100`
                        }`}
                      aria-hidden="true"
                    ></i>
                    {!(isCollapsed && !isMobileMenuOpen) && (
                      <span className="text-[13px] font-medium truncate animate-apple">{project.name}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(userPermissions.viewReports || userPermissions.viewScheduler) && (
            <div>
              {!(isCollapsed && !isMobileMenuOpen) && (
                <h3 className="text-[11px] font-bold text-[#86868b] dark:text-slate-500 uppercase tracking-[0.15em] mb-4 px-2 animate-apple">{t('menu_intelligence')}</h3>
              )}
              <div className="space-y-1">
                {userPermissions.viewScheduler && (
                  <NavItem
                    label={t('menu_scheduler')}
                    icon="fa-calendar-days"
                    active={currentView === 'scheduler'}
                    onClick={onGoScheduler}
                    color="text-indigo-600 dark:text-indigo-400"
                    isCollapsed={isCollapsed && !isMobileMenuOpen}
                  />
                )}
                {userPermissions.viewReports && (
                  <NavItem
                    label={t('menu_reports')}
                    icon="fa-file-contract"
                    active={currentView === 'reports'}
                    onClick={onGoReports}
                    color="text-cyan-600 dark:text-cyan-400"
                    isCollapsed={isCollapsed && !isMobileMenuOpen}
                  />
                )}
              </div>
            </div>
          )}

          {(userPermissions.viewCompanies || userPermissions.viewUsers || userPermissions.viewLogs || userPermissions.viewProfiles) && (
            <div>
              {!(isCollapsed && !isMobileMenuOpen) && (
                <h3 className="text-[11px] font-bold text-[#86868b] dark:text-slate-500 uppercase tracking-[0.15em] mb-4 px-2 animate-apple">{t('menu_management')}</h3>
              )}
              <div className="space-y-1">
                {userPermissions.viewCompanies && <NavItem label={t('menu_units')} icon="fa-building" active={currentView === 'companies'} onClick={onGoCompanies} color="text-indigo-500 dark:text-indigo-400" isCollapsed={isCollapsed && !isMobileMenuOpen} />}
                {userPermissions.viewUsers && <NavItem label={t('menu_users')} icon="fa-users" active={currentView === 'users'} onClick={onGoUsers} color="text-emerald-500 dark:text-emerald-400" isCollapsed={isCollapsed && !isMobileMenuOpen} />}
                {userPermissions.viewProfiles && <NavItem label={t('menu_profiles')} icon="fa-id-badge" active={currentView === 'profiles'} onClick={onGoProfiles} color="text-brand" isCollapsed={isCollapsed && !isMobileMenuOpen} />}
                {userPermissions.viewLogs && <NavItem label={t('menu_audit')} icon="fa-clock-rotate-left" active={currentView === 'logs'} onClick={onGoLogs} color="text-amber-500 dark:text-amber-400" isCollapsed={isCollapsed && !isMobileMenuOpen} />}
                {currentUser?.role === 'admin' && <NavItem label="Inteligência Artificial" icon="fa-robot" active={currentView === 'ai-config'} onClick={onGoAIConfig} color="text-purple-600 dark:text-purple-400" isCollapsed={isCollapsed && !isMobileMenuOpen} />}
              </div>
            </div>
          )}

          <div>
            {!(isCollapsed && !isMobileMenuOpen) && (
              <h3 className="text-[11px] font-bold text-[#86868b] dark:text-slate-500 uppercase tracking-[0.15em] mb-4 px-2 animate-apple">{t('menu_system')}</h3>
            )}
            <div className="space-y-1">
              {userPermissions.viewHelp && <NavItem label={t('menu_help')} icon="fa-life-ring" active={currentView === 'help'} onClick={onGoHelp} color="text-slate-400" isCollapsed={isCollapsed && !isMobileMenuOpen} />}
              {userPermissions.viewSettings && <NavItem label={t('menu_settings')} icon="fa-sliders" active={currentView === 'settings'} onClick={onGoSettings} color="text-slate-400" isCollapsed={isCollapsed && !isMobileMenuOpen} />}
            </div>
          </div>
        </nav>

        <div className={`${isCollapsed && !isMobileMenuOpen ? 'p-2' : 'p-6'} border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 transition-all duration-300`}>
          <div className={`flex items-center gap-3 mb-4 ${isCollapsed && !isMobileMenuOpen ? 'justify-center' : ''}`}>
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold shadow-sm shrink-0 border-2 border-white dark:border-slate-600 overflow-hidden"
            >
              {(currentUser?.name || 'U').charAt(0)}
            </div>
            {!(isCollapsed && !isMobileMenuOpen) && (
              <div className="flex-1 min-w-0 text-left animate-apple">
                <p className="text-[12px] font-bold text-[#1d1d1f] dark:text-slate-200 truncate leading-tight">{currentUser?.name || t('user_placeholder')}</p>
                <p className="text-[9px] text-brand font-black uppercase tracking-widest truncate">
                  {company?.name || t('unit_placeholder')}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            aria-label={t('menu_logout')}
            title={isCollapsed && !isMobileMenuOpen ? t('menu_logout') : undefined}
            className={`w-full py-2.5 rounded-xl text-rose-500 font-bold text-[11px] hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900/30 ${isCollapsed && !isMobileMenuOpen ? 'px-0' : ''}`}
          >
            <i className="fas fa-power-off" aria-hidden="true"></i>
            {!(isCollapsed && !isMobileMenuOpen) && <span className="animate-apple">{t('menu_logout')}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
