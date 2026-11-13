export function BrandMark({
  className,
  variant = 'default',
}: {
  className?: string
  variant?: 'default' | 'inverse'
}) {
  const inverse = variant === 'inverse'
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect
        width="32"
        height="32"
        rx="9"
        fill={inverse ? '#F4F0E6' : '#093E3A'}
      />
      <path
        d="M9.5 24V16.4C9.5 12.9 12.3 10 15.8 10h2.7"
        fill="none"
        stroke={inverse ? '#093E3A' : '#F4F0E6'}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M22.2 10h3.3"
        stroke={inverse ? '#093E3A' : '#F4F0E6'}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="9.5" cy="24.4" r="2" fill={inverse ? '#093E3A' : '#F4F0E6'} />
      <circle cx="27" cy="10" r="2" fill="#D9A24A" />
    </svg>
  )
}
