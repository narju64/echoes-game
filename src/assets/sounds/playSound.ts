import { audioSounds } from './soundAssets';
import type { AudioSoundName } from './soundAssets';

export function playSound(src: string, volume?: number) {
  const audio = new Audio(src);
  if (volume !== undefined) audio.volume = volume;
  audio.play();
}

export function playAudioSound(soundName: AudioSoundName, volume?: number) {
  const soundPath = audioSounds[soundName];
  if (soundPath) {
    playSound(soundPath, volume);
  } else {
    console.warn(`Sound not found: ${soundName}`);
  }
}

export function playClickSound() {
  playAudioSound('impactGlass_light_000', 0.5);
}

// Convenience functions for commonly used sounds
export function playGlassImpact() {
  playAudioSound('impactGlass_heavy_004');
}

export function playMetalImpact() {
  playAudioSound('impactMetal_003');
}

export function playLaserSound() {
  playAudioSound('laserSmall_004');
}

export function playExplosion() {
  playAudioSound('lowFrequency_explosion_000', 1.0);
  playAudioSound('impactMetal_003', 1.0);
} 