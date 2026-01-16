import Phaser from 'phaser'
import { WORLD_BOUNDS_PAD, WORLD_W } from '../config/gameConfig'
import { HAZARD_CONFIG } from '../config/hazardConfig'
import type { StageConfig } from '../config/stageConfig'
import { UFO_CONFIG } from '../config/ufoConfig'
import { emitDamage, emitUfoCrashImpactDone } from '../events/EventBus'
import { UfoFSM, type UfoState } from '../fsm/UfoFSM'
import type { HazardScheduler } from '../hazards/HazardScheduler'

type UfoPhase = 'P1' | 'P2' | 'P3' | 'Death'

type PhaseConfig = {
  moveSpeed: number
  attackIntervalMs: number
  laserWeight: number
  magnetWeight: number
  timingScale: number
}

type SparkParticle = {
  sprite: Phaser.GameObjects.Rectangle
  life: number
  maxLife: number
  vx: number
  vy: number
}

export class UfoBoss {
  private readonly fsm = new UfoFSM()
  private readonly container: Phaser.GameObjects.Container
  private readonly body: Phaser.GameObjects.Rectangle
  private readonly ring: Phaser.GameObjects.Rectangle
  private readonly dome: Phaser.GameObjects.Ellipse
  private readonly smokePuffs: Phaser.GameObjects.Ellipse[]
  private readonly crashSmoke: Phaser.GameObjects.Ellipse[]
  private readonly sparks: SparkParticle[]
  private readonly fire: Phaser.GameObjects.Rectangle
  private readonly groundY: number
  private readonly hoverY: number
  private readonly patrolMinX: number
  private readonly patrolMaxX: number

  private readonly stageConfig: StageConfig
  private hp: number
  private phase: UfoPhase = 'P1'
  private direction: -1 | 1 = 1
  private nextAttackTime = 0
  private recoverEndsAt = 0
  private magnetDropEndsAt = 0
  private enrageTriggered = false
  private crashImpactY = 0
  private nextSparkTime = 0
  private sparkIndex = 0
  private readonly hitbox: Phaser.Geom.Rectangle
  private crashImpactEmitted = false

  private readonly baseOffsets = {
    bodyX: 0,
    bodyY: 0,
    ringX: 0,
    ringY: 10,
    domeX: 0,
    domeY: -18,
    smokeX: 0,
    smokeY: -30,
  }

  constructor(scene: Phaser.Scene, x: number, groundY: number, stageConfig: StageConfig) {
    this.stageConfig = stageConfig
    this.hp = stageConfig.ufoMaxHp
    this.groundY = groundY
    this.hoverY = UFO_CONFIG.hoverY

    this.container = scene.add.container(x, UFO_CONFIG.spawn.startY)

    this.body = scene.add.rectangle(0, 0, 140, 32, 0x6c7a89).setOrigin(0.5, 0.5)
    this.ring = scene.add.rectangle(0, 12, 164, 10, 0x9fb4c9).setOrigin(0.5, 0.5)
    this.dome = scene.add.ellipse(0, -18, 78, 40, 0xaad5ff).setOrigin(0.5, 0.5)

    this.fire = scene.add.rectangle(0, 10, 18, 26, 0xff7a18).setOrigin(0.5, 0)
    this.fire.setVisible(false)

    this.smokePuffs = [0, 1, 2].map((index) =>
      scene.add.ellipse(index * 14 - 14, -28, 14, 10, 0x8f98a0).setOrigin(0.5, 0.5).setAlpha(0),
    )

    this.crashSmoke = [0, 1, 2, 3, 4].map((index) =>
      scene.add.ellipse(index * 10 - 20, -24, 16, 10, 0x6f7884).setOrigin(0.5, 0.5).setAlpha(0),
    )

    this.sparks = Array.from({ length: 10 }, () => ({
      sprite: scene.add.rectangle(0, 0, 2, 2, 0xffd27d, 1).setOrigin(0.5, 0.5).setAlpha(0),
      life: 0,
      maxLife: 0,
      vx: 0,
      vy: 0,
    }))

    this.container.add([
      this.body,
      this.ring,
      this.dome,
      this.fire,
      ...this.smokePuffs,
      ...this.crashSmoke,
      ...this.sparks.map((spark) => spark.sprite),
    ])

    this.patrolMinX = WORLD_BOUNDS_PAD
    this.patrolMaxX = WORLD_W - WORLD_BOUNDS_PAD

    this.crashImpactY = this.groundY - 6
    this.hitbox = new Phaser.Geom.Rectangle(0, 0, this.ring.width, 48)
    this.fsm.setState('SpawnIn', scene.time.now)
  }

