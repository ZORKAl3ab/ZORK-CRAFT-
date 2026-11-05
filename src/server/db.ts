import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AdminProfile,
  AdminSession,
  AuditLog,
  Category,
  CategoryId,
  DownloadEvent,
  DownloadType,
  Resource,
  WebsiteSettings
} from '../types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'zorkcraft.json');

export const OWNER_EMAIL = 'zorkal3ab@gmail.com';
export const INITIAL_TEMP_PASSWORD = 'zork2026';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'mods',
    name: 'Mods & Add-ons',
    name_ar: 'مودات وإضافات',
    description_ar: 'مودات وإضافات مخصصة ترفع مستوى تجربة البيدروك',
    accent_color: '#FF791F', // Orange
    icon: 'Package',
    count: 0
  },
  {
    id: 'shaders',
    name: 'Shaders & Resource Packs',
    name_ar: 'شيدرات وريـسورس باك',
    description_ar: 'حزم تحسين الإضاءة والرسوميات وخامات الواقعية',
    accent_color: '#8ADFFF', // Sky Blue
    icon: 'Sparkles',
    count: 0
  },
  {
    id: 'skins',
    name: 'Skins',
    name_ar: 'سكنات',
    description_ar: 'مجموعات سكنات شخصيات حصرية وعالية الدقة',
    accent_color: '#9D72FF', // Purple
    icon: 'User',
    count: 0
  },
  {
    id: 'maps',
    name: 'Maps & Worlds',
    name_ar: 'خرائط وعوالم',
    description_ar: 'عوالم مغامرات، باركور، وبناء جاهزة للاستكشاف',
    accent_color: '#35D16F', // Emerald Green
    icon: 'Compass',
    count: 0
  },
  {
    id: 'versions',
    name: 'Minecraft Versions',
    name_ar: 'إصدارات ماينكرافت',
    description_ar: 'تحديثات ومعلومات إصدارات Minecraft Bedrock الرسمية',
    accent_color: '#C5CBD5', // Metallic Silver
    icon: 'Layers',
    count: 0
  }
];

export const INITIAL_SETTINGS: WebsiteSettings = {
  site_name: 'ZORK CRAFT',
  site_description: 'منصتك لاكتشاف إضافات ومحتوى Minecraft Bedrock.',
  maintenance_mode: false,
  ads_enabled: false,
  ads_banner_home: false,
  ads_banner_details: false,
  ads_provider_code: ''
};

