import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { SCENARIO_CATALOG } from '../data/scenarios'
import { formatClock } from '../domain/time'
import { useApp } from '../state/context'
import { BrandMark } from './BrandMark'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { RoleSwitch } from './RoleSwitch'

export function AppHeader() {
  const { state, dispatch } = useApp()
  const [resetOpen, setResetOpen] = useState(false)
  const scenarioTitle =
    SCENARIO_CATALOG.find((scenario) => scenario.id === state.scenarioId)?.title ??
    'seeded'

  return (
    <>
      <header className="night sticky top-0 z-40 border-b border-paper/10 bg-night/95 shadow-[0_20px_40px_-34px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark
              variant="inverse"
              className="size-9 shrink-0 rounded-[10px] shadow-[0_10px_24px_-14px_rgba(0,0,0,0.7)]"
            />
            <div className="min-w-0 leading-none">
              <p className="font-display text-[16px] font-bold tracking-[0.12em] text-paper">
                ROUTELESS
              </p>
              <p className="mt-1.5 font-mono text-[8.5px] uppercase tracking-[0.24em] text-mint/55">
                The last mile
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-paper/10 bg-paper/[0.05] py-1.5 pl-2.5 pr-3 lg:inline-flex">
              <span className="size-1.5 rounded-full bg-gold" aria-hidden />
              <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-paper/40">
                Scenario
              </span>
              <span className="max-w-[9rem] truncate text-[11.5px] font-semibold text-paper/85">
                {scenarioTitle}
              </span>
            </span>

            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-gold"
              title="Simulated demo clock. Not live time."
            >
              <span className="size-1.5 rounded-full bg-gold" aria-hidden />
              Demo {formatClock(state.clockMin)}
            </span>

            <div className="hidden md:block">
              <RoleSwitch />
            </div>

            <Button
              variant="night"
              size="sm"
              onClick={() => setResetOpen(true)}
              aria-label="Reset demo"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </div>

        <div className="px-4 pb-3 md:hidden sm:px-6">
          <RoleSwitch full />
        </div>
      </header>

      <ConfirmDialog
        open={resetOpen}
        title="Reset the demo?"
        description={`This restores the ${scenarioTitle} scenario and clears every report, draft, and approved seat saved on this device. The view returns to the student.`}
        confirmLabel="Reset demo"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          dispatch({ type: 'RESET_DEMO' })
          setResetOpen(false)
        }}
      />
    </>
  )
}
