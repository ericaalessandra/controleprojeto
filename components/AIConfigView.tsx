import React, { useState, useEffect } from 'react';
import { Company } from '../types';

interface AIConfigViewProps {
    currentCompanyId: string;
    companies: Company[];
    onSave: (company: Company, applyToAll?: boolean) => Promise<void>;
    onChangeCompany: (companyId: string) => void;
}

const DEFAULT_PERSONA = `VOCÊ É: Innova Intelligence - Seu assistente de IA amigável, entusiasta e especialista em Gestão de Projetos! 🚀
===== SUA PERSONALIDADE =====
1. SEJA AMIGÁVEL: Use emojis (🚀, 💡, ✅, 📊) para tornar a conversa leve e visualmente rica.
2. SEJA ESPECIALISTA: Você entende profundamente de gerenciamento de projetos e pode explicar conceitos.
3. SEJA PROATIVO: Se vir um projeto atrasado, sugira ações ou pergunte se o usuário quer ajuda.`;

const DEFAULT_DEFINITIONS = `===== DEFINIÇÕES DO SISTEMA (CONHECIMENTO TÉCNICO) =====
Use estas definições para analisar os dados:
- ATRASADO 🚨: Quando a "Data de Fim" é anterior à data de hoje e o status NÃO é "Concluído".
- EM DIA ✅: Quando a "Data de Fim" é futura ou igual a hoje.
- RISCO ⚠️: Quando faltam menos de 5 dias para o prazo e a tarefa ainda não começou.
- ORÇAMENTO 💰: Compare sempre o "Custo Estimado" com o "Total do Projeto" se disponível.`;

const AIConfigView: React.FC<AIConfigViewProps> = ({ currentCompanyId, companies, onSave, onChangeCompany }) => {
    const [persona, setPersona] = useState('');
    const [definitions, setDefinitions] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [applyToAll, setApplyToAll] = useState(false);

    // Encontra a empresa ativa com base no seletor (ou prop)
    const activeCompany = companies.find(c => c.id === currentCompanyId);

    useEffect(() => {
        if (activeCompany) {
            setPersona(activeCompany.aiPersona || DEFAULT_PERSONA);
            setDefinitions(activeCompany.aiDefinitions || DEFAULT_DEFINITIONS);
            setApplyToAll(false); // Reset checkbox ao trocar de empresa
        }
    }, [activeCompany?.id]); // Recarregar apenas se mudar o ID

    const handleSave = async () => {
        if (!activeCompany) return;

        // Confirmação extra se for aplicar para todos
        if (applyToAll && !window.confirm(`ATENÇÃO: Você está prestes a aplicar estas regras para TODAS as ${companies.length} empresas cadastradas.\n\nIsso sobrescreverá configurações individuais.\n\nDeseja continuar?`)) {
            return;
        }

        setIsSaving(true);
        try {
            await onSave({
                ...activeCompany,
                aiPersona: persona,
                aiDefinitions: definitions
            }, applyToAll);
            setApplyToAll(false); // Reset checkbox após salvar
        } finally {
            setIsSaving(false);
        }
    };

    const restoreDefaults = () => {
        if (window.confirm('Tem certeza? Isso apagará suas regras personalizadas.')) {
            setPersona(DEFAULT_PERSONA);
            setDefinitions(DEFAULT_DEFINITIONS);
        }
    };

    if (!activeCompany) return <div className="p-8">Carregando dados da empresa...</div>;

    return (
        <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                            <i className="fas fa-brain text-xl"></i>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Cérebro da IA</h1>
                    </div>

                    <div className="flex items-center gap-4 mt-4">
                        {/* Seletor de Empresa */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i className="fas fa-building text-slate-400 text-xs"></i>
                            </div>
                            <select
                                value={currentCompanyId}
                                onChange={(e) => onChangeCompany(e.target.value)}
                                className="appearance-none pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 border-none outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[200px]"
                            >
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <i className="fas fa-chevron-down text-slate-400 text-xs"></i>
                            </div>
                        </div>

                        <p className="text-slate-500 text-xs hidden md:block border-l border-slate-300 pl-4">
                            Editando regras de: <strong>{activeCompany.name}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="flex gap-3">
                        <button
                            onClick={restoreDefaults}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Restaurar Padrão
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all active:scale-95"
                        >
                            {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                            Salvar Regras
                        </button>
                    </div>

                    {/* Checkbox "Aplicar para Todas" */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${applyToAll ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 dark:border-slate-600 group-hover:border-purple-500'}`}>
                            <input
                                type="checkbox"
                                checked={applyToAll}
                                onChange={e => setApplyToAll(e.target.checked)}
                                className="hidden"
                            />
                            {applyToAll && <i className="fas fa-check text-[10px]"></i>}
                        </div>
                        <span className={`text-xs font-bold transition-colors ${applyToAll ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            Aplicar para TODAS as empresas
                        </span>
                    </label>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Card Personalidade */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                            <i className="fas fa-smile-beam"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Personalidade e Tom</h3>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Prompt do Sistema</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-4">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            <i className="fas fa-info-circle mr-1"></i>
                            Defina como a IA deve se comportar. Use instruções diretas como "Seja formal", "Use emojis", "Fale como um especialista".
                        </p>
                    </div>

                    <textarea
                        value={persona}
                        onChange={e => setPersona(e.target.value)}
                        className="w-full h-80 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl p-5 text-sm font-mono text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-pink-500/20 transition-all resize-none shadow-inner"
                        placeholder="Ex: Você é um assistente prestativo..."
                    />
                </div>

                {/* Card Definições Técnicas */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-Cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                            <i className="fas fa-book-open"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Definições do Sistema</h3>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Base de Conhecimento</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-4">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            <i className="fas fa-info-circle mr-1"></i>
                            Ensine a IA o que significam os termos do seu negócio. Ex: "Atrasado é quando venceu ontem".
                        </p>
                    </div>

                    <textarea
                        value={definitions}
                        onChange={e => setDefinitions(e.target.value)}
                        className="w-full h-80 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl p-5 text-sm font-mono text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none shadow-inner"
                        placeholder="Ex: ATRASADO: Data fim < hoje..."
                    />
                </div>
            </div>
        </div>
    );
};

export default AIConfigView;
