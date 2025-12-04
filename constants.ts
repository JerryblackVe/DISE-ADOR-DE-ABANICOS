

// SVG Path representing a standard 180-degree hand fan shape (Pais)
// Centered relative to origin (0,0) at the baseline.
// Shapes draws UPWARDS (Negative Y in SVG coords)
// Outer Radius: 280 (Visual margin)
// Inner Radius: 100
// Perfect semicircular arch (rainbow shape)
export const DEFAULT_FAN_PATH = "M -280 0 A 280 280 0 0 1 280 0 L 100 0 A 100 100 0 0 0 -100 0 Z";

// Placeholder for Polymer Fan Image (User will upload their own)
export const DEFAULT_POLYMER_IMAGE = "/imagenes/canvapolimero.png";

// Default Logo Path
export const DEFAULT_LOGO = "/imagenes/logo.png";

// Mock template data
export const DEFAULT_TEMPLATE = {
  id: 'standard-fan',
  name: 'Abanico Clásico 23cm',
  width: 600,
  height: 350,
  printAreaPath: DEFAULT_FAN_PATH
};

export const AVAILABLE_FONTS = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Inter',
  'Playfair Display',
  'Pacifico',
  'Roboto'
];

// Updated Palettes as per request
export const COMMON_COLORS = [
  '#ffffff', // Blanco
  '#000000', // Negro
  '#ef4444', // Rojo
  '#ec4899', // Rosa
  '#3b82f6', // Azul Claro
  '#1e3a8a', // Azul Oscuro
  '#4ade80', // Verde Claro
  '#14532d', // Verde Oscuro
  '#facc15', // Amarillo
  '#d1d5db', // Gris Claro
  '#374151', // Gris Oscuro
  '#9333ea', // Morado
  '#ffd700', // Dorado
];

export const FLUO_COLORS = [
  '#ccff00', // Fluo Yellow / Lime
  '#ff9500', // Fluo Orange
  '#00ff00', // Fluo Green
  '#ff00ff', // Fluo Fuschia/Magenta
];

export const PRESET_COLORS = COMMON_COLORS; // Backwards compatibility if needed