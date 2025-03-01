# SCSSの記述

このサイトではSCSSが記述に採用されています。

コンパイルには専用のツールをダウンロードしておく必要があります。


## animation

アニメーションを追加したい場合はアニメーションをトリガーするクラスとキーフレームを作成する必要があります。

animationディレクトリ内には次のファイルがあります

* animation.scss
* keyframes.scss

アニメーションを追加する場合、keyframesにアニメーションを記述し、トリガー用のクラスをanimationに記述する。

もしくはanimation.scssにtransition要素が含まれるクラスを追加することも可能です。

## layout

レイアウトに関するスタイルを変更したい場合はこのフォルダ内にあるシートを編集する必要があります。

layoutフォルダには次のファイルがあります。

* common.scss
* chat-layout.scss
* header-layout.scss
* talk-layout.scss
* other.scss

common.scssには基本的にはタグ名(ex body,head...)を指定しているスタイルが含まれています。

chat-layout.scssにはチャット画面(基本的にはc-という接頭辞として使われています！！)
で使用されているクラスに関するスタイルが含まれています。

header-layout.scssには基本的にヘッダー画面(サイドバー)に関するスタイルが格納されています。

talk-layout.scssにはトーク画面(基本的にはp-という接頭辞が使われています！)
を指定しているスタイルが含まれています。

other.scssにはg-が接頭辞のスタイルや、その他のスタイルが格納されています。



chat-layout.scss,talk-layout.scssに含まれている内容には不可解な点が多いです。
詳細を知っている人がこのドキュメントを修正していただけると幸いです。



## 記述方法

SCSSデコーディングされているため、アンパサンドなどの画期的な記述方法が使用できます。

しかし、可読性が一定程度以上失われているため、編集個所を開発者ツールで探したのちにIDEの検索機能で検索することを推奨します。


### ブレークポイント

このSCSSファイルには以下のブレークポイントが設定されています。

        "sm": "screen and (min-width: 399px)",
        "tb": "screen and (min-width: 769px)",
        "pc": "screen and (min-width: 1053px)",
        "max_sm": "screen and (max-width: 400px)",
        "max_tb": "screen and (max-width: 768px)",
        "max_pc": "screen and (max-width: 1052px)",

このブレークポイントはmixinにて使用することができます。

例として

```scss
.example {
    background-color:black;

    mq(max_sm) {
        background-color:red;
        }
}
```

というコードはCSSにおいてのこれと等しいです。

```css
.example{
    background-color: black;
}

@media screen and (max-width: 400px) {
    background-color: red;
}
```

