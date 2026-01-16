import Phaser from 'phaser'
import type { Hazard, HazardPhase, HazardTarget, HazardTiming } from './Hazard'

type LaserStrikeConfig = {
  telegraphMs: number
  activeMs: number
  recoverMs: number
  width: number
  damage: number
  blinkMs: number
  lineHeight: number
  telegraphColor: number
  activeColor: number
  recoverColor: number
  beamAlpha: number
  recoverAlpha: number
  telegraphDepth: number
  beamDepth: number
}

type LaserStrikeOptions = {
  id: string
  scene: Phaser.Scene
  x: number
  groundY: number
  worldHeight: number
  startTime: number
  config: LaserStrikeConfig
}

export class LaserStrike implements Hazard {
  readonly id: string
  readonly type = 'LaserStrike'
  readonly timing: HazardTiming
  phase: HazardPhase = 'Telegraph'
  hitbox: Phaser.Geom.Rectangle | null = null

  private readonly scene: Phaser.Scene
  private readonly x: number
  private readonly groundY: number
  private readonly worldHeight: number
  private readonly config: LaserStrikeConfig
  private readonly telegraphLine: Phaser.GameObjects.Rectangle
  private readonly beam: Phaser.GameObjects.Rectangle
  private readonly hitboxRect: Phaser.Geom.Rectangle
  private hasHit = false
  private lastPhase: HazardPhase = 'Telegraph'

  constructor(options: LaserStrikeOptions) {
    this.id = options.id
    this.scene = options.scene
    this.x = options.x
    this.groundY = options.groundY
    this.worldHeight = options.worldHeight
    this.config = options.config
    this.timing = {
      startTime: options.startTime,
      telegraphMs: options.config.telegraphMs,
      activeMs: options.config.activeMs,
      recoverMs: options.config.recoverMs,
    }

    const lineY = this.groundY + this.config.lineHeight / 2
    this.telegraphLine = this.scene.add
      .rectangle(this.x, lineY, this.config.width, this.config.lineHeight, this.config.telegraphColor)
      .setOrigin(0.5, 0.5)
      .setDepth(this.config.telegraphDepth)

    this.beam = this.scene.add
      .rectangle(this.x, 0, this.config.width, this.worldHeight, this.config.activeColor, this.config.beamAlpha)
      .setOrigin(0.5, 0)
      .setDepth(this.config.beamDepth)
      .setVisible(false)

    this.hitboxRect = new Phaser.Geom.Rectangle(0, 0, this.config.width, this.worldHeight)
  }

  update(now: number, deltaMs: number): void {
    const elapsed = now - this.timing.startTime
    const activeStart = this.timing.telegraphMs
    const recoverStart = activeStart + this.timing.activeMs
    const endTime = recoverStart + this.timing.recoverMs

    if (elapsed < activeStart) {
      this.phase = 'Telegraph'
    } else if (elapsed < recoverStart) {
      this.phase = 'Active'
    } else if (elapsed < endTime) {
      this.phase = 'Recover'
    } else {
      this.phase = 'Done'
    }

    if (this.phase !== this.lastPhase) {
      this.applyPhaseVisuals(this.phase)
      this.lastPhase = this.phase
    }

    if (this.phase === 'Telegraph') {
      const blinkOn = Math.floor(elapsed / this.config.blinkMs) % 2 === 0
      this.telegraphLine.setVisible(blinkOn)
    }

    if (this.phase === 'Active') {
      this.beam.setVisible(true)
      this.hitboxRect.setTo(this.x - this.config.width / 2, 0, this.config.width, this.worldHeight)
      this.hitbox = this.hitboxRect
    } else {
      this.hitbox = null
    }

    void deltaMs
  }

  applyToTarget(target: HazardTarget, now: number): void {
    if (this.phase !== 'Active' || !this.hitbox || this.hasHit) {
      return
    }

    const intersects = Phaser.Geom.Intersects.RectangleToRectangle(this.hitbox, target.hitbox)
    if (!intersects) {
      return
    }

    const didDamage = target.applyDamage(this.config.damage, this.type, now)
    if (didDamage) {
      this.hasHit = true
    }
  }

  isFinished(): boolean {
    return this.phase === 'Done'
  }

  destroy(): void {
    this.telegraphLine.destroy()
    this.beam.destroy()
  }

  private applyPhaseVisuals(phase: HazardPhase): void {
    if (phase === 'Telegraph') {
      this.telegraphLine.setFillStyle(this.config.telegraphColor, 1)
      this.telegraphLine.setVisible(true)
      this.beam.setVisible(false)
    } else if (phase === 'Active') {
      this.telegraphLine.setFillStyle(this.config.activeColor, 1)
      this.telegraphLine.setVisible(true)
      this.beam.setVisible(true)
    } else if (phase === 'Recover') {
      this.telegraphLine.setFillStyle(this.config.recoverColor, this.config.recoverAlpha)
      this.telegraphLine.setVisible(true)
      this.beam.setVisible(false)
    } else {
      this.telegraphLine.setVisible(false)
      this.beam.setVisible(false)
    }
  }
}
