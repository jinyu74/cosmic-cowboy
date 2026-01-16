import Phaser from 'phaser'

export type InputKey = 'left' | 'right' | 'shoot'

type KeyMap = Record<InputKey, Phaser.Input.Keyboard.Key>
type KeyState = Record<InputKey, boolean>

const INPUT_KEYS: InputKey[] = ['left', 'right', 'shoot']

export class InputSnapshot {
  private readonly keys: KeyMap
  private readonly prevDown: KeyState

  readonly keysDown: KeyState
  readonly keysPressed: KeyState
  readonly keysReleased: KeyState

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard

    if (!keyboard) {
      throw new Error('Keyboard input is not available for this scene.')
    }

    this.keys = keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      shoot: Phaser.Input.Keyboard.KeyCodes.Z,
    }) as KeyMap

    this.prevDown = { left: false, right: false, shoot: false }
    this.keysDown = { left: false, right: false, shoot: false }
    this.keysPressed = { left: false, right: false, shoot: false }
    this.keysReleased = { left: false, right: false, shoot: false }
  }

  update(): void {
    for (const key of INPUT_KEYS) {
      const isDown = this.keys[key].isDown
      const wasDown = this.prevDown[key]

      this.keysDown[key] = isDown
      this.keysPressed[key] = isDown && !wasDown
      this.keysReleased[key] = !isDown && wasDown
      this.prevDown[key] = isDown
    }
  }
}
