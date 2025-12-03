import { KeyboardControls } from '@react-three/drei';

// Define key mappings
export enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  jump = 'jump',
  pause = 'pause',
  restart = 'restart'
}

// Define key bindings
export const keyboardMap = [
  { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
  { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
  { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
  { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
  { name: Controls.jump, keys: ['Space'] },
  { name: Controls.pause, keys: ['KeyP', 'Escape'] },
  { name: Controls.restart, keys: ['KeyR'] }
];

export { KeyboardControls }; 