export function playSound(src: string, volume?: number) {
  const audio = new Audio(src);
  if (volume !== undefined) audio.volume = volume;
  audio.play();
}

export function playClickSound() {
  playSound('/src/assets/sounds/audio/impactGlass_light_000.ogg', 0.5);
} 