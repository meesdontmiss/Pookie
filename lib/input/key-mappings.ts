/**
 * Key Mappings
 * 
 * This file defines the default key mappings for the game and provides
 * an interface for custom key mappings.
 */

export interface KeyMapping {
  forward: string[];
  backward: string[];
  left: string[];
  right: string[];
  jump: string[];
  shift: string[];
  trick1: string[];
  trick2: string[];
  action: string[];
  escape: string[];
  sprint: string[];
  crouch: string[];
  interact: string[];
}

// Default key mapping
export const DEFAULT_KEYS: KeyMapping = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  shift: ['ShiftLeft', 'ShiftRight'],
  trick1: ['Digit1'],
  trick2: ['Digit2'],
  action: ['KeyE'],
  escape: ['Escape'],
  sprint: ['ShiftLeft'],
  crouch: ['ControlLeft'],
  interact: ['KeyF']
};

// Special key mappings for specific game modes
export const FLIGHT_MODE_KEYS: Partial<KeyMapping> = {
  forward: ['KeyW', 'ArrowUp'], // Thrust forward
  backward: ['KeyS', 'ArrowDown'], // Brake
  left: ['KeyA', 'ArrowLeft'], // Roll left
  right: ['KeyD', 'ArrowRight'], // Roll right
  // Additional flight-specific controls
  trick1: ['KeyQ'], // Barrel roll left
  trick2: ['KeyE'], // Barrel roll right
  action: ['KeyF'], // Special action
  // Keep standard mappings for other keys
};

/**
 * Get merged key mapping with defaults
 */
export function getMergedKeyMapping(customMapping: Partial<KeyMapping> = {}): KeyMapping {
  return {
    ...DEFAULT_KEYS,
    ...customMapping
  };
} 