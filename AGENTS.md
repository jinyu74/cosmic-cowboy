# AGENTS.md — Cosmic Cowboy (Phaser 4 / Retro Boss Fight)

## Goal
Build a 2D retro arcade boss fight:
- Cowboy (small) moves left/right and shoots upward.
- UFO boss hovers, moves left/right, attacks via Laser and Magnet.
- UFO visually deforms as HP decreases; at HP=0 it burns/smokes and crashes to ground; then stage transitions.

## Tech (fixed)
- Phaser 4 (current RC series) + TypeScript + Vite
- Package manager: pnpm

## Controls (fixed defaults)
- Move: ArrowLeft / ArrowRight
- Shoot: Z (hold to repeat)
- Roll: DoubleTap Left/Right (220ms window, 30ms debounce). (Optional alt key: Shift + direction if needed)

## Cowboy FSM (must follow)
States: Idle, Move, Shoot, Roll, Hit, MagnetLifted, Falling, Dead

Roll:
- Duration 250ms, Invincible 180ms, Cooldown 1200ms
- Roll blocks shooting; locks direction during roll
- Invincibility blocks DAMAGE only (do not disable world collision)

Damage:
- All damage goes through applyDamage(amount, source)
- applyDamage must respect invincibility + dead state
- Laser is once-hit per active window by default

## UFO FSM (must follow)
States:
SpawnIn, Patrol,
LaserTelegraph, LaserFire,
MagnetTelegraph, MagnetLift, MagnetDrop,
Recover, Enrage,
CrashStart, CrashFall, CrashImpact, StageClear

Phases by hpRatio:
- P1: 1.0~0.7 (laser heavy)
- P2: 0.7~0.4 (mixed)
- P3: 0.4~0.01 (aggressive; sweep optional)
- Death: 0.0 (crash sequence)

Deform:
- deform = 1 - hpRatio (0..1)
- Increase scale/skew/noise/smoke with deform (visual only)

## Hazard / Hitbox contract (must follow)
All attacks have 3 phases:
1) Telegraph: show warning, no damage
2) Active: hitbox enabled
3) Recover: no damage

LaserStrike:
- Telegraph: ground warning line (blink)
- Active: vertical Rect spanning world height
- Damage: once per active window (avoid unfair DOT)

LaserSweep (P3 optional):
- Telegraph shows sweep path
- Active updates hitbox position each frame

Magnet:
- Telegraph shows area
- Grab check happens ONCE at Active start (timed avoidance possible with Roll)
- If grabbed: Cowboy -> MagnetLifted -> Falling; damage on ground impact once

## Code organization (fixed)
- src/game/config/      (all numbers/timings/weights here)
- src/game/input/       (input snapshot + double-tap)
- src/game/fsm/         (cowboy/ufo state machines)
- src/game/hazards/     (hazard scheduler + hitbox definitions)
- src/game/entities/    (cowboy/ufo data + components)
- src/game/scenes/      (Phaser scenes)
- src/game/debug/       (overlay)

## Definition of done (per task)
- pnpm dev runs
- No TypeScript errors
- Debug overlay shows: cowboy state, ufo state, hp, phase, invincible, roll cooldown
