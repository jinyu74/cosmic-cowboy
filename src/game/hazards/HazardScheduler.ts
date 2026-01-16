import type Phaser from 'phaser'
import { HAZARD_CONFIG } from '../config/hazardConfig'
import type { Hazard, HazardTarget } from './Hazard'
import { LaserStrike } from './LaserStrike'
import { Magnet } from './Magnet'

export class HazardScheduler {
  private readonly scene: Phaser.Scene
  private readonly worldHeight: number
  private hazards: Hazard[] = []
  private nextId = 1

  constructor(scene: Phaser.Scene, worldHeight: number) {
    this.scene = scene
    this.worldHeight = worldHeight
  }

  spawnLaserStrike(x: number, groundY: number, now: number, timingScale = 1): void {
    const base = HAZARD_CONFIG.laserStrike
    const config = {
      ...base,
      telegraphMs: Math.round(base.telegraphMs * timingScale),
      activeMs: Math.round(base.activeMs * timingScale),
      recoverMs: Math.round(base.recoverMs * timingScale),
    }

    const hazard = new LaserStrike({
      id: `laser-${this.nextId++}`,
      scene: this.scene,
      x,
      groundY,
      worldHeight: this.worldHeight,
      startTime: now,
      config,
    })

    this.hazards.push(hazard)
  }

  spawnMagnet(x: number, groundY: number, now: number, timingScale = 1): void {
    const base = HAZARD_CONFIG.magnet
    const config = {
      ...base,
      telegraphMs: Math.round(base.telegraphMs * timingScale),
      activeMs: Math.round(base.activeMs * timingScale),
      recoverMs: Math.round(base.recoverMs * timingScale),
    }

    const hazard = new Magnet({
      id: `magnet-${this.nextId++}`,
      scene: this.scene,
      x,
      groundY,
      startTime: now,
      config,
    })

    this.hazards.push(hazard)
  }

  update(now: number, deltaMs: number, target: HazardTarget): void {
    const remaining: Hazard[] = []

    for (const hazard of this.hazards) {
      hazard.update(now, deltaMs)
      hazard.applyToTarget(target, now)

      if (hazard.isFinished()) {
        hazard.destroy()
      } else {
        remaining.push(hazard)
      }
    }

    this.hazards = remaining
  }

  clear(): void {
    for (const hazard of this.hazards) {
      hazard.destroy()
    }
    this.hazards = []
  }
}
