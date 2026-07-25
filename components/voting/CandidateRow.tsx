'use client'

import { useEffect, useRef, useState } from 'react'
import type { Candidate } from '@/lib/types'

interface Props {
  candidate: Candidate
  value: number
  remaining: number
  rank?: number        // 1–3 for top ranked; undefined otherwise
  onChange: (value: number) => void
  disabled: boolean
}

const RANK_ICON: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function StepButton({
  label, onClick, disabled,
}: {
  label: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-11 w-[3.75rem] rounded-xl border border-slate-200 bg-white
                 text-sm font-semibold text-slate-700
                 hover:bg-slate-50 active:scale-95
                 disabled:opacity-25 disabled:cursor-not-allowed
                 transition-all duration-150 select-none"
    >
      {label}
    </button>
  )
}

export default function CandidateRow({
  candidate, value, remaining, rank, onChange, disabled,
}: Props) {
  const prevValueRef = useRef(value)
  const [showCoinAnim, setShowCoinAnim] = useState(false)

  useEffect(() => {
    const prev = prevValueRef.current
    prevValueRef.current = value
    if (value > prev) {
      setShowCoinAnim(true)
      const id = setTimeout(() => setShowCoinAnim(false), 450)
      return () => clearTimeout(id)
    }
  }, [value])

  function adjust(delta: number) {
    const next = value + delta
    if (next < 0) return
    if (delta > 0 && delta > remaining) return
    onChange(next)
  }

  const hasCoins = value > 0
  const isTopRanked = rank === 1 && hasCoins

  return (
    <div className={`relative rounded-2xl border-2 p-4 transition-colors duration-300 ${
      isTopRanked
        ? 'border-amber-400 bg-amber-50 shadow-sm shadow-amber-100'
        : hasCoins
          ? 'border-amber-200 bg-amber-50/60'
          : 'border-gray-100 bg-white'
    }`}>

      {/* Floating coin animation on increase */}
      {showCoinAnim && (
        <span
          className="absolute top-3 right-14 text-lg pointer-events-none animate-coin-bounce"
          aria-hidden="true"
        >
          🪙
        </span>
      )}

      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-start gap-2 mb-3">
        {/* Rank medal */}
        {rank && rank <= 3 && (
          <span className="text-xl shrink-0 leading-none mt-0.5">{RANK_ICON[rank]}</span>
        )}

        {/* Candidate name */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-base leading-snug line-clamp-2 ${
            hasCoins ? 'text-slate-900' : 'text-slate-600'
          }`}>
            {candidate.name}
          </p>
        </div>

        {/* Coin count */}
        <div className={`shrink-0 flex items-baseline gap-1 font-bold tabular-nums ${
          hasCoins ? 'text-amber-600' : 'text-slate-300'
        }`}>
          <span className="text-2xl leading-none">{value}</span>
          <span className="text-base leading-none">🪙</span>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────── */}
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-2.5 rounded-full transition-[width] duration-300 ease-out ${
            hasCoins ? 'bg-gradient-to-r from-amber-400 to-amber-500' : ''
          }`}
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${candidate.name}のコイン割合`}
        />
      </div>

      {/* ── Step buttons ────────────────────────────── */}
      <div className="flex items-center justify-end gap-1.5">
        <StepButton label="−10" onClick={() => adjust(-10)} disabled={disabled || value < 10} />
        <StepButton label="−1"  onClick={() => adjust(-1)}  disabled={disabled || value < 1} />
        <StepButton label="+1"  onClick={() => adjust(1)}   disabled={disabled || remaining < 1} />
        <StepButton label="+10" onClick={() => adjust(10)}  disabled={disabled || remaining < 10} />
      </div>
    </div>
  )
}
