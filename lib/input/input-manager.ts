/**
 * Centralized Input Manager for handling all input events
 * 
 * This singleton class handles all keyboard, mouse, and pointer events,
 * providing a unified interface for components to subscribe to input events
 * without creating duplicate event listeners.
 */

import { KeyMapping, DEFAULT_KEYS } from './key-mappings';

// Input event types
export type InputEventType = 
  | 'keydown' 
  | 'keyup' 
  | 'mousemove' 
  | 'mousedown' 
  | 'mouseup'
  | 'pointerlockchange'
  | 'pointerlockerror'
  | 'inputStateReset'
  | 'flight_mode_change'
  | 'chat_focus_change';

// Mouse state interface
export interface MouseState {
  position: {
    x: number;
    y: number;
  };
  movement: {
    x: number;
    y: number;
  };
  buttons: {
    left: boolean;
    middle: boolean;
    right: boolean;
  };
  rotation: {
    horizontal: number;
    vertical: number;
  };
  worldPosition?: {
    x: number;
    y: number;
    z: number;
  };
  isLocked: boolean;
}

// Key state interface
export interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  shift: boolean;
  trick1: boolean;
  trick2: boolean;
  action: boolean;
  escape: boolean;
  sprint: boolean;
  crouch: boolean;
  interact: boolean;
}

// Input states based on mapped keys
export interface InputState {
  keys: KeyState;
  mouse: MouseState;
  chatInputFocused: boolean;
  flightMode: boolean;
  pointerLocked: boolean;
}

export class InputManager {
  private static instance: InputManager;
  
  // Event subscribers
  private subscribers: Map<InputEventType, Set<(event: any) => void>> = new Map();
  
  // Raw key state (by key code)
  private rawKeyState: Record<string, boolean> = {};
  
  // Processed input state (based on key mappings)
  private inputState: InputState = {
    keys: {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      shift: false,
      trick1: false,
      trick2: false,
      action: false,
      escape: false,
      sprint: false,
      crouch: false,
      interact: false
    },
    mouse: {
      position: { x: 0, y: 0 },
      movement: { x: 0, y: 0 },
      buttons: { left: false, middle: false, right: false },
      rotation: { horizontal: 0, vertical: 0 },
      worldPosition: undefined,
      isLocked: false
    },
    chatInputFocused: false,
    flightMode: false,
    pointerLocked: false
  };
  
  // Current key mapping
  private keyMapping: KeyMapping = DEFAULT_KEYS;
  
  // Private constructor to enforce singleton
  private constructor() {
    this.setupEventListeners();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }
  
  /**
   * Set up all the event listeners
   */
  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    // Mouse events
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    
    // Pointer lock events
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('pointerlockerror', this.handlePointerLockError);
    
    // Custom events
    window.addEventListener('chatInputStateChanged', this.handleChatInputStateChanged as EventListener);
    
