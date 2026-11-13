import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  DoubleSide,
  Float32BufferAttribute,
  FogExp2,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'

export type IntroSceneHandle = {
  dispose: () => void
}

type Palette = {
  mint: number
  teal: number
  gold: number
  danger: number
  night: number
  paper: number
}

const PALETTE: Palette = {
  mint: 0x9fe6cc,
  teal: 0x2f8a78,
  gold: 0xd7a24a,
  danger: 0xd0604a,
  night: 0x061713,
  paper: 0xf4f0e6,
}

const CAMPUS = new Vector3(2.6, 0, -5.2)
const VILLAGE_A = new Vector3(-7.4, 0, -1.6)
const VILLAGE_B = new Vector3(-3.6, 0, 4.6)
const VILLAGE_C = new Vector3(5.8, 0, 3.8)

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

function glowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(0.22, 'rgba(255,255,255,0.42)')
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.1)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 128, 128)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function lineFromCurve(
  curve: CatmullRomCurve3,
  color: number,
  opacity: number,
  segments = 140,
): { line: Line; material: LineBasicMaterial } {
  const points = curve.getPoints(segments)
  const geometry = new BufferGeometry().setFromPoints(points)
  const material = new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const line = new Line(geometry, material)
  geometry.setDrawRange(0, 0)
  line.frustumCulled = false
  return { line, material }
}

function subCurve(
  curve: CatmullRomCurve3,
  from: number,
  to: number,
): CatmullRomCurve3 {
  const points: Vector3[] = []
  for (let index = 0; index <= 70; index += 1) {
    points.push(curve.getPoint(from + ((to - from) * index) / 70))
  }
  return new CatmullRomCurve3(points)
}

