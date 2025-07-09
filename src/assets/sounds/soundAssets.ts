// Import all sound assets using Vite's asset import system
// This ensures they work in both development and production

// Audio folder sounds
export const audioSounds = {
  // Impact sounds
  impactGlass_heavy_004: new URL('./Audio/impactGlass_heavy_004.ogg', import.meta.url).href,
  impactGlass_light_000: new URL('./Audio/impactGlass_light_000.ogg', import.meta.url).href,
  impactMetal_003: new URL('./Audio/impactMetal_003.ogg', import.meta.url).href,
  
  // Laser sounds
  laserSmall_004: new URL('./Audio/laserSmall_004.ogg', import.meta.url).href,
  laserSmall_001: new URL('./Audio/laserSmall_001.ogg', import.meta.url).href,
  laserLarge_004: new URL('./Audio/laserLarge_004.ogg', import.meta.url).href,
  laser3: new URL('./Audio/laser3.ogg', import.meta.url).href,
  
  // Explosion and effects
  lowFrequency_explosion_000: new URL('./Audio/lowFrequency_explosion_000.ogg', import.meta.url).href,
  forceField_000: new URL('./Audio/forceField_000.ogg', import.meta.url).href,
  doorOpen_002: new URL('./Audio/doorOpen_002.ogg', import.meta.url).href,
} as const;

// Music assets
export const musicAssets = {
  introTheme: new URL('./Music/Echoes Intro 1.ogg', import.meta.url).href,
  menuTheme: new URL('./Music/Echoes Menu 1.ogg', import.meta.url).href,
} as const;

// Loop overlap timing constants (in seconds)
export const LOOP_OVERLAPS = {
  INTRO_THEME: 6.7,
  MENU_THEME: 8.3,
} as const;

// Type for sound names
export type AudioSoundName = keyof typeof audioSounds;
export type MusicName = keyof typeof musicAssets; 