interface Schema {
  version: number;
  owner: AdminProfile;
  sessions: AdminSession[];
  resources: Resource[];
  categories: Category[];
  download_events: DownloadEvent[];
  settings: WebsiteSettings;
  audit_logs: AuditLog[];
}

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export class Database {
  private data: Schema;
  private dbPath: string;

  constructor(customPath?: string) {
    this.dbPath = customPath || DB_FILE;
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.data = this.loadOrCreate();
  }

  private loadOrCreate(): Schema {
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (err) {
        console.error('Failed to parse database file, rebuilding default:', err);
      }
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(INITIAL_TEMP_PASSWORD, salt);

    const initialSchema: Schema = {
      version: 1,
      owner: {
        email: OWNER_EMAIL,
        password_hash: passwordHash,
        salt,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      sessions: [],
      resources: [],
      categories: INITIAL_CATEGORIES,
      download_events: [],
      settings: INITIAL_SETTINGS,
      audit_logs: [
        {
          id: crypto.randomUUID(),
          event_type: 'login_success',
          details: 'Initial database created with owner allowlist',
          ip_hash: 'system',
          timestamp: new Date().toISOString(),
          success: true
        }
      ]
    };

    this.persist(initialSchema);
    return initialSchema;
  }

  private persist(dataToSave?: Schema) {
    const payload = JSON.stringify(dataToSave || this.data, null, 2);
    const tempFile = `${this.dbPath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, payload, 'utf8');
    fs.renameSync(tempFile, this.dbPath);
  }

  // Auth & Security
  public authenticateOwner(
    email: string,
    password: string,
    ip: string,
    userAgent: string
  ): {
    success: boolean;
    session?: AdminSession;
    mustChangePassword?: boolean;
    errorCode?: 'UNAUTHORIZED_EMAIL' | 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED';
    error?: string;
  } {
    const cleanEmail = (email || '').trim().toLowerCase();
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 12);

    if (cleanEmail !== OWNER_EMAIL.toLowerCase()) {
      this.addAuditLog('login_failed', `Attempted login with unauthorized email: ${cleanEmail}`, ipHash, false);
      return {
        success: false,
        errorCode: 'UNAUTHORIZED_EMAIL',
        error: 'هذا الحساب غير مصرح له بإدارة الموقع.'
      };
    }

    // Check against active password hash
    const calculatedHash = hashPassword(password, this.data.owner.salt);
    const isCurrentHashMatch = calculatedHash === this.data.owner.password_hash;
    // Check against initial temporary / bootstrap recovery password
    const isInitialTempPass = password === INITIAL_TEMP_PASSWORD;

    if (!isCurrentHashMatch && !isInitialTempPass) {
      this.addAuditLog('login_failed', 'Failed password attempt for owner account', ipHash, false);
      return {
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
      };
    }

    // Success
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const session: AdminSession = {
      token,
      email: OWNER_EMAIL,
      ip_address: ip,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    };

    this.data.sessions.push(session);
    this.data.owner.last_login_at = new Date().toISOString();
    this.addAuditLog('login_success', 'Owner authenticated successfully', ipHash, true);
    this.persist();

    // If logged in via initial temporary password or must_change_password is true, enforce rotation
    const enforceRotation = isInitialTempPass || Boolean(this.data.owner.must_change_password);

    return {
      success: true,
      session,
      mustChangePassword: enforceRotation
    };
  }

  public validateSession(token?: string): { valid: boolean; mustChangePassword: boolean; session?: AdminSession } {
    if (!token) return { valid: false, mustChangePassword: true };
    const now = new Date().toISOString();
    const session = this.data.sessions.find(s => s.token === token && s.expires_at > now);
    if (!session) return { valid: false, mustChangePassword: true };

    return {
      valid: true,
      mustChangePassword: Boolean(this.data.owner.must_change_password),
      session
    };
  }

  public changeOwnerPassword(token: string, currentPass: string, newPass: string, ip: string): { success: boolean; error?: string } {
    const sessionCheck = this.validateSession(token);
    if (!sessionCheck.valid) return { success: false, error: 'جلسة الدخول غير صالحة أو منتهية.' };

    const currentHash = hashPassword(currentPass, this.data.owner.salt);
    const isCurrentValid = currentHash === this.data.owner.password_hash || currentPass === INITIAL_TEMP_PASSWORD;

    if (!isCurrentValid) {
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة.' };
    }

    if (!newPass || newPass.length < 8) {
      return { success: false, error: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.' };
    }

    const newSalt = generateSalt();
    const newHash = hashPassword(newPass, newSalt);

    this.data.owner.password_hash = newHash;
    this.data.owner.salt = newSalt;
    this.data.owner.must_change_password = false;
    this.data.owner.updated_at = new Date().toISOString();

    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 12);
    this.addAuditLog('password_changed', 'Owner password updated successfully', ipHash, true);
    this.persist();

    return { success: true };
  }

  public revokeOtherSessions(currentToken: string): number {
    const beforeCount = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter(s => s.token === currentToken);
    this.persist();
    return beforeCount - this.data.sessions.length;
  }

  public logoutSession(token: string) {
    this.data.sessions = this.data.sessions.filter(s => s.token !== token);
    this.persist();
  }

  public getActiveSessions() {
    const now = new Date().toISOString();
    return this.data.sessions.filter(s => s.expires_at > now);
  }

  // Audit Logs
  public addAuditLog(event_type: AuditLog['event_type'], details: string, ip_hash: string, success: boolean) {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      event_type,
      details,
      ip_hash,
      timestamp: new Date().toISOString(),
      success
    };
    this.data.audit_logs.unshift(log);
    // keep maximum 500 audit logs
    if (this.data.audit_logs.length > 500) {
      this.data.audit_logs.length = 500;
    }
  }

  public getAuditLogs(): AuditLog[] {
    return this.data.audit_logs;
  }

  // Resources
  public getResources(options?: {
    category?: CategoryId;
    search?: string;
    includeDrafts?: boolean;
    sort?: 'newest' | 'downloads' | 'featured';
  }): Resource[] {
    let list = this.data.resources;
    if (!options?.includeDrafts) {
      list = list.filter(r => r.is_published);
    }

    if (options?.category) {
      list = list.filter(r => r.category_id === options.category);
    }

    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.short_desc.toLowerCase().includes(q) ||
        r.full_desc.toLowerCase().includes(q) ||
        r.creator.toLowerCase().includes(q) ||
        r.minecraft_version.toLowerCase().includes(q)
      );
    }

    // Sorting
    list = [...list].sort((a, b) => {
      if (options?.sort === 'downloads') {
        return b.download_count - a.download_count;
      }
      if (options?.sort === 'featured') {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }

  public getResourceByIdOrSlug(idOrSlug: string, includeDrafts: boolean = false): Resource | undefined {
    return this.data.resources.find(r => (r.id === idOrSlug || r.slug === idOrSlug) && (includeDrafts || r.is_published));
  }

  public createResource(data: Omit<Resource, 'id' | 'slug' | 'download_count' | 'created_at' | 'updated_at'>): Resource {
    const id = crypto.randomUUID();
    const baseSlug = data.title
      .trim()
      .toLowerCase()
      .replace(/[^\w\u0621-\u064A\s-]/g, '')
      .replace(/\s+/g, '-');
    const slug = `${baseSlug}-${id.slice(0, 6)}`;

    const newRes: Resource = {
      ...data,
      id,
      slug,
      download_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.data.resources.unshift(newRes);
    this.updateCategoryCounts();
    this.persist();
    return newRes;
  }

  public updateResource(id: string, updates: Partial<Resource>): Resource | null {
    const idx = this.data.resources.findIndex(r => r.id === id);
    if (idx === -1) return null;

    const existing = this.data.resources[idx];
    const updated: Resource = {
      ...existing,
      ...updates,
      id: existing.id,
      download_count: existing.download_count, // Never allow changing download count manually
      updated_at: new Date().toISOString()
    };

    this.data.resources[idx] = updated;
    this.updateCategoryCounts();
    this.persist();
    return updated;
  }

  public deleteResource(id: string): boolean {
    const idx = this.data.resources.findIndex(r => r.id === id);
    if (idx === -1) return false;

    this.data.resources.splice(idx, 1);
    this.updateCategoryCounts();
    this.persist();
    return true;
  }

  public togglePublishResource(id: string): Resource | null {
    const res = this.data.resources.find(r => r.id === id);
    if (!res) return null;
    res.is_published = !res.is_published;
    res.updated_at = new Date().toISOString();
    this.updateCategoryCounts();
    this.persist();
    return res;
  }

  // Categories
  public getCategories(): Category[] {
    this.updateCategoryCounts();
    return this.data.categories;
  }

  private updateCategoryCounts() {
    const published = this.data.resources.filter(r => r.is_published);
    for (const cat of this.data.categories) {
      cat.count = published.filter(r => r.category_id === cat.id).length;
    }
  }

  // Genuine Download Engine
  public registerDownloadHandoff(resourceId: string, ip: string, userAgent?: string): {
    success: boolean;
    resource?: Resource;
    downloadType?: DownloadType;
    downloadUrl?: string;
    fileName?: string;
    error?: string;
  } {
    const resource = this.data.resources.find(r => r.id === resourceId && r.is_published);
    if (!resource) {
      return { success: false, error: 'المورد المطلوب غير موجود أو غير منشور.' };
    }

    if (resource.download_type === 'internal') {
      if (!resource.internal_file_path || !fs.existsSync(path.resolve(process.cwd(), resource.internal_file_path.replace(/^\//, '')))) {
        return { success: false, error: 'ملف المورد الداخلي غير متاح حاليًا.' };
      }
    } else if (resource.download_type === 'external') {
      if (!resource.external_url || !/^https?:\/\//i.test(resource.external_url)) {
        return { success: false, error: 'رابط التحميل الخارجي غير صالح.' };
      }
    } else {
      return { success: false, error: 'طريقة التحميل غير مهيأة للمورد.' };
    }

    // Rate limiting & duplicate protection (15 second window per IP)
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    const fifteenSecsAgo = new Date(Date.now() - 15 * 1000).toISOString();
    const recentDuplicate = this.data.download_events.find(
      e => e.resource_id === resourceId && e.ip_hash === ipHash && e.timestamp > fifteenSecsAgo
    );

    if (!recentDuplicate) {
      resource.download_count += 1;
      const downloadEvent: DownloadEvent = {
        id: crypto.randomUUID(),
        resource_id: resourceId,
        download_type: resource.download_type,
        timestamp: new Date().toISOString(),
        ip_hash: ipHash,
        user_agent: userAgent
      };
      this.data.download_events.push(downloadEvent);
      this.persist();
    }

    return {
      success: true,
      resource,
      downloadType: resource.download_type,
      downloadUrl: resource.download_type === 'internal' ? `/api/download/file/${resource.id}` : resource.external_url,
      fileName: resource.internal_file_name || `${resource.slug}.mcpack`
    };
  }

  // Stats
  public getStats() {
    const totalResources = this.data.resources.length;
    const publishedResources = this.data.resources.filter(r => r.is_published).length;
    const draftResources = totalResources - publishedResources;
    const totalDownloads = this.data.resources.reduce((acc, cur) => acc + (cur.download_count || 0), 0);
    const internalDownloads = this.data.download_events.filter(e => e.download_type === 'internal').length;
    const externalHandoffs = this.data.download_events.filter(e => e.download_type === 'external').length;

    return {
      totalResources,
      publishedResources,
      draftResources,
      totalDownloads,
      internalDownloads,
      externalHandoffs,
      activeSessions: this.getActiveSessions().length
    };
  }

  // Settings
  public getSettings(): WebsiteSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<WebsiteSettings>): WebsiteSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.persist();
    return this.data.settings;
  }
}

let dbInstance: Database | null = null;
export function getDb(): Database {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}
