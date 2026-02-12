// LISTE DES QUARTIERS (DISTRICTS)
export const DISTRICTS = [
  // RELIGIEUX (Bleu)
  { id: 101, name: "Temple", color: "blue", cost: 1 },
  { id: 102, name: "Église", color: "blue", cost: 2 },
  { id: 103, name: "Monastère", color: "blue", cost: 3 },
  { id: 104, name: "Cathédrale", color: "blue", cost: 5 },

  // MILITAIRE (Rouge)
  { id: 201, name: "Tour de guet", color: "red", cost: 1 },
  { id: 202, name: "Prison", color: "red", cost: 2 },
  { id: 203, name: "Caserne", color: "red", cost: 3 },
  { id: 204, name: "Forteresse", color: "red", cost: 5 },

  // NOBLE (Jaune)
  { id: 301, name: "Manoir", color: "yellow", cost: 3 },
  { id: 302, name: "Château", color: "yellow", cost: 4 },
  { id: 303, name: "Palais", color: "yellow", cost: 5 },

  // COMMERCANT (Vert)
  { id: 401, name: "Taverne", color: "green", cost: 1 },
  { id: 402, name: "Échoppe", color: "green", cost: 2 },
  { id: 403, name: "Marché", color: "green", cost: 2 },
  { id: 404, name: "Comptoir", color: "green", cost: 3 },
  { id: 405, name: "Port", color: "green", cost: 4 },
  { id: 406, name: "Hôtel de ville", color: "green", cost: 5 },

  // MERVEILLES (Violet)
  { id: 501, name: "Cour des Miracles", color: "purple", cost: 2 },
  { id: 502, name: "Donjon", color: "purple", cost: 3 },
  { id: 503, name: "Laboratoire", color: "purple", cost: 5 },
  { id: 504, name: "Forge", color: "purple", cost: 5 },
  { id: 505, name: "Observatoire", color: "purple", cost: 5 },
  { id: 506, name: "Cimetière", color: "purple", cost: 5 },
  { id: 507, name: "Bibliothèque", color: "purple", cost: 6 },
  { id: 508, name: "École de Magie", color: "purple", cost: 6 },

  // DOUBLONS POUR REMPLIR LE DECK
  { id: 105, name: "Temple", color: "blue", cost: 1 },
  { id: 205, name: "Tour de guet", color: "red", cost: 1 },
  { id: 407, name: "Taverne", color: "green", cost: 1 },
  { id: 304, name: "Manoir", color: "yellow", cost: 3 },
];

// LISTE DES PERSONNAGES (CHARACTERS) - C'EST ÇA QUI MANQUAIT PEUT-ÊTRE
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
