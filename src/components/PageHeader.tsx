import type { ReactNode } from 'react'
import { Eyebrow } from './StatusChip'

type PageHeaderProps = {
  eyebrow: ReactNode
  title: string
  description: ReactNode
  aside?: ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  aside,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2.5">
          <span className="h-px w-8 bg-gold" aria-hidden="true" />
          <Eyebrow className="text-brand">{eyebrow}</Eyebrow>
        </div>
        <h1 className="mt-3 font-display text-[clamp(2rem,4.6vw,3.05rem)] font-semibold leading-[1.0] text-ink">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">
          {description}
        </p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  )
}
