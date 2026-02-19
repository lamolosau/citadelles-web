import React from "react";
import { GLOBAL_STYLES } from "../data/constants";

const LoadingScreen = ({ onCancel, onReset }) => (
  <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-amber-600 font-family-medieval relative">
    <style>{GLOBAL_STYLES}</style>
    <div className="text-6xl mb-4 animate-pulse">🏰</div>
    <h2 className="text-3xl font-bold uppercase tracking-[0.3em] animate-pulse">
      Restauration du Royaume...
    </h2>
    <div className="flex flex-col gap-4 mt-8">
      <button
        onClick={onCancel}
        className="text-xs text-stone-500 hover:text-stone-300 underline"
      >
        Annuler et revenir au menu
      </button>
      <button
        onClick={onReset}
        className="px-4 py-2 bg-red-900/30 border border-red-800 text-red-500 text-xs font-bold uppercase hover:bg-red-900 hover:text-white transition-colors"
      >
        🛑 Réinitialisation d'Urgence
      </button>
    </div>
  </div>
);

export default LoadingScreen;
