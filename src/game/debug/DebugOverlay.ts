import Phaser from 'phaser'
import { ensurePixelFont } from './pixelFont'

type DebugStatus = {
  status: string
}

type CowboyInfo = {
  state: string
  hp: number
  maxHp: number
  isInvincible: boolean
  rollCooldownRemaining: number
}

type UfoInfo = {
  hp: number
  maxHp: number
  phase: string
  state: string
}

const DEFAULT_STATUS: DebugStatus = {
  status: 'Ready',
}

export class DebugOverlay {
  private readonly hudContainer: Phaser.GameObjects.Container
  private readonly debugContainer: Phaser.GameObjects.Container
  private readonly cowboyBarFill: Phaser.GameObjects.Rectangle
  private readonly ufoBarFill: Phaser.GameObjects.Rectangle
  private readonly phaseText: Phaser.GameObjects.BitmapText
  private readonly rollText: Phaser.GameObjects.BitmapText
  private readonly debugText: Phaser.GameObjects.BitmapText
  private readonly barWidth: number
  private status: DebugStatus = DEFAULT_STATUS
  private inputEvent = 'None'
  private cowboyInfo: CowboyInfo | null = null
  private ufoInfo: UfoInfo | null = null
  private debugEnabled = false

  constructor(scene: Phaser.Scene) {
    const fontKey = ensurePixelFont(scene)

    const panelX = 6
    const panelY = 6
    const panelWidth = 150
    const panelHeight = 60
    const barWidth = 120
    const barHeight = 6
    const textHeight = 8
    this.barWidth = barWidth

    this.hudContainer = scene.add.container(0, 0).setDepth(900).setScrollFactor(0)

    const panel = scene.add.graphics()
    panel.fillStyle(0x0f1726, 0.75)
    panel.fillRect(panelX, panelY, panelWidth, panelHeight)
    panel.lineStyle(1, 0x7fb7c9, 0.85)
    panel.strokeRect(panelX, panelY, panelWidth, panelHeight)

    const labelX = panelX + 8
    const label1Y = panelY + 6
    const bar1Y = label1Y + textHeight + 2
    const label2Y = bar1Y + barHeight + 6
    const bar2Y = label2Y + textHeight + 2
    const infoY = bar2Y + barHeight + 4

    const cowboyLabel = scene.add.bitmapText(labelX, label1Y, fontKey, 'COWBOY', 8).setTint(0xf8f1d4)
    const ufoLabel = scene.add.bitmapText(labelX, label2Y, fontKey, 'UFO', 8).setTint(0xf8f1d4)

    const barBgColor = 0x1a2b3a
    const cowboyBarBg = scene
      .add.rectangle(labelX, bar1Y, barWidth, barHeight, barBgColor, 0.9)
      .setOrigin(0, 0.5)
    this.cowboyBarFill = scene
      .add.rectangle(labelX, bar1Y, barWidth, barHeight, 0x7be67c, 1)
      .setOrigin(0, 0.5)

    const ufoBarBg = scene
      .add.rectangle(labelX, bar2Y, barWidth, barHeight, barBgColor, 0.9)
      .setOrigin(0, 0.5)
    this.ufoBarFill = scene.add.rectangle(labelX, bar2Y, barWidth, barHeight, 0xff7d7d, 1).setOrigin(0, 0.5)

    this.phaseText = scene.add.bitmapText(labelX, infoY, fontKey, 'PHASE --', 8).setTint(0xb9e2f2)
    this.rollText = scene
      .add.bitmapText(labelX + 70, infoY, fontKey, 'ROLL CD 0', 8)
      .setTint(0xb9e2f2)

    this.hudContainer.add([
      panel,
      cowboyLabel,
      cowboyBarBg,
      this.cowboyBarFill,
      ufoLabel,
      ufoBarBg,
      this.ufoBarFill,
      this.phaseText,
      this.rollText,
    ])

    this.debugContainer = scene.add.container(0, 0).setDepth(900).setScrollFactor(0)
    const debugPanelY = panelY + panelHeight + 6
    const debugPanelHeight = 40
    const debugPanel = scene.add.graphics()
    debugPanel.fillStyle(0x0b111a, 0.68)
    debugPanel.fillRect(panelX, debugPanelY, panelWidth, debugPanelHeight)
    debugPanel.lineStyle(1, 0x4d6b78, 0.7)
    debugPanel.strokeRect(panelX, debugPanelY, panelWidth, debugPanelHeight)

    this.debugText = scene
      .add.bitmapText(panelX + 6, debugPanelY + 6, fontKey, '', 8)
      .setTint(0xcbd6e2)

    this.debugContainer.add([debugPanel, this.debugText])
    this.debugContainer.setVisible(false)

    const keyboard = scene.input.keyboard
    if (keyboard) {
      const toggleKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1)
      toggleKey.on('down', () => {
        this.debugEnabled = !this.debugEnabled
        this.debugContainer.setVisible(this.debugEnabled)
      })
    }

    this.update()
  }

  setStatus(status: string): void {
    this.status = { status }
  }

  setInputEvent(eventLabel: string): void {
    this.inputEvent = eventLabel
  }

  setCowboyInfo(info: CowboyInfo): void {
    this.cowboyInfo = info
  }

  setUfoInfo(info: UfoInfo): void {
    this.ufoInfo = info
  }

  update(): void {
    if (this.cowboyInfo) {
      const ratio = Phaser.Math.Clamp(this.cowboyInfo.hp / this.cowboyInfo.maxHp, 0, 1)
      this.cowboyBarFill.width = Math.round(this.barWidth * ratio)
      this.rollText.setText(`ROLL CD ${this.cowboyInfo.rollCooldownRemaining}`)
    }

    if (this.ufoInfo) {
      const ratio = Phaser.Math.Clamp(this.ufoInfo.hp / this.ufoInfo.maxHp, 0, 1)
      this.ufoBarFill.width = Math.round(this.barWidth * ratio)
      const phaseLabel = this.ufoInfo.phase === 'Death' ? 'DEAD' : this.ufoInfo.phase
      this.phaseText.setText(`PHASE ${phaseLabel}`)
    }

    if (this.debugEnabled) {
      const lines: string[] = [`STATUS ${this.status.status}`, `INPUT ${this.inputEvent}`]
      if (this.cowboyInfo) {
        lines.push(
          `COWBOY ${this.cowboyInfo.state} INV ${this.cowboyInfo.isInvincible ? 'Y' : 'N'} CD ${
            this.cowboyInfo.rollCooldownRemaining
          }`,
        )
      }
      if (this.ufoInfo) {
        lines.push(`UFO ${this.ufoInfo.state} HP ${this.ufoInfo.hp}/${this.ufoInfo.maxHp} PH ${this.ufoInfo.phase}`)
      }
      this.debugText.setText(lines)
    }
  }
}
