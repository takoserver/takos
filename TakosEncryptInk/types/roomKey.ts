export interface RoomKey {
  key: string
  keyType: "roomKey"
  timestamp: string // 鍵の作成日時
  hashHex: string
  version: number
  masterKeysHashHex: {
    [key: string]: string
  }
}
