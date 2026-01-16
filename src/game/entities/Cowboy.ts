import Phaser from 'phaser'
import { COWBOY_CONFIG } from '../config/cowboyConfig'
import { WORLD_BOUNDS_PAD, WORLD_W } from '../config/gameConfig'
import { emitCowboyDead, emitDamage } from '../events/EventBus'
import { CowboyFSM, type CowboyState } from '../fsm/CowboyFSM'
import type { InputSnapshot } from '../input/InputSnapshot'

export type RollTrigger = {
  left: boolean
  right: boolean
}

export type CowboyDebugInfo = {
  state: CowboyState
  hp: number
  maxHp: number
  isInvincible: boolean
  rollCooldownRemaining: number
}

export class Cowboy {
  private readonly fsm = new CowboyFSM()
  private readonly sprite: Phaser.GameObjects.Rectangle
  private readonly hitbox: Phaser.Geom.Rectangle
  private readonly groundY: number
  private hp: number = COWBOY_CONFIG.maxHp
  private invincibleUntil = 0
  private rollEndsAt = 0
  private rollCooldownUntil = 0
  private rollDirection: -1 | 1 = 1
  private hitRecoverAt = 0
  private magnetLiftStartTime = 0
  private magnetLiftEndTime = 0
  private magnetLiftStartY = 0
  private magnetLiftTargetY = 0
  private fallDamageApplied = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.rectangle(x, y, 22, 34, 0xe7d6b6).setOrigin(0.5, 1)
    this.hitbox = new Phaser.Geom.Rectangle(0, 0, this.sprite.width, this.sprite.height)
    this.groundY = y
  }

  getDebugInfo(now: number): CowboyDebugInfo {
    return {
      state: this.fsm.getState(),
      hp: this.hp,
      maxHp: COWBOY_CONFIG.maxHp,
      isInvincible: this.isInvincible(now),
      rollCooldownRemaining: Math.max(0, Math.ceil(this.rollCooldownUntil - now)),
    }
  }

  getHitbox(): Phaser.Geom.Rectangle {
    const width = this.sprite.width
    const height = this.sprite.height
    const x = this.sprite.x - width / 2
    const y = this.sprite.y - height

    this.hitbox.setTo(x, y, width, height)
    return this.hitbox
  }

  getX(): number {
    return this.sprite.x
  }

  getShootOrigin(): { x: number; y: number } {
    return {
      x: this.sprite.x,
      y: this.sprite.y - this.sprite.height + 2,
    }
  }

  canShoot(): boolean {
    return !this.fsm.is('Roll') && !this.fsm.is('Dead') && !this.fsm.is('MagnetLifted') && !this.fsm.is('Falling')
  }

  destroy(): void {
    this.sprite.destroy()
  }

  update(input: InputSnapshot, rollTrigger: RollTrigger, now: number, deltaMs: number): void {
    if (this.fsm.is('Dead')) {
      return
    }

    if (this.fsm.is('MagnetLifted')) {
      this.updateMagnetLift(now)
      return
    }

    if (this.fsm.is('Falling')) {
      this.updateFalling(now, deltaMs)
      return
    }

    if (this.fsm.is('Roll')) {
      if (now >= this.rollEndsAt) {
        this.rollEndsAt = 0
        this.exitToNeutralState(input, now)
      } else {
        this.move(this.rollDirection, deltaMs)
        return
      }
    }

    if (this.fsm.is('Hit')) {
      if (now < this.hitRecoverAt) {
        return
      }

      this.hitRecoverAt = 0
      this.exitToNeutralState(input, now)
    }

    if (this.shouldStartRoll(rollTrigger, now)) {
      const direction = rollTrigger.left ? -1 : 1
      this.startRoll(direction, now)
      return
    }

    const leftDown = input.keysDown.left
    const rightDown = input.keysDown.right
    const shootDown = input.keysDown.shoot
    const moveDirection = leftDown === rightDown ? 0 : leftDown ? -1 : 1

    if (shootDown) {
      this.fsm.setState('Shoot', now)
    } else if (moveDirection !== 0) {
      this.fsm.setState('Move', now)
    } else {
      this.fsm.setState('Idle', now)
    }

    if (moveDirection !== 0) {
      this.move(moveDirection, deltaMs)
    }
  }

  applyDamage(amount: number, source: string, now: number): boolean {
    if (this.fsm.is('Dead') || this.isInvincible(now)) {
      return false
    }

    void source

    const nextHp = Math.max(0, this.hp - amount)
    this.hp = nextHp

    emitDamage({ amount, source, target: 'Cowboy', x: this.sprite.x, y: this.sprite.y })

    if (nextHp === 0) {
      this.fsm.setState('Dead', now)
      emitCowboyDead()
      return true
    }

    this.fsm.setState('Hit', now)
    this.hitRecoverAt = now + COWBOY_CONFIG.hitStunMs
    return true
  }

  applyMagnetGrab(source: string, now: number): boolean {
    if (this.fsm.is('Dead') || this.fsm.is('Roll')) {
      return false
    }

    if (this.fsm.is('MagnetLifted') || this.fsm.is('Falling')) {
      return false
    }

    this.fsm.setState('MagnetLifted', now)
    this.magnetLiftStartTime = now
    this.magnetLiftEndTime = now + COWBOY_CONFIG.magnet.liftMs
    this.magnetLiftStartY = this.sprite.y
    this.magnetLiftTargetY = this.groundY - COWBOY_CONFIG.magnet.liftHeight
    this.fallDamageApplied = false

    void source
    return true
  }

  private isInvincible(now: number): boolean {
    return now < this.invincibleUntil
  }

  private shouldStartRoll(rollTrigger: RollTrigger, now: number): boolean {
    return (rollTrigger.left || rollTrigger.right) && now >= this.rollCooldownUntil
  }

  private startRoll(direction: -1 | 1, now: number): void {
    this.fsm.setState('Roll', now)
    this.rollDirection = direction
    this.rollEndsAt = now + COWBOY_CONFIG.roll.durationMs
    this.invincibleUntil = now + COWBOY_CONFIG.roll.invincibleMs
    this.rollCooldownUntil = now + COWBOY_CONFIG.roll.cooldownMs
  }

  private exitToNeutralState(input: InputSnapshot, now: number): void {
    const leftDown = input.keysDown.left
    const rightDown = input.keysDown.right
    const shootDown = input.keysDown.shoot
    const moveDirection = leftDown === rightDown ? 0 : leftDown ? -1 : 1

    if (shootDown) {
      this.fsm.setState('Shoot', now)
    } else if (moveDirection !== 0) {
      this.fsm.setState('Move', now)
    } else {
      this.fsm.setState('Idle', now)
    }
  }

  private move(direction: -1 | 1, deltaMs: number): void {
    const distance = (COWBOY_CONFIG.moveSpeed * deltaMs) / 1000
    const nextX = this.sprite.x + direction * distance
    const minX = WORLD_BOUNDS_PAD
    const maxX = WORLD_W - WORLD_BOUNDS_PAD
    const clamped = Phaser.Math.Clamp(nextX, minX, maxX)
    this.sprite.setX(clamped)
  }

  private updateMagnetLift(now: number): void {
    const duration = COWBOY_CONFIG.magnet.liftMs
    const t = duration > 0 ? Phaser.Math.Clamp((now - this.magnetLiftStartTime) / duration, 0, 1) : 1
    const nextY = Phaser.Math.Linear(this.magnetLiftStartY, this.magnetLiftTargetY, t)
    this.sprite.setY(nextY)

    if (now >= this.magnetLiftEndTime) {
      this.fsm.setState('Falling', now)
    }
  }

  private updateFalling(now: number, deltaMs: number): void {
    const distance = (COWBOY_CONFIG.magnet.fallSpeed * deltaMs) / 1000
    const nextY = this.sprite.y + distance

    if (nextY >= this.groundY) {
      this.sprite.setY(this.groundY)

      if (!this.fallDamageApplied) {
        this.fallDamageApplied = true
        this.applyDamage(COWBOY_CONFIG.magnet.fallDamage, 'MagnetDrop', now)
      }

      if (!this.fsm.is('Dead') && this.fsm.is('Falling')) {
        this.fsm.setState('Idle', now)
      }
    } else {
      this.sprite.setY(nextY)
    }
  }
}
