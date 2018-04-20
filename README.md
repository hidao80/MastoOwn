# 自分のトゥート抽出SPA

特定のマストドンインスタンスから指定したユーザのトゥートを抽出します。  
homeタイムラインを抽出対象としているので、アクセストークンが必要です。

アクセストークンを使うことで、**他人にストーキングされることを防いでいます**。:smile:

## アプリケーショントークンの取得方法

1. マストドンインスタンスのweb UIにアクセス
1. ユーザー設定画面に移動
1. 開発メニューのアプリ項目を選択
1. 右画面から「新規アプリ」ボタンをクリック
1. 「アプリの名前」を「MastoOwn」と入力
1. 「write」と「follow」のチェックを外す
1. 「送信」をクリック。開発メニューのアプリ項目に戻る。
1. アプリ「MastoOwn」をクリック
1. 「アクセストークン」に記載されている文字列が本SPAで使用するトークンとなります。

## 表示しているトゥートのダウンロード（JSONフォーマット）

必要なだけトゥートを画面に表示している状態で、「JSONでダウンロード」ボタンをクリックすると、無題（ブラウザデフォルト）のファイル名でJSONをstringifyしたファイルをダウンロードします。  
このファイルにはトゥートごとの日付、文章、URL、メディアへのURLしか記述されていません。そのほかの情報を求められている方は、issueを上げてください。

## TODO

- 日付で抽出範囲選択
