import { audioSounds, musicAssets, LOOP_OVERLAPS } from './soundAssets';
import type { AudioSoundName, MusicName } from './soundAssets';

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

// Background music player with looping
class BackgroundMusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentMusic: string | null = null;
  private volume: number = 0.3; // Default volume for background music
  private loopOverlap: number = 0.5; // Overlap time in seconds for seamless looping

  play(musicName: MusicName, volume?: number, loop: boolean = true) {
    const musicPath = musicAssets[musicName];
    if (!musicPath) {
      console.warn(`Music not found: ${musicName}`);
      return;
    }

    console.log(`Attempting to play music: ${musicName} at path: ${musicPath}`);

    // If same music is already playing, don't restart
    if (this.currentMusic === musicPath && this.audio && !this.audio.paused) {
      console.log('Same music already playing, skipping');
      return;
    }

    // Stop current music if playing
    this.stop();

    // Create new audio element
    this.audio = new Audio(musicPath);
    this.audio.loop = false; // We'll handle looping manually for better control
    this.audio.volume = volume !== undefined ? volume : this.volume;
    this.audio.preload = 'auto'; // Ensure audio is loaded
    this.currentMusic = musicPath;

    console.log(`Audio element created with volume: ${this.audio.volume}`);

    // Add event listeners for debugging
    this.audio.addEventListener('loadstart', () => console.log('Audio load started'));
    this.audio.addEventListener('canplay', () => console.log('Audio can play'));
    this.audio.addEventListener('canplaythrough', () => console.log('Audio can play through'));
    this.audio.addEventListener('play', () => console.log('Audio started playing'));
    this.audio.addEventListener('pause', () => console.log('Audio paused'));
    this.audio.addEventListener('error', (e) => console.error('Audio error:', e));

    // Add custom loop handling for seamless transitions (only if loop is enabled)
    if (loop) {
      this.audio.addEventListener('timeupdate', () => {
        if (this.audio && this.audio.duration > 0) {
          const timeUntilEnd = this.audio.duration - this.audio.currentTime;
          if (timeUntilEnd <= this.loopOverlap) {
            // Start the next loop slightly before the current one ends
            this.audio.currentTime = 0;
          }
        }
      });
    }

    // Play the music with better error handling
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Background music started successfully');
        })
        .catch(error => {
          console.error('Failed to play background music:', error);
          // Try to handle autoplay restrictions
          if (error.name === 'NotAllowedError') {
            console.log('Autoplay blocked by browser. User interaction required.');
            // We could add a fallback here, like showing a "Click to enable audio" button
          }
        });
    }
  }

  stop() {
    if (this.audio) {
      console.log('Stopping background music');
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
      this.currentMusic = null;
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
      console.log(`Volume set to: ${this.volume}`);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused;
  }

  // Add method to check if audio is loaded
  isLoaded(): boolean {
    return this.audio !== null && this.audio.readyState >= 2; // HAVE_CURRENT_DATA
  }

  // Set loop overlap time (in seconds)
  setLoopOverlap(overlapSeconds: number) {
    this.loopOverlap = Math.max(0, overlapSeconds);
    console.log(`Loop overlap set to: ${this.loopOverlap} seconds`);
  }

  // Get the current audio element for external event listeners
  getAudioElement(): HTMLAudioElement | null {
    return this.audio;
  }
}

// Global background music player instance
export const backgroundMusic = new BackgroundMusicPlayer();

// Convenience function to set loop overlap for seamless transitions
export function setMusicLoopOverlap(overlapSeconds: number) {
  backgroundMusic.setLoopOverlap(overlapSeconds);
}

// Convenience functions for specific music themes
export function setIntroThemeLoop() {
  backgroundMusic.setLoopOverlap(LOOP_OVERLAPS.INTRO_THEME);
}

export function setMenuThemeLoop() {
  backgroundMusic.setLoopOverlap(LOOP_OVERLAPS.MENU_THEME);
}

// Test function to debug audio issues
export function testAudio() {
  console.log('=== Audio Debug Test ===');
  console.log('Available music assets:', musicAssets);
  console.log('Available audio sounds:', audioSounds);
  
  // Test if we can create an audio element
  try {
    const testAudio = new Audio();
    console.log('Audio API available:', !!testAudio);
    console.log('Audio context state:', testAudio.readyState);
  } catch (error) {
    console.error('Audio API not available:', error);
  }
  
  // Test if intro music file exists
  const introPath = musicAssets.introTheme;
  console.log('Intro music path:', introPath);
  
  // Try to load the intro music
  const testIntro = new Audio(introPath);
  testIntro.addEventListener('loadstart', () => console.log('Intro music load started'));
  testIntro.addEventListener('canplay', () => console.log('Intro music can play'));
  testIntro.addEventListener('canplaythrough', () => console.log('Intro music can play through'));
  testIntro.addEventListener('error', (e) => console.error('Intro music error:', e));
  testIntro.load();
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