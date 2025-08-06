export interface AccountDoc {
  _id?: string;
  userName: string;
  displayName: string;
  avatarInitial: string;
  privateKey?: string;
  publicKey: string;
  followers?: string[];
  following?: string[];
  dms?: string[];
}

export interface SessionDoc {
  _id?: string;
  sessionId: string;
  expiresAt: Date;
  createdAt?: Date;
}

/** FASP 設定。docs/FASP.md 7.1 の項目をフィールド化。
 * capabilities は FASP General provider_info に準拠する。
 */
export interface FaspConfigDoc {
  enabled: boolean;
  base_url: string;
  capabilities: {
    data_sharing?: string;
    trends?: string;
    account_search?: string;
  };
}

/** FASP 登録情報。
 * docs/FASP.md 4.1 の交換データを保持する。 */
export interface FaspRegistrationDoc {
  fasp_id: string;
  name: string;
  base_url: string;
  server_id: string;
  public_key: string;
  private_key: string;
  our_public_key: string;
  capabilities: { id: string; version: string }[];
}

/** FASP data sharing のイベント購読情報。*/
export interface FaspEventSubscriptionDoc {
  _id?: string;
  server_id: string;
  category: string;
  subscription_type: string;
  max_batch_size?: number;
  threshold?: {
    timeframe?: number;
    shares?: number;
    likes?: number;
    replies?: number;
  };
}

/** FASP data sharing のバックフィル要求情報。*/
export interface FaspBackfillRequestDoc {
  _id?: string;
  server_id: string;
  category: string;
  max_count: number;
  more_objects_available?: boolean;
}
