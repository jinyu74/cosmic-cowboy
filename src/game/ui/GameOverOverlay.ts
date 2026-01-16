import Phaser from 'phaser'
import { ensurePixelFont } from '../debug/pixelFont'

export class GameOverOverlay {
  private readonly container: Phaser.GameObjects.Container
  private readonly button: Phaser.GameObjects.Rectangle
  private readonly buttonLabel: Phaser.GameObjects.BitmapText

  constructor(scene: Phaser.Scene, width: number, height: number, onRetry: () => void) {
    const fontKey = ensurePixelFont(scene)
    const panelWidth = 180
    const panelHeight = 80
    const panelX = width / 2
    const panelY = height / 2

    const panel = scene.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, 0x0b111a, 0.85)
      .setStrokeStyle(1, 0x7fb7c9, 0.85)

    const title = scene.add
      .bitmapText(panelX, panelY - 24, fontKey, 'GAME OVER', 8)
      .setOrigin(0.5, 0.5)
      .setTint(0xffb3b3)

    this.button = scene.add
      .rectangle(panelX, panelY + 6, 72, 18, 0x1c2a3d, 0.9)
      .setStrokeStyle(1, 0x9bd4f0, 0.9)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })

    this.buttonLabel = scene.add
      .bitmapText(panelX, panelY + 6, fontKey, 'RETRY', 8)
      .setOrigin(0.5, 0.5)
      .setTint(0xeaf5ff)

    const hint = scene.add
      .bitmapText(panelX, panelY + 28, fontKey, 'ENTER / R', 8)
      .setOrigin(0.5, 0.5)
      .setTint(0x9bb3c9)

    this.container = scene.add.container(0, 0, [panel, title, this.button, this.buttonLabel, hint])
    this.container.setDepth(980).setVisible(false).setScrollFactor(0)

    this.button.on('pointerdown', () => onRetry())

    const keyboard = scene.input.keyboard
    if (keyboard) {
      const enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
      const rKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
      enterKey.on('down', () => this.container.visible && onRetry())
      rKey.on('down', () => this.container.visible && onRetry())
    }
  }

  show(): void {
    this.container.setVisible(true)
  }

  hide(): void {
    this.container.setVisible(false)
  }
}
