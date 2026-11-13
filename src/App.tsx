import { useEffect, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { IntroSplash } from './components/IntroSplash'
import { StudentHome } from './pages/StudentHome'
import { CoordinatorDashboard } from './pages/CoordinatorDashboard'
import { AppProvider } from './state/store'
import { useApp } from './state/context'
import { readIntroSeen, shouldShowIntro } from './lib/intro'

function Shell() {
  const { state, storage } = useApp()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [state.role])

  return (
    <div className="flex min-h-svh flex-col">
      <div className="bg-night text-paper">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-1.5 sm:px-6 lg:px-8">
          <span className="size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
          <p className="font-mono text-[9.5px] uppercase leading-tight tracking-[0.13em] text-paper/70">
            <span className="sm:hidden">Simulated demo · no live data</span>
            <span className="hidden sm:inline">
              Simulated demo · no real buses, schools, or student data
            </span>
          </p>
        </div>
      </div>

      <AppHeader />

      <main
        key={state.role}
        className="reveal relative mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-8"
      >
        {state.role === 'student' ? <StudentHome /> : <CoordinatorDashboard />}
      </main>

      <footer className="border-t border-paper/10 bg-night text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="text-[11px] leading-relaxed text-paper/55">
            ROUTELESS · Last Mile — simulated prototype for Aerophilia 2K26
            Prompt Battle.
          </p>
          <p className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.11em] text-paper/45">
            <span
              className={`size-1.5 rounded-full ${
                storage === 'ok' ? 'bg-mint' : 'bg-gold'
              }`}
              aria-hidden
            />
            {storage === 'ok'
              ? 'State saved on this device'
              : 'Storage unavailable · changes last for this tab only'}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  const [introOpen, setIntroOpen] = useState(() =>
    shouldShowIntro({
      search: window.location.search,
      seen: readIntroSeen(window.sessionStorage),
    }),
  )

  return (
    <AppProvider>
      <div aria-hidden={introOpen || undefined}>
        <Shell />
      </div>
      {introOpen ? <IntroSplash onDone={() => setIntroOpen(false)} /> : null}
    </AppProvider>
  )
}
