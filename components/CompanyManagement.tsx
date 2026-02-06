
import React, { useState } from 'react';
import { Company, Attachment, Project } from '../types';
import ConfirmationModal from './ConfirmationModal';
import DeleteCompanyModal from './DeleteCompanyModal';
import BaseModal from './BaseModal';
import { useLanguage } from '../LanguageContext';

const formatCNPJ = (value: string) => {
  const v = value.replace(/\D/g, "").substring(0, 14);
  if (v.length <= 2) return v;
  if (v.length <= 5) return v.replace(/^(\d{2})(\d)/, "$1.$2");
  if (v.length <= 8) return v.replace(/^(\d{2})(\d{3})(\d)/, "$1.$2.$3");
  if (v.length <= 12) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d)/, "$1.$2.$3/$4");
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d)/, "$1.$2.$3/$4-$5");
};

const validateCNPJ = (cnpj: string): { valid: boolean; error?: string } => {
  const digits = cnpj.replace(/[^\d]+/g, '');
  if (digits.length === 0) return { valid: false, error: 'O CNPJ é obrigatório.' };
  if (digits.length !== 14) return { valid: false, error: 'O CNPJ deve conter 14 dígitos.' };
  if (/^(\d)\1+$/.test(digits)) return { valid: false, error: 'Formato inválido.' };

  const calculateDigit = (slice: string, factor: number[]): number => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) sum += parseInt(slice[i]) * factor[i];
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const factor1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const factor2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calculateDigit(digits.substring(0, 12), factor1);
  const d2 = calculateDigit(digits.substring(0, 13), factor2);

  return d1 === parseInt(digits[12]) && d2 === parseInt(digits[13]) ? { valid: true } : { valid: false, error: 'CNPJ inválido.' };
};

const validateEmail = (email: string): boolean => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

