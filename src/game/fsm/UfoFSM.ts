export type UfoState =
  | 'SpawnIn'
  | 'Patrol'
  | 'LaserTelegraph'
  | 'LaserFire'
  | 'MagnetTelegraph'
  | 'MagnetLift'
  | 'MagnetDrop'
  | 'Recover'
  | 'Enrage'
  | 'CrashStart'
  | 'CrashFall'
  | 'CrashImpact'
  | 'StageClear'

export class UfoFSM {
  private state: UfoState = 'SpawnIn'
  private stateStartTime = 0

  getState(): UfoState {
    return this.state
  }

  is(state: UfoState): boolean {
    return this.state === state
  }

  setState(next: UfoState, now: number): void {
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
