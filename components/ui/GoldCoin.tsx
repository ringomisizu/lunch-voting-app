import { useId } from 'react'

interface Props {
  size?: number
  className?: string
}

export default function GoldCoin({ size = 20, className = '' }: Props) {
  const uid = useId().replace(/\W/g, '')
  const faceId = `cf-${uid}`
  const shadeId = `cs-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={faceId} cx="38%" cy="32%" r="70%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#FFE566" />
          <stop offset="40%"  stopColor="#F4A41B" />
          <stop offset="100%" stopColor="#A86200" />
        </radialGradient>
        <radialGradient id={shadeId} cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
          <stop offset="72%"  stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#5C3300" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      {/* Outer rim for depth */}
      <circle cx="12" cy="12" r="11.5" fill="#9A5900" />
      {/* Main face */}
      <circle cx="12" cy="12" r="10.8" fill={`url(#${faceId})`} />
      {/* Inner engraved ring */}
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="#A86200" strokeWidth="0.65" opacity="0.55" />
      {/* Edge vignette */}
      <circle cx="12" cy="12" r="10.8" fill={`url(#${shadeId})`} />
      {/* Specular highlight */}
      <ellipse cx="9.2" cy="8.2" rx="3.0" ry="1.7" fill="white" opacity="0.26" transform="rotate(-25 9.2 8.2)" />
    </svg>
  )
}
