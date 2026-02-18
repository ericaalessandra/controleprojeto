import React, { useState, useMemo } from 'react';
import { HelpResource, User } from '../types';
import ConfirmationModal from './ConfirmationModal';
import BaseModal from './BaseModal';
import { useLanguage } from '../LanguageContext';

interface ResourcesViewProps {
  currentUser: User;
  resources: HelpResource[];
  onAddResource: (resource: HelpResource) => Promise<void>;
  onUpdateResource: (resource: HelpResource) => Promise<void>;
  onDeleteResource: (id: string) => Promise<void>;
}

const ResourcesView: React.FC<ResourcesViewProps> = ({
  currentUser,
  resources,
  onAddResource,
  onUpdateResource,
  onDeleteResource
}) => {
  const { t } = useLanguage();
  const isAdmin = currentUser.role === 'admin';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<HelpResource | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);

  // States para o formulário
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'pdf' | 'youtube'>('pdf');
  const [url, setUrl] = useState('');
  const [fileData, setFileData] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Documentos PDF (Listagem Compacta)
  const pdfResources = useMemo(() => {
    return (Array.isArray(resources) ? resources : []).filter(r => r.type === 'pdf').sort((a, b) => b.createdAt - a.createdAt);
  }, [resources]);

  // Vídeos (Listagem Compacta)
  const videoResources = useMemo(() => {
    return (Array.isArray(resources) ? resources : []).filter(r => r.type === 'youtube').sort((a, b) => b.createdAt - a.createdAt);
  }, [resources]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileData(event.target?.result as string);
      setFileName(file.name);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setEditingResource(null);
    setTitle(''); setDescription(''); setType('pdf'); setUrl(''); setFileData(''); setFileName('');
    setIsModalOpen(false);
    setIsSaving(false);
  };

  const handleEdit = (resource: HelpResource) => {
    setEditingResource(resource);
    setTitle(resource.title);
    setDescription(resource.description || '');
    setType(resource.type);
    if (resource.type === 'youtube') setUrl(resource.url || '');
    if (resource.type === 'pdf') {
      setFileData(resource.fileData || '');
      setFileName(resource.fileName || '');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (type === 'youtube' && !url.trim()) return alert("Link obrigatório.");
    if (type === 'pdf' && !fileData) return alert("PDF obrigatório.");

    setIsSaving(true);
    try {
      const resourceData: HelpResource = {
        id: editingResource ? editingResource.id : crypto.randomUUID(),
        title,
        description,
        type,
        createdAt: editingResource ? editingResource.createdAt : Date.now(),
        ...(type === 'youtube' ? { url } : { fileData, fileName })
      };

      if (editingResource) await onUpdateResource(resourceData);
      else await onAddResource(resourceData);

      resetForm();
    } catch (err) {
      alert("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-slate-950 overflow-hidden animate-apple px-6">

      {/* HEADER COMPACTO - UNALINE */}
      <header className="flex items-center justify-between py-6 border-b border-slate-100 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white">
            <i className="fas fa-graduation-cap text-base"></i>
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t('help_title')}</h1>
        </div>

        {isAdmin && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg active:scale-95"
          >
            <i className="fas fa-plus"></i> {t('help_new_material')}
          </button>
        )}
      </header>

      {/* CONTEÚDO EM DUAS COLUNAS - SEM SCROLL GLOBAL */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 py-6 min-h-0 overflow-hidden">

        {/* COLUNA 1: Treinamentos */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <i className="fab fa-youtube text-rose-500"></i> {t('help_trainings')}
            </h2>
            <span className="text-[10px] font-bold text-slate-400">{videoResources.length} {t('metric_actions_count')}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-compact">
            {videoResources.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <i className="fab fa-youtube text-4xl mb-2"></i>
                <p className="text-[10px] font-bold uppercase">{t('help_empty')}</p>
              </div>
            ) : (
              videoResources.map((video) => (
                <div key={video.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between group border border-transparent hover:border-rose-500/20 transition-all shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 shrink-0">
                      <i className="fas fa-video text-xs"></i>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate leading-tight mb-0.5">{video.title}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">{t('help_youtube_link')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => window.open(video.url, '_blank')}
                      className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all shadow-sm"
                      title={t('help_open_youtube')}
                    >
                      <i className="fas fa-external-link-alt text-[10px]"></i>
                    </button>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(video)}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-300 hover:text-indigo-600 transition-all flex items-center justify-center border border-slate-100 dark:border-white/5"
                          title={t('edit')}
                        >
                          <i className="fas fa-pen text-[9px]"></i>
                        </button>
                        <button
                          onClick={() => setResourceToDelete(video.id)}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center border border-slate-100 dark:border-white/5"
                          title={t('delete')}
                        >
                          <i className="fas fa-trash-alt text-[10px]"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUNA 2: Manuais */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-file-pdf text-indigo-500"></i> {t('help_manuals')}
            </h2>
            <span className="text-[10px] font-bold text-slate-400">{pdfResources.length} {t('metric_actions_count')}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-compact">
            {pdfResources.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <i className="fas fa-file-pdf text-4xl mb-2"></i>
                <p className="text-[10px] font-bold uppercase">{t('help_empty')}</p>
              </div>
            ) : (
              pdfResources.map((pdf) => (
                <div key={pdf.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between group border border-transparent hover:border-indigo-500/20 transition-all shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shrink-0">
                      <i className="fas fa-file-invoice text-xs"></i>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate leading-tight mb-0.5">{pdf.title}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">{new Date(pdf.createdAt).toLocaleDateString(t('active') === 'Ativo' ? 'pt-BR' : 'en-US')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        if (pdf.fileData) {
                          const link = document.createElement('a');
                          link.href = pdf.fileData;
                          link.download = pdf.fileName || `documento-${pdf.id}.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                      className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all shadow-sm"
                      title={t('help_download_pdf')}
                    >
                      <i className="fas fa-download text-[10px]"></i>
                    </button>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(pdf)}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-300 hover:text-indigo-600 transition-all flex items-center justify-center border border-slate-100 dark:border-white/5"
                          title={t('edit')}
                        >
                          <i className="fas fa-pen text-[9px]"></i>
                        </button>
                        <button
                          onClick={() => setResourceToDelete(pdf.id)}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center border border-slate-100 dark:border-white/5"
                          title={t('delete')}
                        >
                          <i className="fas fa-trash-alt text-[10px]"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* FOOTER MINIMALISTA */}
      <footer className="py-4 text-center shrink-0">
        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Innova4Up Enterprise Hub</p>
      </footer>

      {/* MODAL DE CADASTRO OTIMIZADO */}
      <BaseModal isOpen={isModalOpen} onClose={resetForm} maxWidth="max-w-[380px]">
        <div className="p-6 pb-4 flex flex-col bg-white dark:bg-slate-900 max-h-[90vh]">
          <header className="mb-3 text-center">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {editingResource ? t('help_update_asset') : t('help_new_resource')}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('help_expand_knowledge')}</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-1 scrollbar-hide">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button type="button" onClick={() => setType('pdf')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'pdf' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                <i className="fas fa-file-pdf mr-2"></i> PDF
              </button>
              <button type="button" onClick={() => setType('youtube')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'youtube' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-sm' : 'text-slate-400'}`}>
                <i className="fab fa-youtube mr-2"></i> YouTube
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('help_material_title')}</label>
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('help_material_placeholder')}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-xs text-slate-900 dark:text-white transition-all shadow-inner focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {type === 'youtube' ? (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1">{t('help_youtube_link')}</label>
                <input
                  required
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full px-4 py-3 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border-none outline-none font-bold text-xs text-rose-600 dark:text-rose-400 shadow-inner focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">{t('help_digital_file')}</label>
                <div className="relative w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[20px] flex flex-col items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 mb-1.5 group-hover:scale-110 transition-transform">
                    <i className="fas fa-cloud-upload-alt text-base"></i>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center px-4">
                    {fileData ? (fileName.length > 25 ? fileName.substring(0, 22) + '...' : fileName) : t('help_select_pdf')}
                  </span>
                  <input type="file" accept=".pdf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all active:scale-95"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="flex-[2] py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 dark:shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : (editingResource ? t('help_update_data') : t('help_ensure_access'))}
              </button>
            </div>
          </form>
        </div>
      </BaseModal>

      <ConfirmationModal
        isOpen={!!resourceToDelete}
        title={t('help_remove_content')}
        message={t('help_confirm_remove')}
        onConfirm={async () => { if (resourceToDelete) await onDeleteResource(resourceToDelete); setResourceToDelete(null); }}
        onCancel={() => setResourceToDelete(null)}
      />
    </div>
  );
};

export default ResourcesView;