  getState(): UfoState {
    return this.fsm.getState()
  }

  getHudInfo(): { hp: number; maxHp: number; phase: UfoPhase; state: UfoState } {
    return {
      hp: this.hp,
      maxHp: this.stageConfig.ufoMaxHp,
      phase: this.phase,
      state: this.fsm.getState(),
    }
  }

  getHpRatio(): number {
    return Phaser.Math.Clamp(this.hp / this.stageConfig.ufoMaxHp, 0, 1)
  }

  getHitbox(): Phaser.Geom.Rectangle {
    const width = this.ring.width
    const height = 48
    const x = this.container.x - width / 2
    const y = this.container.y - height / 2
    this.hitbox.setTo(x, y, width, height)
    return this.hitbox
  }

  takeDamage(amount: number, source: string, now: number): boolean {
    return this.applyDamage(amount, source, now)
  }

  destroy(): void {
    this.container.destroy(true)
  }

  applyDamage(amount: number, source: string, now: number): boolean {
    if (amount <= 0 || this.fsm.is('CrashStart') || this.fsm.is('CrashFall') || this.fsm.is('CrashImpact')) {
      return false
    }

    this.hp = Math.max(0, this.hp - amount)
    emitDamage({ amount, source, target: 'UfoBoss', x: this.container.x, y: this.container.y })

    if (this.hp === 0) {
      this.startCrash(now)
    }

    void source
    return true
  }

  update(now: number, deltaMs: number, hazards: HazardScheduler, targetX: number): void {
    const hpRatio = this.getHpRatio()
    const phaseInfo = this.resolvePhase(hpRatio)

    if (phaseInfo.phase !== this.phase) {
      this.phase = phaseInfo.phase
    }

    if (!this.enrageTriggered && hpRatio <= UFO_CONFIG.enrage.thresholdRatio && this.phase !== 'Death') {
      this.enrageTriggered = true
      this.fsm.setState('Enrage', now)
    }

    if (this.phase === 'Death') {
      this.updateCrash(now, deltaMs)
      this.applyDeform(1, now, deltaMs, true)
      return
    }

    if (this.fsm.is('SpawnIn')) {
      this.updateSpawnIn(now, phaseInfo.config)
    } else if (this.fsm.is('Patrol')) {
      this.updatePatrol(now, deltaMs, phaseInfo.config, hazards, targetX)
    } else if (this.fsm.is('LaserTelegraph')) {
      const telegraphMs = HAZARD_CONFIG.laserStrike.telegraphMs * this.stageConfig.laserTelegraphScale
      if (this.fsm.getStateDuration(now) >= this.scaleTiming(telegraphMs, phaseInfo.config)) {
        this.fsm.setState('LaserFire', now)
      }
    } else if (this.fsm.is('LaserFire')) {
      if (this.fsm.getStateDuration(now) >= this.scaleTiming(HAZARD_CONFIG.laserStrike.activeMs, phaseInfo.config)) {
        this.recoverEndsAt = now + this.scaleTiming(HAZARD_CONFIG.laserStrike.recoverMs, phaseInfo.config)
        this.fsm.setState('Recover', now)
      }
    } else if (this.fsm.is('MagnetTelegraph')) {
      const telegraphMs = HAZARD_CONFIG.magnet.telegraphMs * this.stageConfig.magnetTelegraphScale
      if (this.fsm.getStateDuration(now) >= this.scaleTiming(telegraphMs, phaseInfo.config)) {
        this.fsm.setState('MagnetLift', now)
      }
    } else if (this.fsm.is('MagnetLift')) {
      if (this.fsm.getStateDuration(now) >= this.scaleTiming(HAZARD_CONFIG.magnet.activeMs, phaseInfo.config)) {
        this.magnetDropEndsAt = now + this.scaleTiming(HAZARD_CONFIG.magnet.recoverMs, phaseInfo.config)
        this.fsm.setState('MagnetDrop', now)
      }
    } else if (this.fsm.is('MagnetDrop')) {
      if (now >= this.magnetDropEndsAt) {
        this.recoverEndsAt = now + UFO_CONFIG.attackRecoverMs
        this.fsm.setState('Recover', now)
      }
    } else if (this.fsm.is('Recover')) {
      if (now >= this.recoverEndsAt) {
        this.nextAttackTime = now + phaseInfo.config.attackIntervalMs
        this.fsm.setState('Patrol', now)
      }
    } else if (this.fsm.is('Enrage')) {
      if (this.fsm.getStateDuration(now) >= UFO_CONFIG.enrage.durationMs) {
        this.nextAttackTime = now + phaseInfo.config.attackIntervalMs
        this.fsm.setState('Patrol', now)
      }
    } else if (this.isCrashState()) {
      this.updateCrash(now, deltaMs)
    }

    this.applyDeform(1 - hpRatio, now, deltaMs, this.isCrashState())
    this.updateHover()
  }

