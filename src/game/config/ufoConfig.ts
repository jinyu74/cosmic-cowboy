export const UFO_CONFIG = {
  maxHp: 18,
  spawn: {
    startY: -120,
    durationMs: 1200,
  },
  hoverY: 48,
  patrol: {
    padding: 140,
    hoverBobPx: 6,
    hoverBobMs: 420,
  },
  phases: {
    p1: {
      minRatio: 0.7,
      moveSpeed: 80,
      attackIntervalMs: 2400,
      laserWeight: 0.7,
      magnetWeight: 0.3,
      timingScale: 1.0,
    },
    p2: {
      minRatio: 0.4,
      moveSpeed: 105,
      attackIntervalMs: 2000,
      laserWeight: 0.55,
      magnetWeight: 0.45,
      timingScale: 0.9,
    },
    p3: {
      minRatio: 0.01,
      moveSpeed: 130,
      attackIntervalMs: 1650,
      laserWeight: 0.45,
      magnetWeight: 0.55,
      timingScale: 0.8,
    },
  },
  attackRecoverMs: 280,
  enrage: {
    thresholdRatio: 0.4,
    durationMs: 600,
    pulseScale: 1.06,
  },
  crash: {
    startMs: 520,
    fallSpeed: 360,
    impactMs: 700,
  },
  deform: {
    maxScaleX: 0.18,
    maxScaleY: -0.12,
    skewOffset: 8,
    noisePx: 2.5,
    smokeAlpha: 0.75,
    smokeRisePx: 14,
  },
} as const
