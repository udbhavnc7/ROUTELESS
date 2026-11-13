import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { IntroSceneHandle } from '../three/introScene'
import { INTRO_DURATION_MS, markIntroSeen } from '../lib/intro'
import { BrandMark } from './BrandMark'
import { cn } from '../lib/cn'

const WAYPOINTS = [
  { id: 'a', label: 'Village A', className: 'left-[14%] top-[42%]' },
  { id: 'b', label: 'Village B', className: 'left-[30%] top-[66%]' },
  { id: 'c', label: 'Village C', className: 'left-[66%] top-[60%]' },
  { id: 'campus', label: 'Campus · 09:00', className: 'left-[58%] top-[25%]' },
]

function IntroFallbackArt() {
  return (
    <svg
      viewBox="0 0 900 620"
      className="intro-fallback absolute inset-0 size-full"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="intro-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#12453b" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#08211c" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#061713" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="intro-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3d9985" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#9fe6cc" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3d9985" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect width="900" height="620" fill="#061713" />
      <rect width="900" height="620" fill="url(#intro-glow)" />
      {Array.from({ length: 15 }, (_, index) => (
        <line
          key={`h-${index}`}
          x1="0"
          y1={80 + index * 34}
          x2="900"
          y2={80 + index * 34}
          stroke="#2f8a78"
          strokeOpacity="0.1"
        />
      ))}
      {Array.from({ length: 22 }, (_, index) => (
        <line
          key={`v-${index}`}
          x1={60 + index * 38}
          y1="0"
          x2={60 + index * 38}
          y2="620"
          stroke="#2f8a78"
          strokeOpacity="0.06"
        />
      ))}
      <path
        d="M165 285 C 300 220, 440 200, 560 195"
        fill="none"
        stroke="url(#intro-line)"
        strokeWidth="2"
      />
      <path
        d="M310 420 C 380 380, 470 300, 560 195"
        fill="none"
        stroke="url(#intro-line)"
        strokeWidth="2"
      />
      <path
        d="M610 400 C 600 350, 610 300, 580 210"
        fill="none"
        stroke="#d0604a"
        strokeWidth="2"
        strokeDasharray="7 9"
        strokeOpacity="0.75"
      />
      <path
        d="M628 408 C 690 370, 640 270, 590 215"
        fill="none"
        stroke="#9fe6cc"
        strokeWidth="2.5"
        strokeDasharray="3 6"
      />
      <circle cx="165" cy="285" r="7" fill="#9fe6cc" />
      <circle cx="165" cy="285" r="17" fill="none" stroke="#9fe6cc" strokeOpacity="0.35" />
      <circle cx="310" cy="420" r="7" fill="#9fe6cc" />
      <circle cx="310" cy="420" r="17" fill="none" stroke="#9fe6cc" strokeOpacity="0.35" />
      <circle cx="610" cy="400" r="7" fill="#9fe6cc" />
      <circle cx="610" cy="400" r="17" fill="none" stroke="#9fe6cc" strokeOpacity="0.35" />
      <circle cx="575" cy="203" r="10" fill="#d7a24a" />
      <circle cx="575" cy="203" r="24" fill="none" stroke="#d7a24a" strokeOpacity="0.4" />
    </svg>
  )
}

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const actionRef = useRef<HTMLButtonElement>(null)
  const finished = useRef(false)
  const [leaving, setLeaving] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    markIntroSeen(window.sessionStorage)
    setLeaving(true)
    window.setTimeout(onDone, 380)
  }, [onDone])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    actionRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault()
        finish()
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        actionRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finish])

  useEffect(() => {
    const timer = window.setTimeout(finish, INTRO_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [finish])

  useEffect(() => {
    let cancelled = false
    let handle: IntroSceneHandle | null = null
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    import('../three/introScene')
      .then(({ mountIntroScene }) => {
        if (cancelled || !canvasRef.current) return
        try {
          handle = mountIntroScene(canvasRef.current, { reducedMotion: reduced })
          setSceneReady(true)
        } catch {
          // The SVG lattice behind the canvas remains as the fallback.
        }
      })
      .catch(() => {
        // Keep the SVG fallback if the scene chunk cannot load.
      })

    return () => {
      cancelled = true
      handle?.dispose()
    }
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      className={cn(
        'intro fixed inset-0 z-[100] overflow-hidden bg-night text-paper',
        leaving && 'intro-leaving',
      )}
    >
      <div className="intro-aurora" aria-hidden="true" />
      <IntroFallbackArt />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn(
          'absolute inset-0 size-full transition-opacity duration-1000',
          sceneReady ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div className="intro-vignette" aria-hidden="true" />

      {WAYPOINTS.map((point) => (
        <span
          key={point.id}
          aria-hidden="true"
          className={cn(
            'intro-waypoint absolute hidden font-mono text-[9px] uppercase tracking-[0.18em] text-mint/70 lg:block',
            point.className,
          )}
        >
          <span className="mr-2 inline-block size-1 rounded-full bg-mint align-middle" />
          {point.label}
        </span>
      ))}

      <div className="relative z-10 flex h-full flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark variant="inverse" className="size-10 shrink-0 rounded-[11px]" />
            <div className="leading-none">
              <p className="font-display text-[17px] font-bold tracking-[0.13em]">
                ROUTELESS
              </p>
              <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-mint/65">
                The last mile
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-night-2/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-gold">
            <ShieldCheck className="size-3" aria-hidden="true" />
            Simulated demo
          </span>
        </div>

        <div className="mt-auto grid items-end gap-8 pb-4 pt-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
          <div className="max-w-2xl">
            <p
              className="intro-rise font-mono text-[10px] uppercase tracking-[0.24em] text-gold/90"
              style={{ animationDelay: '120ms' }}
            >
              07:58 · a route goes dark
            </p>
            <h1
              id="intro-title"
              className="intro-rise mt-4 font-display text-[clamp(2.6rem,6.4vw,4.9rem)] font-semibold leading-[0.96] tracking-[-0.035em]"
              style={{ animationDelay: '220ms' }}
            >
              A bus fails.
              <br />
              <span className="text-mint">The route doesn&rsquo;t.</span>
            </h1>
            <p
              className="intro-rise mt-5 max-w-lg text-[15px] leading-relaxed text-paper/70"
              style={{ animationDelay: '420ms' }}
            >
              ROUTELESS turns a student&rsquo;s one-tap report into a
              coordinator-verified disruption and a deterministic recovery plan
              built only from spare seats that can actually reach them.
            </p>
            <ul
              className="intro-rise mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper/55"
              style={{ animationDelay: '620ms' }}
            >
              <li>3 villages · 1 fleet</li>
              <li className="text-mint/75">Drafts hold nothing</li>
              <li className="text-mint/75">Approved seats never move</li>
            </ul>
          </div>

          <div
            className="intro-rise flex w-full flex-col gap-2.5 sm:w-auto"
            style={{ animationDelay: '760ms' }}
          >
            <button
              ref={actionRef}
              type="button"
              onClick={finish}
              className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-paper px-6 text-[13.5px] font-semibold text-night shadow-[0_18px_50px_-18px_rgba(159,230,204,0.55)] transition-transform hover:-translate-y-0.5 focus-visible:outline-mint"
            >
              Enter the demo
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
            <p className="text-center font-mono text-[9px] uppercase tracking-[0.14em] text-paper/40">
              Enter or Esc to skip · plays once per session
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-paper/10 pt-4 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.12em] text-paper/35 sm:flex-row sm:items-center sm:justify-between">
          <p>No live buses, schools, or student data · every figure is seeded</p>
          <p className="text-paper/30">Aerophilia 2K26 · Prompt Battle</p>
        </div>
      </div>

      <div className="intro-progress absolute inset-x-0 bottom-0 h-[2px] bg-paper/10">
        <span
          className="intro-progress-bar block h-full bg-gradient-to-r from-mint/50 via-mint to-gold"
          style={{ animationDuration: `${INTRO_DURATION_MS}ms` }}
        />
      </div>
    </div>
  )
}
