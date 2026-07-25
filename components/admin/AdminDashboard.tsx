'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Settings, Candidate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import CandidateManager from './CandidateManager'

const STATUS_LABEL: Record<string, string> = {
  preparing: '準備中',
  open: '受付中',
  closed: '締切済み',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  preparing: 'secondary',
  open: 'default',
  closed: 'destructive',
}

export default function AdminDashboard() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [voterCount, setVoterCount] = useState(0)
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // refresh() triggers the useEffect below to re-fetch all data
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  // Effect body only starts async operations (Promise chain) — no synchronous setState.
  // All setState calls happen inside .then() / .catch() / .finally() callbacks (async).
  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetch('/api/admin/settings'),
      fetch('/api/admin/candidates'),
    ])
      .then(async ([settingsRes, candidatesRes]) => {
        if (cancelled) return
        if (settingsRes.status === 401) {
          router.refresh()
          return
        }
        const [settingsData, candidatesData] = await Promise.all([
          settingsRes.json(),
          candidatesRes.json(),
        ])
        if (cancelled) return
        setSettings(settingsData.settings)
        setVoterCount(settingsData.voterCount ?? 0)
        setTitle(settingsData.settings?.title ?? '')
        setCandidates(candidatesData.candidates ?? [])
        setActionError(null)
      })
      .catch(() => {
        if (!cancelled) setActionError('データの読み込みに失敗しました')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [refreshKey, router])

  async function handleRefresh() {
    setIsLoading(true)
    setActionError(null)
    setSuccessMessage(null)
    refresh()
  }

  async function patch(body: Record<string, unknown>) {
    setActionError(null)
    setSuccessMessage(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.status === 401) { router.refresh(); return false }
      if (!res.ok) {
        const data = await res.json()
        setActionError(data.error ?? '操作に失敗しました')
        setIsLoading(false)
        return false
      }
      refresh()
      return true
    } catch {
      setActionError('通信エラーが発生しました')
      setIsLoading(false)
      return false
    }
  }

  async function handleSaveTitle() { await patch({ title }) }
  async function handleStartVoting() { await patch({ status: 'open' }) }
  async function handleCloseVoting() { await patch({ status: 'closed' }) }
  async function handleToggleResults() {
    if (!settings) return
    await patch({ results_published: !settings.results_published })
  }

  async function handleReset() {
    setActionError(null)
    setSuccessMessage(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' })
      if (res.status === 401) { router.refresh(); return }
      if (!res.ok) {
        const data = await res.json()
        setActionError(data.error ?? 'リセットに失敗しました')
        setIsLoading(false)
      } else {
        setShowResetConfirm(false)
        setSuccessMessage('投票をリセットし、準備中に戻しました')
        refresh()
      }
    } catch {
      setActionError('通信エラーが発生しました')
      setIsLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    )
  }

  const status = settings?.status ?? 'preparing'
  const canStart = status === 'preparing' && candidates.length >= 10 && candidates.length <= 15

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">管理画面</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>更新</Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>ログアウト</Button>
          </div>
        </div>

        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
            {actionError}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-md px-4 py-3 text-sm">
            {successMessage}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">投票タイトル</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例：2024年7月 ランチ投票"
                maxLength={100}
              />
              <Button onClick={handleSaveTitle} className="shrink-0">保存</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">投票状況</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">ステータス</span>
              <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
            </div>

            <div>
              <span className="text-3xl font-bold">{voterCount}</span>
              <span className="text-base text-gray-500 ml-1">／ 3件</span>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              {status === 'preparing' && (
                <Button onClick={handleStartVoting} disabled={!canStart}>
                  投票を開始する
                </Button>
              )}
              {status === 'open' && (
                <Button variant="outline" onClick={handleCloseVoting}>
                  投票を締め切る
                </Button>
              )}
              {status === 'closed' && (
                <Button
                  variant={settings?.results_published ? 'outline' : 'default'}
                  onClick={handleToggleResults}
                >
                  {settings?.results_published ? '結果を非公開にする' : '結果を公開する'}
                </Button>
              )}
            </div>

            {status === 'preparing' && !canStart && (
              <p className="text-sm text-gray-500">
                投票を開始するには候補を10〜15件登録してください（現在 {candidates.length} 件）
              </p>
            )}

            <Separator />

            {showResetConfirm ? (
              <div className="border border-orange-200 bg-orange-50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-orange-800">
                  全員の投票データを削除して、準備中に戻します。この操作は元に戻せません。実行しますか？
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetConfirm(false)}
                    disabled={isLoading}
                  >
                    キャンセル
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleReset}
                    disabled={isLoading}
                  >
                    {isLoading ? 'リセット中...' : '投票をリセット'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="destructive"
                onClick={() => { setShowResetConfirm(true); setSuccessMessage(null) }}
              >
                投票をリセット
              </Button>
            )}
          </CardContent>
        </Card>

        <CandidateManager
          candidates={candidates}
          isEditable={status === 'preparing'}
          onUpdate={async () => { setIsLoading(true); refresh() }}
          onError={setActionError}
        />
      </div>
    </div>
  )
}
