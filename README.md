# ランチ投票アプリ

匿名ポイント投票アプリ。1人100ポイントを候補に自由配分して投票できます。最大3名まで投票可能。管理者が結果を公開するまで投票内容は非公開です。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router, TypeScript)
- **スタイル**: Tailwind CSS + shadcn/ui
- **データベース**: Supabase (PostgreSQL)

## 画面構成

| URL | 内容 | 認証 |
|---|---|---|
| `/` | 投票フォーム | なし |
| `/complete` | 投票完了メッセージ | なし |
| `/results` | 結果表示 | RESULTS_PASSWORD |
| `/admin` | 管理画面 | ADMIN_PASSWORD |

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成し、各値を設定します。

```bash
cp .env.local.example .env.local
```

| 変数名 | 説明 |
|---|---|
| `SUPABASE_URL` | Supabase プロジェクトの URL |
| `SUPABASE_SECRET_KEY` | Supabase の service_role キー（公開厳禁） |
| `ADMIN_PASSWORD` | 管理画面のパスワード |
| `RESULTS_PASSWORD` | 結果ページのパスワード |
| `SESSION_SECRET` | セッション署名用の秘密鍵（32文字以上の乱数推奨） |
| `APP_ORIGIN` | アプリのオリジン（例: `http://localhost:3000`） |

`SESSION_SECRET` の生成例:

```bash
openssl rand -base64 32
```

### 3. データベースのセットアップ

Supabase の SQL Editor で `supabase/migrations/001_initial.sql` の内容を実行します。

これにより以下が作成されます:
- テーブル: `settings`, `candidates`, `voters`, `votes`
- PostgreSQL 関数: `submit_vote()`, `reset_votes()`
- RLS ポリシー（匿名アクセスを完全拒否）

### 4. 開発サーバーの起動

```bash
npm run dev
```

## 使い方

### 管理者の操作手順

1. `/admin` にアクセスし、`ADMIN_PASSWORD` でログイン
2. 投票タイトルを設定
3. 候補を10〜15件追加（順序の変更も可能）
4. 「投票を開始」→ 投票者に `/` の URL を共有
5. 3票集まると自動的に投票が締め切られる（または手動で「投票を締め切る」）
6. 「結果を公開」→ 結果閲覧者に `/results` の URL とパスワードを共有
7. 次回開催に備えて「リセット」（投票データ・投票者データのみ削除、候補は保持）

### 投票者の操作

1. `/` にアクセスし、100ポイントを候補に配分して送信
2. 投票完了後は `/complete` に遷移

### 結果の閲覧

1. `/results` にアクセスし、`RESULTS_PASSWORD` を入力
2. 管理者が公開するまで「まだ公開されていません」と表示される

## セキュリティ設計

- **認証**: HMAC-SHA256 署名付きセッション Cookie（パスワードは Cookie に保存しない）
- **二重投票防止**: httpOnly Cookie でマーク → リセット後は DB 照合で無効化
- **同時投票制御**: PostgreSQL の `SELECT ... FOR UPDATE` でシリアライズ
- **CSRF 対策**: 全ミューテーション API で Origin ヘッダーを検証
- **レート制限**: 認証エンドポイントに IP ベースのインメモリレート制限（5回失敗→15分ブロック）
- **RLS**: Supabase の匿名ロールはすべてのテーブルへのアクセスを拒否

### 注意事項

- **Cookie によるレート制限はブラウザ単位です。** 同一ユーザーが Cookie を削除したり別ブラウザを使えば再投票できます。本アプリはカジュアルな用途を想定しており、悪意ある多重投票の完全防止は目的としていません。
- **インメモリレート制限はサーバー再起動でリセットされます。** 複数インスタンスにまたがる共有状態も持ちません。
- **`SUPABASE_SECRET_KEY` は service_role キーです。** クライアントサイドに漏洩しないよう `NEXT_PUBLIC_` プレフィックスは使用しないでください。

## ディレクトリ構成

```
.
├── app/
│   ├── page.tsx              # 投票ページ
│   ├── complete/page.tsx     # 投票完了
│   ├── results/page.tsx      # 結果ページ
│   ├── admin/page.tsx        # 管理ページ
│   └── api/
│       ├── vote/route.ts
│       ├── results/auth/route.ts
│       └── admin/
│           ├── auth/route.ts
│           ├── settings/route.ts
│           ├── candidates/route.ts
│           ├── candidates/[id]/route.ts
│           └── reset/route.ts
├── components/
│   ├── voting/               # 投票フォーム関連
│   ├── results/              # 結果表示関連
│   └── admin/                # 管理画面関連
├── lib/
│   ├── supabase.ts           # Supabase クライアント（サーバー専用）
│   ├── session.ts            # 署名付きセッション Cookie
│   ├── csrf.ts               # Origin ヘッダー検証
│   ├── rate-limit.ts         # インメモリレート制限
│   ├── results.ts            # ランキング計算
│   └── types.ts              # TypeScript 型定義
└── supabase/
    └── migrations/
        └── 001_initial.sql   # スキーマ・関数・RLS
```