  private updateSpawnIn(now: number, phaseConfig: PhaseConfig): void {
    const t = Phaser.Math.Clamp(this.fsm.getStateDuration(now) / UFO_CONFIG.spawn.durationMs, 0, 1)
    const y = Phaser.Math.Linear(UFO_CONFIG.spawn.startY, this.hoverY, t)
    this.container.setY(y)

    if (t >= 1) {
      this.nextAttackTime = now + phaseConfig.attackIntervalMs
      this.fsm.setState('Patrol', now)
    }
  }

  private updatePatrol(
    now: number,
    deltaMs: number,
    phaseConfig: PhaseConfig,
    hazards: HazardScheduler,
    targetX: number,
  ): void {
    const distance = (phaseConfig.moveSpeed * deltaMs) / 1000
    const nextX = this.container.x + this.direction * distance

    if (nextX <= this.patrolMinX) {
      this.container.setX(this.patrolMinX)
      this.direction = 1
    } else if (nextX >= this.patrolMaxX) {
      this.container.setX(this.patrolMaxX)
      this.direction = -1
    } else {
      this.container.setX(nextX)
    }

    if (now >= this.nextAttackTime) {
      this.startAttack(now, phaseConfig, hazards, targetX)
    }
  }

  private startAttack(now: number, phaseConfig: PhaseConfig, hazards: HazardScheduler, targetX: number): void {
    const roll = Math.random() * (phaseConfig.laserWeight + phaseConfig.magnetWeight)
    const useLaser = roll < phaseConfig.laserWeight
    const timingScale = phaseConfig.timingScale
    const clampedX = Phaser.Math.Clamp(targetX, WORLD_BOUNDS_PAD, WORLD_W - WORLD_BOUNDS_PAD)

    if (useLaser) {
      hazards.spawnLaserStrike(clampedX, this.groundY, now, timingScale, this.stageConfig.laserTelegraphScale)
      this.fsm.setState('LaserTelegraph', now)
    } else {
      hazards.spawnMagnet(clampedX, this.groundY, now, timingScale, this.stageConfig.magnetTelegraphScale)
      this.fsm.setState('MagnetTelegraph', now)
    }
  }

  private startCrash(now: number): void {
    if (this.isCrashState() || this.fsm.is('StageClear')) {
      return
    }

    this.fsm.setState('CrashStart', now)
    this.fire.setVisible(true)
  }

  private updateCrash(now: number, deltaMs: number): void {
    if (this.fsm.is('CrashStart')) {
      if (this.fsm.getStateDuration(now) >= UFO_CONFIG.crash.startMs) {
        this.fsm.setState('CrashFall', now)
      }
      return
    }

    if (this.fsm.is('CrashFall')) {
      const distance = (UFO_CONFIG.crash.fallSpeed * deltaMs) / 1000
      const nextY = this.container.y + distance

      if (nextY >= this.crashImpactY) {
        this.container.setY(this.crashImpactY)
        this.fsm.setState('CrashImpact', now)
      } else {
        this.container.setY(nextY)
      }
      return
    }

    if (this.fsm.is('CrashImpact')) {
      if (this.fsm.getStateDuration(now) >= UFO_CONFIG.crash.impactMs) {
        this.fsm.setState('StageClear', now)
        if (!this.crashImpactEmitted) {
          this.crashImpactEmitted = true
          emitUfoCrashImpactDone()
        }
      }
    }
  }