    console.log('Input Manager: All event listeners initialized');
  }
  
  /**
   * Clean up event listeners
   */
  public cleanup(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('pointerlockerror', this.handlePointerLockError);
    window.removeEventListener('chatInputStateChanged', this.handleChatInputStateChanged as EventListener);
  }
  
  /**
   * Handle keydown events
   */
  private handleKeyDown = (e: KeyboardEvent) => {
    // Skip handling when chat is focused (except escape key)
    if (this.inputState.chatInputFocused && e.code !== 'Escape') {
      return;
    }
    
    // Handle key input based on mapping
    if (this.keyMapping.forward.includes(e.code)) {
      this.inputState.keys.forward = true;
    }
    
    if (this.keyMapping.backward.includes(e.code)) {
      this.inputState.keys.backward = true;
    }
    
    if (this.keyMapping.left.includes(e.code)) {
      this.inputState.keys.left = true;
    }
    
    if (this.keyMapping.right.includes(e.code)) {
      this.inputState.keys.right = true;
    }
    
    if (this.keyMapping.jump.includes(e.code)) {
      this.inputState.keys.jump = true;
    }
    
    if (this.keyMapping.shift.includes(e.code)) {
      this.inputState.keys.shift = true;
    }
    
    if (this.keyMapping.trick1.includes(e.code)) {
      this.inputState.keys.trick1 = true;
    }
    
    if (this.keyMapping.trick2.includes(e.code)) {
      this.inputState.keys.trick2 = true;
    }
    
    if (this.keyMapping.action.includes(e.code)) {
      this.inputState.keys.action = true;
    }
    
    if (this.keyMapping.escape.includes(e.code)) {
      this.inputState.keys.escape = true;
      
      // When escape is pressed, exit special modes
      if (this.inputState.pointerLocked) {
        this.exitPointerLock();
      }
    }
    
    this.notifySubscribers('keydown', e);
  };
  
  /**
   * Handle keyup events
   */
  private handleKeyUp = (e: KeyboardEvent): void => {
    // Always handle key up to prevent stuck keys
    this.rawKeyState[e.code] = false;
    
    // Special handling for escape key
    if (e.code === 'Escape') {
      this.inputState.keys.escape = false;
    }
    
    // Update mapped key state
    this.updateMappedKeyState();
    
    // Notify subscribers
    this.notifySubscribers('keyup', e);
  };
  
  /**
   * Handle mouse move events
   */
  private handleMouseMove = (e: MouseEvent): void => {
    // Update mouse position
    this.inputState.mouse.position.x = e.clientX;
    this.inputState.mouse.position.y = e.clientY;
    
    // Update mouse movement
    this.inputState.mouse.movement.x = e.movementX || 0;
    this.inputState.mouse.movement.y = e.movementY || 0;
    
    // If pointer is locked, update rotation
    if (this.inputState.pointerLocked) {
      // Apply sensitivity
      const sensitivity = 0.003;
      this.inputState.mouse.rotation.horizontal -= e.movementX * sensitivity;
      
      // Apply vertical rotation with constraints
      let verticalRotation = this.inputState.mouse.rotation.vertical - e.movementY * sensitivity;
      verticalRotation = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, verticalRotation));
      this.inputState.mouse.rotation.vertical = verticalRotation;
    }
    
    // Notify subscribers
    this.notifySubscribers('mousemove', e);
  };
  
  /**
   * Handle mouse down events
   */
  private handleMouseDown = (e: MouseEvent): void => {
    // Update button state
    switch (e.button) {
      case 0: // Left
        this.inputState.mouse.buttons.left = true;
        break;
      case 1: // Middle
        this.inputState.mouse.buttons.middle = true;
        break;
      case 2: // Right
        this.inputState.mouse.buttons.right = true;
        break;
    }
    
    // Notify subscribers
    this.notifySubscribers('mousedown', e);
  };
  
  /**
   * Handle mouse up events
   */
  private handleMouseUp = (e: MouseEvent): void => {
    // Update button state
    switch (e.button) {
      case 0: // Left
        this.inputState.mouse.buttons.left = false;
        break;
      case 1: // Middle
        this.inputState.mouse.buttons.middle = false;
        break;
      case 2: // Right
        this.inputState.mouse.buttons.right = false;
        break;
    }
    
    // Notify subscribers
    this.notifySubscribers('mouseup', e);
  };
  
  /**
   * Handle pointer lock change
   */
  private handlePointerLockChange = (): void => {
    this.inputState.pointerLocked = document.pointerLockElement !== null;
    this.notifySubscribers('pointerlockchange', { isLocked: this.inputState.pointerLocked });
  };
  
  /**
   * Handle pointer lock error
   */
  private handlePointerLockError = (): void => {
    this.inputState.pointerLocked = false;
    console.error('Pointer lock error');
    this.notifySubscribers('pointerlockerror', {});
  };
  
  /**
   * Handle chat input state changes
   */
  private handleChatInputStateChanged = (e: CustomEvent): void => {
    const focused = e.detail?.focused || false;
    this.setChatInputFocus(focused);
  };
  
  /**
   * Update the mapped key state based on raw key state and key mappings
   */
  private updateMappedKeyState(): void {
    const keyState = this.inputState.keys;
    
    // If chat is focused, all movement keys are false
    if (this.inputState.chatInputFocused) {
      keyState.forward = false;
      keyState.backward = false;
      keyState.left = false;
      keyState.right = false;
      keyState.jump = false;
      keyState.shift = false;
      keyState.trick1 = false;
      keyState.trick2 = false;
      keyState.action = false;
      // Keep escape key state
      return;
    }
    
    // Helper function to check if any key in a list is pressed
    const isAnyKeyPressed = (keyCodes: string[]): boolean => {
      return keyCodes.some(code => this.rawKeyState[code]);
    };
    
    // Update mapped key state based on raw key state
    keyState.forward = isAnyKeyPressed(this.keyMapping.forward);
    keyState.backward = isAnyKeyPressed(this.keyMapping.backward);
    keyState.left = isAnyKeyPressed(this.keyMapping.left);
    keyState.right = isAnyKeyPressed(this.keyMapping.right);
    keyState.jump = isAnyKeyPressed(this.keyMapping.jump);
    keyState.shift = isAnyKeyPressed(this.keyMapping.shift);
    keyState.trick1 = isAnyKeyPressed(this.keyMapping.trick1);
    keyState.trick2 = isAnyKeyPressed(this.keyMapping.trick2);
    keyState.action = isAnyKeyPressed(this.keyMapping.action);
  }
  
  /**
   * Notify subscribers of an event
   */
  private notifySubscribers(event: InputEventType, data: any): void {
    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers) {
      eventSubscribers.forEach(callback => callback(data));
    }
  }
  
  /**
   * Subscribe to an input event
   */
  public subscribe(event: InputEventType, callback: (event: any) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    
    const eventSubscribers = this.subscribers.get(event)!;
    eventSubscribers.add(callback);
    
    return () => {
      if (eventSubscribers) {
        eventSubscribers.delete(callback);
      }
    };
  }
  
  /**
   * Get the current input state
   */
  public getInputState(): InputState {
    return { ...this.inputState };
  }
  
  /**
   * Get the current key state
   */
  public getKeyState(): KeyState {
    return { ...this.inputState.keys };
  }
  
  /**
   * Get the current mouse state
   */
  public getMouseState(): MouseState {
    return { ...this.inputState.mouse };
  }
  
  /**
   * Set chat input focus
   */
  public setChatInputFocus(focused: boolean): void {
    this.inputState.chatInputFocused = focused;
    
    // Reset keys when chat gets focused to prevent "stuck" keys
    if (focused) {
      Object.keys(this.rawKeyState).forEach(key => {
        this.rawKeyState[key] = false;
      });
      this.updateMappedKeyState();
      this.notifySubscribers('inputStateReset', null);
    }
  }
  
  /**
   * Set flight mode
   */
  public setFlightMode(active: boolean): void {
    this.inputState.flightMode = active;
    this.notifySubscribers('flight_mode_change', { active });
  }
  
  /**
   * Request pointer lock on an element
   */
  public requestPointerLock(element: HTMLElement): void {
    if (element.requestPointerLock) {
      element.requestPointerLock();
    }
  }
  
  /**
   * Exit pointer lock
   */
  public exitPointerLock(): void {
    // Store current camera rotation state before exiting
    const currentRotation = { ...this.inputState.mouse.rotation }
    
    // Log the current rotation state
    console.log('Preserving rotation state before exit:', currentRotation)
    
    // Exit pointer lock
    if (document.exitPointerLock) {
      document.exitPointerLock();
      
      // Ensure the rotation state is preserved even after exiting
      setTimeout(() => {
        // Make doubly sure the rotation wasn't reset
        this.inputState.mouse.rotation = currentRotation;
      }, 10)
    }
  }
  
  /**
   * Update the world position of the mouse
   */
  public updateMouseWorldPosition(position: { x: number, y: number, z: number }): void {
    this.inputState.mouse.worldPosition = position;
  }
  
  /**
   * Set the key mapping
   */
  public setKeyMapping(mapping: Partial<KeyMapping>): void {
    this.keyMapping = { ...DEFAULT_KEYS, ...mapping };
    this.updateMappedKeyState();
  }
} 