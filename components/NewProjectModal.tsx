
import React, { useState, useEffect } from 'react';
import { ProjectObjective, Company } from '../types';
import BaseModal from './BaseModal';

interface NewProjectModalProps {
  onClose: () => void;
  onSave: (name: string, description: string, totalBudget?: number, objectives?: ProjectObjective[], startDate?: string, endDate?: string, logoData?: string) => Promise<string | void>;
  projectToEdit?: any;
  company?: Company | null;
}

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1.5 align-middle">
    <i className="fas fa-circle-info text-slate-300 hover:text-indigo-500 cursor-help text-[10px] transition-colors relative z-10"></i>
    <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-4 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold rounded-2xl shadow-2xl z-[9999] leading-tight text-center pointer-events-none normal-case tracking-normal border border-white/10 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-x-transparent after:border-b-transparent after:border-t-slate-900 whitespace-normal">
      {text}
    </div>
  </div>
);

const NewProjectModal: React.FC<NewProjectModalProps> = ({ onClose, onSave, projectToEdit, company }) => {
  const [name, setName] = useState(projectToEdit?.name || '');
  const [logoData, setLogoData] = useState(projectToEdit?.logoData || '');
  const [description, setDescription] = useState(projectToEdit?.description || '');
  const [totalBudget, setTotalBudget] = useState<number>(projectToEdit?.totalBudget || 0);
  const [budgetText, setBudgetText] = useState<string>('');
  const [startDate, setStartDate] = useState(projectToEdit?.startDate || '');
  const [endDate, setEndDate] = useState(projectToEdit?.endDate || '');
  const [objectives, setObjectives] = useState<ProjectObjective[]>(projectToEdit?.objectives || [{ id: crypto.randomUUID(), description: '', deadline: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    if (projectToEdit?.totalBudget) {
      setBudgetText(formatCurrency(projectToEdit.totalBudget));
    } else {
      setBudgetText('R$ 0,00');
    }
  }, [projectToEdit]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    const numericValue = value ? parseInt(value) / 100 : 0;
    setTotalBudget(numericValue);
    setBudgetText(formatCurrency(numericValue));
  };

  const addObjective = () => {
    setObjectives([...objectives, { id: crypto.randomUUID(), description: '', deadline: '' }]);
  };

  const removeObjective = (id: string) => {
    if (objectives.length === 1) return;
    setObjectives(objectives.filter(obj => obj.id !== id));
  };

  const updateObjective = (id: string, field: keyof ProjectObjective, value: string) => {
    setObjectives(objectives.map(obj => obj.id === id ? { ...obj, [field]: value } : obj));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDateError('');

    if (!name.trim()) return;

    if (startDate && endDate && endDate < startDate) {
      setDateError("Atenção: A data final não pode ser anterior à data inicial.");
      return;
    }

    setIsSaving(true);
    onSave(name, description, totalBudget, objectives.filter(o => o.description.trim() !== ''), startDate, endDate, logoData)
      .finally(() => {
        setIsSaving(false);
        onClose();
      });
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col h-[90vh] sm:h-auto overflow-hidden bg-white dark:bg-slate-900">

        {/* Header Elegante */}
        <header className="px-10 py-10 border-b border-slate-100 dark:border-white/5 flex flex-col bg-slate-50/30 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            {company?.logoData && (
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-center p-2 shadow-sm shrink-0">
                <img src={company.logoData} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {projectToEdit ? 'Configurar Iniciativa' : 'Nova Iniciativa Estratégica'}
              </h3>
              <p className="text-sm text-slate-400 font-bold mt-1">Planejamento e governança de projeto.</p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-white dark:bg-slate-950">

          {/* Seção 1: Identidade Visual e Informações */}
          <section className="space-y-6">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Informações Gerais</h4>

            <div className="flex flex-col sm:flex-row gap-6">
              {/* Logo à Esquerda */}
              <div className="shrink-0">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors">
                    {logoData ? (
                      <img src={logoData} alt="Project Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-center p-2">
                        <i className="fas fa-image text-2xl text-slate-300 mb-1"></i>
                        <p className="text-[8px] font-black text-slate-400 uppercase leading-tight">Logo</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setLogoData(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform pointer-events-none">
                    <i className="fas fa-pen text-[10px]"></i>
                  </div>
                </div>
              </div>

              {/* Campos à Direita */}
              <div className="flex-1 space-y-4">
                <div className="relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                    Título do Projeto
                    <Tooltip text="Nome curto e identificável para a iniciativa estratégica." />
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-5 py-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none outline-none font-bold text-sm text-slate-900 dark:text-white transition-all shadow-inner focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ex: Expansão Nacional 2026"
                  />
                </div>

                <div className="relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                    Resumo / Escopo
                    <Tooltip text="Descrição sucinta dos objetivos e o que está incluído ou excluído do projeto." />
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-5 py-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none outline-none font-medium text-sm resize-none text-slate-900 dark:text-white transition-all shadow-inner focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Qual o objetivo principal desta iniciativa?"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Seção 2: Cronograma e Verba */}
          <section className="space-y-6">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Cronograma e Financeiro</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                    Data Inicial
                    <Tooltip text="Data planejada para o início das atividades conforme o cronograma." />
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setDateError(''); }}
                    className="w-full px-5 py-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none text-xs font-bold text-slate-900 dark:text-white outline-none shadow-inner"
                  />
                </div>
                <div className="relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                    Data Final
                    <Tooltip text="Prazo limite para a entrega de todos os marcos e encerramento do projeto." />
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setDateError(''); }}
                    className={`w-full px-5 py-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none text-xs font-bold ${dateError ? 'text-rose-500' : 'text-slate-900 dark:text-white'} outline-none shadow-inner`}
                  />
                </div>
              </div>

              <div className="relative">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                  Investimento Previsto
                  <Tooltip text="Valor total orçado para a execução desta iniciativa." />
                </label>
                <input
                  type="text"
                  value={budgetText}
                  onChange={handleBudgetChange}
                  className="w-full px-5 py-4 rounded-3xl bg-indigo-50 dark:bg-indigo-900/10 border-none outline-none font-black text-sm text-indigo-600 dark:text-indigo-400 shadow-inner"
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
            {dateError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex items-center gap-3 text-rose-600 dark:text-rose-400 animate-apple">
                <i className="fas fa-exclamation-circle"></i>
                <span className="text-[10px] font-black uppercase tracking-widest">{dateError}</span>
              </div>
            )}
          </section>

          {/* Seção 3: Metas e OKRs */}
          <section className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                Metas e OKRs
                <Tooltip text="Marcos específicos e mensuráveis que definem o sucesso do projeto." />
              </h4>
              <button
                type="button"
                onClick={addObjective}
                className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
              >
                <i className="fas fa-plus text-[10px]"></i>
              </button>
            </div>

            <div className="space-y-3">
              {objectives.map((obj, index) => (
                <div key={obj.id} className="p-6 rounded-[28px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex flex-col md:flex-row gap-4 items-end group transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl">
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white text-[9px] flex items-center justify-center font-black">{index + 1}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição do Marco</span>
                    </div>
                    <input
                      type="text"
                      value={obj.description}
                      onChange={e => updateObjective(obj.id, 'description', e.target.value)}
                      placeholder="Ex: Aumentar market share em 5%"
                      className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border-none text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none shadow-inner focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="w-full md:w-36 space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Deadline</span>
                    <input
                      type="date"
                      value={obj.deadline}
                      onChange={e => updateObjective(obj.id, 'deadline', e.target.value)}
                      className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border-none text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none shadow-inner"
                    />
                  </div>
                  {objectives.length > 1 && (
                    <button type="button" onClick={() => removeObjective(obj.id)} className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center">
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </form>

        {/* Footer de Ação Otimizado */}
        <footer className="p-10 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-10 py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-white dark:hover:bg-slate-700 transition-all">Cancelar</button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
            {projectToEdit ? 'Confirmar Alterações' : 'Criar Iniciativa'}
          </button>
        </footer>
      </div>
    </BaseModal>
  );
};

export default NewProjectModal;
