'use client'

import { useState } from 'react'
import type { Candidate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Props {
  candidates: Candidate[]
  isEditable: boolean
  onUpdate: () => Promise<void>
  onError: (msg: string) => void
}

export default function CandidateManager({ candidates, isEditable, onUpdate, onError }: Props) {
  const [newName, setNewName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleAdd() {
    const name = newName.trim()
    if (!name || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) {
        onError(data.error ?? '追加に失敗しました')
      } else {
        setNewName('')
        await onUpdate()
      }
    } catch {
      onError('通信エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/candidates/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        onError(data.error ?? '削除に失敗しました')
      } else {
        await onUpdate()
      }
    } catch {
      onError('通信エラーが発生しました')
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const newOrder = [...candidates]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newOrder.length) return
    ;[newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]]

    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder.map(c => c.id) }),
      })
      const data = await res.json()
      if (!res.ok) {
        onError(data.error ?? '並べ替えに失敗しました')
      } else {
        await onUpdate()
      }
    } catch {
      onError('通信エラーが発生しました')
    }
  }

  const countLabel =
    candidates.length < 10
      ? `（投票開始には ${10 - candidates.length} 件追加が必要）`
      : candidates.length > 15
        ? '（15件以下にしてください）'
        : '（投票開始可能）'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-baseline gap-2">
          候補リスト
          <span className="text-sm font-normal text-gray-500">
            {candidates.length} 件 {countLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {candidates.length === 0 && (
          <p className="text-sm text-gray-400 py-2">候補がまだ登録されていません</p>
        )}

        {candidates.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2 py-1">
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => handleMove(i, 'up')}
                disabled={!isEditable || i === 0}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none px-1"
                aria-label="上に移動"
              >
                ▲
              </button>
              <button
                onClick={() => handleMove(i, 'down')}
                disabled={!isEditable || i === candidates.length - 1}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none px-1"
                aria-label="下に移動"
              >
                ▼
              </button>
            </div>
            <span className="flex-1 text-sm">{c.name}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!isEditable}
              onClick={() => handleDelete(c.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
            >
              削除
            </Button>
          </div>
        ))}

        {isEditable && (
          <>
            <Separator className="my-3" />
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                placeholder="候補名を入力（Enter または追加ボタン）"
                maxLength={100}
                disabled={candidates.length >= 15 || isSubmitting}
              />
              <Button
                onClick={handleAdd}
                disabled={!newName.trim() || isSubmitting || candidates.length >= 15}
                className="shrink-0"
              >
                追加
              </Button>
            </div>
            {candidates.length >= 15 && (
              <p className="text-sm text-red-500">候補は最大15件です</p>
            )}
          </>
        )}

        {!isEditable && (
          <p className="text-sm text-gray-400 mt-2">投票開始後は候補を変更できません</p>
        )}
      </CardContent>
    </Card>
  )
}
