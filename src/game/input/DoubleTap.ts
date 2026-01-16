export const DOUBLE_TAP_WINDOW = 220
export const TAP_DEBOUNCE = 30

export type TapDirection = 'left' | 'right'

type TapTimes = Record<TapDirection, number>

export class DoubleTap {
  private readonly lastTapTime: TapTimes = {
    left: Number.NEGATIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
  }
  private readonly lastInputTime: TapTimes = {
    left: Number.NEGATIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
  }

  registerTap(direction: TapDirection, now: number): boolean {
    const sinceLastInput = now - this.lastInputTime[direction]

    if (sinceLastInput < TAP_DEBOUNCE) {
      this.lastInputTime[direction] = now
      return false
    }

    const isDoubleTap = now - this.lastTapTime[direction] <= DOUBLE_TAP_WINDOW
    this.lastTapTime[direction] = now
    this.lastInputTime[direction] = now
    return isDoubleTap
  }
}
