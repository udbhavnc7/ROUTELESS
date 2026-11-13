import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

type PanelProps = {
  title: string
  meta?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  headingId?: string
}

export function Panel({
  title,
  meta,
  action,
  children,
  className,
  bodyClassName,
  headingId,
}: PanelProps) {
  return (
    <section
      className={cn(
        'panel group relative overflow-hidden rounded-2xl border border-line/90 bg-surface',
        className,
      )}
      aria-labelledby={headingId}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent"
      />
      <div className="flex flex-col gap-2.5 border-b border-line/70 bg-gradient-to-b from-surface to-paper/25 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="font-display text-[18px] font-semibold leading-tight"
          >
            {title}
          </h2>
          {meta ? (
            <p className="mt-1 max-w-xl text-xs leading-snug text-ink-2">{meta}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
