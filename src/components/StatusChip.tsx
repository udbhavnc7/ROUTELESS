import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export type ChipTone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger'

const TONES: Record<ChipTone, string> = {
  neutral: 'border-line-strong/70 bg-paper-2/50 text-ink-2',
  brand: 'border-brand/25 bg-brand-soft text-brand-deep',
  ok: 'border-ok/30 bg-ok-soft text-ok',
  warn: 'border-warn/30 bg-warn-soft text-warn',
  danger: 'border-danger/30 bg-danger-soft text-danger',
}

type StatusChipProps = {
  tone?: ChipTone
  dot?: boolean
  children: ReactNode
  className?: string
}

export function StatusChip({
  tone = 'neutral',
  dot = true,
  children,
  className,
}: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] border px-2 py-[3px] font-mono text-[9.5px] font-medium uppercase leading-none tracking-[0.12em]',
        TONES[tone],
        className,
      )}
    >
      {dot ? (
        <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      ) : null}
      {children}
    </span>
  )
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink-2',
        className,
      )}
    >
      {children}
    </p>
  )
}
