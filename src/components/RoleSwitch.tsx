import { ClipboardList, GraduationCap } from 'lucide-react'
import type { Role } from '../data/types'
import { useApp } from '../state/context'
import { cn } from '../lib/cn'

const OPTIONS: { id: Role; label: string; icon: typeof GraduationCap }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'coordinator', label: 'Coordinator', icon: ClipboardList },
]

export function RoleSwitch({ full = false }: { full?: boolean }) {
  const { state, dispatch } = useApp()

  return (
    <div
      role="group"
      aria-label="Demo view (not real access control)"
      className={cn(
        'night rounded-full border border-paper/15 bg-paper/[0.06] p-1',
        full ? 'grid w-full grid-cols-2' : 'inline-flex',
      )}
    >
      {OPTIONS.map((option) => {
        const active = state.role === option.id
        const Icon = option.icon
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => dispatch({ type: 'SET_ROLE', role: option.id })}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
              active
                ? 'bg-paper text-night shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
                : 'text-paper/65 hover:bg-paper/10 hover:text-paper',
            )}
          >
            <Icon className="size-[15px]" aria-hidden />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
