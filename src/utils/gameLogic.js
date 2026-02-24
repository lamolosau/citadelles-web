import { DISTRICTS } from "../data/gameData";

export const DISTRICT_MAP = DISTRICTS.reduce((acc, dist) => {
  acc[dist.id] = dist;
  return acc;
}, {});

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

export const generateFullDeck = () => {
  const deck = [];
  DISTRICTS.forEach((card) => {
    for (let i = 0; i < (card.qty || 1); i++) deck.push(card.id);
  });
  return shuffle(deck);
};

export const removeOne = (arr, val) => {
  const idx = arr.indexOf(val);
  if (idx === -1) return arr;
  const newArr = [...arr];
  newArr.splice(idx, 1);
  return newArr;
};

export const calculateScore = (p, firstBuilderId) => {
  let score = 0;
  const colors = new Set();
  const cityIds = p.city || [];

  const hasHauntedCity = cityIds.some(
    (id) => (DISTRICT_MAP[id]?.name || "") === "Cour des Miracles",
  );

  cityIds.forEach((id) => {
    const c = DISTRICT_MAP[id];
    if (c) {
      score += c.cost;
      colors.add(c.color);
    }
  });

  if (colors.size >= 5 || (hasHauntedCity && colors.size === 4)) score += 3;
  if (p.user_id === firstBuilderId) score += 4;
  else if (cityIds.length >= 8) score += 2;

  return score;
};