const formatCurrencySimple = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface CompanyManagementProps {
  companies: Company[];
  projects: Project[];
  onSave: (company: Company) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CompanyManagement: React.FC<CompanyManagementProps> = ({ companies, projects, onSave, onDelete }) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjError, setCnpjError] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [appName, setAppName] = useState('');
  const [logoData, setLogoData] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0071e3');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string, message: string, type: 'warning' | 'danger', action?: () => void } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; company: Company | null; projectCount: number } | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoData(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    setCnpjError('');
    setEmailError('');

    let hasError = false;
    if (!name.trim()) { alert("Informe a Razão Social."); hasError = true; }
    const cnpjValidation = validateCNPJ(cnpj);
    if (!cnpjValidation.valid) { setCnpjError(cnpjValidation.error || 'CNPJ Inválido'); hasError = true; }
    if (email && !validateEmail(email)) { setEmailError('Formato de e-mail inválido.'); hasError = true; }

    if (hasError) return;

    setConfirmModal({
      open: true,
      title: "Confirmar Alterações?",
      message: "Os dados da unidade serão atualizados no ecossistema.",
      type: 'warning',
      action: async () => {
        setIsLoading(true);
        try {
          const companyData: Company = {
            id: editingId || crypto.randomUUID(),
            name, cnpj, email, appName: appName || name, logoData, primaryColor, status,
            contractActive: false,
            contractAttachments: [],
            createdAt: companies.find(c => c.id === editingId)?.createdAt || Date.now(),
            // Inheritance: New companies start with default AI Rules
            aiPersona: companies.find(c => c.id === editingId)?.aiPersona || `VOCÊ É: Innova Intelligence - Seu assistente de IA amigável, entusiasta e especialista em Gestão de Projetos! 🚀
===== SUA PERSONALIDADE =====
1. SEJA AMIGÁVEL: Use emojis (🚀, 💡, ✅, 📊) para tornar a conversa leve e visualmente rica.
2. SEJA ESPECIALISTA: Você entende profundamente de gerenciamento de projetos e pode explicar conceitos.
3. SEJA PROATIVO: Se vir um projeto atrasado, sugira ações ou pergunte se o usuário quer ajuda.`,
            aiDefinitions: companies.find(c => c.id === editingId)?.aiDefinitions || `===== DEFINIÇÕES DO SISTEMA (CONHECIMENTO TÉCNICO) =====
Use estas definições para analisar os dados:
- ATRASADO 🚨: Quando a "Data de Fim" é anterior à data de hoje e o status NÃO é "Concluído".
- EM DIA ✅: Quando a "Data de Fim" é futura ou igual a hoje.
- RISCO ⚠️: Quando faltam menos de 5 dias para o prazo e a tarefa ainda não começou.
- ORÇAMENTO 💰: Compare sempre o "Custo Estimado" com o "Total do Projeto" se disponível.`
          };
          await onSave(companyData);
          reset();
        } catch (err) { alert("Erro ao gravar dados."); }
        finally { setIsLoading(false); }
      }
    });
  };

  const reset = () => {
    setName(''); setCnpj(''); setCnpjError(''); setEmail(''); setEmailError('');
    setAppName(''); setLogoData(''); setStatus('active');
    setPrimaryColor('#0071e3');
    setEditingId(null); setIsModalOpen(false);
    setConfirmModal(null);
  };

  const openEdit = (c: Company) => {
    setName(c.name); setCnpj(c.cnpj); setEmail(c.email || '');
    setAppName(c.appName || ''); setLogoData(c.logoData || '');
    setPrimaryColor(c.primaryColor || '#0071e3'); setStatus(c.status);
    setEditingId(c.id); setIsModalOpen(true);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-apple">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Ecossistema Enterprise</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Gestão centralizada de unidades e governança.</p>
        </div>
        <button
          type="button"
          onClick={() => { reset(); setIsModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-8 py-4 rounded-[24px] font-bold shadow-xl flex items-center gap-3 transition-all"
        >
          <i className="fas fa-plus text-xs"></i> Nova Unidade
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {companies.map(c => {
          const projectCount = projects.filter(p => p.companyId === c.id).length;
          return (
            <div key={c.id} className="group bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl transition-all duration-500">
              <div className="flex justify-between items-start mb-6">
                <div className="h-14 w-auto min-w-[56px] max-w-[120px] bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/5 px-2">
                  {c.logoData ? <img src={c.logoData} className="max-w-full max-h-full object-contain p-2" alt="Logo" /> : <i className="fas fa-building text-xl text-slate-300"></i>}
                </div>
                <div className="flex gap-2 transition-opacity">
                  <button onClick={() => openEdit(c)} className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center justify-center border border-slate-100 dark:border-white/5 shadow-sm"><i className="fas fa-cog text-[10px]"></i></button>
                  <button onClick={() => setDeleteModal({ open: true, company: c, projectCount })} className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center justify-center border border-rose-100 dark:border-white/5 shadow-sm"><i className="fas fa-trash-alt text-[10px]"></i></button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate leading-tight tracking-tight">{c.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.cnpj}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-white/5">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Iniciativas</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{projectCount}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5 text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <p className={`text-sm font-bold ${c.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>{c.status === 'active' ? 'Ativo' : 'Inativo'}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <BaseModal isOpen={isModalOpen} onClose={reset} maxWidth="max-w-3xl">
        <div className="h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          <header className="px-10 py-10 border-b border-slate-100 dark:border-white/5 flex flex-col bg-slate-50/30 dark:bg-slate-900/50">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{editingId ? 'Configurar Unidade' : 'Registrar Nova Unidade'}</h3>
            <p className="text-sm text-slate-400 font-bold mt-1">Defina os parâmetros de governança e branding da unidade empresarial.</p>
          </header>

          <form onSubmit={handleSaveAttempt} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
            <section className="space-y-6">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">01. Identificação Jurídica</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">Razão Social</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner outline-none font-bold text-xs text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">CNPJ</label>
                  <input type="text" value={cnpj} onChange={e => setCnpj(formatCNPJ(e.target.value))} required className={`w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner outline-none font-bold text-xs text-slate-900 dark:text-white ${cnpjError ? 'ring-2 ring-rose-500/20' : ''}`} />
                  {cnpjError && <p className="text-[8px] text-rose-500 font-black uppercase ml-1">{cnpjError}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">E-mail Administrativo</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner outline-none font-bold text-xs text-slate-900 dark:text-white" />
                </div>
              </div>
            </section>

            <section className="p-8 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[40px] border border-indigo-100/30 dark:border-indigo-500/10 space-y-6">
              <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-palette"></i> 02. Branding & Whitelabel</h5>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                <div className="md:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">Identificador da Unidade</label>
                    <input type="text" value={appName} onChange={e => setAppName(e.target.value)} placeholder="Como aparecerá no menu" className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-slate-900 border-none shadow-inner outline-none font-bold text-xs text-slate-900 dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">Cor Primária</label>
                      <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-inner">
                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border-none" />
                        <span className="text-[10px] font-mono font-black text-slate-400">{primaryColor.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">Logo Institucional</label>
                      <div className="relative h-14 bg-white dark:bg-slate-900 rounded-2xl shadow-inner flex items-center justify-center overflow-hidden cursor-pointer border border-slate-100 dark:border-slate-800">
                        {logoData ? <img src={logoData} className="h-full w-auto max-w-full object-contain p-2" /> : <span className="text-[8px] font-black text-slate-300 uppercase">Upload PNG</span>}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-12 lg:col-span-5 h-[200px] bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-white/5 flex items-center justify-center p-8 shadow-sm overflow-hidden">
                  {logoData ? <img src={logoData} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-20"><i className="fas fa-building text-5xl mb-2"></i><p className="text-[9px] font-black uppercase">Preview Logo</p></div>}
                </div>
              </div>
            </section>
          </form>

          <footer className="p-10 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 flex gap-4">
            <button type="button" onClick={reset} className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all">Descartar</button>
            <button onClick={handleSaveAttempt} disabled={isLoading} className="flex-[2] py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3">
              {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save text-xs opacity-50"></i>}
              {editingId ? 'Salvar Configurações' : 'Cadastrar Unidade'}
            </button>
          </footer>
        </div>
      </BaseModal>

      {confirmModal?.open && (
        <ConfirmationModal
          isOpen={true}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText="Confirmar"
          onConfirm={() => { confirmModal.action?.(); setConfirmModal(null); }}
          onCancel={() => setConfirmModal(null)}
          type={confirmModal.type}
        />
      )}

      <DeleteCompanyModal
        isOpen={!!deleteModal?.open}
        company={deleteModal?.company || null}
        projectCount={deleteModal?.projectCount || 0}
        isLoading={isLoading}
        onCancel={() => setDeleteModal(null)}
        onConfirm={async () => {
          if (deleteModal?.company) {
            setIsLoading(true);
            try { await onDelete(deleteModal.company.id); setDeleteModal(null); }
            catch (err) { alert("Erro ao excluir."); }
            finally { setIsLoading(false); }
          }
        }}
      />
    </div>
  );
};

export default CompanyManagement;
