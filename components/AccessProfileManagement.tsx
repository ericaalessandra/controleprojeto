
import React, { useState } from 'react';
import { UserRole, UserPermission } from '../types';

interface AccessProfileManagementProps {
  roles: UserRole[];
  onSaveRole: (role: UserRole) => Promise<void>;
}

const AccessProfileManagement: React.FC<AccessProfileManagementProps> = ({ roles, onSaveRole }) => {
  const [selectedRoleId, setSelectedRoleId] = useState<'admin' | 'user'>(roles[0]?.id || 'admin');
  const [isSaving, setIsSaving] = useState(false);
  const [modifiedRoles, setModifiedRoles] = useState<Record<string, UserRole>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);

  const selectedRole = modifiedRoles[selectedRoleId] || roles.find(r => r.id === selectedRoleId)!;

  const togglePermission = (key: keyof UserPermission) => {
    const updatedRole: UserRole = {
      ...selectedRole,
      permissions: {
        ...selectedRole.permissions,
        [key]: !selectedRole.permissions[key]
      }
    };
    setModifiedRoles(prev => ({ ...prev, [selectedRoleId]: updatedRole }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    // Debounce: prevent saves within 2 seconds of last save
    const now = Date.now();
    if (now - lastSaveTime < 2000) {
      console.warn('[ROLES] Save blocked: too soon after last save');
      return;
    }

    console.log('[ROLES] Starting save process...');
    console.log('[ROLES] Modified roles:', modifiedRoles);

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      let savedCount = 0;
      for (const roleId in modifiedRoles) {
        console.log(`[ROLES] Saving role: ${roleId}`, modifiedRoles[roleId]);
        await onSaveRole(modifiedRoles[roleId]);
        savedCount++;
        console.log(`[ROLES] Role ${roleId} saved successfully`);
      }

      console.log(`[ROLES] All ${savedCount} role(s) saved successfully!`);
      setModifiedRoles({});
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setLastSaveTime(now);

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[ROLES] Error saving roles:', error);
      alert('Erro ao salvar permissões. Verifique o console para detalhes.');
    }
    setIsSaving(false);
  };

  const permissionLabels: Record<keyof UserPermission, { label: string; desc: string; icon: string }> = {
    viewDashboard: { label: 'Dashboard Geral', desc: 'Acesso ao resumo estratégico e gráficos.', icon: 'fa-chart-line' },
    viewProjects: { label: 'Gestão de Projetos', desc: 'Permite visualizar e interagir com projetos e Kanban.', icon: 'fa-folder-tree' },
    viewScheduler: { label: 'Agenda & Scheduler', desc: 'Acesso ao calendário de tarefas e atividades acessórias.', icon: 'fa-calendar-alt' },
    viewReports: { label: 'Relatórios Executivos', desc: 'Acesso à central de relatórios consolidados.', icon: 'fa-file-invoice-dollar' },
    viewCompanies: { label: 'Gestão de Unidades', desc: 'Acesso à configuração de empresas/unidades.', icon: 'fa-building' },
    viewUsers: { label: 'Gestão de Colaboradores', desc: 'Acesso ao cadastro e ativação de usuários.', icon: 'fa-users-gear' },
    viewLogs: { label: 'Auditoria e Logs', desc: 'Visualização do histórico de ações do sistema.', icon: 'fa-clock-rotate-left' },
    viewProfiles: { label: 'Perfis de Acesso', desc: 'Gerenciamento desta tela de permissões.', icon: 'fa-id-card-clip' },
    viewHelp: { label: 'Guia de Ajuda', icon: 'fa-circle-question', desc: 'Acesso aos tutoriais e manuais.' },
    viewSettings: { label: 'Configurações', icon: 'fa-gear', desc: 'Acesso às configurações de perfil e whitelabel.' },
    canViewAllProjects: { label: 'Visibilidade Global', desc: 'Permite visualizar projetos de TODAS as unidades.', icon: 'fa-globe' },
    canUseChatBot: { label: 'Innova Intelligence (IA)', desc: 'Permite interagir com o assistente de IA para análise de projetos.', icon: 'fa-robot' }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-apple">
      <header className="mb-12">
        <h2 className="text-4xl font-extrabold text-[#1d1d1f] tracking-tight">Perfis de Acesso</h2>
        <p className="text-slate-500 text-lg mt-2 font-medium">Controle granular de permissões e visibilidade do sistema.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Lista de Perfis */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Perfis Disponíveis</h3>
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id as any)}
              className={`w-full p-5 rounded-3xl border transition-all flex items-center justify-between group ${selectedRoleId === role.id
                ? 'bg-brand border-brand text-white shadow-xl shadow-brand/20'
                : 'bg-white border-slate-100 text-slate-900 hover:border-brand/30 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${selectedRoleId === role.id ? 'bg-white/20' : 'bg-slate-50 text-brand'}`}>
                  {role.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{role.name}</p>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${selectedRoleId === role.id ? 'text-white/60' : 'text-slate-400'}`}>ID: {role.id}</p>
                </div>
              </div>
              <i className={`fas fa-chevron-right text-xs transition-transform group-hover:translate-x-1 ${selectedRoleId === role.id ? 'text-white/40' : 'text-slate-200'}`}></i>
            </button>
          ))}

          <div className="mt-8 p-6 bg-amber-50 rounded-[32px] border border-amber-100 flex flex-col gap-3">
            <i className="fas fa-shield-halved text-amber-500 text-xl"></i>
            <p className="text-[11px] font-bold text-amber-800 leading-relaxed uppercase tracking-wider">
              Segurança Corporativa
            </p>
            <p className="text-[10px] text-amber-700/80 font-medium leading-relaxed">
              As alterações de permissões refletem em tempo real no menu e funcionalidades para todos os usuários do perfil selecionado.
            </p>
          </div>
        </div>

        {/* Detalhes de Permissões */}
        <div className="lg:col-span-8">
          <div className="apple-card p-10 bg-white border border-slate-100">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h4 className="text-2xl font-black text-slate-900">{selectedRole.name}</h4>
                <p className="text-sm text-slate-500 font-medium">Defina quais módulos este perfil pode acessar.</p>
              </div>
              {isSaving && <div className="flex items-center gap-2 text-brand font-black text-[10px] uppercase tracking-widest"><i className="fas fa-spinner fa-spin"></i> Sincronizando...</div>}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(Object.keys(permissionLabels) as Array<keyof UserPermission>).map(key => {
                const info = permissionLabels[key];
                const isEnabled = selectedRole.permissions[key];

                return (
                  <div
                    key={key}
                    className={`p-6 rounded-[28px] border transition-all flex items-center justify-between group cursor-pointer ${isEnabled ? 'bg-slate-50/50 border-brand/10' : 'bg-white border-slate-100 opacity-60'
                      }`}
                    onClick={() => togglePermission(key)}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-colors ${isEnabled ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-slate-100 text-slate-400'
                        }`}>
                        <i className={`fas ${info.icon}`}></i>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">{info.label}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{info.desc}</p>
                      </div>
                    </div>
                    <div className={`w-14 h-7 rounded-full relative transition-colors ${isEnabled ? 'bg-brand' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${isEnabled ? 'left-8' : 'left-1'}`}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botão de Salvar */}
            <div className="mt-8 pt-8 border-t border-slate-100">
              <button
                onClick={handleSaveChanges}
                disabled={!hasUnsavedChanges || isSaving}
                className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-3 ${saveSuccess
                    ? 'bg-emerald-500 text-white cursor-default'
                    : hasUnsavedChanges && !isSaving
                      ? 'bg-brand text-white hover:shadow-xl hover:shadow-brand/20 active:scale-95 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
              >
                {isSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Salvando Alterações...
                  </>
                ) : saveSuccess ? (
                  <>
                    <i className="fas fa-check-circle"></i>
                    Salvo com Sucesso!
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <i className="fas fa-save"></i>
                    Salvar Alterações
                    <span className="px-2 py-1 bg-amber-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider ml-2">
                      Não Salvo
                    </span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i>
                    Todas as Alterações Salvas
                  </>
                )}
              </button>

              {/* Debug info */}
              {hasUnsavedChanges && (
                <p className="text-[10px] text-amber-600 font-medium mt-2 text-center">
                  ⚠️ Clique em "Salvar Alterações" para persistir no banco de dados
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessProfileManagement;
