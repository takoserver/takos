# tako'sの分散型プロトコル

## 概要

tako'sはmisskeyやmastdonのような形態のチャットアプリケーションを作成するためのプロトコルです。tako'sは分散型のプロトコルであり、ユーザーは自分のサーバーを立ち上げることで、自分のデータを管理することができます。tako'sは、ユーザーが自分のデータを管理することができるため、プライバシーが保護されます。

## エンドポイント

各サーバーは他のサーバーと通信するために、専用のエンドポイントを持っています。通信はすべてpostリクエストで行われ、署名付きのjsonデータを送信します。

エンドポイント

`/takos/v2/server`

### 基本型

```typescript
type Request = {
  type: string;
  data: any;
  sign?: string;
};
```
