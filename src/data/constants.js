// ==========================================
// DONNÉES DU JEU & UTILITAIRES
// ==========================================

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

export const CHARACTERS = [
  { id: 1, name: "Assassin", color: "gray" },
  { id: 2, name: "Voleur", color: "gray" },
  { id: 3, name: "Magicien", color: "gray" },
  { id: 4, name: "Roi", color: "yellow" },
  { id: 5, name: "Évêque", color: "blue" },
  { id: 6, name: "Marchand", color: "green" },
  { id: 7, name: "Architecte", color: "gray" },
  { id: 8, name: "Condottiere", color: "red" },
];

export const DISTRICTS = [
  { id: 1, name: "Temple", cost: 1, color: "blue", qty: 3 },
  { id: 2, name: "Église", cost: 2, color: "blue", qty: 3 },
  { id: 3, name: "Monastère", cost: 3, color: "blue", qty: 3 },
  { id: 4, name: "Cathédrale", cost: 5, color: "blue", qty: 2 },
  { id: 5, name: "Tour de guet", cost: 1, color: "red", qty: 3 },
  { id: 6, name: "Prison", cost: 2, color: "red", qty: 3 },
  { id: 7, name: "Caserne", cost: 3, color: "red", qty: 3 },
  { id: 8, name: "Forteresse", cost: 5, color: "red", qty: 2 },
  { id: 9, name: "Manoir", cost: 3, color: "yellow", qty: 5 },
  { id: 10, name: "Château", cost: 4, color: "yellow", qty: 4 },
  { id: 11, name: "Palais", cost: 5, color: "yellow", qty: 3 },
  { id: 12, name: "Taverne", cost: 1, color: "green", qty: 5 },
  { id: 13, name: "Échoppe", cost: 2, color: "green", qty: 3 },
  { id: 14, name: "Marché", cost: 2, color: "green", qty: 4 },
  { id: 15, name: "Comptoir", cost: 3, color: "green", qty: 3 },
  { id: 16, name: "Port", cost: 4, color: "green", qty: 3 },
  { id: 17, name: "Hôtel de ville", cost: 5, color: "green", qty: 2 },
  { id: 18, name: "Cour des Miracles", cost: 2, color: "purple", qty: 1 },
  { id: 19, name: "Donjon", cost: 3, color: "purple", qty: 1 },
  { id: 20, name: "Laboratoire", cost: 5, color: "purple", qty: 1 },
  { id: 21, name: "Forge", cost: 5, color: "purple", qty: 1 },
  { id: 22, name: "Observatoire", cost: 5, color: "purple", qty: 1 },
  { id: 23, name: "Cimetière", cost: 5, color: "purple", qty: 1 },
  { id: 24, name: "Bibliothèque", cost: 6, color: "purple", qty: 1 },
  { id: 25, name: "École de Magie", cost: 6, color: "purple", qty: 1 },
  { id: 26, name: "Grande Muraille", cost: 6, color: "purple", qty: 1 },
  { id: 27, name: "Université", cost: 6, color: "purple", qty: 1 },
  { id: 28, name: "Dracoport", cost: 6, color: "purple", qty: 1 },
];

export const WONDER_DESC = {
  "Cour des Miracles":
    "Compte comme la dernière couleur manquante pour le bonus de 3pts.",
  Donjon: "Indestructible face au Condottiere.",
  Laboratoire: "Action : Sacrifier 1 carte pour gagner 1 or.",
  Forge: "Action : Payer 2 or pour piocher 3 cartes.",
  Observatoire: "Piochez 3 cartes au lieu de 2.",
  Cimetière: "Récupérez un quartier détruit (Passif).",
  Bibliothèque: "Conservez les 2 cartes piochées.",
  "École de Magie":
    "Prend la couleur de votre personnage pour les revenus (Auto).",
  "Grande Muraille": "Vos quartiers coûtent +1 or à détruire.",
  Université: "Coûte 6, vaut 8 points.",
  Dracoport: "Coûte 6, vaut 8 points.",
};

// --- Helpers ---

export const getCardDesc = (card) => {
  if (WONDER_DESC[card.name]) return WONDER_DESC[card.name];
  return `Quartier ${card.color === "yellow" ? "Noble" : card.color === "green" ? "Commerçant" : card.color === "blue" ? "Religieux" : "Militaire"}.`;
};

export const getCharColors = (id) => {
  const c = CHARACTERS.find((x) => x.id == id);
  if (!c)
    return {
      border: "border-stone-500",
      bg: "bg-stone-800",
      text: "text-stone-300",
    };
  switch (c.color) {
    case "yellow":
      return {
        border: "border-amber-500",
        bg: "bg-amber-950",
        text: "text-amber-500",
      };
    case "blue":
      return {
        border: "border-sky-600",
        bg: "bg-sky-950",
        text: "text-sky-400",
      };
    case "green":
      return {
        border: "border-emerald-600",
        bg: "bg-emerald-950",
        text: "text-emerald-400",
      };
    case "red":
      return {
        border: "border-red-600",
        bg: "bg-red-950",
        text: "text-red-500",
      };
    default:
      return {
        border: "border-stone-400",
        bg: "bg-stone-800",
        text: "text-stone-300",
      };
  }
};
