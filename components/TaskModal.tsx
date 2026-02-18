import React, { useState, useEffect } from 'react';
import { Project, Task, TaskStatus, Company, Attachment, ProjectObjective } from '../types';
import { useLanguage } from '../LanguageContext';
import BaseModal from './BaseModal';

interface TaskModalProps {
  project: Project;
  company?: Company | null;
  initialTask?: Task;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'createdAt' | 'companyId'>) => void;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1.5 align-middle">
    <i className="fas fa-circle-info text-slate-300 hover:text-indigo-500 cursor-help text-[10px] transition-colors relative z-10"></i>
    <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-900 text-white text-[10px] font-bold rounded-xl shadow-2xl z-[9999] leading-tight text-center pointer-events-none normal-case tracking-normal border border-white/10 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-x-transparent after:border-b-transparent after:border-t-slate-900 whitespace-normal">
      {text}
    </div>
  </div>
);

const TaskModal: React.FC<TaskModalProps> = ({ project, company, initialTask, onClose, onSave }) => {
  const { t } = useLanguage();
  console.log("TaskModal v2.1 loaded - with Drive Link");
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [startDate, setStartDate] = useState(initialTask?.startDate || '');
  const [endDate, setEndDate] = useState(initialTask?.endDate || '');
  const [goal, setGoal] = useState(initialTask?.goal || '');
  const [linkedObjectives, setLinkedObjectives] = useState<string[]>(initialTask?.linkedObjectives || []);
  const [budget, setBudget] = useState<number>(initialTask?.budget || 0);
  const [budgetText, setBudgetText] = useState<string>('');

  const [involvedList, setInvolvedList] = useState<string[]>(initialTask?.involved || []);
  const [newInvolved, setNewInvolved] = useState('');

  const [targetAudience, setTargetAudience] = useState(initialTask?.targetAudience || '');
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status || TaskStatus.PLANNING);
  const [attachments, setAttachments] = useState<Attachment[]>(initialTask?.attachments || []);
  const [specificGoals, setSpecificGoals] = useState<ProjectObjective[]>(initialTask?.specificGoals || [{ id: crypto.randomUUID(), description: '', deadline: '' }]);
  const [driveLink, setDriveLink] = useState(initialTask?.driveLink || '');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (initialTask?.budget) {
      setBudgetText(formatCurrency(initialTask.budget));
    } else {
      setBudgetText('R$ 0,00');
    }
  }, [initialTask]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    const numericValue = value ? parseInt(value) : 0;
    const finalValue = numericValue / 100;
    setBudget(finalValue);
    setBudgetText(formatCurrency(finalValue));
  };

  const handleAddInvolved = () => {
    if (newInvolved.trim() && !involvedList.includes(newInvolved.trim())) {
      setInvolvedList([...involvedList, newInvolved.trim()]);
      setNewInvolved('');
    }
  };

  const handleRemoveInvolved = (name: string) => {
    setInvolvedList(involvedList.filter(i => i !== name));
  };

  const toggleObjective = (objId: string) => {
    setLinkedObjectives(prev =>
      prev.includes(objId) ? prev.filter(id => id !== objId) : [...prev, objId]
    );
  };

  const addSpecificGoal = () => {
    setSpecificGoals([...specificGoals, { id: crypto.randomUUID(), description: '', deadline: '' }]);
  };

  const removeSpecificGoal = (id: string) => {
    if (specificGoals.length === 1) return;
    setSpecificGoals(specificGoals.filter(obj => obj.id !== id));
  };

  const updateSpecificGoal = (id: string, field: keyof ProjectObjective, value: string) => {
    setSpecificGoals(specificGoals.map(obj => obj.id === id ? { ...obj, [field]: value } : obj));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsUploading(true);
    const fileArray = Array.from(files);
    let loadedCount = 0;
    const newAttachments: Attachment[] = [];

    const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx'];
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    fileArray.forEach((file: File) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const isValidExtension = extension && ALLOWED_EXTENSIONS.includes(extension);
      const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);

      if (!isValidExtension && !isValidMime) {
        alert(`O arquivo "${file.name}" não é permitido. Apenas PDF, PNG, JPG, Word e Excel são aceitos.`);
        loadedCount++;
        if (loadedCount === fileArray.length) setIsUploading(false);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`O arquivo "${file.name}" excede o limite de ${MAX_FILE_SIZE_MB}MB.`);
        loadedCount++;
        if (loadedCount === fileArray.length) setIsUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        newAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          data: event.target?.result as string,
          size: file.size,
          description: ''
        });
        loadedCount++;
        if (loadedCount === fileArray.length) {
          setAttachments(prev => [...prev, ...newAttachments]);
          setIsUploading(false);
          e.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const updateAttachmentDescription = (id: string, text: string) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, description: text } : a));
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleDownload = (file: Attachment) => {
    if (!file.data) return;
    try {
      const link = document.createElement('a');
      link.href = file.data;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erro ao baixar arquivo:", err);
      alert("Falha ao baixar o arquivo.");
    }
  };

  const steps = [
    { id: 1, title: 'Básico', icon: 'fa-id-card' },
    { id: 2, title: 'Alinhamento', icon: 'fa-bullseye' },
    { id: 3, title: 'Execução', icon: 'fa-calendar-check' },
    { id: 4, title: 'Equipe', icon: 'fa-users' },
    { id: 5, title: 'Evidências', icon: 'fa-file-shield' }
  ];

  const handleNext = () => {
    if (currentStep === 1 && !title.trim()) {
      alert("Por favor, preencha o título da ação.");
      return;
    }
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = (e?: React.FormEvent | boolean) => {
    // Se e for boolean, é o flag isEarlySave. Se não, é o evento do form.
    const isEarlySave = typeof e === 'boolean' ? e : false;
    if (e && typeof e !== 'boolean') (e as React.FormEvent).preventDefault();

    if (!title.trim()) {
      alert("Por favor, preencha o título da ação.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      alert("Atenção: A 'Data Final' não pode ser anterior à 'Data Inicial'.");
      return;
    }

    // Só valida descrições se não for salvamento precoce OU se estiver na etapa 5
    if (!isEarlySave || currentStep === 5) {
      if (attachments.some(a => !a.description || a.description.trim() === '')) {
        alert("Erro: O campo 'Descritivo' é obrigatório para todos os arquivos na Etapa 5.");
        return;
      }
    }

    onSave({
      projectId: project.id,
      title,
      description,
      startDate,
      endDate,
      goal,
      linkedObjectives,
      budget,
      involved: involvedList,
      targetAudience,
      status,
      attachments,
      specificGoals: specificGoals.filter(o => o.description.trim() !== ''),
      driveLink
    });
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} maxWidth="max-w-2xl">
      <div className="h-full flex flex-col min-h-0 bg-white dark:bg-slate-900 border-none transition-all duration-300">

        {/* HEADER: TITULO E TIMELINE (RESPONSIVO) */}
        <header className="shrink-0 px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-slate-900/50">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mb-4 sm:mb-6 px-1">
            {initialTask ? 'Editar Ação' : 'Nova Ação'}
          </h3>

          {/* TIMELINE VISUAL (REFINADA PARA MOBILE) */}
          <div className="relative flex justify-between items-center max-w-lg mx-auto px-2">
            <div className="absolute top-4 sm:top-5 left-0 w-full h-[2px] bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
            <div
              className="absolute top-4 sm:top-5 left-0 h-[2px] bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-500 ease-out"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />

            {steps.map((step) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5">
                <button
                  onClick={() => {
                    if (step.id < currentStep || (currentStep === 1 && title.trim()) || currentStep > 1) {
                      setCurrentStep(step.id);
                    }
                  }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-[10px] sm:text-[11px] transition-all duration-300 shadow-md ${currentStep === step.id
                    ? 'bg-indigo-600 text-white scale-110 shadow-indigo-600/20'
                    : currentStep > step.id
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-white/5'
                    }`}
                >
                  {currentStep > step.id ? <i className="fas fa-check"></i> : step.id}
                </button>
                <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest hidden xs:block ${currentStep === step.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </header>

        {/* CORPO DO FORMULÁRIO (CONTEÚDO DA ETAPA ATUAL) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-950 p-5 sm:p-8">

          {/* ETAPA 1: BÁSICO */}
          {currentStep === 1 && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-black text-indigo-500">1</div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação Básica</h5>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Título da Ação
                    <Tooltip text="Nome curto e identificável para a ação." />
                  </label>
                  <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none font-bold text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm" placeholder="Ex: Workshop de Capacitação" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Descrição do Escopo
                    <Tooltip text="O que será entregue nesta ação?" />
                  </label>
                  <textarea rows={6} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none font-bold text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none shadow-sm" placeholder="O que será entregue nesta ação?" />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: ALINHAMENTO */}
          {currentStep === 2 && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-black text-indigo-500">2</div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alinhamento Estratégico</h5>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Objetivo Específico
                    <Tooltip text="Qual o propósito fundamental?" />
                  </label>
                  <textarea rows={3} value={goal} onChange={e => setGoal(e.target.value)} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none font-bold text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none shadow-sm" placeholder="Qual o propósito fundamental?" />
                </div>

                {/* Metas Específicas */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">
                      Metas Específicas
                      <Tooltip text="Marcos específicos e mensuráveis que definem o sucesso dessa ação." />
                    </label>
                    <button
                      type="button"
                      onClick={addSpecificGoal}
                      className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                    >
                      <i className="fas fa-plus text-[8px]"></i>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {specificGoals.map((g, idx) => (
                      <div key={g.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-3 items-end group transition-all">
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-4 h-4 rounded-md bg-indigo-600 text-white text-[8px] flex items-center justify-center font-black">{idx + 1}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Descrição da Meta</span>
                          </div>
                          <input
                            type="text"
                            value={g.description}
                            onChange={e => updateSpecificGoal(g.id, 'description', e.target.value)}
                            placeholder="Ex: Concluir etapa 1"
                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-none text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none shadow-inner focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div className="w-full sm:w-32 space-y-2">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo</span>
                          <input
                            type="date"
                            value={g.deadline}
                            onChange={e => updateSpecificGoal(g.id, 'deadline', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-none text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none shadow-inner"
                          />
                        </div>
                        {specificGoals.length > 1 && (
                          <button type="button" onClick={() => removeSpecificGoal(g.id)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center shadow-sm">
                            <i className="fas fa-trash-alt text-[10px]"></i>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-white/5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Relacionar às Metas do Projeto:
                    <Tooltip text="Vincule esta ação a uma ou mais metas globais do projeto." />
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {project.objectives?.map(obj => (
                      <label key={obj.id} className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${linkedObjectives.includes(obj.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-indigo-300'}`}>
                        <input type="checkbox" checked={linkedObjectives.includes(obj.id)} onChange={() => toggleObjective(obj.id)} className="sr-only" />
                        <div className={`w-5 h-5 mt-0.5 rounded-lg flex items-center justify-center transition-all ${linkedObjectives.includes(obj.id) ? 'bg-white text-indigo-600 shadow-sm' : 'border-2 border-slate-200 bg-white'}`}>
                          {linkedObjectives.includes(obj.id) && <i className="fas fa-check text-[10px]"></i>}
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold leading-tight flex-1">{obj.description}</span>
                      </label>
                    ))}
                    {(!project.objectives || project.objectives.length === 0) && (
                      <div className="p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-center">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma meta cadastrada no projeto</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: EXECUÇÃO */}
          {currentStep === 3 && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-black text-indigo-500">3</div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execução & Recursos</h5>
                </div>
                <div className="grid grid-cols-1 gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Data Início
                        <Tooltip text="Data planejada para o início das atividades." />
                      </label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none outline-none font-bold text-xs dark:text-white shadow-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Data Fim
                        <Tooltip text="Prazo limite para a entrega desta ação." />
                      </label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none outline-none font-bold text-xs dark:text-white shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-1">
                      Custo Total Previsto (R$)
                      <Tooltip text="Valor orçado para a execução desta ação." />
                    </label>
                    <input type="text" value={budgetText} onChange={handleBudgetChange} className="w-full px-5 py-4 rounded-xl sm:rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-none outline-none font-black text-base sm:text-lg shadow-sm" placeholder="R$ 0,00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Público Beneficiado
                      <Tooltip text="Quem será diretamente impactado por esta ação?" />
                    </label>
                    <input type="text" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none font-bold text-xs dark:text-white shadow-sm" placeholder="Ex: Mulheres líderes, Equipe técnica..." />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: EQUIPE */}
          {currentStep === 4 && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-black text-indigo-500">4</div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe Responsável</h5>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input type="text" value={newInvolved} onChange={e => setNewInvolved(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddInvolved())} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none font-bold text-xs dark:text-white shadow-sm" placeholder="Nome do integrante..." />
                      <div className="absolute top-4 right-4">
                        <Tooltip text="Pessoas responsáveis pela execução desta ação." />
                      </div>
                    </div>
                    <button type="button" onClick={handleAddInvolved} className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center hover:scale-105 transition-all shadow-lg active:scale-95"><i className="fas fa-plus"></i></button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {involvedList.map(person => (
                      <div key={person} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl sm:rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-slate-500">{person.charAt(0).toUpperCase()}</div>
                          <span className="text-xs font-bold text-slate-700 dark:text-white truncate max-w-[180px] sm:max-w-none">{person}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveInvolved(person)} className="text-slate-300 hover:text-rose-500 transition-colors px-2 rounded-lg py-1"><i className="fas fa-trash-alt text-[10px]"></i></button>
                      </div>
                    ))}
                    {involvedList.length === 0 && (
                      <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px] text-center">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum responsável adicionado</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 5: EVIDÊNCIAS */}
          {currentStep === 5 && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-[10px] font-black text-amber-500">5</div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentação & Evidências</h5>
                </div>

                {/* Google Drive Link for Task */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Informar o link para o diretório (Google Drive) dessa Ação:
                    <Tooltip text="Incluir o link do Google Drive com as evidências de execução dessa ação." />
                  </label>
                  <input
                    type="text"
                    value={driveLink}
                    onChange={e => setDriveLink(e.target.value)}
                    className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none font-bold text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                    placeholder="https://drive.google.com/..."
                  />
                </div>

                <div className="relative p-6 sm:p-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl sm:rounded-[40px] flex flex-col items-center justify-center bg-slate-50/10 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group cursor-pointer">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-indigo-500 mb-3 group-hover:scale-110 transition-transform">
                    <i className="fas fa-cloud-arrow-up text-lg sm:text-xl"></i>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Upload de Arquivos Digitais</p>
                    <Tooltip text="Carregue arquivos que comprovem a execução desta ação. PDF, PNG, JPG, Word e Excel são aceitos." />
                  </div>
                  <p className="text-[7px] text-slate-300 uppercase tracking-widest mt-1">PDF, PNG, JPG, WORD, EXCEL</p>
                  <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>

                <div className="space-y-4">
                  {attachments.map(file => (
                    <div key={file.id} className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl sm:rounded-3xl shadow-sm space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <i className={`fas ${file.type.includes('image')
                            ? 'fa-image text-amber-500'
                            : file.type.includes('pdf')
                              ? 'fa-file-pdf text-rose-500'
                              : file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')
                                ? 'fa-file-word text-blue-500'
                                : file.type.includes('sheet') || file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')
                                  ? 'fa-file-excel text-emerald-500'
                                  : 'fa-file text-slate-400'
                            } text-xs sm:text-base`}></i>
                          <span className="text-[10px] font-bold text-slate-500 truncate max-w-[150px] sm:max-w-[200px]">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(file)}
                            className="text-slate-300 hover:text-indigo-500 transition-colors p-1"
                            title="Baixar arquivo"
                          >
                            <i className="fas fa-download text-[10px]"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAttachment(file.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                            title="Excluir arquivo"
                          >
                            <i className="fas fa-trash-alt text-[10px]"></i>
                          </button>
                        </div>
                      </div>
                      <input type="text" value={file.description || ''} onChange={e => updateAttachmentDescription(file.id, e.target.value)} placeholder="O que este arquivo comprova?" className={`w-full px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800 border text-[10px] sm:text-[11px] font-bold outline-none transition-all ${!file.description ? 'border-rose-200' : 'border-slate-100 dark:border-white/5 focus:border-indigo-500'}`} />
                    </div>
                  ))}
                </div>

                <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 rounded-xl sm:rounded-2xl flex items-start gap-3">
                  <i className="fas fa-shield-halved text-slate-400 text-[10px] mt-1 shrink-0"></i>
                  <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 leading-normal uppercase tracking-tight">{t('lgpd_attachment_warning')}</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER: CONTROLES DE NAVEGAÇÃO DA TIMELINE (ESTRATÉGICO MOBILE) */}
        <footer className="shrink-0 p-5 sm:p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 flex gap-3 sm:gap-4">
          <div className="flex-1 flex gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 sm:flex-none px-4 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400 font-black uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <i className="fas fa-angle-left"></i> <span className="hidden xs:inline">Voltar</span>
              </button>
            )}

            {title.trim() && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="flex-1 sm:flex-none px-4 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-indigo-100 dark:border-indigo-500/20 text-indigo-500 font-black uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                title="Salvar alterações e sair"
              >
                <i className="fas fa-save shadow-sm"></i> <span className="hidden xs:inline">Salvar Ação</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={currentStep === 5 ? () => handleSubmit() : handleNext}
            disabled={isUploading}
            className={`flex-1 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3 ${currentStep === 5
              ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-indigo-600/10'
              : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white'
              }`}
          >
            {isUploading ? <i className="fas fa-spinner fa-spin"></i> : (
              <>
                {currentStep === 5 ? (initialTask ? 'Salvar Alterações' : 'Concluir & Lançar') : 'Próxima Etapa'}
                {currentStep !== 5 && <i className="fas fa-angle-right text-xs"></i>}
              </>
            )}
          </button>
        </footer>

      </div>
      <style>{`
        @media (max-width: 480px) {
          .xs\\:block { display: block; }
          .xs\\:inline { display: inline; }
        }
        @media (max-width: 380px) {
          .xs\\:block { display: none; }
          .xs\\:inline { display: none; }
        }
      `}</style>
    </BaseModal>
  );
};

export default TaskModal;
