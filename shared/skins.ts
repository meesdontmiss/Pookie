export interface SkinDef {
  id: string;
  name: string;
  modelPath: string;
  scale: number;
  offsetY: number; // vertical offset from ball center
  preview?: string; // optional preview image
}

export const AVAILABLE_SKINS: SkinDef[] = [
  { id: 'pookie', name: 'Pookie', modelPath: '/models/POOKIE.glb', scale: 0.25, offsetY: -0.45 },
  { id: 'penguin', name: 'Penguin', modelPath: '/models/quest%20characters/penguin.glb', scale: 0.012, offsetY: -0.5 },
  { id: 'shiba', name: 'Shiba', modelPath: '/models/quest%20characters/shiba.glb', scale: 0.012, offsetY: -0.5 },
  { id: 'shark_cat', name: 'Shark Cat', modelPath: '/models/quest%20characters/shark_cat.glb', scale: 0.012, offsetY: -0.5 },
  { id: 'shark_boi', name: 'Shark Boi', modelPath: '/models/quest%20characters/shark_boi.glb', scale: 0.012, offsetY: -0.5 },
  { id: 'fancyson', name: 'Fancyson', modelPath: '/models/quest%20characters/Pengamin%20Fancyson.glb', scale: 0.012, offsetY: -0.5 },
  { id: 'turbo_granny', name: 'Turbo Granny', modelPath: '/models/quest%20characters/turbo_granny.glb', scale: 0.012, offsetY: -0.5 },
];

export const DEFAULT_SKIN = AVAILABLE_SKINS[0];

export function getSkinById(id: string): SkinDef {
  return AVAILABLE_SKINS.find((s) => s.id === id) || DEFAULT_SKIN;
}

const SKIN_STORAGE_KEY = 'pookie_selected_skin';

export function getSelectedSkinId(): string {
  if (typeof window === 'undefined') return DEFAULT_SKIN.id;
  try {
    return localStorage.getItem(SKIN_STORAGE_KEY) || DEFAULT_SKIN.id;
  } catch {
    return DEFAULT_SKIN.id;
  }
}

export function setSelectedSkinId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, id);
  } catch {}
}
