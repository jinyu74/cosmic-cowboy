import Phaser from 'phaser'
import { GAME_CONFIG } from '../config/gameConfig'

type DustParticle = {
  sprite: Phaser.GameObjects.Rectangle
  speed: number
}

export class BackgroundLayers {
  private readonly scene: Phaser.Scene
  private readonly width: number
  private readonly height: number
  private readonly groundTop: number
  private readonly sky: Phaser.GameObjects.TileSprite
  private readonly mountains: Phaser.GameObjects.TileSprite
  private readonly ground: Phaser.GameObjects.TileSprite
  private readonly dust: DustParticle[]
  private skyOffset = 0
  private mountainOffset = 0
  private groundOffset = 0

  constructor(scene: Phaser.Scene, width: number, height: number, groundTop: number) {
    this.scene = scene
    this.width = width
    this.height = height
    this.groundTop = groundTop

    this.ensureSkyTexture()
    this.ensureMountainTexture()
    this.ensureGroundTexture()

    this.sky = scene.add
      .tileSprite(0, 0, width, height, 'bg-sky')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-20)

    const mountainHeight = 72
    this.mountains = scene.add
      .tileSprite(0, this.groundTop - mountainHeight, width, mountainHeight, 'bg-mountains')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-15)

    this.ground = scene.add
      .tileSprite(0, this.groundTop, width, GAME_CONFIG.groundHeight, 'bg-ground')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-10)

    this.dust = this.spawnDustParticles(10)
  }

  update(deltaX: number): void {
    const snappedDelta = Math.round(deltaX)

    if (snappedDelta !== 0) {
      this.skyOffset -= snappedDelta * 0.08
      this.mountainOffset -= snappedDelta * 0.3
      this.groundOffset -= snappedDelta * 0.9
    }

    this.sky.tilePositionX = Math.round(this.skyOffset)
    this.mountains.tilePositionX = Math.round(this.mountainOffset)
    this.ground.tilePositionX = Math.round(this.groundOffset)

    if (snappedDelta === 0) {
      return
    }

    for (const particle of this.dust) {
      const drift = snappedDelta * (0.8 + particle.speed)
      particle.sprite.x = Math.round(particle.sprite.x - drift)

      if (particle.sprite.x < -4) {
        particle.sprite.x = this.width + Phaser.Math.Between(4, 20)
      } else if (particle.sprite.x > this.width + 4) {
        particle.sprite.x = -Phaser.Math.Between(4, 20)
      }
    }
  }

  private ensureSkyTexture(): void {
    const key = 'bg-sky'
    if (this.scene.textures.exists(key)) {
      return
    }

    const texture = this.scene.textures.createCanvas(key, this.width, this.height)
    if (!texture) {
      return
    }

    const ctx = texture.getContext()
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#0a0f1f')
    gradient.addColorStop(0.6, '#141c33')
    gradient.addColorStop(1, '#1a2338')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    for (let i = 0; i < 48; i += 1) {
      const x = Phaser.Math.Between(2, this.width - 2)
      const y = Phaser.Math.Between(2, this.height / 2)
      ctx.fillRect(x, y, 1, 1)
    }

    ctx.fillStyle = 'rgba(176, 197, 255, 0.35)'
    for (let i = 0; i < 18; i += 1) {
      const x = Phaser.Math.Between(2, this.width - 2)
      const y = Phaser.Math.Between(2, this.height / 2)
      ctx.fillRect(x, y, 1, 1)
    }

    texture.refresh()
  }

  private ensureMountainTexture(): void {
    const key = 'bg-mountains'
    if (this.scene.textures.exists(key)) {
      return
    }

    const width = this.width
    const height = 72
    const texture = this.scene.textures.createCanvas(key, width, height)
    if (!texture) {
      return
    }

    const ctx = texture.getContext()
    ctx.fillStyle = '#0f1a2b'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#14233a'
    ctx.beginPath()
    ctx.moveTo(0, height)
    let x = 0
    while (x <= width) {
      const peak = height - Phaser.Math.Between(18, 52)
      ctx.lineTo(x, peak)
      x += Phaser.Math.Between(24, 44)
    }
    ctx.lineTo(width, height)
    ctx.closePath()
    ctx.fill()

    texture.refresh()
  }

  private ensureGroundTexture(): void {
    const key = 'bg-ground'
    if (this.scene.textures.exists(key)) {
      return
    }

    const width = 64
    const height = GAME_CONFIG.groundHeight
    const texture = this.scene.textures.createCanvas(key, width, height)
    if (!texture) {
      return
    }

    const ctx = texture.getContext()
    ctx.fillStyle = '#1c2338'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#2a344d'
    for (let x = 0; x < width; x += 6) {
      ctx.fillRect(x, 8, 3, 1)
    }

    ctx.fillStyle = '#141a2a'
    for (let y = 14; y < height; y += 6) {
      const offset = Phaser.Math.Between(0, 4)
      ctx.fillRect(offset, y, width - 8, 1)
    }

    ctx.fillStyle = '#2f3d54'
    ctx.fillRect(0, 0, width, 2)

    texture.refresh()
  }

  private spawnDustParticles(count: number): DustParticle[] {
    const particles: DustParticle[] = []
    for (let i = 0; i < count; i += 1) {
      const x = Phaser.Math.Between(0, this.width)
      const y = Phaser.Math.Between(this.groundTop - 14, this.groundTop - 4)
      const sprite = this.scene.add
        .rectangle(x, y, 2, 1, 0xd4c6a1, 0.35)
        .setOrigin(0.5, 0.5)
        .setDepth(-9)
        .setScrollFactor(0)
      particles.push({ sprite, speed: Phaser.Math.FloatBetween(0.1, 0.35) })
    }
    return particles
  }
}
