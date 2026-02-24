import { useState, useEffect } from "react";
import { GLOBAL_STYLES } from "../utils/theme";
import { playSound, playCrossfadeLoop } from "../utils/soundManager";

let isAudioUnlocked = false;

const LoginView = ({
  pseudo,
  setPseudo,
  createRoom,
  roomCode,
  setRoomCode,
  joinRoom,
}) => {
  const [hasEntered, setHasEntered] = useState(isAudioUnlocked);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    let loginMusic = null;
    if (hasEntered) loginMusic = playCrossfadeLoop("loginloop.mp3", 0.3, 2000);
    return () => {
      if (loginMusic) loginMusic.stop();
    };
  }, [hasEntered]);

  const handleAction = async (actionCallback) => {
    playSound("wood-button.mp3", 0.4, null);
    setIsConnecting(true);

    try {
      await actionCallback();
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => setIsConnecting(false), 2000);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-[url('/background.png')] bg-cover bg-center bg-no-repeat text-amber-50 overflow-hidden">
      <style>{GLOBAL_STYLES}</style>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] z-0"></div>

      <div
        className={`relative z-10 flex flex-col items-center w-full transition-all duration-700 ${!hasEntered ? "blur-md opacity-40 pointer-events-none scale-95" : "blur-0 opacity-100 scale-100"}`}
      >
        <h1 className="text-7xl text-amber-500 mb-10 drop-shadow-[0_5px_15px_rgba(0,0,0,1)] tracking-widest font-black text-center">
          CITADELLES
        </h1>

        <div className="relative w-full max-w-sm flex justify-center">
          <div
            className={`p-8 rounded-xl border-4 border-amber-900 bg-stone-900/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full flex flex-col gap-5 backdrop-blur-md transition-all duration-500 ${isConnecting ? "opacity-0 scale-90 blur-md pointer-events-none absolute" : "opacity-100 scale-100 blur-0 relative"}`}
          >
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="w-full bg-black/70 p-4 rounded border border-amber-800 text-amber-100 placeholder-amber-800/50 outline-none text-center uppercase tracking-widest focus:ring-2 focus:ring-amber-700 transition-all"
              placeholder="Votre Nom"
            />

            <button
              onClick={() => handleAction(createRoom)}
              className="w-full bg-amber-800 hover:bg-amber-700 p-4 rounded border-b-4 border-amber-950 font-bold text-xl uppercase tracking-widest transition-transform active:scale-95 shadow-lg"
            >
              Créer Table
            </button>

            <div className="flex gap-3 mt-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-28 bg-black/70 p-4 rounded border border-amber-800 text-center font-mono text-amber-500 font-bold uppercase focus:ring-2 focus:ring-amber-700 transition-all"
                placeholder="CODE"
                maxLength={4}
              />
              <button
                onClick={() => handleAction(joinRoom)}
                className="flex-1 bg-stone-800 hover:bg-stone-700 p-4 rounded border-b-4 border-stone-950 font-bold uppercase tracking-widest transition-transform active:scale-95 shadow-lg"
              >
                Rejoindre
              </button>
            </div>
          </div>

          <div
            className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 delay-100 ${isConnecting ? "opacity-100 scale-100" : "opacity-0 scale-110 pointer-events-none"}`}
          >
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
            <h2 className="text-xl font-black text-amber-400 tracking-widest uppercase drop-shadow-md animate-pulse text-center">
              Ouverture des portes...
            </h2>
          </div>
        </div>
      </div>

      {!hasEntered && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-stone-900 border-2 border-amber-700 p-8 rounded-xl shadow-[0_0_60px_rgba(217,119,6,0.3)] flex flex-col items-center max-w-sm w-full mx-4 text-center animate-in zoom-in duration-300">
            <h2 className="text-4xl font-black text-amber-500 mb-4 tracking-widest drop-shadow-md">
              BIENVENUE
            </h2>
            <p className="text-amber-100/80 mb-8 tracking-widest text-sm uppercase">
              Activer l'expérience sonore
            </p>
            <button
              onClick={() => {
                playSound("wood-button.mp3", 0.5, null);
                setHasEntered(true);
                isAudioUnlocked = true;
              }}
              className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 p-4 rounded border-b-4 border-amber-800 font-black text-xl uppercase tracking-widest transition-transform active:scale-95 shadow-lg"
            >
              Entrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;
