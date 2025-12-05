

// SVG Path representing a standard 180-degree hand fan shape (Pais)
// Centered relative to origin (0,0) at the baseline.
// Shapes draws UPWARDS (Negative Y in SVG coords)
// Outer Radius: 280 (Visual margin)
// Inner Radius: 100
// Perfect semicircular arch (rainbow shape)
export const DEFAULT_FAN_PATH = "M -280 0 A 280 280 0 0 1 280 0 L 100 0 A 100 100 0 0 0 -100 0 Z";

// New Default Cloth SVG URL (Using jsDelivr CDN for better reliability/CORS and raw access)
export const DEFAULT_CLOTH_SVG_URL = "https://cdn.jsdelivr.net/gh/JerryblackVe/imagenes_almacen@main/tela_canva_abanico.svg";

// Polymer Models List
export const POLYMER_MODELS = [
  {
    id: 'rounded',
    name: 'Punta Redondeada',
    url: 'https://i.postimg.cc/XqR6GjNb/canvapolimero.png'
  },
  {
    id: 'straight',
    name: 'Punta Recta',
    url: 'https://i.postimg.cc/BZcV83Ft/abanico-cuadrado.png'
  },
  {
    id: 'heart',
    name: 'Punta Corazón',
    url: 'https://i.postimg.cc/nzCnF1TW/corazon.png'
  }
];

// Default Logo Path (Using external URL via jsDelivr)
export const DEFAULT_LOGO = "https://cdn.jsdelivr.net/gh/JerryblackVe/imagenes_almacen@main/LOGO.png";

// Social Media Icons
export const SOCIAL_WHATSAPP_ICON = "https://cdn.jsdelivr.net/gh/JerryblackVe/imagenes_almacen@main/whatsapp.png";
export const SOCIAL_INSTAGRAM_ICON = "https://cdn.jsdelivr.net/gh/JerryblackVe/imagenes_almacen@main/instagram-logo-on-transparent-background-free-png.png";

// EMAILJS CONFIGURATION
export const EMAILJS_SERVICE_ID = "service_8zekvls";
export const EMAILJS_TEMPLATE_ID = "template_r7tbw8l";
export const EMAILJS_PUBLIC_KEY = "XYIJ4yfzD__Cs2eXY";

// CONFIGURACIÓN GLOBAL (Predeterminada para todos los usuarios)
// Modifica esto y sube el código para aplicar cambios a todos los dispositivos
export const GLOBAL_CONFIG = {
  defaultLogo: DEFAULT_LOGO,
  enabledModes: {
    cloth: true,   // Cambia a false para deshabilitar Tela globalmente
    polymer: true  // Cambia a false para deshabilitar Polímero globalmente
  },
  // Puedes forzar una plantilla por defecto aquí si lo deseas
  defaultPolymerImage: POLYMER_MODELS[0].url
};

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
  'Inter',
  'Roboto',
  'Playfair Display', // Elegante / Serif
  'Great Vibes',      // Cursiva Elegante (Bodas)
  'Dancing Script',   // Cursiva Casual
  'Pacifico',         // Divertida
  'Cinzel',           // Clásica / Romana
  'Montserrat',       // Moderna / Geométrica
  'Tiny Angels',      // Fuente Local Personalizada
  'Courier New',
  'Times New Roman'
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