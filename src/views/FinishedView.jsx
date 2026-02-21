import { GLOBAL_STYLES } from "../utils/theme";
import { calculateScore } from "../utils/gameLogic";

// ==========================================
// VUE : FinishedView
// ==========================================

const FinishedView = ({
  players,
  myId,
  roomHostId,
  backToLobby,
  firstBuilderId,
}) => {
  // On trie les joueurs du plus grand score au plus petit
  // On passe `firstBuilderId` à la fonction pour qu'elle sache qui a fini en premier
  const sortedPlayers = [...players].sort(
    (a, b) =>
      calculateScore(b, firstBuilderId) - calculateScore(a, firstBuilderId),
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-gradient-to-b from-stone-900 to-black text-amber-50">
      <style>{GLOBAL_STYLES}</style>
      <h2 className="text-6xl text-amber-500 mb-8 uppercase tracking-[0.3em] drop-shadow-lg">
        Fin de Partie
      </h2>
      <div className="bg-stone-900/90 p-8 rounded-lg border-4 border-amber-800 w-full max-w-2xl shadow-2xl">
        <div className="space-y-4">
          {sortedPlayers.map((p, i) => (
            <div
              key={p.id}
              className={`flex justify-between items-center p-4 rounded border-2 ${
                i === 0
                  ? "bg-amber-900/40 border-amber-500"
                  : "bg-stone-800/50 border-stone-700"
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`text-4xl font-bold ${
                    i === 0 ? "text-amber-400" : "text-stone-500"
                  }`}
                >
                  #{i + 1}
                </span>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold">{p.pseudo}</span>
                  <span className="text-xs text-stone-400">
                    {p.city?.length || 0} quartiers bâtis
                  </span>
                </div>
              </div>
              <span className="text-4xl font-black text-amber-100">
                {calculateScore(p, firstBuilderId)} pts
              </span>
            </div>
          ))}
        </div>
        {myId === roomHostId && (
          <button
            onClick={backToLobby}
            className="w-full mt-8 bg-stone-800 hover:bg-stone-700 text-stone-300 p-4 rounded border-b-4 border-stone-950 font-bold text-xl uppercase tracking-widest"
          >
            Retour au Lobby
          </button>
        )}
      </div>
    </div>
  );
};

export default FinishedView;
