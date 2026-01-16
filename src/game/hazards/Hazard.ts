import type Phaser from 'phaser'

export type HazardPhase = 'Telegraph' | 'Active' | 'Recover' | 'Done'

export type HazardTiming = {
  startTime: number
  telegraphMs: number
  activeMs: number
  recoverMs: number
}

export type HazardTarget = {
  hitbox: Phaser.Geom.Rectangle
  applyDamage: (amount: number, source: string, now: number) => boolean
  applyMagnetGrab: (source: string, now: number) => boolean
}

export interface Hazard {
  readonly id: string
  readonly type: string
  readonly timing: HazardTiming
  phase: HazardPhase
  hitbox: Phaser.Geom.Rectangle | null
  update(now: number, deltaMs: number): void
  applyToTarget(target: HazardTarget, now: number): void
  isFinished(): boolean
  destroy(): void
}
