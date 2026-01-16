import Phaser from 'phaser'
import { GAME_CONFIG, WORLD_H, WORLD_W } from '../config/gameConfig'
import { BULLET_CONFIG } from '../config/bulletConfig'
import { DebugOverlay } from '../debug/DebugOverlay'
import { GameFlowState } from '../flow/GameFlowState'
import { onCowboyDead } from '../events/EventBus'
import { Cowboy } from '../entities/Cowboy'
import { BulletManager } from '../entities/BulletManager'
import { UfoBoss } from '../entities/UfoBoss'
import { ImpactFx } from '../fx/ImpactFx'
import { HazardScheduler } from '../hazards/HazardScheduler'
import { DoubleTap } from '../input/DoubleTap'
import { InputSnapshot } from '../input/InputSnapshot'
import { BackgroundLayers } from './BackgroundLayers'
import { GameOverOverlay } from '../ui/GameOverOverlay'

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
  private gameOverOverlay!: GameOverOverlay
  private flowState: GameFlowState = GameFlowState.Boot
  private stageIndex = 1
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
    this.impactFx = new ImpactFx(this)
    this.hazardScheduler = new HazardScheduler(this, WORLD_H)
    this.background = new BackgroundLayers(this, width, height, groundTop)
    this.gameOverOverlay = new GameOverOverlay(this, width, height, () => this.handleRetry())

    this.debugOverlay = new DebugOverlay(this)
    this.debugOverlay.setStatus('Booted')
    this.debugOverlay.setInputEvent(this.lastInputEvent)

    onCowboyDead(() => this.enterGameOver())

    this.resetStage(1)
    this.flowState = GameFlowState.Playing
    this.debugOverlay.setStatus(`Stage ${this.stageIndex}`)
  }

  update(_time: number, delta: number): void {
    this.inputSnapshot.update()

    const now = this.time.now
    this.impactFx.update(now)

    if (this.impactFx.isHitstopActive(now)) {
      this.debugOverlay.update()
      return
    }

    if (this.flowState !== GameFlowState.Playing) {
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

  private enterGameOver(): void {
    if (this.flowState === GameFlowState.GameOver) {
      return
    }

    this.flowState = GameFlowState.GameOver
    this.debugOverlay.setStatus('Game Over')
    this.gameOverOverlay.show()
    this.hazardScheduler.clear()
    this.bullets.clear()
    this.nextShotTime = 0
  }

  private handleRetry(): void {
    this.stageIndex = 1
    this.resetStage(1)
    this.flowState = GameFlowState.Playing
    this.debugOverlay.setStatus(`Stage ${this.stageIndex}`)
    this.gameOverOverlay.hide()
  }

  private resetStage(stageIndex: number): void {
    const groundTop = WORLD_H - GAME_CONFIG.groundHeight

    this.hazardScheduler.clear()
    this.bullets?.clear()
    this.impactFx.reset()
    this.time.removeAllEvents()

    if (this.cowboy) {
      this.cowboy.destroy()
    }
    if (this.ufoBoss) {
      this.ufoBoss.destroy()
    }

    this.stageIndex = stageIndex

    this.cowboy = new Cowboy(this, WORLD_W / 2, groundTop)
    this.bullets = new BulletManager(this)
    this.ufoBoss = new UfoBoss(this, WORLD_W / 2, groundTop)
    this.lastCowboyX = this.cowboy.getX()
    this.nextShotTime = 0
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
