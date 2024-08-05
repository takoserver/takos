# リモートサーバーがユーザーが実行したアクティビティを取得し処理するapi

### Endpoint: `POST /takos/v2/server/activity`

#### Parameters

```javascript
{
    type: string,
    objectid: string,
    object: any
}

// objectid format
// UUID v4@example.com
```

#### Response

```javascript
{
  status: true;
}
```

#### Description

dataにはアクティビティのデータが入る。データはそれぞれ異なるため、それぞれのドキュメントを参照してください。
