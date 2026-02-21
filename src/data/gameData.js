// ==========================================
// 1. DONNÉES DU JEU (Citadelles)
// ==========================================

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

export const getCardDesc = (card) => {
  if (WONDER_DESC[card.name]) return WONDER_DESC[card.name];
  return `Quartier ${card.color === "yellow" ? "Noble" : card.color === "green" ? "Commerçant" : card.color === "blue" ? "Religieux" : "Militaire"}.`;
};
