
import React, { useState, useEffect } from 'react';
import { User, Company } from '../types';
import { db } from '../db';
import ConfirmationModal from './ConfirmationModal';
import { ensureContrast } from '../colorUtils';
import { useLanguage } from '../LanguageContext';

interface SettingsViewProps {
  user: User;
  company: Company;
  onUpdateUser: (u: User) => Promise<void>;
  onUpdateCompany?: (c: Company) => Promise<void>;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, company, onUpdateUser, onUpdateCompany }) => {
  const { t } = useLanguage();
  const isAdmin = user.role === 'admin';
  // ... rest same
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState(user.password || '');
  const [showPass, setShowPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  // Estados Whitelabel (Admin Only)
  const [loginBg, setLoginBg] = useState(company.loginBgData || '');
  const [loginLogo, setLoginLogo] = useState(company.logoData || '');
  const [chatBotIcon, setChatBotIcon] = useState(company.chatBotIconData || '');
  const [appName, setAppName] = useState(company.appName || '');
  const [primaryColor, setPrimaryColor] = useState(company.primaryColor || '#0071e3');

  // Metadados do Sistema
  const [systemManufacturer, setSystemManufacturer] = useState(company.systemManufacturer || 'Innova4Up.');
  const [systemVersion, setSystemVersion] = useState(company.systemVersion || '1.0');
  const [systemLastUpdate, setSystemLastUpdate] = useState(company.systemLastUpdate || 'Janeiro /2026');

  // Estados Legais
  const [privacyPolicy, setPrivacyPolicy] = useState(company.privacyPolicy || '');
  const [termsOfUse, setTermsOfUse] = useState(company.termsOfUse || '');

  // Sincroniza estados quando a empresa muda (ex: após salvar)
  useEffect(() => {
    setLoginBg(company.loginBgData || '');
    setLoginLogo(company.logoData || '');
    setChatBotIcon(company.chatBotIconData || '');
    setAppName(company.appName || '');
    setPrimaryColor(company.primaryColor || '#0071e3');
    setSystemManufacturer(company.systemManufacturer || 'Innova4Up.');
    setSystemVersion(company.systemVersion || '1.0');
    setSystemLastUpdate(company.systemLastUpdate || 'Janeiro /2026');
    setPrivacyPolicy(company.privacyPolicy || '');
    setTermsOfUse(company.termsOfUse || '');
  }, [company]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'bg' | 'logo' | 'bot') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Aumentado para 5MB para suportar fundos HD
    if (file.size > 5 * 1024 * 1024) {
      alert("O arquivo é muito grande. O limite para imagens de interface é 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      if (target === 'bg') setLoginBg(data);
      else if (target === 'logo') setLoginLogo(data);
      else if (target === 'bot') setChatBotIcon(data);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUser = async () => {
    if (!name.trim()) return alert("O Nome é obrigatório.");
    if (!email.trim()) return alert("O E-mail é obrigatório.");

    setIsSaving(true);
    try {
      // Verificar unicidade de e-mail (se foi alterado)
      if (email.toLowerCase() !== user.email.toLowerCase()) {
        const allUsers = await db.getAllUsers();
        const emailExists = allUsers.some(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== user.id);

        if (emailExists) {
          alert("Este e-mail já está sendo utilizado por outro usuário.");
          setIsSaving(false);
          setConfirmUpdate(false);
          return;
        }
      }

      await onUpdateUser({ ...user, name, email, password });
      alert("Dados do perfil atualizados com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar perfil.");
    } finally {
      setIsSaving(false);
      setConfirmUpdate(false);
    }
  };

  const handleSaveCompanyConfig = async () => {
    if (!onUpdateCompany) return;
    setIsSaving(true);
    try {
      await onUpdateCompany({
        ...company,
        loginBgData: loginBg,
        logoData: loginLogo,
        chatBotIconData: chatBotIcon,
        appName: appName,
        primaryColor: ensureContrast(primaryColor, '#ffffff'), // Garante contraste para modo claro
        systemManufacturer,
        systemVersion,
        systemLastUpdate,
        privacyPolicy,
        termsOfUse
      });
      alert("Identidade visual e informações do sistema atualizadas!");
    } catch (err) {
      alert("Erro ao salvar personalização.");
    } finally {
      setIsSaving(false);
    }
  };

  // LGPD & Recuperação de Dados
  const handleExportFullBackup = async () => {
    try {
      const fullData = await db.exportFullDatabase();
      const blob = new Blob([fullData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-innova4up-enterprise-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erro ao gerar backup.");
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Atenção: A restauração de backup irá sobrescrever dados locais com o mesmo ID. Deseja continuar?")) return;

    setIsSaving(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await db.importFullDatabase(json);
        alert("Backup restaurado com sucesso! O sistema será reiniciado.");
        window.location.reload();
      } catch (err) {
        alert("Falha ao processar arquivo de backup.");
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteAllLocalData = () => {
    localStorage.clear();
    const request = indexedDB.deleteDatabase('Innova4UpDB');
    request.onsuccess = () => {
      alert("Todos os dados foram eliminados permanentemente.");
      window.location.reload();
    };
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 pb-24">
      <header className="text-center animate-apple">
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('settings_title')}</h2>
        <div className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{company.name} • {t('settings_workspace_active')}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Segurança do Usuário */}
        <div className="apple-card p-10 bg-white dark:bg-slate-900 relative animate-apple overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-brand"></div>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-[#1d1d1f] dark:bg-slate-800 rounded-[24px] flex items-center justify-center text-white text-2xl font-extrabold shadow-xl">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('settings_profile_section')}</h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{t('settings_credentials_subtitle')}</p>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div className="group">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                {t('settings_display_name')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm font-bold text-slate-800 dark:text-white focus:ring-4 focus:ring-brand-light dark:focus:ring-brand-light/10 focus:border-brand transition-all"
              />
            </div>

            <div className="group">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                {t('settings_corporate_email')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm font-medium text-slate-800 dark:text-white focus:ring-4 focus:ring-brand-light dark:focus:ring-brand-light/10 focus:border-brand transition-all"
              />
            </div>

            <div className="group">
              <label className="block text-[10px] font-bold text-brand uppercase tracking-widest mb-2 ml-1">{t('settings_access_password')}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-mono text-sm dark:text-white focus:ring-4 focus:ring-brand-light dark:focus:ring-brand-light/10 focus:border-brand transition-all shadow-sm"
                  placeholder="••••••••"
                />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hover:text-brand transition-colors">
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
          </div>

          <button onClick={() => setConfirmUpdate(true)} disabled={isSaving} className="w-full mt-8 py-4 rounded-2xl bg-slate-900 dark:bg-brand text-white font-bold text-sm hover:bg-black dark:hover:bg-brand-hover transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg">
            <i className="fas fa-shield-halved"></i> {t('settings_save_profile')}
          </button>
        </div>

        {/* Whitelabel & Login Appearance */}
        {isAdmin && (
          <div className="apple-card p-10 bg-white dark:bg-slate-900 relative animate-apple overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[24px] flex items-center justify-center text-2xl font-extrabold shadow-inner">
                <i className="fas fa-wand-magic-sparkles"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('settings_whitelabel_title')}</h3>
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{t('settings_whitelabel_subtitle')}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand uppercase tracking-widest mb-2 ml-1">{t('settings_workspace_name')}</label>
                  <input
                    type="text"
                    value={appName}
                    onChange={e => setAppName(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm font-bold text-brand dark:text-brand-light focus:ring-4 focus:ring-brand-light dark:focus:ring-brand-light/10 focus:border-brand transition-all"
                    placeholder="Ex: Innova4Up Enterprise"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand uppercase tracking-widest mb-2 ml-1">{t('settings_theme_color')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer p-1"
                    />
                    <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono dark:text-white" />
                  </div>
                </div>
              </div>

              {/* Campos Sobre o Sistema */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('settings_system_info_title')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('settings_manufacturer')}</label>
                    <input type="text" value={systemManufacturer} onChange={e => setSystemManufacturer(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('settings_version')}</label>
                    <input type="text" value={systemVersion} onChange={e => setSystemVersion(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('settings_last_update')}</label>
                    <input type="text" value={systemLastUpdate} onChange={e => setSystemLastUpdate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('settings_bg_login')}</label>
                    {loginBg && <button onClick={() => setLoginBg('')} className="text-[9px] font-black text-rose-500 uppercase hover:underline">X</button>}
                  </div>
                  <div className="relative group w-full h-24 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden hover:border-brand transition-all cursor-pointer shadow-inner">
                    {loginBg ? <img src={loginBg} className="w-full h-full object-cover" alt="Background" /> : <i className="fas fa-image text-slate-200 dark:text-slate-700 text-2xl"></i>}
                    <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'bg')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[7px] text-white text-center font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Global Login BG</div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('settings_main_logo')}</label>
                    {loginLogo && <button onClick={() => setLoginLogo('')} className="text-[9px] font-black text-rose-500 uppercase hover:underline">X</button>}
                  </div>
                  <div className="relative group w-full h-24 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden hover:border-brand transition-all cursor-pointer shadow-inner">
                    {loginLogo ? <img src={loginLogo} className="max-w-full max-h-full object-contain p-2" alt="Logo" /> : <i className="fas fa-upload text-slate-200 dark:text-slate-700 text-2xl"></i>}
                    <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('settings_bot_icon')}</label>
                    {chatBotIcon && <button onClick={() => setChatBotIcon('')} className="text-[9px] font-black text-rose-500 uppercase hover:underline">X</button>}
                  </div>
                  <div className="relative group w-full h-24 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden hover:border-brand transition-all cursor-pointer shadow-inner">
                    {chatBotIcon ? <img src={chatBotIcon} className="max-w-full max-h-full object-contain p-2" alt="Bot Icon" /> : <i className="fas fa-robot text-slate-200 dark:text-slate-700 text-2xl"></i>}
                    <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'bot')} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveCompanyConfig}
                disabled={isSaving}
                className="w-full py-4 rounded-2xl bg-brand text-white font-bold text-sm shadow-xl shadow-brand hover:bg-brand-hover transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                {t('settings_apply_visual')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Documentos Legais (Admin Only) */}
      {isAdmin && (
        <div className="apple-card p-10 bg-white dark:bg-slate-900 relative animate-apple overflow-hidden border border-slate-100 dark:border-slate-800 mb-8">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-[24px] flex items-center justify-center text-2xl font-extrabold shadow-inner">
              <i className="fas fa-file-contract"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('legal_docs_title') || 'Documentos Legais'}</h3>
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{t('legal_docs_subtitle') || 'Personalize os termos e políticas'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Política de Privacidade
                </label>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Markdown Suportado</span>
              </div>
              <textarea
                value={privacyPolicy}
                onChange={e => setPrivacyPolicy(e.target.value)}
                className="w-full h-64 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-xs font-mono leading-relaxed text-slate-700 dark:text-slate-300 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none custom-scrollbar"
                placeholder="# Política de Privacidade..."
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Termos de Uso
                </label>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Markdown Suportado</span>
              </div>
              <textarea
                value={termsOfUse}
                onChange={e => setTermsOfUse(e.target.value)}
                className="w-full h-64 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-xs font-mono leading-relaxed text-slate-700 dark:text-slate-300 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none custom-scrollbar"
                placeholder="# Termos de Uso..."
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSaveCompanyConfig}
              disabled={isSaving}
              className="px-8 py-4 rounded-2xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
              Salvar Documentos
            </button>
          </div>
        </div>
      )}

      {/* Gestão de Dados & Privacidade (LGPD) */}
      <div className="apple-card p-10 bg-slate-900 dark:bg-slate-900 text-white animate-apple border border-slate-800 dark:border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand blur-[100px] pointer-events-none opacity-20"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-brand flex items-center justify-center shadow-lg">
                <i className="fas fa-database text-xl"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">{t('settings_db_governance')}</h3>
                <p className="text-brand dark:text-brand-light text-[10px] font-black uppercase tracking-widest mt-1">{t('settings_local_first_title')}</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              {t('settings_local_first_desc')}
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={handleExportFullBackup}
                className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white text-white hover:text-slate-900 font-bold text-xs transition-all flex items-center gap-2 border border-white/20 shadow-lg"
              >
                <i className="fas fa-download"></i> {t('settings_generate_backup')}
              </button>
              <label className="px-6 py-3 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold text-xs transition-all flex items-center gap-2 border border-indigo-500/20 cursor-pointer">
                <i className="fas fa-upload"></i> {t('settings_restore_backup')}
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
              <button
                onClick={() => setConfirmDeleteAll(true)}
                className="px-6 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs transition-all flex items-center gap-2 border border-rose-500/20"
              >
                <i className="fas fa-trash-alt"></i> {t('settings_delete_all')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmUpdate}
        title={t('settings_confirm_update_title')}
        message={t('settings_confirm_update_msg')}
        confirmText={t('save')}
        onConfirm={handleSaveUser}
        onCancel={() => setConfirmUpdate(false)}
        type="warning"
      />

      <ConfirmationModal
        isOpen={confirmDeleteAll}
        title={t('settings_delete_all_title')}
        message={t('settings_delete_all_msg')}
        confirmText={t('settings_delete_all_confirm')}
        onConfirm={handleDeleteAllLocalData}
        onCancel={() => setConfirmDeleteAll(false)}
        type="danger"
      />
    </div>
  );
};

export default SettingsView;
