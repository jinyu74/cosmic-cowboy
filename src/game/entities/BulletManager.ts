import Phaser from 'phaser'
import { BULLET_CONFIG } from '../config/bulletConfig'
import { WORLD_H } from '../config/gameConfig'

type Bullet = {
  sprite: Phaser.GameObjects.Rectangle
  hitbox: Phaser.Geom.Rectangle
}

export class BulletManager {
  private readonly scene: Phaser.Scene
  private bullets: Bullet[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  spawn(x: number, y: number): void {
    const sprite = this.scene.add
      .rectangle(x, y, BULLET_CONFIG.width, BULLET_CONFIG.height, BULLET_CONFIG.color)
      .setOrigin(0.5, 1)
      .setDepth(2)
    const hitbox = new Phaser.Geom.Rectangle(0, 0, BULLET_CONFIG.width, BULLET_CONFIG.height)
    this.bullets.push({ sprite, hitbox })
  }

  update(
    now: number,
    deltaMs: number,
    targetHitbox: Phaser.Geom.Rectangle,
    applyDamage: (amount: number, source: string, timestamp: number) => boolean,
  ): void {
    const remaining: Bullet[] = []

    for (const bullet of this.bullets) {
      bullet.sprite.y -= (BULLET_CONFIG.speed * deltaMs) / 1000

      if (bullet.sprite.y + BULLET_CONFIG.height < 0) {
        bullet.sprite.destroy()
        continue
      }

      if (bullet.sprite.y > WORLD_H + BULLET_CONFIG.height) {
        bullet.sprite.destroy()
        continue
      }

      bullet.hitbox.setTo(
        bullet.sprite.x - BULLET_CONFIG.width / 2,
        bullet.sprite.y - BULLET_CONFIG.height,
        BULLET_CONFIG.width,
        BULLET_CONFIG.height,
      )

      const hit = Phaser.Geom.Intersects.RectangleToRectangle(bullet.hitbox, targetHitbox)
      if (hit) {
        const didDamage = applyDamage(BULLET_CONFIG.damage, 'Bullet', now)
        if (didDamage) {
          bullet.sprite.destroy()
          continue
        }
      }

      remaining.push(bullet)
    }

    this.bullets = remaining
  }

  clear(): void {
    for (const bullet of this.bullets) {
      bullet.sprite.destroy()
    }
    this.bullets = []
  }
}
