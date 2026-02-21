import { GLOBAL_STYLES } from "../utils/theme";
import LeaveButton from "../components/LeaveButton";

// ==========================================
// VUE : LobbyView
// ==========================================

const LobbyView = ({
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
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center p-10 bg-gradient-to-b from-stone-900 to-black text-amber-50 relative">
      <style>{GLOBAL_STYLES}</style>
      <LeaveButton onClick={() => setShowLeaveModal(true)} />
      <h2 className="text-5xl text-amber-600 mb-8 uppercase tracking-[0.2em]">
        Antichambre
      </h2>
      <div className="p-8 rounded border-4 border-amber-900 bg-stone-900/80 w-full max-w-lg shadow-2xl flex flex-col gap-6 inner-shadow">
        <div className="text-center">
          <p className="text-stone-500 text-xs uppercase tracking-[0.5em] mb-2">
            Code d'accès
          </p>
          <div className="bg-black/50 p-4 rounded border-2 border-amber-800 inline-block">
            <span className="text-6xl text-amber-500 tracking-widest">
              {roomCode}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="p-4 bg-stone-950/50 rounded border border-amber-900/30 flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${onlineIds.includes(p.user_id) ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-stone-600"}`}
                />
                <span className="text-xl font-bold tracking-wide">
                  {p.pseudo}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {p.user_id === roomHostId && (
                  <span className="text-xs bg-amber-900/50 text-amber-500 px-2 py-1 rounded border border-amber-800 uppercase font-bold">
                    Hôte
                  </span>
                )}
                {myId === roomHostId && p.user_id !== myId && (
                  <button
                    onClick={() => setPlayerToKickId(p.user_id)}
                    className="w-6 h-6 flex items-center justify-center bg-red-900/50 text-red-500 border border-red-800 rounded hover:bg-red-800 hover:text-red-200 transition-colors"
                    title="Exclure"
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
            onClick={startGame}
            className="w-full mt-4 bg-green-900 hover:bg-green-800 text-green-100 p-5 rounded border-b-4 border-green-950 font-bold text-2xl uppercase shadow-lg tracking-[0.2em] transition-all"
          >
            Commencer
          </button>
        )}
        {myId === roomHostId && players.length < 2 && (
          <div className="text-center text-stone-500 mt-4 italic text-sm">
            En attente d'au moins un adversaire...
          </div>
        )}
      </div>

      {showLeaveModal && (
        <div className="fixed inset-0 z-[10000] modal-overlay flex items-center justify-center">
          <div className="bg-stone-900 border-4 border-red-600 p-6 rounded-lg text-center shadow-2xl max-w-sm">
            <h3 className="text-2xl text-red-500 font-bold mb-4 uppercase tracking-widest">
              Déserter ?
            </h3>
            <p className="text-stone-300 mb-6 italic">
              Voulez-vous vraiment quitter le Royaume et abandonner votre Cité ?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="px-6 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded border border-stone-500 font-bold uppercase"
              >
                Rester
              </button>
              <button
                onClick={confirmLeaveGame}
                className="px-6 py-2 bg-red-900 hover:bg-red-800 text-red-100 rounded border border-red-500 font-bold uppercase"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {playerToKickId && (
        <div className="fixed inset-0 z-[10000] modal-overlay flex items-center justify-center">
          <div className="bg-stone-900 border-4 border-red-600 p-6 rounded-lg text-center shadow-2xl max-w-sm">
            <h3 className="text-2xl text-red-500 font-bold mb-4 uppercase tracking-widest">
              Bannissement
            </h3>
            <p className="text-stone-300 mb-6 italic">
              Voulez-vous chasser{" "}
              <span className="font-bold text-amber-500">
                {players.find((p) => p.user_id === playerToKickId)?.pseudo}
              </span>{" "}
              de la table ?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setPlayerToKickId(null)}
                className="px-6 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded border border-stone-500 font-bold uppercase"
              >
                Gracier
              </button>
              <button
                onClick={confirmKick}
                className="px-6 py-2 bg-red-900 hover:bg-red-800 text-red-100 rounded border border-red-500 font-bold uppercase"
              >
                Bannir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyView;
