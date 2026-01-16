import Phaser from 'phaser'
import { GAME_CONFIG, WORLD_H, WORLD_W } from '../config/gameConfig'
import { DebugOverlay } from '../debug/DebugOverlay'
import { BULLET_CONFIG } from '../config/bulletConfig'
import { Cowboy } from '../entities/Cowboy'
import { BulletManager } from '../entities/BulletManager'
import { UfoBoss } from '../entities/UfoBoss'
import { ImpactFx } from '../fx/ImpactFx'
import { HazardScheduler } from '../hazards/HazardScheduler'
import { DoubleTap } from '../input/DoubleTap'
import { InputSnapshot } from '../input/InputSnapshot'
import { BackgroundLayers } from './BackgroundLayers'

export class MainScene extends Phaser.Scene {
  private debugOverlay!: DebugOverlay
  private inputSnapshot!: InputSnapshot
  private doubleTap!: DoubleTap
  private cowboy!: Cowboy
  private bullets!: BulletManager
  private ufoBoss!: UfoBoss
  private impactFx!: ImpactFx
  private hazardScheduler!: HazardScheduler
  private background!: BackgroundLayers
  private lastInputEvent = 'None'
  private lastCowboyX = 0
  private nextShotTime = 0

  constructor() {
    super('MainScene')
  }

  create(): void {
    const width = WORLD_W
    const height = WORLD_H
    const groundTop = WORLD_H - GAME_CONFIG.groundHeight

    this.cameras.main.setRoundPixels(true)
    this.cameras.main.setBounds(0, 0, width, height)
    this.addScanlineOverlay(width, height)

    this.inputSnapshot = new InputSnapshot(this)
    this.doubleTap = new DoubleTap()
    this.cowboy = new Cowboy(this, width / 2, groundTop)
    this.bullets = new BulletManager(this)
    this.ufoBoss = new UfoBoss(this, width / 2, groundTop)
    this.impactFx = new ImpactFx(this)
    this.hazardScheduler = new HazardScheduler(this, WORLD_H)
    this.background = new BackgroundLayers(this, width, height, groundTop)
    this.lastCowboyX = this.cowboy.getX()

    this.debugOverlay = new DebugOverlay(this)
    this.debugOverlay.setStatus('Booted')
    this.debugOverlay.setInputEvent(this.lastInputEvent)
  }

  update(_time: number, delta: number): void {
    this.inputSnapshot.update()

    const now = this.time.now
    this.impactFx.update(now)

    if (this.impactFx.isHitstopActive(now)) {
      this.debugOverlay.update()
      return
    }
    const leftPressed = this.inputSnapshot.keysPressed.left
    const rightPressed = this.inputSnapshot.keysPressed.right
    const rollTrigger = {
      left: leftPressed ? this.doubleTap.registerTap('left', now) : false,
      right: rightPressed ? this.doubleTap.registerTap('right', now) : false,
    }

    let newEvent: string | null = null

    // Prioritize roll > shoot > direction events to keep the HUD readable.
    if (rollTrigger.left) {
      newEvent = 'Roll Left'
    } else if (rollTrigger.right) {
      newEvent = 'Roll Right'
    } else if (this.inputSnapshot.keysPressed.shoot) {
      newEvent = 'Shoot'
    } else if (leftPressed) {
      newEvent = 'Left Press'
    } else if (rightPressed) {
      newEvent = 'Right Press'
    } else if (this.inputSnapshot.keysReleased.left) {
      newEvent = 'Left Release'
    } else if (this.inputSnapshot.keysReleased.right) {
      newEvent = 'Right Release'
    } else if (this.inputSnapshot.keysReleased.shoot) {
      newEvent = 'Shoot Release'
    }

    if (newEvent) {
      this.lastInputEvent = newEvent
      this.debugOverlay.setInputEvent(this.lastInputEvent)
    }

    if (!this.inputSnapshot.keysDown.shoot) {
      this.nextShotTime = 0
    }

    if (this.inputSnapshot.keysDown.shoot && this.cowboy.canShoot() && now >= this.nextShotTime) {
      const origin = this.cowboy.getShootOrigin()
      this.bullets.spawn(origin.x, origin.y)
      this.nextShotTime = now + BULLET_CONFIG.fireRateMs
    }

    this.cowboy.update(this.inputSnapshot, rollTrigger, now, delta)
    this.ufoBoss.update(now, delta, this.hazardScheduler, this.cowboy.getX())
    const cowboyX = this.cowboy.getX()
    const deltaX = cowboyX - this.lastCowboyX
    this.background.update(deltaX)
    this.lastCowboyX = cowboyX

    const cowboyHitbox = this.cowboy.getHitbox()
    this.hazardScheduler.update(now, delta, {
      hitbox: cowboyHitbox,
      applyDamage: (amount, source, timestamp) => this.cowboy.applyDamage(amount, source, timestamp),
      applyMagnetGrab: (source, timestamp) => this.cowboy.applyMagnetGrab(source, timestamp),
    })

    this.bullets.update(now, delta, this.ufoBoss.getHitbox(), (amount, source, timestamp) =>
      this.ufoBoss.takeDamage(amount, source, timestamp),
    )

    this.debugOverlay.setCowboyInfo(this.cowboy.getDebugInfo(now))
    this.debugOverlay.setUfoInfo(this.ufoBoss.getHudInfo())
    this.debugOverlay.update()
  }

  private addScanlineOverlay(width: number, height: number): void {
    const key = 'scanline-overlay'

    if (!this.textures.exists(key)) {
      const texture = this.textures.createCanvas(key, 2, 2)
      if (!texture) {
        return
      }
      const ctx = texture.getContext()

      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)'
      ctx.fillRect(0, 0, 2, 1)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.fillRect(0, 1, 2, 1)
      texture.refresh()
    }

    this.add
      .tileSprite(0, 0, width, height, key)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(900)
      .setAlpha(0.45)
  }
}
