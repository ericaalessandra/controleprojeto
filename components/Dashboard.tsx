
import React, { useMemo, useState, useEffect } from 'react';
import { Project, Task, Company } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useLanguage } from '../LanguageContext';

interface DashboardProps {
  projects: Project[];
  tasks: Task[];
  companies: Company[];
  isAdmin: boolean;
  isDarkMode: boolean;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onNewProject: () => void;
  onGenerateConsolidatedReport?: () => void;
}

const formatCurrency = (val: number, lang: string) => {
  const locale = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US';
  const currency = lang === 'pt' ? 'BRL' : lang === 'es' ? 'EUR' : 'USD';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val);
};

const MetricCard = ({ title, value, label, icon, color, subValue }: any) => {
  const isBrand = color === 'bg-brand';
  const bgColorClass = isBrand ? 'bg-brand-light' : `${color} bg-opacity-10`;
  const iconColorClass = isBrand ? 'text-brand' : color.replace('bg-', 'text-');

  return (
    <div className="apple-card p-5 sm:p-6 flex flex-col justify-between group bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover-lift active-press cursor-default h-full">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[16px] sm:rounded-[18px] ${bgColorClass} flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm`}>
          <i className={`fas ${icon} ${iconColorClass} text-base sm:text-lg`}></i>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</span>
          {subValue && <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5">{subValue}</div>}
        </div>
      </div>
      <div className="mt-auto">
        <h3 className="text-xl sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight group-hover:text-brand transition-colors truncate">{value}</h3>
        <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ projects, tasks, companies, isAdmin, isDarkMode, onOpenProject, onNewProject }) => {
  const { t, language } = useLanguage();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');

  useEffect(() => {
    if (!isAdmin && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [isAdmin, companies]);

  const filteredData = useMemo(() => {
    let filteredProjs = projects;

    if (selectedCompanyId !== 'all') {
      filteredProjs = projects.filter(p => p.companyId === selectedCompanyId);
    }

    const filteredProjIds = filteredProjs.map(p => p.id);
    const filteredTasks = tasks.filter(t => filteredProjIds.includes(t.projectId));

    return {
      projects: filteredProjs,
      tasks: filteredTasks
    };
  }, [projects, tasks, selectedCompanyId]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const currentProjects = filteredData.projects;
    const currentTasks = filteredData.tasks;

    const totalPortfolioBudget = currentProjects.reduce((acc, p) => acc + (p.totalBudget || 0), 0);
    const totalAllocatedBudget = currentTasks.reduce((acc, t) => acc + (t.budget || 0), 0);
    const completedTasks = currentTasks.filter(t => t.status === 'Concluído').length;

    return {
      totalProjects: currentProjects.length,
      totalActions: currentTasks.length,
      portfolioBudget: totalPortfolioBudget,
      allocatedBudget: totalAllocatedBudget,
      budgetBurn: totalPortfolioBudget > 0 ? Math.round((totalAllocatedBudget / totalPortfolioBudget) * 100) : 0,
      progress: currentTasks.length > 0 ? Math.round((completedTasks / currentTasks.length) * 100) : 0,
      atRisk: currentTasks.filter(t => t.status !== 'Concluído' && t.status !== 'Cancelado' && t.endDate && t.endDate <= today).length
    };
  }, [filteredData]);

  const projectAnalysis = useMemo(() => {
    return filteredData.projects.map(p => {
      const pTasks = tasks.filter(t => t.projectId === p.id);
      const pCompleted = pTasks.filter(t => t.status === 'Concluído').length;
      const pAllocated = pTasks.reduce((acc, t) => acc + (t.budget || 0), 0);
      const pProg = pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0;
      const pCompany = companies.find(c => c.id === p.companyId);

      return {
        id: p.id,
        name: p.name,
        prog: pProg,
        budget: p.totalBudget || 0,
        allocated: pAllocated,
        tasksCount: pTasks.length,
        description: p.description,
        company: pCompany
      };
    }).sort((a, b) => b.prog - a.prog);
  }, [filteredData.projects, tasks, companies]);

  const aiInsights = useMemo(() => {
    const insights = [];
    const atRiskProjects = projectAnalysis.filter(p => p.prog < 30 && p.tasksCount > 0);
    const highBurnProjects = projectAnalysis.filter(p => p.budget > 0 && (p.allocated / p.budget) > 0.8);

    if (atRiskProjects.length > 0) {
      insights.push({
        type: 'warning',
        title: t('insight_inertia_title'),
        message: `${atRiskProjects.length} ${t('insight_inertia_msg')}`,
        action: t('insight_inertia_action')
      });
    }

    if (highBurnProjects.length > 0) {
      insights.push({
        type: 'budget',
        title: t('insight_budget_title'),
        message: `${highBurnProjects[0].name} ${t('insight_budget_msg')}`,
        action: t('insight_budget_action')
      });
    }

    if (stats.progress > 70) {
      insights.push({
        type: 'success',
        title: t('insight_elite_title'),
        message: t('insight_elite_msg'),
        action: t('insight_elite_action')
      });
    } else {
      insights.push({
        type: 'info',
        title: t('insight_opt_title'),
        message: t('insight_opt_msg'),
        action: t('insight_opt_action')
      });
    }

    return insights;
  }, [projectAnalysis, stats, selectedCompanyId]);

  const brandPrimary = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#0071e3';

  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 125 ? '#5856d6' : '#ff9500';
  };

  const contrastColor = getContrastColor(brandPrimary);
  const chartAxisColor = isDarkMode ? '#94a3b8' : '#64748b';
  const chartGridColor = isDarkMode ? '#334155' : '#f1f5f9';

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-[1600px] mx-auto animate-apple">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 mb-8 sm:mb-12">
        <div>
          <div className="flex items-center gap-2 mb-1.5 opacity-80">
            <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse"></span>
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('dash_title')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#1d1d1f] dark:text-white leading-tight">{t('dash_title')}</h2>
          <p className="text-xs sm:text-sm md:text-base text-[#86868b] dark:text-slate-400 mt-1.5 font-medium">{t('dash_subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex flex-col">
            <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">{t('dash_filter_unit')}</label>
            <div className="relative">
              <select
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(e.target.value)}
                disabled={!isAdmin && companies.length <= 1}
                className="appearance-none w-full sm:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-3 sm:py-4 pl-6 pr-12 rounded-2xl font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-brand sm:min-w-[250px] transition-all hover-glow"
              >
                {isAdmin && <option value="all">{t('dash_all_units')}</option>}
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
            </div>
          </div>

          <button
            onClick={onNewProject}
            className="bg-brand hover:bg-brand-hover text-white px-8 py-4 rounded-2xl font-bold shadow-2xl transition-all active-press text-[14px] flex items-center justify-center gap-3 h-[52px] sm:h-[58px] sm:mt-auto hover-lift"
          >
            <i className="fas fa-plus-circle"></i> {t('dash_new_project')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-12">
        <MetricCard
          title={t('metric_portfolio')}
          value={formatCurrency(stats.portfolioBudget, language)}
          label={t('metric_portfolio_desc')}
          icon="fa-wallet"
          color="bg-emerald-500"
          subValue={`${stats.totalProjects} ${t('metric_projects_count')}`}
        />
        <MetricCard
          title={t('metric_allocated')}
          value={formatCurrency(stats.allocatedBudget, language)}
          label={t('metric_allocated_desc')}
          icon="fa-hand-holding-dollar"
          color="bg-brand"
          subValue={`${stats.budgetBurn}% ${t('metric_budget_burn')}`}
        />
        <MetricCard
          title={t('metric_delivery')}
          value={`${stats.progress}%`}
          label={t('metric_delivery_desc')}
          icon="fa-chart-pie"
          color="bg-indigo-500"
          subValue={`${stats.totalActions} ${t('metric_actions_count')}`}
        />
        <MetricCard
          title={t('metric_risks')}
          value={stats.atRisk}
          label={t('metric_risks_desc')}
          icon="fa-triangle-exclamation"
          color={stats.atRisk > 0 ? "bg-rose-500" : "bg-slate-300"}
          subValue={t('metric_attention_needed')}
        />
      </div>

      {/* IA Insights Section */}
      <div className="mb-12 animate-apple">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white ai-indicator">
            <i className="fas fa-wand-magic-sparkles text-xs"></i>
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[#1d1d1f] dark:text-white tracking-tight leading-none">{t('insight_title')}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('insight_subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiInsights.map((insight, idx) => (
            <div key={idx} className="apple-card p-6 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-900/10 dark:to-slate-800 border-indigo-100 dark:border-indigo-900/30 flex gap-4 items-start hover-lift group transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-6 ${insight.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                insight.type === 'budget' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' :
                  insight.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                    'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                }`}>
                <i className={`fas ${insight.type === 'warning' ? 'fa-triangle-exclamation' :
                  insight.type === 'budget' ? 'fa-receipt' :
                    insight.type === 'success' ? 'fa-bolt' :
                      'fa-lightbulb'
                  }`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{insight.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed line-clamp-2">{insight.message}</p>
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider group cursor-pointer">
                  <span>{insight.action}</span>
                  <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 apple-card p-6 sm:p-10 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">{t('chart_comparative')}</h3>
              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest">{t('chart_comparative_sub')}</p>
            </div>
            <i className="fas fa-chart-bar text-slate-200 dark:text-slate-600 text-2xl sm:text-3xl hidden sm:block"></i>
          </div>
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectAnalysis} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: chartAxisColor }} hide={window.innerWidth < 640} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: chartAxisColor }} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                <Tooltip
                  cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '15px', backgroundColor: isDarkMode ? '#1e293b' : '#fff' }}
                  formatter={(val: number) => formatCurrency(val, language)}
                />
                <Bar dataKey="budget" name={t('metric_portfolio')} fill={brandPrimary} radius={[10, 10, 0, 0]} barSize={window.innerWidth < 640 ? 20 : 40} />
                <Bar dataKey="allocated" name={t('metric_allocated')} fill={contrastColor} radius={[10, 10, 0, 0]} barSize={window.innerWidth < 640 ? 20 : 40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-12 space-y-6">
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight px-2">{t('monitor_title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
            {projectAnalysis.map(analysis => {
              const healthColor = analysis.prog > 70 ? 'text-emerald-500' : analysis.prog > 30 ? 'text-brand' : 'text-amber-500';
              const unitLogo = analysis.company?.logoData;

              return (
                <div key={analysis.id} className="apple-card p-5 sm:p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100 dark:border-slate-600 shadow-sm">
                      {unitLogo ? (
                        <img src={unitLogo} className="w-full h-full object-contain p-2" alt="Unit Logo" />
                      ) : (
                        <i className="fas fa-folder-open text-xl"></i>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-black ${healthColor}`}>{analysis.prog}%</span>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Execução</p>
                    </div>
                  </div>

                  <h4 className="text-lg font-extrabold text-[#1d1d1f] dark:text-white mb-1 truncate">{analysis.name}</h4>
                  <p className="text-[10px] text-brand font-black uppercase tracking-widest mb-4">{analysis.company?.name || t('unit_placeholder')}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-8 h-10">{analysis.description || t('no_executive_summary')}</p>

                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">{t('investment')}</span>
                      <span className="text-slate-900 dark:text-slate-200">{formatCurrency(analysis.budget, language)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 bg-brand`} style={{ width: `${analysis.prog}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">{t('allocated_actions')}</span>
                      <span className="text-slate-900 dark:text-slate-200">{formatCurrency(analysis.allocated, language)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${analysis.budget > 0 ? (analysis.allocated / analysis.budget) * 100 : 0}%`, backgroundColor: contrastColor }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenProject(analysis.id)}
                    className="w-full py-4 rounded-2xl bg-slate-50 dark:bg-slate-700 hover:bg-[#1d1d1f] dark:hover:bg-slate-600 hover:text-white dark:hover:text-white transition-all text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-600"
                  >
                    {t('btn_detail_strategy')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