  private applyDeform(deform: number, now: number, deltaMs: number, isCrashing: boolean): void {
    const clampDeform = Phaser.Math.Clamp(deform, 0, 1)
    const phaseKick = clampDeform >= 0.6 ? 0.25 : clampDeform >= 0.3 ? 0.12 : 0
    const intensity = Phaser.Math.Clamp(clampDeform + phaseKick, 0, 1)
    const wobble = Math.sin(now / 180) * intensity * UFO_CONFIG.deform.noisePx
    const skew = intensity * UFO_CONFIG.deform.skewOffset
    const jitterMagnitude = Math.round(intensity * 2 + (isCrashing ? 2 : 0))
    const jitterX = jitterMagnitude > 0 ? Phaser.Math.Between(-jitterMagnitude, jitterMagnitude) : 0
    const jitterY = jitterMagnitude > 0 ? Phaser.Math.Between(-jitterMagnitude, jitterMagnitude) : 0

    const baseScaleX = 1 + intensity * UFO_CONFIG.deform.maxScaleX
    const baseScaleY = 1 + intensity * UFO_CONFIG.deform.maxScaleY
    const enragePulse =
      this.fsm.is('Enrage') ? 1 + Math.sin(now / 90) * (UFO_CONFIG.enrage.pulseScale - 1) : 1

    this.container.setScale(baseScaleX * enragePulse, baseScaleY * enragePulse)

    this.body.setPosition(
      Math.round(this.baseOffsets.bodyX - skew + jitterX),
      Math.round(this.baseOffsets.bodyY + wobble + jitterY),
    )
    this.ring.setPosition(
      Math.round(this.baseOffsets.ringX + jitterX * 0.5),
      Math.round(this.baseOffsets.ringY + wobble * 0.6 + jitterY * 0.4),
    )
    this.dome.setPosition(
      Math.round(this.baseOffsets.domeX + skew + jitterX * 0.6),
      Math.round(this.baseOffsets.domeY + wobble * 0.8 + jitterY * 0.6),
    )

    const smokeAlpha = isCrashing ? 0.95 : intensity * UFO_CONFIG.deform.smokeAlpha
    const rise = UFO_CONFIG.deform.smokeRisePx + Math.round(intensity * 6)

    for (let i = 0; i < this.smokePuffs.length; i += 1) {
      const puff = this.smokePuffs[i]
      const t = ((now / 380) + i * 0.33) % 1
      puff.setAlpha(smokeAlpha * (0.55 + 0.45 * Math.sin(now / 120 + i)))
      puff.setScale(1 + intensity * 0.5)
      puff.setPosition(
        Math.round(this.baseOffsets.smokeX + (i - 1) * 16 + jitterX * 0.3),
        Math.round(this.baseOffsets.smokeY - t * rise + jitterY * 0.2),
      )
    }

    this.updateCrashSmoke(now, intensity, isCrashing)
    this.updateSparks(now, deltaMs, intensity, isCrashing)

    if (isCrashing) {
      const fireJitter = 1 + Math.sin(now / 80) * 0.25
      this.fire.setScale(fireJitter, 1 + Math.sin(now / 60) * 0.35)
      this.fire.setAlpha(0.8 + Math.sin(now / 90) * 0.2)
    }
  }

  private updateCrashSmoke(now: number, intensity: number, isCrashing: boolean): void {
    for (let i = 0; i < this.crashSmoke.length; i += 1) {
      const puff = this.crashSmoke[i]
      if (!isCrashing) {
        puff.setAlpha(0)
        continue
      }

      const t = ((now / 260) + i * 0.22) % 1
      const rise = 10 + intensity * 18
      const offsetX = (i - 2) * 12 + Phaser.Math.Between(-1, 1)
      const offsetY = -t * rise - i * 4
      puff.setAlpha((0.5 + 0.5 * Math.sin(now / 140 + i)) * (0.6 + intensity * 0.4))
      puff.setScale(1.1 + intensity * 0.6)
      puff.setPosition(Math.round(offsetX), Math.round(this.baseOffsets.smokeY + offsetY))
    }
  }

