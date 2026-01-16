import './style.css'
import Phaser from 'phaser'
import { GAME_CONFIG, WORLD_H, WORLD_W } from './game/config/gameConfig'
import { MainScene } from './game/scenes/MainScene'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app root element')
}

app.innerHTML = ''

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: WORLD_W,
  height: WORLD_H,
  parent: app,
  backgroundColor: GAME_CONFIG.backgroundColor,
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.NONE,
  },
  scene: [MainScene],
}

const game = new Phaser.Game(config)

const resizeCanvas = () => {
  const bounds = app.getBoundingClientRect()
  const scale = Math.max(1, Math.min(Math.floor(bounds.width / WORLD_W), Math.floor(bounds.height / WORLD_H)))
  const displayWidth = WORLD_W * scale
  const displayHeight = WORLD_H * scale

  game.canvas.style.width = `${displayWidth}px`
  game.canvas.style.height = `${displayHeight}px`
}

window.addEventListener('resize', resizeCanvas)
resizeCanvas()
