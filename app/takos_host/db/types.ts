import type { DataStore } from "../../core/db/types.ts";

export interface HostUser {
  _id: string;
  userName: string;
  email: string;
  emailVerified: boolean;
  verifyCode?: string;
  verifyCodeExpires?: Date;
  hashedPassword: string;
  salt: string;
  createdAt: Date;
}

export interface HostSession {
  sessionId: string;
  user: string;
  expiresAt: Date;
}

export interface TenantRepo {
  ensure(id: string, domain: string): Promise<void>;
}

export interface HostRepo {
  listInstances(owner: string): Promise<{ host: string }[]>;
  countInstances(owner: string): Promise<number>;
  findInstanceByHost(
    host: string,
  ): Promise<
    | { _id: string; host: string; owner: string; env?: Record<string, string> }
    | null
  >;
  findInstanceByHostAndOwner(
    host: string,
    owner: string,
  ): Promise<
    { _id: string; host: string; env?: Record<string, string> } | null
  >;
  createInstance(
    data: { host: string; owner: string; env?: Record<string, string> },
  ): Promise<void>;
  updateInstanceEnv(id: string, env: Record<string, string>): Promise<void>;
  deleteInstance(host: string, owner: string): Promise<void>;
}

export interface OAuthRepo {
  list(): Promise<{ clientId: string; redirectUri: string }[]>;
  find(clientId: string): Promise<{ clientSecret: string } | null>;
  create(
    data: { clientId: string; clientSecret: string; redirectUri: string },
  ): Promise<void>;
}

export interface DomainsRepo {
  list(user: string): Promise<{ domain: string; verified: boolean }[]>;
  find(
    domain: string,
    user?: string,
  ): Promise<{ _id: string; token: string; verified: boolean } | null>;
  create(domain: string, user: string, token: string): Promise<void>;
  verify(id: string): Promise<void>;
}

export interface HostUserRepo {
  findByUserName(userName: string): Promise<HostUser | null>;
  findByUserNameOrEmail(
    userName: string,
    email: string,
  ): Promise<HostUser | null>;
  create(data: {
    userName: string;
    email: string;
    hashedPassword: string;
    salt: string;
    verifyCode: string;
    verifyCodeExpires: Date;
  }): Promise<HostUser>;
  update(id: string, update: Partial<HostUser>): Promise<void>;
}

export interface HostSessionRepo {
  findById(sessionId: string): Promise<HostSession | null>;
  create(
    sessionId: string,
    user: string,
    expiresAt: Date,
  ): Promise<HostSession>;
  updateExpires(sessionId: string, expiresAt: Date): Promise<void>;
  deleteById(sessionId: string): Promise<void>;
}

export interface HostDataStore extends DataStore {
  tenantId: string;
  multiTenant: boolean;
  tenant: TenantRepo;
  host: HostRepo;
  oauth: OAuthRepo;
  domains: DomainsRepo;
  hostUsers: HostUserRepo;
  hostSessions: HostSessionRepo;
}
