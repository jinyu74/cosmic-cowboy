import Phaser from 'phaser'
import { onDamage, type DamageEvent } from '../events/EventBus'

export class ImpactFx {
  private readonly scene: Phaser.Scene
  private readonly flash: Phaser.GameObjects.Rectangle
  private hitstopUntil = 0
  private flashUntil = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    this.flash = scene.add
      .rectangle(0, 0, scene.scale.width, scene.scale.height, 0xffffff, 0.45)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(890)
      .setVisible(false)

    onDamage((event) => this.handleDamage(event))
  }

  update(now: number): void {
    if (now < this.flashUntil) {
      this.flash.setVisible(true)
    } else {
      this.flash.setVisible(false)
    }
  }

  isHitstopActive(now: number): boolean {
    return now < this.hitstopUntil
  }

  private handleDamage(_event: DamageEvent): void {
    const now = this.scene.time.now
    this.hitstopUntil = Math.max(this.hitstopUntil, now + 50)
    this.flashUntil = Math.max(this.flashUntil, now + 32)

    this.scene.cameras.main.shake(90, 0.018)
  }
}
