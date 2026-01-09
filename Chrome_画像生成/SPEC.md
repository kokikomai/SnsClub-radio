# Instant Infographic - 要件定義書

## 概要

任意のWebページ上でテキストを選択し、Gemini（Nano Banana Pro）を使って図解を自動生成するChrome拡張機能。

## 機能要件

### F1: テキスト選択検知
- 任意のWebページ上でテキストを選択した際に検知
- 選択テキストが存在する場合、フローティングボタンを表示

### F2: 図解生成
- 選択テキストをGemini API（Imagen 3 / Nano Banana Pro）に送信
- 図解（インフォグラフィック）として画像を生成
- 日本語テキストを正確にレンダリング

### F3: 画像の保存・コピー
- 生成された画像をプレビューモーダルで表示
- クリップボードにコピー（Cmd+Vで貼り付け可能）
- PNGファイルとしてダウンロード

### F4: 設定管理
- Gemini APIキーの保存・管理
- 図解スタイルの選択（フローチャート、マインドマップ、リスト等）
- 言語設定（日本語/英語）

## 技術仕様

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │Content Script│←→│ Background  │←→│   Popup UI     │ │
│  │(Notion Page) │  │  Worker     │  │  (Settings)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│        │                 │                              │
│        ↓                 ↓                              │
│  [テキスト選択]    [Gemini API]                         │
│  [画像挿入]        [画像生成]                           │
└─────────────────────────────────────────────────────────┘
```

### ファイル構成

```
instant-infographic/
├── manifest.json          # Chrome拡張設定
├── background.js          # Service Worker
├── content.js             # Content Script
├── popup/
│   ├── popup.html         # 設定UI
│   ├── popup.js           # 設定ロジック
│   └── popup.css          # スタイル
├── styles/
│   └── content.css        # 注入CSS
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── SPEC.md                # この文書
```

### 使用API

1. **Gemini API (generativelanguage.googleapis.com)**
   - モデル: `gemini-2.0-flash-exp` (画像生成対応)
   - エンドポイント: `/v1beta/models/{model}:generateContent`

2. **Chrome Extensions API**
   - `chrome.storage.sync` - 設定保存
   - `chrome.contextMenus` - 右クリックメニュー
   - `chrome.runtime` - メッセージング

## ユーザーフロー

1. ユーザーが任意のWebページを開く
2. テキストを選択
3. 表示されるフローティングボタンをクリック
4. 図解スタイルを選択
5. ローディング表示
6. Geminiが図解を生成
7. プレビューモーダルで画像を確認
8. コピーまたはダウンロード

## 制約事項

- Gemini APIキーが必要（ユーザーが取得）
- 画像生成には数秒〜十数秒かかる
- 一部のサイトではContent Security Policyにより動作しない場合あり

## 今後の拡張

- 図解スタイルのテンプレート追加
- 生成履歴の保存
- 画像の編集機能
- 特定サイトとの連携（Notion, Google Docs等）
