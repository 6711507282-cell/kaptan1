export interface KeyBindings {
  moveLeft: string;
  moveRight: string;
  jump: string;
  action: string;
}

export type ControlPreset = 'WASD' | 'Arrows' | 'Custom';

export interface TouchSettings {
  showOnScreen: boolean;
  buttonOpacity: number;
  layoutType: 'left-right-jump' | 'dpad-action';
  buttonSize: 'sm' | 'md' | 'lg';
}

export interface GameSettings {
  keyBindings: KeyBindings;
  preset: ControlPreset;
  touchSettings: TouchSettings;
  soundEnabled: boolean;
  musicEnabled: boolean;
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  jump: 'Space',
  action: 'KeyX',
};

export const DEFAULT_SETTINGS: GameSettings = {
  keyBindings: DEFAULT_KEY_BINDINGS,
  preset: 'Arrows',
  touchSettings: {
    showOnScreen: true,
    buttonOpacity: 0.7,
    layoutType: 'left-right-jump',
    buttonSize: 'md',
  },
  soundEnabled: true,
  musicEnabled: false,
};