  private updateSparks(now: number, deltaMs: number, intensity: number, isCrashing: boolean): void {
    const baseInterval = Phaser.Math.Linear(220, 70, intensity)
    const interval = isCrashing ? baseInterval * 0.5 : baseInterval

    if (now >= this.nextSparkTime) {
      this.spawnSpark(intensity, isCrashing)
      this.nextSparkTime = now + interval
    }

    for (const spark of this.sparks) {
      if (spark.life <= 0) {
        continue
      }

      spark.life -= deltaMs
      const progress = spark.life / spark.maxLife
      spark.sprite.x = Math.round(spark.sprite.x + (spark.vx * deltaMs) / 1000)
      spark.sprite.y = Math.round(spark.sprite.y + (spark.vy * deltaMs) / 1000)
      spark.sprite.setAlpha(Phaser.Math.Clamp(progress, 0, 1))

      if (spark.life <= 0) {
        spark.sprite.setAlpha(0)
      }
    }
  }

  private spawnSpark(intensity: number, isCrashing: boolean): void {
    const spark = this.sparks[this.sparkIndex]
    this.sparkIndex = (this.sparkIndex + 1) % this.sparks.length

    const life = Phaser.Math.Between(120, 220)
    const spread = isCrashing ? 34 : 24
    const offsetX = Phaser.Math.Between(-spread, spread)
    const offsetY = Phaser.Math.Between(-22, 6)
    const speed = Phaser.Math.Linear(60, 140, intensity)
    const angle = Phaser.Math.DegToRad(Phaser.Math.Between(210, 330))

    spark.life = life
    spark.maxLife = life
    spark.vx = Math.cos(angle) * speed
    spark.vy = Math.sin(angle) * speed
    spark.sprite.setPosition(Math.round(offsetX), Math.round(offsetY))
    spark.sprite.setAlpha(0.9)
    spark.sprite.setScale(1 + intensity * 0.5, 1 + intensity * 0.2)
  }

  private updateHover(): void {
    if (this.fsm.is('CrashFall') || this.fsm.is('CrashImpact') || this.fsm.is('StageClear')) {
      return
    }

    if (!this.fsm.is('SpawnIn')) {
      this.container.setY(this.hoverY)
    }
  }

  private resolvePhase(hpRatio: number): { phase: UfoPhase; config: PhaseConfig } {
    const p1 = UFO_CONFIG.phases.p1
    const p2 = UFO_CONFIG.phases.p2
    const p3 = UFO_CONFIG.phases.p3

    if (hpRatio <= 0) {
      return { phase: 'Death', config: p3 }
    }

    if (hpRatio >= p1.minRatio) {
      return { phase: 'P1', config: this.applyStageConfig(p1) }
    }

    if (hpRatio >= p2.minRatio) {
      return { phase: 'P2', config: this.applyStageConfig(p2) }
    }

    return { phase: 'P3', config: this.applyStageConfig(p3) }
  }

  private applyStageConfig(base: PhaseConfig): PhaseConfig {
    const scaledMoveSpeed = base.moveSpeed * this.stageConfig.moveSpeedScale
    const scaledInterval = Math.round(base.attackIntervalMs * this.stageConfig.attackIntervalScale)
    const magnetWeight = Phaser.Math.Clamp(base.magnetWeight + this.stageConfig.magnetWeightBias, 0.05, 0.95)
    const laserWeight = Phaser.Math.Clamp(base.laserWeight - this.stageConfig.magnetWeightBias, 0.05, 0.95)
    const total = magnetWeight + laserWeight

    return {
      moveSpeed: scaledMoveSpeed,
      attackIntervalMs: scaledInterval,
      laserWeight: laserWeight / total,
      magnetWeight: magnetWeight / total,
      timingScale: base.timingScale,
    }
  }

  private scaleTiming(value: number, phaseConfig: PhaseConfig): number {
    return Math.round(value * phaseConfig.timingScale)
  }

  private isCrashState(): boolean {
    return this.fsm.is('CrashStart') || this.fsm.is('CrashFall') || this.fsm.is('CrashImpact')
  }
}
