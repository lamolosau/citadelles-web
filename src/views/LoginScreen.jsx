import React from "react";
import { GLOBAL_STYLES } from "../data/constants";
// On importe l'image depuis le dossier assets
import bgImage from "../assets/background.jpg";

const LoginScreen = ({
  pseudo,
  setPseudo,
  roomCode,
  setRoomCode,
  createRoom,
  joinRoom,
}) => {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative overflow-hidden"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <style>{GLOBAL_STYLES}</style>

      {/* Calque sombre pour la lisibilité (Overlay) */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      {/* Contenu (z-10 pour passer au dessus de l'image et du calque) */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <h1 className="text-7xl text-amber-500 mb-10 drop-shadow-[0_5px_5px_rgba(0,0,0,1)] tracking-widest font-black">
          CITADELLES
        </h1>

        <div className="p-8 rounded-lg border-4 border-amber-900/80 bg-stone-950/90 shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full flex flex-col gap-4 inner-shadow backdrop-blur-sm">
          <input
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="w-full bg-black/60 p-4 rounded border border-amber-800 text-amber-100 placeholder-amber-800/50 outline-none text-center uppercase tracking-widest focus:border-amber-500 transition-colors"
            placeholder="Votre Nom"
          />

          <button
            onClick={createRoom}
            className="w-full bg-gradient-to-b from-amber-800 to-amber-950 hover:from-amber-700 hover:to-amber-900 p-4 rounded border-t border-amber-700 border-b-4 border-black font-bold text-xl uppercase tracking-widest text-amber-100 shadow-lg transition-transform active:scale-95 active:border-b-0"
          >
            Créer Table
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-24 bg-black/60 p-4 rounded border border-amber-800 text-center font-mono text-amber-500 font-bold uppercase focus:border-amber-500 transition-colors"
              placeholder="CODE"
              maxLength={4}
            />
            <button
              onClick={joinRoom}
              className="flex-1 bg-gradient-to-b from-stone-700 to-stone-900 hover:from-stone-600 hover:to-stone-800 p-4 rounded border-t border-stone-600 border-b-4 border-black font-bold uppercase tracking-widest text-stone-200 shadow-lg transition-transform active:scale-95 active:border-b-0"
            >
              Rejoindre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
