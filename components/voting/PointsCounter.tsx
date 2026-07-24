interface Props {
  remaining: number
  total: number
}

export default function PointsCounter({ remaining, total }: Props) {
  const used = total - remaining
  const isComplete = remaining === 0
  const isOver = remaining < 0

  return (
    <div
      className={`rounded-xl p-6 text-center border-2 transition-colors ${
        isOver
          ? 'border-red-400 bg-red-50'
          : isComplete
            ? 'border-green-400 bg-green-50'
            : 'border-gray-200 bg-white'
      }`}
    >
      <div
        className={`text-5xl font-bold tabular-nums ${
          isOver ? 'text-red-600' : isComplete ? 'text-green-600' : 'text-gray-800'
        }`}
      >
        {remaining}
      </div>
      <div className="text-sm mt-2 text-gray-500">残りポイント</div>
      <div className="text-xs mt-1 text-gray-400">
        使用済み {used} / {total} ポイント
      </div>
    </div>
  )
}
