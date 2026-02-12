/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // On prépare déjà notre palette "Médiévale" pour Citadelles
        "citadelle-gold": "#d4af37",
        "citadelle-dark": "#1a1a1a",
        "citadelle-paper": "#f4e4bc",
      },
    },
  },
  plugins: [],
};
