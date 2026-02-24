import { CHARACTERS } from "../data/gameData";

export const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');
body { font-family: 'MedievalSharp', cursive; background-color: #0c0a09; color: #fffbeb; overflow: hidden; cursor: default; }
.card-shadow { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3); }
.inner-shadow { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.6); }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #1c1917; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #78350f; border-radius: 3px; }
@keyframes slide-down { 0% { transform: translateY(-100%) translateX(-50%); opacity: 0; } 10% { transform: translateY(0) translateX(-50%); opacity: 1; } 90% { transform: translateY(0) translateX(-50%); opacity: 1; } 100% { transform: translateY(-100%) translateX(-50%); opacity: 0; } }
.toast-anim { animation: slide-down 4s forwards ease-in-out; }
.tooltip { pointer-events: none; z-index: 9999; }
.modal-overlay { background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(4px); }
`;

const COLOR_MAPS = {
  yellow: {
    border: "border-amber-500",
    bg: "bg-amber-950",
    text: "text-amber-500",
  },
  blue: { border: "border-sky-600", bg: "bg-sky-950", text: "text-sky-400" },
  green: {
    border: "border-emerald-600",
    bg: "bg-emerald-950",
    text: "text-emerald-400",
  },
  red: { border: "border-red-600", bg: "bg-red-950", text: "text-red-500" },
  default: {
    border: "border-stone-400",
    bg: "bg-stone-800",
    text: "text-stone-300",
  },
};

const CHAR_COLORS_MAP = CHARACTERS.reduce((acc, c) => {
  acc[c.id] = COLOR_MAPS[c.color] || COLOR_MAPS.default;
  return acc;
}, {});

export const getCharColors = (id) => {
  return CHAR_COLORS_MAP[id] || COLOR_MAPS.default;
};
