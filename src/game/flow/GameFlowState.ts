export const GameFlowState = {
  Boot: 'BOOT',
  Playing: 'PLAYING',
  GameOver: 'GAME_OVER',
  StageClear: 'STAGE_CLEAR',
} as const

export type GameFlowState = (typeof GameFlowState)[keyof typeof GameFlowState]
