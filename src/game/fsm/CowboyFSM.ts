export type CowboyState =
  | 'Idle'
  | 'Move'
  | 'Shoot'
  | 'Roll'
  | 'Hit'
  | 'MagnetLifted'
  | 'Falling'
  | 'Dead'

export class CowboyFSM {
  private state: CowboyState = 'Idle'
  private stateStartTime = 0

  getState(): CowboyState {
    return this.state
  }

  is(state: CowboyState): boolean {
    return this.state === state
  }

  setState(next: CowboyState, now: number): void {
    if (this.state === next) {
      return
    }

    this.state = next
    this.stateStartTime = now
  }

  getStateDuration(now: number): number {
    return now - this.stateStartTime
  }
}