export function mountIntroScene(
  canvas: HTMLCanvasElement,
  { reducedMotion }: { reducedMotion: boolean },
): IntroSceneHandle {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(PALETTE.night, 0)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))

  const scene = new Scene()
  scene.fog = new FogExp2(PALETTE.night, 0.038)

  const camera = new PerspectiveCamera(38, 1, 0.1, 120)
  camera.position.set(0.6, 10.8, 21)
  camera.lookAt(0.1, 0, -0.4)

  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item)
    return item
  }

  const glow = track(glowTexture())

  /* ------------------------------------------------------------------ grid */

  const gridPositions: number[] = []
  const gridExtent = 26
  const gridStep = 1.6
  for (let value = -gridExtent; value <= gridExtent; value += gridStep) {
    gridPositions.push(-gridExtent, 0, value, gridExtent, 0, value)
    gridPositions.push(value, 0, -gridExtent, value, 0, gridExtent)
  }
  const gridGeometry = track(
    new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(gridPositions, 3),
    ),
  )
  const gridMaterial = track(
    new LineBasicMaterial({
      color: PALETTE.teal,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
    }),
  )
  const grid = new Line(gridGeometry, gridMaterial)
  grid.position.y = -0.02
  scene.add(grid)

  const majorPositions: number[] = []
  for (let value = -24; value <= 24; value += 8) {
    majorPositions.push(-24, 0, value, 24, 0, value)
    majorPositions.push(value, 0, -24, value, 0, 24)
  }
  const majorGeometry = track(
    new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(majorPositions, 3),
    ),
  )
  const majorMaterial = track(
    new LineBasicMaterial({
      color: PALETTE.mint,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    }),
  )
  const majorGrid = new Line(majorGeometry, majorMaterial)
  majorGrid.position.y = -0.015
  scene.add(majorGrid)

  for (const radius of [4.2, 7.6, 11.4]) {
    const ringGeometry = track(new RingGeometry(radius, radius + 0.012, 128))
    const ringMaterial = track(
      new MeshBasicMaterial({
        color: PALETTE.mint,
        transparent: true,
        opacity: 0.07,
        side: DoubleSide,
        depthWrite: false,
      }),
    )
    const ring = new Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(CAMPUS.x, -0.01, CAMPUS.z)
    scene.add(ring)
  }

  /* ---------------------------------------------------------------- beacons */

  const beacons: { pulse: Sprite; baseScale: number }[] = []

  const makeBeacon = (
    position: Vector3,
    color: number,
    size: number,
    pillar: number,
  ) => {
    const group = new Group()
    group.position.copy(position)

    const discGeometry = track(new CircleGeometry(0.085, 32))
    const discMaterial = track(
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    const disc = new Mesh(discGeometry, discMaterial)
    disc.rotation.x = -Math.PI / 2
    disc.position.y = 0.02
    group.add(disc)

    const ringGeometry = track(new RingGeometry(size * 0.86, size, 64))
    const ringMaterial = track(
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.75,
        side: DoubleSide,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    const ring = new Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.015
    group.add(ring)

    const haloGeometry = track(new RingGeometry(size * 1.6, size * 1.66, 64))
    const haloMaterial = track(
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18,
        side: DoubleSide,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    const halo = new Mesh(haloGeometry, haloMaterial)
    halo.rotation.x = -Math.PI / 2
    halo.position.y = 0.01
    group.add(halo)

    const pillarGeometry = track(
      new BufferGeometry().setAttribute(
        'position',
        new Float32BufferAttribute([0, 0.02, 0, 0, pillar, 0], 3),
      ),
    )
    const pillarMaterial = track(
      new LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    group.add(new Line(pillarGeometry, pillarMaterial))

    const spriteMaterial = track(
      new SpriteMaterial({
        map: glow,
        color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    const sprite = new Sprite(spriteMaterial)
    sprite.position.set(0, 0.24, 0)
    sprite.scale.setScalar(size * 9)
    group.add(sprite)

    scene.add(group)
    beacons.push({ pulse: sprite, baseScale: size * 9 })
    return group
  }

  makeBeacon(VILLAGE_A, PALETTE.mint, 0.44, 1.35)
  makeBeacon(VILLAGE_B, PALETTE.mint, 0.44, 1.55)
  makeBeacon(VILLAGE_C, PALETTE.mint, 0.46, 1.45)
  const campusGroup = makeBeacon(CAMPUS, PALETTE.gold, 0.62, 1.9)

  const campusCoreMaterial = track(
    new MeshBasicMaterial({
      color: PALETTE.gold,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  )
  const campusCoreGeometry = track(new OctahedronGeometry(0.52, 0))
  const campusCore = new Mesh(campusCoreGeometry, campusCoreMaterial)
  campusCore.position.set(0, 1.12, 0)
  campusGroup.add(campusCore)

  /* ----------------------------------------------------------------- routes */

  const routeA = new CatmullRomCurve3([
    VILLAGE_A.clone().add(new Vector3(0, 0.06, 0)),
    new Vector3(-5.4, 0.3, -4.4),
    new Vector3(-1.6, 0.22, -5.8),
    CAMPUS.clone().add(new Vector3(0, 0.06, 0)),
  ])

  const routeB = new CatmullRomCurve3([
    VILLAGE_B.clone().add(new Vector3(0, 0.06, 0)),
    new Vector3(-1.8, 0.26, 2.8),
    new Vector3(0.6, 0.2, -0.6),
    CAMPUS.clone().add(new Vector3(0, 0.06, 0)),
  ])

  const routeC = new CatmullRomCurve3([
    VILLAGE_C.clone().add(new Vector3(0, 0.06, 0)),
    new Vector3(5.2, 0.22, 1.2),
    new Vector3(4.3, 0.18, -1.6),
    CAMPUS.clone().add(new Vector3(0, 0.06, 0)),
  ])

  const recoveryRoute = new CatmullRomCurve3([
    VILLAGE_C.clone().add(new Vector3(0, 0.05, 0.35)),
    new Vector3(6.9, 0.24, -0.2),
    new Vector3(5.4, 0.3, -3.6),
    CAMPUS.clone().add(new Vector3(0.1, 0.05, 0.45)),
  ])

  const routeABuild = lineFromCurve(routeA, PALETTE.teal, 0.5)
  const routeBBuild = lineFromCurve(routeB, PALETTE.teal, 0.5)
  const routeCHead = lineFromCurve(subCurve(routeC, 0, 0.5), PALETTE.teal, 0.6, 70)
  const routeCTail = lineFromCurve(subCurve(routeC, 0.545, 1), PALETTE.teal, 0.6, 70)
  const recoveryBuild = lineFromCurve(recoveryRoute, PALETTE.mint, 0.95, 150)

  scene.add(routeABuild.line, routeBBuild.line, routeCHead.line, routeCTail.line)
  scene.add(recoveryBuild.line)

  const breakPoint = routeC.getPoint(0.5225)
  const breakXGeometry = track(
    new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(
        [
          -0.34, 0, -0.34, 0.34, 0, 0.34,
          0.34, 0, -0.34, -0.34, 0, 0.34,
        ],
        3,
      ),
    ),
  )
  const breakXMaterial = track(
    new LineBasicMaterial({
      color: PALETTE.danger,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  const breakX = new Line(breakXGeometry, breakXMaterial)
  breakX.position.copy(breakPoint)
  breakX.position.y = 0.1
  scene.add(breakX)

  /* ---------------------------------------------------------------- travellers */

  const busGeometry = track(new SphereGeometry(0.075, 16, 16))
  const makeTraveller = (color: number, opacity = 0.95) => {
    const material = track(
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    const mesh = new Mesh(busGeometry, material)
    scene.add(mesh)
    return mesh
  }
  const busA = makeTraveller(PALETTE.mint)
  const busB = makeTraveller(PALETTE.mint)
  const busC = makeTraveller(PALETTE.mint)
  const busRecovery = makeTraveller(PALETTE.gold)

  /* ------------------------------------------------------------------ embers */

  const emberCount = 44
  const emberPositions = new Float32Array(emberCount * 3)
  const emberSeeds: Vector3[] = []
  for (let index = 0; index < emberCount; index += 1) {
    const angle = Math.random() * Math.PI * 2
    const radius = 0.2 + Math.random() * 0.8
    emberSeeds.push(
      new Vector3(
        Math.cos(angle) * radius,
        0.05 + Math.random() * 0.5,
        Math.sin(angle) * radius,
      ),
    )
    emberPositions[index * 3] = breakPoint.x
    emberPositions[index * 3 + 1] = breakPoint.y
    emberPositions[index * 3 + 2] = breakPoint.z
  }
  const emberGeometry = track(
    new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(emberPositions, 3),
    ),
  )
  const emberMaterial = track(
    new PointsMaterial({
      color: PALETTE.danger,
      size: 0.075,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
    }),
  )
  const embers = new Points(emberGeometry, emberMaterial)
  scene.add(embers)

  /* -------------------------------------------------------------------- dust */

  const dustCount = 260
  const dustPositions = new Float32Array(dustCount * 3)
  for (let index = 0; index < dustCount; index += 1) {
    dustPositions[index * 3] = (Math.random() - 0.5) * 30
    dustPositions[index * 3 + 1] = Math.random() * 7
    dustPositions[index * 3 + 2] = (Math.random() - 0.5) * 26
  }
  const dustGeometry = track(
    new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(dustPositions, 3),
    ),
  )
  const dustMaterial = track(
    new PointsMaterial({
      color: PALETTE.mint,
      size: 0.032,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  const dust = new Points(dustGeometry, dustMaterial)
  scene.add(dust)

  /* --------------------------------------------------------------- animation */

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 }
  const reduced = reducedMotion

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    if (reduced) renderFrame(6)
  }

  const setProgress = (line: Line, progress: number) => {
    const geometry = line.geometry as BufferGeometry
    const total = geometry.getAttribute('position')?.count ?? 0
    geometry.setDrawRange(0, Math.floor(total * clamp01(progress)))
  }

  const placeOnCurve = (mesh: Mesh, curve: CatmullRomCurve3, t: number) => {
    const point = curve.getPoint(clamp01(t))
    point.y += 0.12
    mesh.position.copy(point)
  }

  const renderFrame = (time: number) => {
    const t = reduced ? 6 : time

    const drawA = clamp01((t - 0.35) / 1.1)
    const drawB = clamp01((t - 0.55) / 1.15)
    const drawC = clamp01((t - 0.8) / 1.2)
    setProgress(routeABuild.line, drawA)
    setProgress(routeBBuild.line, drawB)
    setProgress(routeCHead.line, drawC)
    setProgress(routeCTail.line, drawC)

    const breakAt = 2.25
    const broken = t >= breakAt
    const breakFlash = clamp01((t - breakAt) / 0.5)
    if (broken) {
      routeCHead.material.color.setHex(PALETTE.danger)
      routeCTail.material.color.setHex(PALETTE.danger)
      routeCTail.material.opacity = 0.16 + 0.6 * (1 - breakFlash)
      breakXMaterial.opacity = 0.95 * Math.min(1, breakFlash * 2)
      breakX.rotation.y = breakFlash * 0.8
    }

    const recoveryDraw = clamp01((t - 3.05) / 1.35)
    setProgress(recoveryBuild.line, recoveryDraw)
    recoveryBuild.material.opacity = 0.95

    /* Travellers */
    const busAT = (t * 0.075 + 0.15) % 1
    const busBT = (t * 0.068 + 0.42) % 1
    placeOnCurve(busA, routeA, busAT)
    placeOnCurve(busB, routeB, busBT)
    const busCT = broken ? Math.min((t * 0.085 + 0.08) % 1, 0.5) : (t * 0.085 + 0.08) % 1
    placeOnCurve(busC, routeC, busCT)
    if (broken && busCT >= 0.495) {
      busC.position.copy(breakPoint)
      busC.position.y += 0.14
    }
    busRecovery.visible = recoveryDraw > 0.02
    if (busRecovery.visible) {
      placeOnCurve(busRecovery, recoveryRoute, (t * 0.09) % 1)
    }

    /* Embers burst outward from the break */
    const emberLife = clamp01((t - breakAt) / 1.6)
    emberMaterial.opacity = broken ? 0.85 * (1 - emberLife) : 0
    const emberAttribute = emberGeometry.getAttribute('position')
    for (let index = 0; index < emberCount; index += 1) {
      const seed = emberSeeds[index]
      const drift = 0.7 + Math.random() * 0.02
      emberAttribute.setXYZ(
        index,
        breakPoint.x + seed.x * (0.4 + emberLife * 2.2 * drift),
        breakPoint.y + seed.y + emberLife * 1.15,
        breakPoint.z + seed.z * (0.4 + emberLife * 2.2 * drift),
      )
    }
    emberAttribute.needsUpdate = true

    /* Dust and beacons */
    dust.rotation.y = t * 0.008
    dust.position.y = Math.sin(t * 0.22) * 0.08
    for (let index = 0; index < beacons.length; index += 1) {
      const { pulse, baseScale } = beacons[index]
      const breathe = 1 + Math.sin(t * 1.4 + index * 1.7) * 0.055
      pulse.scale.setScalar(baseScale * breathe)
    }
    campusCore.rotation.y = t * 0.45
    campusCore.rotation.x = t * 0.2

    /* Camera */
    const ease = reduced ? 1 : clamp01(t / 4.5)
    const smooth = ease * ease * (3 - 2 * ease)
    // Portrait viewports need a wider shot so the lattice still reads behind the copy.
    const portrait = camera.aspect < 0.85
    const startZoom = portrait ? 30 : 21
    const endZoom = portrait ? 25.6 : 17.9
    const zoom = startZoom + (endZoom - startZoom) * smooth
    const cameraY = portrait ? 12.4 : 10.8
    pointer.x += (pointer.targetX - pointer.x) * 0.045
    pointer.y += (pointer.targetY - pointer.y) * 0.045
    camera.position.set(
      (portrait ? 2.6 : 0.6) + pointer.x * 1.1,
      cameraY + pointer.y * 0.55,
      zoom,
    )
    // Portrait shots centre on the campus and the failed corridor, not the full lattice.
    camera.lookAt(portrait ? 2.6 : 0.1, 0.1, portrait ? -3.4 : -0.4)

    renderer.render(scene, camera)
  }

  let raf = 0
  let started = 0
  let pausedAt = 0
  let pausedFor = 0

  const loop = (now: number) => {
    if (!started) started = now
    const elapsed = (now - started - pausedFor) / 1000
    renderFrame(elapsed)
    raf = window.requestAnimationFrame(loop)
  }

  const onPointer = (event: PointerEvent) => {
    pointer.targetX = (event.clientX / window.innerWidth - 0.5) * 2
    pointer.targetY = (event.clientY / window.innerHeight - 0.5) * 2
  }

  const onVisibility = () => {
    if (document.hidden) {
      pausedAt = performance.now()
    } else if (pausedAt) {
      pausedFor += performance.now() - pausedAt
      pausedAt = 0
    }
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)

  if (reduced) {
    resize()
    renderFrame(6)
  } else {
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    raf = window.requestAnimationFrame(loop)
  }

  return {
    dispose: () => {
      window.cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
      for (const item of disposables) item.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
