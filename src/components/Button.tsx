import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'night'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-brand to-brand-deep text-surface shadow-[0_12px_26px_-16px_rgba(7,51,46,0.9)] hover:-translate-y-px hover:shadow-[0_16px_30px_-16px_rgba(7,51,46,0.85)] active:translate-y-0 active:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-none',
  secondary:
    'border border-line-strong bg-surface text-ink shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] hover:-translate-y-px hover:border-brand/35 hover:bg-brand-soft/25 active:translate-y-0 disabled:hover:translate-y-0',
  ghost: 'text-ink-2 hover:bg-ink/5 hover:text-ink',
  danger:
    'bg-gradient-to-b from-danger to-[#8c2f23] text-surface shadow-[0_12px_26px_-16px_rgba(164,58,44,0.8)] hover:-translate-y-px active:translate-y-0',
  night:
    'border border-paper/20 bg-paper/[0.06] text-paper hover:border-paper/35 hover:bg-paper/10',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-1.5 px-3 text-[12.5px]',
  md: 'h-11 gap-2 px-4 text-sm',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[10px] font-semibold transition-[transform,background-color,border-color,box-shadow,color] duration-150 disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
}
