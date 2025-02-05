# sessionシステム

## 概要

tako'sのsessionは各デバイスにsessionIDを発行し、そのsessionIDを利用してデバイス間での認証を行います。
各セッションにはdeviceKeyとkeyShareKeyが割り当てられ、これらの鍵を利用してデバイス間での暗号化通信を行います。

## セッションの生成

セッションの生成は以下の手順で行います。
