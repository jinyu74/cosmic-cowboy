import Phaser from 'phaser'

export type DamageEvent = {
  amount: number
  source: string
  target: 'Cowboy' | 'UfoBoss'
  x: number
  y: number
}

const DAMAGE_EVENT = 'damage'

export const eventBus = new Phaser.Events.EventEmitter()

export const emitDamage = (event: DamageEvent): void => {
  eventBus.emit(DAMAGE_EVENT, event)
}

export const onDamage = (handler: (event: DamageEvent) => void): void => {
  eventBus.on(DAMAGE_EVENT, handler)
}
