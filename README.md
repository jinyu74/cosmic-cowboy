# Cosmic Cowboy

Retro arcade boss fight prototype built with Phaser 4, TypeScript, and Vite.

## How To Run

```bash
pnpm install
pnpm dev
```

## Controls

- Move: Left / Right Arrow
- Shoot: Z (hold to repeat)
- Roll: Double-tap Left or Right (invincible for 180ms, 1200ms cooldown)
- Debug Toggle: F1

## Gameplay Notes

- Shoot upward to damage the UFO boss.
- Roll to avoid lasers and magnet grabs during the invincibility window.
- UFO behavior changes as its HP drops (phase shifts around 70% and 40%).

## Debug HUD

- Main HUD shows Cowboy HP, UFO HP, Phase, and Roll cooldown.
- Press F1 to show or hide developer debug lines (state and input).

## Project Setup

- Pixel-perfect rendering at 320x180 with integer scaling.
- Parallax background and scanline overlay for a retro feel.
