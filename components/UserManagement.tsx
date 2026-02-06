
import React, { useState, useMemo } from 'react';
import { User, Company, Invitation } from '../types';
import ConfirmationModal from './ConfirmationModal';
import BaseModal from './BaseModal';

interface UserManagementProps {
  users: User[];
  companies: Company[];
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onAddUser: (user: User) => Promise<void>;
  invitations: Invitation[];
  onAddInvitation: (invite: Invitation) => Promise<void>;
  onDeleteInvitation: (id: string) => Promise<void>;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, companies, onUpdateUser, onDeleteUser, onToggleStatus, onAddUser, invitations, onAddInvitation, onDeleteInvitation }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [inviteToDelete, setInviteToDelete] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tab, setTab] = useState<'active' | 'pending'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '123',
    companyId: '',
    role: 'user' as 'admin' | 'user'
  });

  React.useEffect(() => {
    if (companies.length === 1 && !formData.companyId) {
      setFormData(prev => ({ ...prev, companyId: companies[0].id }));
    }
  }, [companies, formData.companyId]);

  const filteredUsers = useMemo(() => {
    let result = users || [];
    if (selectedCompanyId !== 'all') result = result.filter(u => u && u.companyId === selectedCompanyId);
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(u =>
        (u.name || '').toLowerCase().includes(low) ||
        (u.email || '').toLowerCase().includes(low)
      );
    }
    return result;
  }, [users, selectedCompanyId, searchTerm]);

  const filteredInvites = useMemo(() => {
    let result = invitations || [];
    if (selectedCompanyId !== 'all') result = result.filter(i => i && i.companyId === selectedCompanyId);
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(i => (i.email || '').toLowerCase().includes(low));
    }
    return result;
  }, [invitations, selectedCompanyId, searchTerm]);

  const validateUserForm = (isEditing: boolean, currentId?: string) => {
    if (!formData.name.trim()) return "O campo 'Nome Completo' é obrigatório.";
    if (!formData.email.trim()) return "O campo 'E-mail Corporativo' é obrigatório.";
    if (!formData.companyId) return "O vínculo com uma 'Unidade' é obrigatório.";
    if (!formData.role) return "O 'Perfil de Acesso' é obrigatório.";

    const emailExists = users.some(u =>
      u.email.toLowerCase() === formData.email.toLowerCase() &&
      u.id !== currentId
    );

    if (emailExists) {
      return "Este e-mail já está cadastrado para outro colaborador.";
    }

    return null;
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    const error = validateUserForm(true, editingUser.id);
    if (error) {
      alert(error);
      return;
    }
    await onUpdateUser({ ...editingUser, ...formData });
    setEditingUser(null);
  };

  const handleAddUser = async () => {
    const error = validateUserForm(false);
    if (error) {
      alert(error);
      return;
    }

    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

    await onAddInvitation({
      id: safeId,
      email: formData.email,
      companyId: formData.companyId,
      role: formData.role,
      invitedBy: '',
      status: 'pending',
      createdAt: Date.now()
    });
    setIsAddModalOpen(false);
    setFormData({ name: '', email: '', password: '123', companyId: '', role: 'user' });
    setTab('pending');
  };

  const openAddModal = () => {
    setFormData({ name: '', email: '', password: '123', companyId: '', role: 'user' });
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: user.password || '',
      companyId: user.companyId,
      role: user.role
    });
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingUser(null);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Equipe Global</h2>
          <div className="flex gap-4 mb-2">
            <button onClick={() => setTab('active')} className={`text-xs font-bold uppercase tracking-wider pb-1 border-b-2 transition-all ${tab === 'active' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-400 dark:text-slate-500'}`}>Ativos ({filteredUsers.length})</button>
            <button onClick={() => setTab('pending')} className={`text-xs font-bold uppercase tracking-wider pb-1 border-b-2 transition-all ${tab === 'pending' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-400 dark:text-slate-500'}`}>Pendentes ({filteredInvites.length})</button>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">Gestão direta de colaboradores e acessos autorizados.</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedCompanyId}
            onChange={e => setSelectedCompanyId(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Todas as Empresas</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap">
            <i className="fas fa-plus"></i> Novo Usuário
          </button>
        </div>
      </header>

      <div className="mb-6 relative">
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"></i>
        <input
          type="text"
          placeholder="Pesquisar por nome ou e-mail..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all shadow-sm text-slate-800 dark:text-white"
        />
      </div>

      <div className="apple-card overflow-hidden">
        {tab === 'active' ? (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Colaborador</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Empresa</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Perfil</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shadow-sm">{(user.name || '?').charAt(0)}</div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{companies.find(c => c.id === user.companyId)?.name || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => onToggleStatus(user.id)} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${user.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
                      {user.status === 'active' ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(user)} className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><i className="fas fa-edit text-xs"></i></button>
                      <button onClick={() => setUserToDelete(user.id)} className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt text-xs"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">E-mail Autorizado</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Empresa</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Perfil</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {filteredInvites.map(invite => (
                <tr key={invite.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center font-bold text-sm shadow-sm"><i className="fas fa-paper-plane text-xs"></i></div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{invite.email}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Aguardando Registro</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{companies.find(c => c.id === invite.companyId)?.name || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${invite.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      {invite.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">Pendente</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setInviteToDelete(invite.id)} className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"><i className="fas fa-times text-xs"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BaseModal isOpen={isAddModalOpen || !!editingUser} onClose={closeModal} maxWidth="max-w-md">
        <div className="bg-white dark:bg-slate-900 overflow-hidden">
          <header className="px-8 py-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-slate-900/50">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {editingUser ? 'Configurar Colaborador' : 'Autorizar Novo Colaborador'}
            </h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Gestão de Equipe & Governança</p>
          </header>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" placeholder="Ex: João Silva" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner outline-none text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                <input type="email" placeholder="email@empresa.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner outline-none text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">Perfil de Acesso</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                    className="w-full px-5 py-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-xs font-black text-indigo-600 dark:text-indigo-400 outline-none border-none shadow-inner focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  >
                    <option value="user">Colaborador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <p className="text-[8px] text-slate-400 font-bold uppercase leading-tight italic py-2">
                    A senha será criada no 1º acesso.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">Vincular Unidade</label>
                <select value={formData.companyId} onChange={e => setFormData({ ...formData, companyId: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all">
                  <option value="">Selecione a Unidade...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <footer className="flex gap-3 pt-6">
              <button onClick={closeModal} className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancelar</button>
              <button onClick={editingUser ? handleSaveEdit : handleAddUser} className="flex-[2] py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
                {editingUser ? 'Atualizar Colaborador' : 'Confirmar Autorização'}
              </button>
            </footer>
          </div>
        </div>
      </BaseModal>

      <ConfirmationModal isOpen={!!userToDelete} title="Remover Usuário?" message="O acesso será revogado permanentemente." onConfirm={() => { if (userToDelete) onDeleteUser(userToDelete); setUserToDelete(null); }} onCancel={() => setUserToDelete(null)} />
      <ConfirmationModal isOpen={!!inviteToDelete} title="Remover Autorização?" message="O convite será cancelado e o e-mail não poderá mais se registrar." onConfirm={() => { if (inviteToDelete) onDeleteInvitation(inviteToDelete); setInviteToDelete(null); }} onCancel={() => setInviteToDelete(null)} />
    </div>
  );
};

export default UserManagement;
