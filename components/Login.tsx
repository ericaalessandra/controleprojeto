
import React, { useState, useMemo } from 'react';
import { User, Company } from '../types';
import { db } from '../db';
import LegalModals from './LegalModals';
import { useLanguage } from '../LanguageContext';
import { supabase } from '../supabase';

interface LoginProps {
  onLogin: (user: User) => Promise<void>;
  onRegister?: (user: User) => Promise<void>;
  companies?: Company[];
  notify?: (type: 'success' | 'danger' | 'warning', title: string, msg: string) => void;
  forceRecovery?: boolean; // Novo prop
}

const validateEmail = (email: string) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

const Input = ({ label, error, type = "text", icon, ...props }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="mb-3 relative text-left">
      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
      <div className="relative group">
        {icon && <i className={`fas ${icon} absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0071e3] dark:group-focus-within:text-blue-400 transition-colors`}></i>}
        <input
          {...props}
          type={inputType}
          className={`w-full ${icon ? 'pl-11' : 'px-5'} ${isPassword ? 'pr-12' : 'pr-5'} py-3 rounded-2xl bg-white dark:bg-slate-800 border ${error ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400'} outline-none transition-all text-sm font-medium text-[#1d1d1f] dark:text-white shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-600 ${props.readOnly ? 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-100 dark:border-slate-800 font-bold' : ''}`}
        />
        {isPassword && !props.readOnly && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors focus:outline-none"
          >
            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-1 ml-1 font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
        <i className="fas fa-triangle-exclamation"></i> {error}
      </p>}
    </div>
  );
};

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, companies, notify, forceRecovery }) => {
  const { t } = useLanguage();
  const [view, setView] = useState<'login' | 'forgot' | 'firstAccess'>('login');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryUser, setRecoveryUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [consentError, setConsentError] = useState(false);

  const BRANDING_CONSTANTS = {
    name: "Innova4Up",
    cnpj: "45.409.514/0001-33",
    bg: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop"
  };

  const activeBranding = useMemo(() => {
    // 0. Estratégia de busca do Background Global:
    // Procuramos em TODAS as empresas e pegamos a primeira que tiver um dado de imagem real (> 1000 chars).
    // Como agora o App.tsx propaga a alteração do admin para todas as empresas,
    // qualquer uma que tiver o dado será a imagem correta.
    const candidates = companies?.filter(c => c.loginBgData && c.loginBgData.length > 1000) || [];
    const companyWithBg = candidates[0] || (companies && companies[0]);

    const globalBg = (companyWithBg && companyWithBg.loginBgData && companyWithBg.loginBgData.length > 1000)
      ? companyWithBg.loginBgData
      : BRANDING_CONSTANTS.bg;

    // 1. Tentar encontrar empresa pelo e-mail digitado (domínio) para Logo e Nome
    if (email && email.includes('@')) {
      const domain = email.split('@')[1].toLowerCase();
      const match = companies?.find(c =>
        c.email?.toLowerCase().includes(domain) ||
        (c.name && c.name.toLowerCase().includes(domain.split('.')[0]))
      );
      if (match) return {
        name: match.appName || match.name,
        cnpj: match.cnpj,
        bg: globalBg, // O fundo de tela agora é sempre o do sistema (definido acima)
        primaryColor: match.primaryColor || '#0071e3'
      };
    }

    // 2. Fallback para a primeira empresa que der match ou a Master
    if (companies && companies.length > 0) {
      const first = companies[0];
      return {
        name: first.appName || first.name,
        cnpj: first.cnpj,
        bg: globalBg,
        primaryColor: first.primaryColor || '#0071e3'
      };
    }

    // 3. Fallback final para constantes do sistema
    return { ...BRANDING_CONSTANTS, bg: globalBg, primaryColor: '#0071e3' };
  }, [email, companies]);

  const activeCompany = useMemo(() => {
    // 1. Tentar encontrar empresa pelo e-mail
    if (email && email.includes('@')) {
      const domain = email.split('@')[1].toLowerCase();
      const match = companies.find(c =>
        c.email?.toLowerCase().includes(domain) ||
        (c.name && c.name.toLowerCase().includes(domain.split('.')[0]))
      );
      if (match) return match;
    }
    // 2. Fallback para Master ou primeira
    // Prioriza a empresa Master (Innova) para exibir os termos globais se não houver imput de email
    const master = companies.find(c => c.name?.toLowerCase().includes('innova') || c.appName?.toLowerCase().includes('innova'));
    return master || companies[0] || null;
  }, [email, companies]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    /* LGPD simplificada: removido check obrigatório no login recorrente conforme solicitação */

    if (!validateEmail(email)) {
      setError(t('login_invalid_email'));
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // FALLBACK: Se falhar no Supabase, tentamos verificar no banco de dados local
        // apenas para permitir a transição segura dos dados.
        const allUsers = await db.getAllUsers();
        const user = allUsers.find(u =>
          u.email.trim().toLowerCase() === email.trim().toLowerCase() &&
          u.password === password
        );

        if (user) {
          if (user.status === 'inactive') {
            setError(t('login_account_inactive'));
          } else {
            // Login local bem sucedido - informamos que é um acesso de transição
            setError(null);
            notify('warning', t('login_transition_title'), t('login_transition_msg'));
            await onLogin(user);
            setIsLoading(false);
            return;
          }
        } else {
          setError(authError.message === 'Invalid login credentials' ? t('login_invalid_creds') : authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // BUSCA PERFIL NO SUPABASE (Fonte de Verdade Enterprise)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          // Fallback para verificar se existe localmente (periodo de transição)
          const allUsers = await db.getAllUsers();
          let localUser = allUsers.find(u => u.email === email);

          if (localUser) {
            if (localUser.status === 'inactive') {
              setError(t('login_account_inactive'));
              await supabase.auth.signOut();
            } else {
              await onLogin(localUser);
            }
          } else {
            setError(`${t('login_profile_not_found')} Detalhe: ${profileError?.message || t('no_executive_summary')}`);
            await supabase.auth.signOut();
          }
        } else if (profile.status === 'inactive') {
          setError(t('login_account_inactive'));
          await supabase.auth.signOut();
        } else {
          // Converter perfil do Supabase para interface User do App
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
          await onLogin(user);
        }
      }
    } catch (err: any) {
      if (err.message === 'Email not confirmed') {
        setError(
          <div className="flex flex-col gap-2 w-full">
            <span>Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.</span>
            <button
              type="button"
              onClick={async () => {
                const { error: resendError } = await supabase.auth.resend({
                  type: 'signup',
                  email: email,
                });
                if (resendError) {
                  notify('danger', 'Error', resendError.message);
                } else {
                  notify('success', 'Email Sent', 'Confirmation sent.');
                }
              }}
              className="mt-1 py-2 px-4 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all self-start border border-rose-200 shadow-sm flex items-center gap-2"
            >
              <i className="fas fa-paper-plane text-[9px]"></i>
              {t('login_resend_link')}
            </button>
          </div>
        );
      } else {
        setError("Erro de conexão com o servidor de autenticação.");
      }
      console.error(err);
    }
    finally { setIsLoading(false); }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (recoveryStep === 1) {
        const allUsers = await db.getAllUsers();
        const found = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!found) {
          setError("Este e-mail corporativo não foi localizado no sistema.");
        } else {
          setRecoveryUser(found);
          setRecoveryStep(2);
        }
      } else {
        if (password !== confirmPassword) {
          setError("As senhas informadas não coincidem.");
        } else if (password.length < 5) {
          setError("A senha deve ter no mínimo 5 caracteres.");
        } else if (recoveryUser) {
          // Enviar e-mail de recuperação real via Supabase
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // Redireciona para o site
          });

          if (resetError) {
            setError(`Erro ao enviar e-mail: ${resetError.message}`);
          } else {
            notify('success', 'E-mail Enviado', 'Verifique sua caixa de entrada para redefinir a senha.');
            alert("Um link de recuperação foi enviado para o seu e-mail.\n\nClique no link e você será redirecionado para criar uma nova senha.");
            setView('login');
            setEmail('');
          }
        }
      }
    } catch (err) { setError("Falha crítica na recuperação."); }
    finally { setIsLoading(false); }
  };

  const handleFirstAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (recoveryStep === 1) {
        // Validação apenas pelo e-mail autorizado (Whitelist)
        const invite = await db.getInvitationByEmail(email);

        if (!invite) {
          setError("Este e-mail não possui um convite pendente. Solicite autorização ao administrador.");
        } else {
          // Criamos um usuário temporário baseado no convite para a etapa 2
          setRecoveryUser({
            id: invite.id,
            companyId: invite.companyId,
            name: '', // Será preenchido na etapa 2
            email: invite.email,
            role: invite.role as any,
            status: 'active',
            firstAccessDone: false,
            createdAt: Date.now()
          });
          setRecoveryStep(2);
        }
      } else {
        if (password !== confirmPassword) {
          setError("As senhas não coincidem.");
        } else if (password.length < 5) {
          setError("A nova senha deve ter no mínimo 5 caracteres.");
        } else if (recoveryUser) {
          if (!acceptedTerms) {
            setConsentError(true);
            setError("Para ativar sua conta, você deve concordar com as políticas de dados (LGPD).");
            return;
          }

          try {
            const { error: signUpError, data: authData } = await supabase.auth.signUp({
              email: recoveryUser.email,
              password: password,
              options: {
                data: {
                  name: userName,
                  companyId: recoveryUser.companyId
                }
              }
            });

            if (signUpError) {
              if (signUpError.message.includes('already registered')) {
                setError("Este usuário já possui cadastro. Faça login ou use a recuperação de senha.");
              } else {
                setError(signUpError.message);
              }
              setIsLoading(false);
              return;
            }

            const updatedUser: User = {
              ...recoveryUser,
              name: userName,
              password,
              firstAccessDone: true,
              lgpdConsent: true,
              lgpdConsentDate: new Date().toISOString()
            };

            if (authData.user) updatedUser.id = authData.user.id;

            await db.saveUser(updatedUser);

            const invite = await db.getInvitationByEmail(recoveryUser.email);
            if (invite) await db.deleteInvitation(invite.id);

            notify('success', 'Cadastro Concluído', 'Verifique seu e-mail para confirmar o acesso.');
            alert("Sua conta foi ativada com sucesso! \n\nIMPORTANTE: Enviamos um link de confirmação para o seu e-mail corporativo. Você precisa clicar nele antes de realizar o primeiro login.");

            setView('login');
            setRecoveryStep(1);
            setPassword('');
            setTempPassword('');
            setConfirmPassword('');
            setUserName('');
            setEmail('');
          } catch (authErr: any) {
            console.error("Critical Auth Error:", authErr);
            setError(`Falha inesperada: ${authErr.message || "Erro de conexão com o servidor"}`);
          }
        }
      }
    } catch (err) { setError("Erro na ativação."); }
    finally { setIsLoading(false); }
  };

  const renderForm = () => {
    if (view === 'login') {
      return (
        <form onSubmit={handleLoginSubmit} className="animate-apple">
          <Input
            label={t('email_label')}
            type="email"
            name="email"
            id="login-email"
            autoComplete="username"
            icon="fa-envelope"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            placeholder="exemplo@empresa.com"
            required
            error={email && !validateEmail(email) ? "E-mail inválido" : null}
          />
          <Input
            label={t('password_label')}
            type="password"
            name="password"
            id="login-password"
            autoComplete="current-password"
            icon="fa-lock"
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center justify-end px-1">
              <button
                type="button"
                onClick={() => { setView('forgot'); setRecoveryStep(1); setError(null); }}
                className="text-[11px] font-extrabold text-[#0071e3] dark:text-blue-400 hover:text-[#005bb5] dark:hover:text-blue-300 hover:underline transition-colors tracking-tight"
              >
                {t('forgot_password')}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ backgroundColor: activeBranding.primaryColor }}
            className="w-full py-3.5 rounded-full text-white font-bold text-sm shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (
              <>
                <i className="fas fa-shield-halved text-xs opacity-70"></i>
                {t('login_button')}
              </>
            )}
          </button>

          <div className="mt-4 text-center space-y-2">
            <button
              type="button"
              onClick={() => { setView('firstAccess'); setRecoveryStep(1); setError(null); }}
              className="text-[12px] font-bold text-[#0071e3] dark:text-blue-400 hover:underline block w-full"
            >
              {t('first_access')}
            </button>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">
              {t('login_restricted')}
            </p>
          </div>
        </form>
      );
    }

    if (view === 'firstAccess') {
      return (
        <form onSubmit={handleFirstAccessSubmit} className="animate-apple space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl mb-1 border border-blue-100 dark:border-blue-900/50">
            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold text-center leading-tight">
              {recoveryStep === 1
                ? t('login_first_access_hint')
                : t('login_first_access_step2')}
            </p>
          </div>

          <Input
            label={t('email_label')}
            type="email"
            icon="fa-at"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            required
            readOnly={recoveryStep === 2}
          />

          {recoveryStep === 2 && (
            <div className="animate-apple space-y-3">
              <Input
                label={t('login_full_name')}
                icon="fa-user"
                value={userName}
                onChange={(e: any) => setUserName(e.target.value)}
                placeholder="Ex: Maria Souza"
                required
              />
              <Input
                label={t('login_new_password')}
                type="password"
                icon="fa-lock"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                placeholder="Mínimo 5 caracteres"
                required
              />
              <Input
                label={t('login_confirm_password')}
                type="password"
                icon="fa-shield-check"
                value={confirmPassword}
                onChange={(e: any) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
              />
            </div>
          )}

          <div className="mb-3">
            <label className={`flex items-start gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer ${consentError ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800'}`}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => { setAcceptedTerms(e.target.checked); setConsentError(false); }}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-[#0071e3] focus:ring-[#0071e3] dark:bg-slate-700"
              />
              <span className="text-[10px] leading-tight text-slate-600 dark:text-slate-400 font-medium">
                {t('login_lgpd_consent')}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-full bg-brand text-white font-bold text-sm shadow-xl hover:bg-brand-hover transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (recoveryStep === 1 ? t('login_validate_data') : t('login_activate_account'))}
          </button>

          <button
            type="button"
            onClick={() => { setView('login'); setRecoveryStep(1); setEmail(''); setPassword(''); setConfirmPassword(''); setTempPassword(''); }}
            className="w-full text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-2 py-1"
          >
            <i className="fas fa-arrow-left text-[10px]"></i> {t('back')}
          </button>
        </form>
      );
    }

    if (view === 'forgot') {
      const userCompany = companies.find(c => c.id === recoveryUser?.companyId)?.name || 'N/A';
      return (
        <form onSubmit={handleRecoverySubmit} className="animate-apple space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl mb-1 border border-blue-100 dark:border-blue-900/50">
            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold text-center leading-tight">
              {recoveryStep === 1
                ? t('login_email_not_found') // We can use this or add a new one, but let's use a generic recovery hint
                : t('login_security_notice')}
            </p>
          </div>

          <Input
            label={t('email_label')}
            type="email"
            icon="fa-at"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            required
            readOnly={recoveryStep === 2}
          />

          {recoveryStep === 2 && recoveryUser && (
            <div className="animate-apple space-y-3">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <Input label="Nome" value={recoveryUser.name} readOnly icon="fa-user" />
                <Input label="Unidade" value={userCompany} readOnly icon="fa-building" />
              </div>
              <div className="border-t border-slate-100 mt-4 pt-4 space-y-3">
                <Input
                  label="Nova Senha"
                  type="password"
                  icon="fa-lock"
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  placeholder="Nova senha (min. 5 chars)"
                  required
                />
                <Input
                  label="Confirmar Senha"
                  type="password"
                  icon="fa-check-double"
                  value={confirmPassword}
                  onChange={(e: any) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-full bg-[#0071e3] text-white font-bold text-sm shadow-xl hover:bg-[#0077ed] transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (recoveryStep === 1 ? t('login_validate_data') : t('save'))}
          </button>

          <button
            type="button"
            onClick={() => { setView('login'); setRecoveryStep(1); setEmail(''); setPassword(''); setConfirmPassword(''); }}
            className="w-full text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-2 py-1"
          >
            <i className="fas fa-arrow-left text-[10px]"></i> {t('back')}
          </button>
        </form>
      );
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center lg:justify-end p-6 lg:pr-24 overflow-hidden">
      <div className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700" style={{ backgroundImage: `url(${activeBranding.bg})` }} />
      <div className="absolute inset-0 z-1 bg-gradient-to-r from-black/70 via-black/30 to-black/80" />

      <div className="relative z-10 w-full max-w-[400px] animate-apple">
        {/* Logomarca Removida Conforme Solicitação */}
        <div className="mb-4"></div>

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[32px] p-6 shadow-2xl border border-white/50 dark:border-white/5">
          {error && (
            <div className={`mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-2xl border border-rose-100 dark:border-rose-900/50 flex items-start gap-3 ${typeof error === 'string' ? 'animate-pulse' : ''}`}>
              <i className="fas fa-circle-exclamation text-base mt-0.5"></i>
              <div className="flex-1">
                {error}
              </div>
            </div>
          )}

          {renderForm()}

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
            <div className="flex gap-6">
              <button onClick={() => setLegalModal('privacy')} className="text-[9px] font-black text-slate-500 dark:text-slate-400 hover:text-[#0071e3] dark:hover:text-blue-400 uppercase tracking-widest transition-colors flex items-center gap-1.5">
                <i className="fas fa-user-shield text-[8px]"></i> {t('privacy')}
              </button>
              <button onClick={() => setLegalModal('terms')} className="text-[9px] font-black text-slate-500 dark:text-slate-400 hover:text-[#0071e3] dark:hover:text-blue-400 uppercase tracking-widest transition-colors flex items-center gap-1.5">
                <i className="fas fa-file-contract text-[8px]"></i> {t('terms')}
              </button>
            </div>

            <div className="text-center space-y-1">
              <p className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-widest">
                © 2026 INNOVA4UP
              </p>
              <p className="text-[8px] font-bold text-[#0071e3] dark:text-blue-400 tracking-wider">
                CNPJ: 45.409.514/0001-33
              </p>
              <p className="text-[8px] font-medium text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] pt-1">
                INNOVA4UP SECURITY MODULE
              </p>
            </div>
          </div>
        </div>
      </div>
      <LegalModals type={legalModal} onClose={() => setLegalModal(null)} company={activeCompany} />
    </div>
  );
};

export default Login;
