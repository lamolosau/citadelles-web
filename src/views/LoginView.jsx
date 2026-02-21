import { GLOBAL_STYLES } from "../utils/theme";

// ==========================================
// VUE : LoginView
// ==========================================

const LoginView = ({
  pseudo,
  setPseudo,
  createRoom,
  roomCode,
  setRoomCode,
  joinRoom,
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-stone-900 to-black text-amber-50">
      <style>{GLOBAL_STYLES}</style>
      <h1 className="text-7xl text-amber-600 mb-10 drop-shadow-xl tracking-widest">
        CITADELLES
      </h1>
      <div className="p-8 rounded-lg border-4 border-amber-900 bg-stone-900/80 shadow-2xl w-full max-w-sm flex flex-col gap-4 inner-shadow">
        <input
          type="text"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          className="w-full bg-black/50 p-4 rounded border border-amber-800 text-amber-100 placeholder-amber-800/50 outline-none text-center uppercase tracking-widest"
          placeholder="Votre Nom"
        />
        <button
          onClick={createRoom}
          className="w-full bg-amber-800 hover:bg-amber-700 p-4 rounded border-b-4 border-amber-950 font-bold text-xl uppercase tracking-widest transition-transform active:scale-95"
        >
          Créer Table
        </button>
        <div className="flex gap-2">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-24 bg-black/50 p-4 rounded border border-amber-800 text-center font-mono text-amber-500 font-bold uppercase"
            placeholder="CODE"
            maxLength={4}
          />
          <button
            onClick={joinRoom}
            className="flex-1 bg-stone-800 hover:bg-stone-700 p-4 rounded border-b-4 border-stone-950 font-bold uppercase tracking-widest transition-transform active:scale-95"
          >
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
