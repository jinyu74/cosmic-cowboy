import { UFO_CONFIG } from './ufoConfig'

export type StageConfig = {
  stageIndex: number
  ufoMaxHp: number
  moveSpeedScale: number
  attackIntervalScale: number
  laserTelegraphScale: number
  magnetTelegraphScale: number
  magnetWeightBias: number
  stageClearDelayMs: number
}

const STAGE_TUNING = {
  hpPerStage: 3,
  moveSpeedScaleStep: 0.1,
  attackIntervalScaleStep: -0.08,
  laserTelegraphScaleStep: -0.08,
  magnetTelegraphScaleStep: -0.06,
  magnetWeightBiasStep: 0.06,
  minAttackIntervalScale: 0.6,
  minTelegraphScale: 0.5,
  maxMoveSpeedScale: 1.8,
  maxMagnetBias: 0.3,
  stageClearDelayMs: 1200,
} as const

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

export const getStageConfig = (stageIndex: number): StageConfig => {
  const stage = Math.max(1, Math.floor(stageIndex))
  const step = stage - 1

  return {
    stageIndex: stage,
    ufoMaxHp: UFO_CONFIG.maxHp + STAGE_TUNING.hpPerStage * step,
    moveSpeedScale: clamp(1 + STAGE_TUNING.moveSpeedScaleStep * step, 1, STAGE_TUNING.maxMoveSpeedScale),
    attackIntervalScale: clamp(
      1 + STAGE_TUNING.attackIntervalScaleStep * step,
      STAGE_TUNING.minAttackIntervalScale,
      1,
    ),
    laserTelegraphScale: clamp(
      1 + STAGE_TUNING.laserTelegraphScaleStep * step,
      STAGE_TUNING.minTelegraphScale,
      1,
    ),
    magnetTelegraphScale: clamp(
      1 + STAGE_TUNING.magnetTelegraphScaleStep * step,
      STAGE_TUNING.minTelegraphScale,
      1,
    ),
    magnetWeightBias: clamp(STAGE_TUNING.magnetWeightBiasStep * step, 0, STAGE_TUNING.maxMagnetBias),
    stageClearDelayMs: STAGE_TUNING.stageClearDelayMs,
  }
}
