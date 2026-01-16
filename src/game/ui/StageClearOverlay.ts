import Phaser from 'phaser'
import { ensurePixelFont } from '../debug/pixelFont'

export class StageClearOverlay {
  private readonly container: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene, width: number, height: number) {
    const fontKey = ensurePixelFont(scene)
    const panelWidth = 190
    const panelHeight = 60
    const panelX = width / 2
    const panelY = height / 2

    const panel = scene.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, 0x0b111a, 0.85)
      .setStrokeStyle(1, 0x9bd4f0, 0.9)

    const title = scene.add
      .bitmapText(panelX, panelY, fontKey, 'STAGE CLEAR', 8)
      .setOrigin(0.5, 0.5)
      .setTint(0xbff7c8)

    this.container = scene.add.container(0, 0, [panel, title])
    this.container.setDepth(980).setVisible(false).setScrollFactor(0)
  }

  show(): void {
    this.container.setVisible(true)
  }

  hide(): void {
    this.container.setVisible(false)
  }
}
