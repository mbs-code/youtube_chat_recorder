
# Youtube Chat Recorder

App to operate streaming chat.  
YouTube のチャットがあるページ（ライブ、アーカイブ等）を開いた際に、チャットを監視し操作する Chrome 拡張機能。  

typescript + (webpack + babel) + vue  
Template by [Kocal/vue-web-extension at v1](https://github.com/Kocal/vue-web-extension/tree/v1)  

使い方はここ。  
[How to Usage](./docs/readme.md)

## command

command of `npm run`

|command|description|
|:--|:--|
|`build`|ビルドする|
|`build:copy`|ビルドした後、`dist-copy`にcloneを作成する|
|`build:analysis`|webpack-bundle-analyzer|
|`build:dev`|開発版のビルドをする(minify しない)|
|`build-zip`|chrome 公開用に zip 化する|
|`watch`|自動ビルド|
|`watch:dev`|開発版の自動ビルド(HMR 有り)|
|`lint`|eslint|
|`prettier`|prettier|
|`prettier:write`|prettier + write|
