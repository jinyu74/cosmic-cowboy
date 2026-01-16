import Phaser from 'phaser'

export type DamageEvent = {
  amount: number
  source: string
  target: 'Cowboy' | 'UfoBoss'
  x: number
  y: number
}

const DAMAGE_EVENT = 'damage'
const COWBOY_DEAD_EVENT = 'cowboy-dead'
const UFO_CRASH_IMPACT_DONE_EVENT = 'ufo-crash-impact-done'

export const eventBus = new Phaser.Events.EventEmitter()

export const emitDamage = (event: DamageEvent): void => {
  eventBus.emit(DAMAGE_EVENT, event)
}

export const onDamage = (handler: (event: DamageEvent) => void): void => {
  eventBus.on(DAMAGE_EVENT, handler)
}

export const emitCowboyDead = (): void => {
  eventBus.emit(COWBOY_DEAD_EVENT)
}

export const onCowboyDead = (handler: () => void): void => {
  eventBus.on(COWBOY_DEAD_EVENT, handler)
}

export const emitUfoCrashImpactDone = (): void => {
  eventBus.emit(UFO_CRASH_IMPACT_DONE_EVENT)
}

export const onUfoCrashImpactDone = (handler: () => void): void => {
  eventBus.on(UFO_CRASH_IMPACT_DONE_EVENT, handler)
}
