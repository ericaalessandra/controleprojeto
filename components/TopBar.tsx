
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Company, Task, TaskStatus } from '../types';
import { useLanguage } from '../LanguageContext';
import { Language } from '../locales';

interface TopBarProps {
  currentUser: User;
  company: Company | null;
  tasks: Task[];
  isSidebarVisible: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onLogout: () => void;
  onSelectProject: (id: string) => void;
  onGoSettings: () => void;
}

const addBusinessDays = (startDate: Date, days: number): Date => {
  let result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) added++;
  }
  return result;
};

const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  company,
  tasks,
  isSidebarVisible,
  isDarkMode,
  onToggleTheme,
  onToggleSidebar,
  onLogout,
  onSelectProject,
  onGoSettings
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfile(false);
      if (notifyRef.current && !notifyRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (aboutRef.current && !aboutRef.current.contains(event.target as Node)) setShowAbout(false);
      if (langRef.current && !langRef.current.contains(event.target as Node)) setShowLangMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const criticalTasks = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const threeBusinessDaysAheadStr = addBusinessDays(today, 3).toISOString().split('T')[0];

    return tasks.filter(t => {
      if (!t.endDate || t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED) return false;
      return t.endDate <= threeBusinessDaysAheadStr;
    }).map(t => ({
      ...t,
      isLate: (t.endDate || '') < todayStr
    })).sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''));
  }, [tasks]);

  const flags: Record<Language, string> = {
    pt: '🇧🇷',
    en: '🇺🇸',
    es: '🇪🇸'
  };

  const langLabels: Record<Language, string> = {
    pt: 'Português',
    en: 'English',
    es: 'Español'
  };

  return (
    <header className="h-20 glass sticky top-0 z-[100] flex items-center justify-between px-4 sm:px-10 border-b border-white/20 dark:border-white/5 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-6">
        <button
          onClick={onToggleSidebar}
          aria-label={isSidebarVisible ? "Recolher menu lateral" : "Expandir menu lateral"}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 focus:ring-2 active-press`}
          title={isSidebarVisible ? "Ocultar Menu" : "Mostrar Menu"}
        >
          <i className={`fas ${isSidebarVisible ? 'fa-bars-staggered' : 'fa-bars'} text-lg`}></i>
        </button>

        {company?.logoData && (
          <div className="h-10 sm:h-12 w-auto min-w-[40px] max-w-[150px] px-2 rounded-xl overflow-hidden flex items-center justify-center bg-white border border-slate-100 dark:border-slate-700 shadow-sm transition-all">
            <img src={company.logoData} className="max-w-full max-h-full object-contain p-1" alt="Company Logo" />
          </div>
        )}

        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2 hidden lg:block"></div>
        <div className="hidden lg:flex flex-col" aria-hidden="true">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">{t('system_status')}</span>
          <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {t('synchronized')}
          </span>
        </div>

        {/* Botão Sobre com Popover */}
        <div className="relative" ref={aboutRef}>
          <button
            onClick={() => setShowAbout(!showAbout)}
            className={`ml-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${showAbout ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            {t('about')}
          </button>

          {showAbout && (
            <div className="absolute top-12 left-0 w-72 bg-white dark:bg-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl border border-slate-100 dark:border-slate-700 z-50 animate-apple overflow-hidden origin-top-left">
              <div className="p-4 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Informações</h4>
                <button onClick={() => setShowAbout(false)} className="w-6 h-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-colors">
                  <i className="fas fa-times text-[10px]"></i>
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden shrink-0">
                    {company?.logoData ? <img src={company.logoData} className="w-full h-full object-contain p-1.5" /> : <i className="fas fa-cube text-slate-300"></i>}
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fabricante</p>
                    <p className="text-xs font-bold text-brand flex items-center gap-1">
                      <i className="fas fa-code text-[10px]"></i> {company?.systemManufacturer || 'Innova4Up.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50 dark:border-slate-700">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Versão</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <i className="fas fa-code-branch text-[10px] text-slate-300"></i> {company?.systemVersion || '1.0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Atualização</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <i className="far fa-clock text-[10px] text-slate-300"></i> {company?.systemLastUpdate || 'Jan/2026'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-700 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  {t('copyright')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Language Switcher - Ícone Ajustado para Globo */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 active-press ${showLangMenu ? 'bg-brand text-white shadow-lg' : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover-glow'}`}
            title="Mudar Idioma"
          >
            <i className="fas fa-globe text-base sm:text-lg"></i>
          </button>

          {showLangMenu && (
            <div className="absolute top-16 right-0 w-44 bg-white dark:bg-slate-800 shadow-xl rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-apple z-50">
              {(Object.keys(flags) as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${language === lang ? 'text-brand bg-brand-light dark:bg-brand/10' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  <span className="text-xl">{flags[lang]}</span>
                  {langLabels[lang]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggle Theme Button */}
        <button
          onClick={onToggleTheme}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 active-press bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover-glow"
          title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
        >
          <i className={`fas ${isDarkMode ? 'fa-sun text-amber-400' : 'fa-moon text-indigo-500'} text-base sm:text-lg`}></i>
        </button>

        <div className="relative" ref={notifyRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={`Visualizar ${criticalTasks.length} notificações de prazos`}
            className={`w-12 h-12 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 relative focus:ring-2 active-press ${showNotifications
              ? 'bg-brand text-white shadow-xl shadow-brand'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-brand bg-slate-50 dark:bg-slate-800 hover-glow'
              }`}
          >
            <i className="fas fa-bell text-sm"></i>
            {criticalTasks.length > 0 && (
              <span className={`absolute top-2 right-2 sm:top-3 sm:right-3 w-2 sm:h-2 sm:w-2.5 sm:h-2.5 rounded-full border-2 border-white dark:border-slate-800 animate-pulse ${criticalTasks.some(t => t.isLate) ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
            )}
          </button>

          {showNotifications && (
            <div
              className="absolute top-16 right-0 w-80 sm:w-96 bg-white dark:bg-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-[24px] sm:rounded-[32px] border border-slate-100 dark:border-slate-700 p-2 z-50 animate-apple overflow-hidden"
              role="dialog"
              aria-label="Central de notificações"
            >
              <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-[22px] sm:rounded-t-[30px]">
                <div>
                  <h4 className="text-[12px] sm:text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-widest">{t('alerts_deadlines')}</h4>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-0.5">Ações do Projeto Próximas do Fim</p>
                </div>
                <span className="text-[10px] sm:text-[11px] bg-brand text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-black">
                  {criticalTasks.length}
                </span>
              </div>
              <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                {criticalTasks.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-check-double text-slate-200 dark:text-slate-600 text-xl"></i>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('no_critical_tasks')}</p>
                  </div>
                ) : (
                  criticalTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => { onSelectProject(task.projectId); setShowNotifications(false); }}
                      className="w-full text-left p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl sm:rounded-2xl flex items-start gap-3 sm:gap-4 transition-all duration-200 mb-1 group"
                    >
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${task.isLate ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-500' : 'bg-brand-light dark:bg-blue-900/30 text-brand'}`}>
                        <i className={`fas ${task.isLate ? 'fa-clock' : 'fa-calendar-day'} text-[10px] sm:text-xs`}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight mb-1">{task.title}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${task.isLate ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300' : 'bg-brand-light dark:bg-blue-900/50 text-brand dark:text-blue-300'}`}>
                            {task.isLate ? 'Prazo Excedido' : 'Prazo Próximo'}
                          </span>
                          <span className="text-[8px] sm:text-[10px] font-bold text-slate-400">Até {task.endDate}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            aria-label="Ver opções de perfil"
            className="flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 sm:pl-4 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 transition-all group active:scale-95 shadow-lg shadow-black/5"
          >
            <div className="hidden md:block text-right">
              <p className="text-[12px] font-bold text-white dark:text-slate-900 leading-none">{(currentUser?.name || 'Usuário').split(' ')[0]}</p>
              <p className="text-[9px] font-black text-white/50 dark:text-slate-600 uppercase tracking-widest mt-0.5">{currentUser?.role === 'admin' ? 'Administrador' : 'Colaborador'}</p>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-brand text-white flex items-center justify-center text-[10px] sm:text-[12px] font-black border border-white/20 dark:border-slate-800/10 group-hover:rotate-6 transition-transform">
              {(currentUser?.name || 'U').charAt(0)}
            </div>
          </button>

          {showProfile && (
            <div className="absolute top-16 right-0 w-64 bg-white dark:bg-slate-800 shadow-2xl rounded-[24px] sm:rounded-[32px] border border-slate-100 dark:border-slate-700 p-2 z-50 animate-apple overflow-hidden">
              <div className="p-6 text-center border-b border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] sm:rounded-[24px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-lg sm:text-xl font-black mx-auto mb-3 shadow-xl">
                  {(currentUser?.name || 'U').charAt(0)}
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white">{currentUser?.name || 'Usuário'}</h4>
                <p className="text-[9px] font-bold text-brand uppercase tracking-widest mt-1">{currentUser?.email || ''}</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => { setShowProfile(false); onGoSettings(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl sm:rounded-2xl hover:bg-brand-light dark:hover:bg-blue-900/20 text-brand font-bold text-xs transition-colors group"
                >
                  <i className="fas fa-user-gear opacity-50 group-hover:scale-110 transition-transform"></i> {t('profile_settings')}
                </button>
                <button
                  onClick={() => { setShowProfile(false); onLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl sm:rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 font-bold text-xs transition-colors group"
                >
                  <i className="fas fa-power-off opacity-50 group-hover:scale-110 transition-transform"></i> {t('profile_logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
