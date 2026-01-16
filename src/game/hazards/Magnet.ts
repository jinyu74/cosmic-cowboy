import Phaser from 'phaser'
import type { Hazard, HazardPhase, HazardTarget, HazardTiming } from './Hazard'

type MagnetConfig = {
  telegraphMs: number
  activeMs: number
  recoverMs: number
  width: number
  fieldHeight: number
  lineHeight: number
  blinkMs: number
  telegraphColor: number
  activeColor: number
  recoverColor: number
  fieldAlpha: number
  recoverAlpha: number
  lineDepth: number
  fieldDepth: number
}

type MagnetOptions = {
  id: string
  scene: Phaser.Scene
  x: number
  groundY: number
  startTime: number
  config: MagnetConfig
}

export class Magnet implements Hazard {
  readonly id: string
  readonly type = 'Magnet'
  readonly timing: HazardTiming
  phase: HazardPhase = 'Telegraph'
  hitbox: Phaser.Geom.Rectangle | null = null

  private readonly scene: Phaser.Scene
  private readonly x: number
  private readonly groundY: number
  private readonly config: MagnetConfig
  private readonly line: Phaser.GameObjects.Rectangle
  private readonly field: Phaser.GameObjects.Rectangle
  private readonly hitboxRect: Phaser.Geom.Rectangle
  private lastPhase: HazardPhase = 'Telegraph'
  private grabCheckPending = false

  constructor(options: MagnetOptions) {
    this.id = options.id
    this.scene = options.scene
    this.x = options.x
    this.groundY = options.groundY
    this.config = options.config
    this.timing = {
      startTime: options.startTime,
      telegraphMs: options.config.telegraphMs,
      activeMs: options.config.activeMs,
      recoverMs: options.config.recoverMs,
    }

    const lineY = this.groundY + this.config.lineHeight / 2
    this.line = this.scene.add
      .rectangle(this.x, lineY, this.config.width, this.config.lineHeight, this.config.telegraphColor)
      .setOrigin(0.5, 0.5)
      .setDepth(this.config.lineDepth)

    const fieldY = this.groundY - this.config.fieldHeight / 2
    this.field = this.scene.add
      .rectangle(this.x, fieldY, this.config.width, this.config.fieldHeight, this.config.activeColor, this.config.fieldAlpha)
      .setOrigin(0.5, 0.5)
      .setDepth(this.config.fieldDepth)
      .setVisible(false)

    this.hitboxRect = new Phaser.Geom.Rectangle(0, 0, this.config.width, this.config.fieldHeight)
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
      if (this.phase === 'Active') {
        this.grabCheckPending = true
      }
      this.lastPhase = this.phase
    }

    if (this.phase === 'Telegraph') {
      const blinkOn = Math.floor(elapsed / this.config.blinkMs) % 2 === 0
      this.line.setVisible(blinkOn)
    }

    if (this.phase === 'Active') {
      this.field.setVisible(true)
      this.hitboxRect.setTo(
        this.x - this.config.width / 2,
        this.groundY - this.config.fieldHeight,
        this.config.width,
        this.config.fieldHeight,
      )
      this.hitbox = this.hitboxRect
    } else {
      this.hitbox = null
    }

    void deltaMs
  }

  applyToTarget(target: HazardTarget, now: number): void {
    if (this.phase !== 'Active' || !this.hitbox || !this.grabCheckPending) {
      return
    }

    this.grabCheckPending = false

    const intersects = Phaser.Geom.Intersects.RectangleToRectangle(this.hitbox, target.hitbox)
    if (!intersects) {
      return
    }

    target.applyMagnetGrab(this.type, now)
  }

  isFinished(): boolean {
    return this.phase === 'Done'
  }

  destroy(): void {
    this.line.destroy()
    this.field.destroy()
  }

  private applyPhaseVisuals(phase: HazardPhase): void {
    if (phase === 'Telegraph') {
      this.line.setFillStyle(this.config.telegraphColor, 1)
      this.line.setVisible(true)
      this.field.setVisible(false)
    } else if (phase === 'Active') {
      this.line.setFillStyle(this.config.activeColor, 1)
      this.line.setVisible(true)
      this.field.setFillStyle(this.config.activeColor, this.config.fieldAlpha)
      this.field.setVisible(true)
    } else if (phase === 'Recover') {
      this.line.setFillStyle(this.config.recoverColor, this.config.recoverAlpha)
      this.line.setVisible(true)
      this.field.setVisible(false)
    } else {
      this.line.setVisible(false)
      this.field.setVisible(false)
    }
  }
}
