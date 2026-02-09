import { Project, Task, HelpResource, User, ActivityLog, Company, UserRole, AccessoryTask, Invitation } from './types';
import { supabase } from './supabase';

const DB_NAME = 'Innova4UpDB';
const DB_VERSION = 10; // Incrementado para incluir INVITATIONS
const STORES = {
  COMPANIES: 'companies',
  PROJECTS: 'projects',
  TASKS: 'tasks',
  ACCESSORY_TASKS: 'accessory_tasks', // Nova store
  RESOURCES: 'resources',
  USERS: 'users',
  LOGS: 'logs',
  ROLES: 'roles',
  INVITATIONS: 'invitations'
};

export class Database {
  private db: IDBDatabase | null = null;
  private isFallback: boolean = false;

  async init(): Promise<void> {
    return new Promise((resolve) => { // Removido reject para evitar travar o app
      try {
        if (typeof indexedDB === 'undefined') {
          console.warn('[DB] IndexedDB not available (Incognito?). Using fallback mode.');
          this.isFallback = true;
          return resolve();
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORES.COMPANIES)) {
            db.createObjectStore(STORES.COMPANIES, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
            const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
            projectStore.createIndex('companyId', 'companyId', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORES.TASKS)) {
            const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
            taskStore.createIndex('companyId', 'companyId', { unique: false });
            taskStore.createIndex('projectId', 'projectId', { unique: false });
          }
          // Nova Store para Scheduler
          if (!db.objectStoreNames.contains(STORES.ACCESSORY_TASKS)) {
            const accStore = db.createObjectStore(STORES.ACCESSORY_TASKS, { keyPath: 'id' });
            accStore.createIndex('companyId', 'companyId', { unique: false });
            accStore.createIndex('date', 'date', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORES.RESOURCES)) {
            db.createObjectStore(STORES.RESOURCES, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.USERS)) {
            const userStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
            userStore.createIndex('companyId', 'companyId', { unique: false });
            userStore.createIndex('email', 'email', { unique: true });
          }
          if (!db.objectStoreNames.contains(STORES.LOGS)) {
            const logStore = db.createObjectStore(STORES.LOGS, { keyPath: 'id' });
            logStore.createIndex('companyId', 'companyId', { unique: false });
            logStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORES.ROLES)) {
            db.createObjectStore(STORES.ROLES, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.INVITATIONS)) {
            db.createObjectStore(STORES.INVITATIONS, { keyPath: 'id' });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.isFallback = false;
          this.cleanupOldLogs();
          console.log('[DB] Local database initialized successfully');
          resolve();
        };

        request.onerror = (e) => {
          console.error('[DB] Failed to open database:', (e.target as IDBOpenDBRequest).error);
          console.warn('[DB] Switching to fallback mode (no local persistence).');
          this.isFallback = true;
          resolve(); // Resolvemos mesmo com erro para não bloquear o app
        };
      } catch (err) {
        console.error('[DB] Critical error opening database:', err);
        this.isFallback = true;
        resolve();
      }
    });
  }

  private async cleanupOldLogs() {
    if (!this.db) return;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const store = this.getStore(STORES.LOGS, 'readwrite');
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(thirtyDaysAgo);
    const request = index.openCursor(range);
    request.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  private getStore(storeName: string, mode: IDBTransactionMode) {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  private async writeData(storeName: string, data: any): Promise<void> {
    if (this.isFallback || !this.db) {
      // No-op em modo fallback
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(); // Fallback silencioso extra
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.put(data);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async deleteData(storeName: string, id: string): Promise<void> {
    if (this.isFallback || !this.db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getStoreData(storeName: keyof typeof STORES): Promise<any[]> {
    if (this.isFallback || !this.db) return Promise.resolve([]); // Retorna array vazio
    return new Promise((resolve) => {
      const store = this.getStore(STORES[storeName], 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  }

  async exportFullDatabase(): Promise<string> {
    const backup: any = {};
    for (const key of Object.keys(STORES)) {
      backup[key] = await this.getStoreData(key as keyof typeof STORES);
    }
    return JSON.stringify(backup);
  }

  async importFullDatabase(json: string): Promise<void> {
    const data = JSON.parse(json);
    for (const [storeName, items] of Object.entries(data)) {
      const storeKey = Object.keys(STORES).find(k => STORES[k as keyof typeof STORES] === storeName || k === storeName);
      if (storeKey) {
        const typedItems = items as any[];
        for (const item of typedItems) {
          await this.writeData(storeName, item);
        }
      }
    }
  }

  async getCompany(id: string): Promise<Company | null> {
    if (this.isFallback || !this.db) return Promise.resolve(null);
    return new Promise((resolve) => {
      const store = this.getStore(STORES.COMPANIES, 'readonly');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  async getAllCompanies(): Promise<Company[]> {
    if (this.isFallback || !this.db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const store = this.getStore(STORES.COMPANIES, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  }

  async saveCompany(company: Company): Promise<void> {
    await this.writeData(STORES.COMPANIES, company);
    // Sync with Supabase (Requer Admin RLS)
    const { error } = await supabase.from('companies').upsert({
      id: company.id,
      name: company.name,
      cnpj: company.cnpj,
      email: company.email,
      logo_data: company.logoData,
      login_bg_data: company.loginBgData,
      chatbot_icon_data: company.chatBotIconData,
      primary_color: company.primaryColor,
      app_name: company.appName,
      privacy_policy: company.privacyPolicy,
      terms_of_use: company.termsOfUse,
      ai_persona: company.aiPersona,
      ai_definitions: company.aiDefinitions,
      status: company.status,
      contract_active: company.contractActive
    });
    if (error) {
      console.error("Supabase Company Sync Error:", error);
      throw new Error(`Erro ao sincronizar empresa: ${error.message}`);
    }
  }

  async saveCompanyLocally(company: Company): Promise<void> {
    await this.writeData(STORES.COMPANIES, company);
  }


  async getLogsByCompany(companyId: string): Promise<ActivityLog[]> {
    if (this.isFallback || !this.db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const store = this.getStore(STORES.LOGS, 'readonly');
      const index = store.index('companyId');
      const request = index.getAll(companyId);
      request.onsuccess = () => resolve(request.result as ActivityLog[]);
      request.onerror = () => resolve([]);
    });
  }

  async saveLog(log: ActivityLog): Promise<void> {
    console.log('[DB] saveLog called:', { id: log.id, action: log.action, timestamp: log.timestamp });

    // Garantir que o timestamp sempre existe
    if (!log.timestamp) {
      log.timestamp = Date.now();
      console.warn('[DB] timestamp was missing, added:', log.timestamp);
    }

    try {
      await this.writeData(STORES.LOGS, log);
      console.log('[DB] Log saved to IndexedDB');

      const { error } = await supabase.from('activity_logs').insert({
        id: log.id,
        company_id: log.companyId,
        user_id: log.userId,
        user_name: log.userName,
        user_email: log.userEmail,
        action: log.action,
        details: log.details,
        ip_address: log.ipAddress,
        device_info: log.deviceInfo,
        timestamp: new Date(log.timestamp).toISOString() // Converter para ISO string
      });

      if (error) {
        console.error("[DB] Supabase Log Sync Error:", error);
      } else {
        console.log('[DB] Log synced to Supabase successfully');
      }
    } catch (error) {
      console.error('[DB] saveLog failed:', error);
      // Removed throw here to prevent blocking if local DB write fails in a complex chain
      // But re-throwing might be safer if caller expects it. Given we want resilience:
      // Let's NOT rethrow if the error is local db related, but the supabase part worked?
      // Actually, if modify `writeData` safely, this try/catch mainly catches supabase errors or other logic.
      // We'll keep throw error to be safe about business logic, but writeData is now safe.
      throw error;
    }
  }

  async deleteLogs(criteria: { companyId?: string, action?: string, startDate?: number, endDate?: number }): Promise<void> {
    console.log('[DB] deleteLogs called with criteria:', criteria);

    let deletedFromIndexDB = 0;

    // 1. Deletar do IndexedDB (Local)
    await new Promise<void>((resolve, reject) => {
      if (this.isFallback || !this.db) return resolve();
      try {
        const store = this.getStore(STORES.LOGS, 'readwrite');
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const log = cursor.value as ActivityLog;
            let shouldDelete = false; // Mudado para false por padrão

            // Deletar se estiver DENTRO dos critérios especificados
            let matchesCompany = !criteria.companyId || log.companyId === criteria.companyId;
            let matchesAction = !criteria.action || criteria.action === 'all' || log.action === criteria.action;
            let matchesDateRange = true;

            if (criteria.startDate && log.timestamp < criteria.startDate) matchesDateRange = false;
            if (criteria.endDate && log.timestamp > criteria.endDate) matchesDateRange = false;

            shouldDelete = matchesCompany && matchesAction && matchesDateRange;

            if (shouldDelete) {
              cursor.delete();
              deletedFromIndexDB++;
            }
            cursor.continue();
          } else {
            console.log(`[DB] Deleted ${deletedFromIndexDB} logs from IndexedDB`);
            resolve();
          }
        };
        request.onerror = () => reject('Failed to iterate logs');
      } catch (e) {
        // Safe resolve on error
        console.error("Local log delete error", e);
        resolve();
      }
    });

    // 2. Deletar do Supabase (Nuvem)
    console.log('[DB] Deleting logs from Supabase...');
    let query = supabase.from('activity_logs').delete();

    if (criteria.companyId) query = query.eq('company_id', criteria.companyId);
    if (criteria.action && criteria.action !== 'all') query = query.eq('action', criteria.action);

    // CRITICAL: Supabase espera TIMESTAMPTZ (ISO string), não timestamp numérico
    // Converter timestamps para ISO strings
    if (criteria.startDate) {
      const startISO = new Date(criteria.startDate).toISOString();
      console.log(`[DB] Start date filter: ${criteria.startDate} -> ${startISO}`);
      query = query.gte('timestamp', startISO);
    }
    if (criteria.endDate) {
      const endISO = new Date(criteria.endDate).toISOString();
      console.log(`[DB] End date filter: ${criteria.endDate} -> ${endISO}`);
      query = query.lte('timestamp', endISO);
    }

    const { error, count } = await query;

    if (error) {
      console.error("[DB] Supabase Log Deletion Error:", error);
      throw new Error(`Erro ao deletar do Supabase: ${error.message}`);
    } else {
      console.log(`[DB] Successfully deleted logs from Supabase`);
    }
  }

  // Função de limpeza para corrigir logs sem timestamp
  async cleanupLogsWithoutTimestamp(): Promise<{ fixed: number, deleted: number }> {
    let fixedCount = 0;
    let deletedCount = 0;
    const idsToDelete: string[] = [];

    // 1. Limpar IndexedDB
    await new Promise<void>((resolve, reject) => {
      if (this.isFallback || !this.db) return resolve();
      try {
        const store = this.getStore(STORES.LOGS, 'readwrite');
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const log = cursor.value as ActivityLog;

            // Se não tem timestamp ou é inválido, deletar
            if (!log.timestamp || isNaN(log.timestamp) || log.timestamp === 0) {
              cursor.delete();
              deletedCount++;
              if (log.id) idsToDelete.push(log.id);
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => { console.warn("Cleanup local logs failed"); resolve(); }
      } catch (e) {
        console.warn("Cleanup local logs error", e);
        resolve();
      }
    });

    // 2. Limpar Supabase - buscar todos os logs e deletar os inválidos
    console.log('[DB] Fetching all logs from Supabase to check timestamps...');
    const { data: allLogs, error: fetchError } = await supabase
      .from('activity_logs')
      .select('id, timestamp');

    if (fetchError) {
      console.error('[DB] Error fetching logs:', fetchError);
    } else if (allLogs) {
      // Identificar logs inválidos
      const invalidLogIds = allLogs
        .filter(log => !log.timestamp || log.timestamp === null)
        .map(log => log.id);

      console.log(`[DB] Found ${invalidLogIds.length} invalid logs in Supabase`);

      // Deletar logs inválidos
      if (invalidLogIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('activity_logs')
          .delete()
          .in('id', invalidLogIds);

        if (deleteError) {
          console.error('[DB] Supabase Cleanup Error:', deleteError);
        } else {
          console.log(`[DB] Deleted ${invalidLogIds.length} invalid logs from Supabase`);
          deletedCount += invalidLogIds.length;
        }
      }
    }

    console.log(`[DB] Cleanup complete: ${deletedCount} logs deleted`);
    return { fixed: fixedCount, deleted: deletedCount };
  }

  async getProjectsByCompany(companyId: string): Promise<Project[]> {
    if (this.isFallback || !this.db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const store = this.getStore(STORES.PROJECTS, 'readonly');
      const index = store.index('companyId');
      const request = index.getAll(companyId);
      request.onsuccess = () => resolve(request.result as Project[]);
      request.onerror = () => resolve([]);
    });
  }

  async saveProject(project: Project): Promise<void> {
    await this.writeData(STORES.PROJECTS, project);
    const { error } = await supabase.from('projects').upsert({
      id: project.id,
      company_id: project.companyId,
      name: project.name,
      description: project.description,
      total_budget: project.totalBudget,
      objectives: project.objectives,
      start_date: project.startDate || null,
      end_date: project.endDate || null,
      logo_data: project.logoData
    });
    if (error) console.error("Supabase Project Sync Error:", error);
  }

  async deleteProject(id: string): Promise<void> {
    await this.deleteTasksByProject(id);
    await this.deleteData(STORES.PROJECTS, id);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) console.error("Supabase Project Delete Error:", error);
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    if (this.isFallback || !this.db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const store = this.getStore(STORES.TASKS, 'readonly');
      const index = store.index('projectId');
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result as Task[]);
      request.onerror = () => resolve([]);
    });
  }

  async deleteTasksByProject(projectId: string): Promise<void> {
    // Se fallback, getTasks retorna [], loop não roda, tudo certo.
    const tasks = await this.getTasksByProject(projectId);
    for (const t of tasks) {
      await this.deleteData(STORES.TASKS, t.id);
    }
  }

  async getTasksByCompany(companyId: string): Promise<Task[]> {
    if (this.isFallback || !this.db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const store = this.getStore(STORES.TASKS, 'readonly');
      const index = store.index('companyId');
      const request = index.getAll(companyId);
      request.onsuccess = () => resolve(request.result as Task[]);
      request.onerror = () => resolve([]);
    });
  }

  async saveTask(task: Task): Promise<void> {
    await this.writeData(STORES.TASKS, task);
    const { error } = await supabase.from('tasks').upsert({
      id: task.id,
      project_id: task.projectId,
      company_id: task.companyId,
      title: task.title,
      description: task.description,
      start_date: task.startDate || null,
      end_date: task.endDate || null,
      goal: task.goal,
      linked_objectives: task.linkedObjectives,
      budget: task.budget,
      involved: task.involved,
      target_audience: task.targetAudience,
      status: task.status,
      attachments: task.attachments
    });
    if (error) console.error("Supabase Task Sync Error:", error);
  }

  async deleteTask(id: string): Promise<void> {
    await this.deleteData(STORES.TASKS, id);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error("Supabase Task Delete Error:", error);
  }

  // --- Métodos de Accessory Tasks ---
  async getAccessoryTasksByCompany(companyId: string): Promise<AccessoryTask[]> {
    if (this.isFallback || !this.db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const store = this.getStore(STORES.ACCESSORY_TASKS, 'readonly');
      const index = store.index('companyId');
      const request = index.getAll(companyId);
      request.onsuccess = () => resolve(request.result as AccessoryTask[]);
      request.onerror = () => resolve([]);
    });
  }

  async saveAccessoryTask(task: AccessoryTask): Promise<void> {
    await this.writeData(STORES.ACCESSORY_TASKS, task);
    const { error } = await supabase.from('accessory_tasks').upsert({
      id: task.id,
      company_id: task.companyId,
      project_id: task.projectId,
      date: task.date || null,
      title: task.title,
      description: task.description
    });
    if (error) console.error("Supabase Accessory Task Sync Error:", error);
  }

  async deleteAccessoryTask(id: string): Promise<void> {
    await this.deleteData(STORES.ACCESSORY_TASKS, id);
    const { error } = await supabase.from('accessory_tasks').delete().eq('id', id);
    if (error) console.error("Supabase Accessory Task Delete Error:", error);
  }
  // ----------------------------------

  async getAllResources(): Promise<HelpResource[]> {
    if (this.isFallback || !this.db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const store = this.getStore(STORES.RESOURCES, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  }

  async saveResource(resource: HelpResource): Promise<void> {
    await this.writeData(STORES.RESOURCES, resource);

    // Sync with Supabase
    const { error } = await supabase.from('resources').upsert({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      url: resource.url,
      file_data: resource.fileData,
      file_name: resource.fileName,
      created_at: new Date(resource.createdAt).toISOString()
    });

    if (error) {
      console.error("Supabase Resource Sync Error:", error);
      throw new Error(`Erro ao sincronizar recurso: ${error.message}`);
    }
  }

  async deleteResource(id: string): Promise<void> {
    await this.deleteData(STORES.RESOURCES, id);
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) {
      console.error("Supabase Resource Delete Error:", error);
      throw new Error(`Erro ao excluir recurso: ${error.message}`);
    }
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    if (this.isFallback || !this.db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const store = this.getStore(STORES.USERS, 'readonly');
      const index = store.index('companyId');
      const request = index.getAll(companyId);
      request.onsuccess = () => resolve(request.result as User[]);
      request.onerror = () => resolve([]);
    });
  }

  async getAllUsers(): Promise<User[]> {
    if (this.isFallback || !this.db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const store = this.getStore(STORES.USERS, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  }

  async saveUser(user: User): Promise<void> {
    await this.writeData(STORES.USERS, user);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      company_id: user.companyId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      first_access_done: user.firstAccessDone,
      lgpd_consent: user.lgpdConsent,
      lgpd_consent_date: user.lgpdConsentDate
    });
    if (error) console.error("Supabase Profile Sync Error:", error);
  }

  async deleteUser(id: string): Promise<void> {
    await this.deleteData(STORES.USERS, id);
    // Notas: Usuarios no Auth devem ser deletados via Admin API se necessário,
    // mas aqui deletamos o perfil na public.profiles
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) console.error("Supabase Profile Delete Error:", error);
  }

  async getAllRoles(): Promise<UserRole[]> {
    if (this.isFallback || !this.db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const store = this.getStore(STORES.ROLES, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  }

  async saveRole(role: UserRole): Promise<void> {
    console.log('[DB] saveRole called:', { id: role.id, name: role.name, permissions: role.permissions });

    // Save to IndexedDB
    await this.writeData(STORES.ROLES, role);
    console.log('[DB] Role saved to IndexedDB');

    // Sync with Supabase
    console.log('[DB] Attempting to sync role to Supabase...');
    const { data, error } = await supabase.from('roles').upsert({
      id: role.id,
      name: role.name,
      permissions: role.permissions
    });

    if (error) {
      console.error("[DB] Supabase Role Sync Error:", error);
      throw error; // Re-throw to let caller handle
    } else {
      console.log('[DB] Role synced to Supabase successfully!', data);
    }
  }

  async deleteCompany(id: string): Promise<void> {
    const projects = await this.getProjectsByCompany(id);
    for (const p of projects) {
      await this.deleteProject(p.id);
    }

    // Deletar accessory tasks vinculadas à empresa
    const accessoryTasks = await this.getAccessoryTasksByCompany(id);
    for (const at of accessoryTasks) {
      await this.deleteAccessoryTask(at.id);
    }

    const users = await this.getUsersByCompany(id);
    for (const u of users) {
      await this.deleteUser(u.id);
    }

    await this.deleteLogs({ companyId: id });
    return this.deleteData(STORES.COMPANIES, id);
  }

  // GESTÃO DE CONVITES (WHITELIST)
  async saveInvitation(invite: Invitation): Promise<void> {
    const { error } = await supabase.from('invitations').upsert({
      id: invite.id,
      email: invite.email.toLowerCase().trim(),
      company_id: invite.companyId,
      role: invite.role,
      invited_by: invite.invitedBy,
      status: invite.status
    });

    if (error) {
      console.error("Supabase Invite Sync Error:", error);
      throw new Error(error.message);
    }

    // Só salva localmente se o Supabase confirmou
    await this.writeData(STORES.INVITATIONS, invite);
  }

  async getInvitationByEmail(email: string): Promise<Invitation | null> {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'pending')
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      companyId: data.company_id,
      role: data.role,
      invitedBy: data.invited_by,
      status: data.status,
      createdAt: new Date(data.created_at).getTime()
    };
  }

  async deleteInvitation(id: string): Promise<void> {
    await this.deleteData(STORES.INVITATIONS, id);
    await supabase.from('invitations').delete().eq('id', id);
  }

  async getInvitationsByCompany(companyId: string): Promise<Invitation[]> {
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('company_id', companyId);

    return (data || []).map(d => ({
      id: d.id,
      email: d.email,
      companyId: d.company_id,
      role: d.role,
      invitedBy: d.invited_by,
      status: d.status,
      createdAt: new Date(d.created_at).getTime()
    }));
  }
}

export const db = new Database();
