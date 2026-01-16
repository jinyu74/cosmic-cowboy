export const COWBOY_CONFIG = {
  maxHp: 5,
  moveSpeed: 220,
  hitStunMs: 200,
  roll: {
    durationMs: 250,
    invincibleMs: 180,
    cooldownMs: 1200,
  },
  magnet: {
    // Tunable defaults: lift/fall pacing until final combat tuning.
    liftHeight: 130,
    liftMs: 420,
    fallSpeed: 780,
    fallDamage: 1,
  },
} as const
