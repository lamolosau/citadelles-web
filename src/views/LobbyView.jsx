import { useState } from "react";
import { GLOBAL_STYLES } from "../utils/theme";
import LeaveButton from "../components/LeaveButton";
import { playSound } from "../utils/soundManager";

const LobbyView = (props) => {
  const {
    setShowLeaveModal,
    roomCode,
    players,
    onlineIds,
    roomHostId,
    myId,
    setPlayerToKickId,
    startGame,
    showLeaveModal,
    confirmLeaveGame,
    playerToKickId,
    confirmKick,
  } = props;

  const [isLeaving, setIsLeaving] = useState(false);
  const [isKicking, setIsKicking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    playSound("wood-button.mp3", 0.6, null);
    setIsStarting(true);
    try {
      await startGame();
    } catch (error) {
      console.error(error);
      setIsStarting(false);
    }
  };

  const handleLeave = async () => {
    playSound("wood-button.mp3", 0.4, null);
    setIsLeaving(true);
    try {
      await confirmLeaveGame();
    } catch (error) {
      console.error(error);
      setIsLeaving(false);
    }
  };

  const handleKick = async () => {
    playSound("wood-button.mp3", 0.4, null);
    setIsKicking(true);
    try {
      await confirmKick();
    } catch (error) {
      console.error(error);
    } finally {
      setIsKicking(false);
      setPlayerToKickId(null);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-[url('/background.png')] bg-cover bg-center bg-no-repeat text-amber-50 overflow-hidden">
      <style>
        {GLOBAL_STYLES}
        {`@keyframes smoothAppear { 0% { opacity: 0; transform: scale(0.95); filter: blur(10px); } 100% { opacity: 1; transform: scale(1); filter: blur(0px); } }`}
      </style>

      <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] z-0"></div>

      <div
        className="absolute top-6 left-6 z-50"
        style={{
          animation:
            "smoothAppear 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        }}
      >
        <LeaveButton onClick={() => setShowLeaveModal(true)} />
      </div>

      <div
        className={`relative z-10 flex flex-col items-center w-full max-w-lg mt-8 transition-all duration-700 ${isLeaving ? "blur-md opacity-40 scale-95 pointer-events-none" : ""}`}
        style={{
          animation:
            "smoothAppear 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        }}
      >
        <h2 className="text-5xl text-amber-500 mb-8 uppercase tracking-[0.2em] font-black drop-shadow-[0_5px_15px_rgba(0,0,0,1)] text-center">
          Antichambre
        </h2>

        <div className="p-8 rounded-xl border-4 border-amber-900 bg-stone-900/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full flex flex-col gap-6 backdrop-blur-md">
          <div className="text-center">
            <p className="text-amber-500/70 text-sm uppercase tracking-[0.5em] mb-2 font-bold">
              Code d'accès
            </p>
            <div className="bg-black/70 p-4 rounded-lg border-2 border-amber-800 inline-block shadow-inner">
              <span className="text-6xl text-amber-500 tracking-widest font-mono font-black drop-shadow-md">
                {roomCode}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="p-4 bg-black/50 rounded-lg border border-amber-900/50 flex justify-between items-center shadow-md transition-all hover:bg-black/70"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-4 h-4 rounded-full border-2 border-black/50 ${onlineIds.includes(p.user_id) ? "bg-green-500 shadow-[0_0_12px_#22c55e]" : "bg-stone-600"}`}
                  />
                  <span className="text-2xl font-bold tracking-wide text-amber-50">
                    {p.pseudo}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {p.user_id === roomHostId && (
                    <span className="text-xs bg-amber-900/80 text-amber-300 px-3 py-1.5 rounded border border-amber-700 uppercase font-black tracking-wider shadow-sm">
                      Hôte
                    </span>
                  )}
                  {myId === roomHostId && p.user_id !== myId && (
                    <button
                      onClick={() => setPlayerToKickId(p.user_id)}
                      className="w-8 h-8 flex items-center justify-center bg-red-950/80 text-red-500 border-2 border-red-800 rounded hover:bg-red-800 hover:text-red-100 transition-colors shadow-md font-bold"
                    >
                      ✖
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {myId === roomHostId && players.length >= 2 && (
            <button
              onClick={handleStart}
              className="w-full mt-4 bg-green-800 hover:bg-green-700 text-green-50 p-5 rounded-lg border-b-4 border-green-950 font-black text-2xl uppercase shadow-[0_0_20px_rgba(34,197,94,0.3)] tracking-[0.2em] transition-transform active:scale-95"
            >
              Commencer
            </button>
          )}
          {myId === roomHostId && players.length < 2 && (
            <div className="text-center text-amber-500/60 mt-4 italic text-sm tracking-wider bg-black/30 p-3 rounded border border-amber-900/30">
              En attente d'au moins un adversaire...
            </div>
          )}
          {myId !== roomHostId && (
            <div className="text-center text-amber-500/60 mt-4 italic text-sm tracking-wider bg-black/30 p-3 rounded border border-amber-900/30">
              En attente de l'hôte...
            </div>
          )}
        </div>
      </div>

      {showLeaveModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-stone-900 border-4 border-red-900 p-8 rounded-xl text-center shadow-[0_0_50px_rgba(220,38,38,0.4)] max-w-sm w-full mx-4 relative overflow-hidden transition-all duration-500">
            {!isLeaving ? (
              <div className="animate-in zoom-in duration-300">
                <h3 className="text-3xl text-red-500 font-black mb-4 uppercase tracking-widest drop-shadow-md">
                  Déserter ?
                </h3>
                <p className="text-stone-300 mb-8 italic text-lg">
                  Voulez-vous vraiment quitter le Royaume et abandonner votre
                  Cité ?
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowLeaveModal(false)}
                    className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border-b-4 border-stone-950 font-bold uppercase tracking-wider transition-transform active:scale-95"
                  >
                    Rester
                  </button>
                  <button
                    onClick={handleLeave}
                    className="flex-1 py-3 bg-red-900 hover:bg-red-800 text-red-100 rounded-lg border-b-4 border-red-950 font-bold uppercase tracking-wider transition-transform active:scale-95"
                  >
                    Quitter
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                <h2 className="text-xl font-black text-red-400 tracking-widest uppercase drop-shadow-md animate-pulse">
                  Départ en cours...
                </h2>
              </div>
            )}
          </div>
        </div>
      )}

      {playerToKickId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-stone-900 border-4 border-red-900 p-8 rounded-xl text-center shadow-[0_0_50px_rgba(220,38,38,0.4)] max-w-sm w-full mx-4 transition-all duration-500">
            {!isKicking ? (
              <div className="animate-in zoom-in duration-300">
                <h3 className="text-3xl text-red-500 font-black mb-4 uppercase tracking-widest drop-shadow-md">
                  Bannissement
                </h3>
                <p className="text-stone-300 mb-8 italic text-lg">
                  Voulez-vous chasser{" "}
                  <span className="font-black text-amber-500 text-xl block mt-2">
                    {players.find((p) => p.user_id === playerToKickId)?.pseudo}
                  </span>{" "}
                  de la table ?
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setPlayerToKickId(null)}
                    className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border-b-4 border-stone-950 font-bold uppercase tracking-wider transition-transform active:scale-95"
                  >
                    Gracier
                  </button>
                  <button
                    onClick={handleKick}
                    className="flex-1 py-3 bg-red-900 hover:bg-red-800 text-red-100 rounded-lg border-b-4 border-red-950 font-bold uppercase tracking-wider transition-transform active:scale-95"
                  >
                    Bannir
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                <h2 className="text-xl font-black text-red-400 tracking-widest uppercase drop-shadow-md animate-pulse">
                  Exil en cours...
                </h2>
              </div>
            )}
          </div>
        </div>
      )}

      {isStarting && (
        <div className="fixed inset-0 z-[20000] flex flex-col items-center justify-center bg-gradient-to-b from-stone-900 to-black animate-in fade-in duration-700">
          <div className="w-24 h-24 border-4 border-amber-500 border-t-transparent border-b-transparent rounded-full animate-spin mb-8 shadow-[0_0_30px_rgba(245,158,11,0.3)]"></div>
          <h2 className="text-4xl font-black text-amber-500 tracking-[0.3em] uppercase drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse text-center">
            Création du Royaume...
          </h2>
        </div>
      )}
    </div>
  );
};

export default LobbyView;
