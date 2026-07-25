interface Props {
  remaining: number
  total: number
  animateComplete: boolean
}

export default function PointsCounter({ remaining, total, animateComplete }: Props) {
  const isComplete = remaining === 0
  const isOver = remaining < 0

  if (isComplete) {
    return (
      <div className={`rounded-xl p-6 text-center border-2 border-green-400 bg-green-50 ${
        animateComplete ? 'animate-coin-complete' : ''
      }`}>
        <div className={`text-2xl font-bold text-green-600 ${animateComplete ? 'animate-pop-in' : ''}`}>
          🎉 じゅんびOK！
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl p-6 text-center border-2 transition-colors ${
      isOver ? 'border-red-400 bg-red-50' : 'border-amber-300 bg-amber-50'
    }`}>
      <div className="text-sm text-gray-500 mb-1">🪙 残りコイン</div>
      <div className={`text-5xl font-bold tabular-nums ${isOver ? 'text-red-600' : 'text-amber-700'}`}>
        {remaining}
      </div>
      <div className="text-sm mt-1 text-gray-400">/ {total}枚</div>
    </div>
  )
}
