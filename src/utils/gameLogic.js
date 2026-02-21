import { DISTRICTS } from "../data/gameData";

// ==========================================
// LOGIQUE DE JEU PURE (Utilitaires)
// ==========================================

// Mélange un tableau aléatoirement (algorithme de Fisher-Yates)
export const shuffle = (array) => {
  let i = array.length,
    r;
  const n = [...array];
  while (i !== 0) {
    r = Math.floor(Math.random() * i);
    i--;
    [n[i], n[r]] = [n[r], n[i]];
  }
  return n;
};

// Génère la pioche complète en fonction des quantités de chaque quartier
export const generateFullDeck = () => {
  let deck = [];
  DISTRICTS.forEach((card) => {
    for (let i = 0; i < (card.qty || 1); i++) deck.push(card.id);
  });
  return shuffle(deck);
};

// Retire une seule occurrence d'une valeur dans un tableau
export const removeOne = (arr, val) => {
  const idx = arr.indexOf(val);
  if (idx === -1) return arr;
  const newArr = [...arr];
  newArr.splice(idx, 1);
  return newArr;
};

// Calcule le score final d'un joueur
export const calculateScore = (p, firstBuilderId) => {
  let score = 0;
  const colors = new Set();

  const hasHauntedCity = (p.city || []).some(
    (id) =>
      (DISTRICTS.find((d) => d.id == id)?.name || "") === "Cour des Miracles",
  );

  (p.city || []).forEach((id) => {
    const c = DISTRICTS.find((d) => d.id == id);
    if (c) {
      score += c.cost;
      colors.add(c.color);
    }
  });

  if (colors.size >= 5 || (hasHauntedCity && colors.size === 4)) score += 3;

  // Bonus du premier bâtisseur (+4) ou cité complète classique (+2)
  if (p.user_id === firstBuilderId) score += 4;
  else if ((p.city || []).length >= 8) score += 2;

  return score;
};
