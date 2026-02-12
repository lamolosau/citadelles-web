import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { DISTRICTS, CHARACTERS } from "./cards";

function App() {
  const [view, setView] = useState("login");
  const [pseudo, setPseudo] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [onlineIds, setOnlineIds] = useState([]);
  const [myId, setMyId] = useState(null);
  const [roomHostId, setRoomHostId] = useState(null);
  const [gameStatus, setGameStatus] = useState("waiting");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [draftPile, setDraftPile] = useState([]);
  const [draftSubStep, setDraftSubStep] = useState("pick");
  const [loading, setLoading] = useState(true);

  // Refs pour la logique de synchronisation
  const myIdRef = useRef(null);
  const roomIdRef = useRef(null);
  const playersRef = useRef([]);
  const roomHostIdRef = useRef(null);

  useEffect(() => {
    myIdRef.current = myId;
    roomIdRef.current = roomId;
    playersRef.current = players;
    roomHostIdRef.current = roomHostId;
  }, [myId, roomId, players, roomHostId]);

  // --- RESTAURATION ---
  useEffect(() => {
    const restore = async () => {
      setLoading(true);
      const sRoomId = localStorage.getItem("citadelles_room_id");
      const sPlayerId = localStorage.getItem("citadelles_player_id");
      const sCode = localStorage.getItem("citadelles_room_code");

      if (sRoomId && sPlayerId) {
        const { data: room } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", sRoomId)
          .single();
        if (room) {
          const { data: p } = await supabase
            .from("players")
            .select("*")
            .eq("user_id", sPlayerId)
            .eq("room_id", sRoomId)
            .single();
          if (p) {
            setMyId(sPlayerId);
            setRoomId(sRoomId);
            setRoomCode(sCode);
            setPseudo(p.pseudo);
            setGameStatus(room.status);
            setRoomHostId(room.host_id);
            setView(room.status === "waiting" ? "lobby" : "game");
          }
        }
      }
      setLoading(false);
    };
    restore();
  }, []);

  const saveSession = (rid, uid, code) => {
    localStorage.setItem("citadelles_room_id", rid);
    localStorage.setItem("citadelles_player_id", uid);
    localStorage.setItem("citadelles_room_code", code);
  };

  const clearSession = () => {
    localStorage.clear();
    setView("login");
    setRoomId(null);
    setMyId(null);
  };

  // --- ACTIONS ---
  const getUserId = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return data.session.user.id;
    const { data: authData } = await supabase.auth.signInAnonymously();
    return authData.user.id;
  };

  const createRoom = async () => {
    if (!pseudo) return;
    setLoading(true);
    try {
      const uid = await getUserId();
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      const { data: room } = await supabase
        .from("rooms")
        .insert([{ code, host_id: uid, status: "waiting" }])
        .select()
        .single();
      await supabase
        .from("players")
        .insert([
          { room_id: room.id, user_id: uid, pseudo, joined_at: new Date() },
        ]);
      saveSession(room.id, uid, code);
      setMyId(uid);
      setRoomId(room.id);
      setRoomCode(code);
      setRoomHostId(uid);
      setView("lobby");
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!pseudo || !roomCode) return;
    setLoading(true);
    try {
      const uid = await getUserId();
      const { data: room } = await supabase
        .from("rooms")
        .select()
        .eq("code", roomCode)
        .single();
      if (!room) throw new Error("Salle introuvable");
      const { data: existing } = await supabase
        .from("players")
        .select()
        .eq("room_id", room.id)
        .eq("user_id", uid)
        .single();
      if (!existing)
        await supabase
          .from("players")
          .insert([
            { room_id: room.id, user_id: uid, pseudo, joined_at: new Date() },
          ]);
      saveSession(room.id, uid, roomCode);
      setMyId(uid);
      setRoomId(room.id);
      setRoomHostId(room.host_id);
      setView(room.status === "waiting" ? "lobby" : "game");
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  const leaveRoom = async () => {
    if (myId && roomId) {
      await supabase
        .from("players")
        .delete()
        .match({ user_id: myId, room_id: roomId });
    }
    clearSession();
  };

  const startGame = async () => {
    const activePlayers = players.filter((p) => onlineIds.includes(p.user_id));
    if (activePlayers.length < 2) return alert("Besoin de 2 joueurs en ligne");

    setLoading(true);
    let d = [...DISTRICTS].sort(() => Math.random() - 0.5);
    for (const p of activePlayers) {
      await supabase
        .from("players")
        .update({
          gold: 2,
          hand: d.splice(0, 4).map((c) => c.id),
          city: [],
          characters: [],
        })
        .eq("id", p.id);
    }
    let c = [...CHARACTERS].sort(() => Math.random() - 0.5);
    const fd = c.pop();
    await supabase
      .from("rooms")
      .update({
        status: "drafting",
        district_stack: d,
        draft_pile: c,
        face_down_char: fd.id,
        current_player_index: 0,
        draft_sub_step: "pick",
      })
      .eq("id", roomId);
    setLoading(false);
  };

  const pickCharacter = async (cid) => {
    const activePlayers = players.filter((p) => onlineIds.includes(p.user_id));
    const me = activePlayers.find((p) => p.user_id === myId);
    const pile = draftPile.filter((x) => x.id !== cid);

    if (activePlayers.length === 2) {
      if (draftSubStep === "pick") {
        await supabase
          .from("players")
          .update({ characters: [...(me.characters || []), cid] })
          .eq("user_id", myId)
          .eq("room_id", roomId);
        await supabase
          .from("rooms")
          .update({ draft_pile: pile, draft_sub_step: "discard" })
          .eq("id", roomId);
      } else {
        if (pile.length <= 1) {
          await supabase
            .from("rooms")
            .update({
              status: "playing",
              draft_pile: [],
              draft_sub_step: "pick",
              current_character_turn: 1,
            })
            .eq("id", roomId);
        } else {
          await supabase
            .from("rooms")
            .update({
              draft_pile: pile,
              draft_sub_step: "pick",
              current_player_index: (currentPlayerIndex + 1) % 2,
            })
            .eq("id", roomId);
        }
      }
    } else {
      // Logique 3+
      const newChars = [...(me.characters || []), cid];
      await supabase
        .from("players")
        .update({ characters: newChars })
        .eq("user_id", myId)
        .eq("room_id", roomId);
      const done = activePlayers.every((p) =>
        p.user_id === myId
          ? newChars.length >= 1
          : (p.characters || []).length >= 1,
      );
      if (done)
        await supabase
          .from("rooms")
          .update({
            status: "playing",
            draft_pile: [],
            current_character_turn: 1,
          })
          .eq("id", roomId);
      else
        await supabase
          .from("rooms")
          .update({
            draft_pile: pile,
            current_player_index:
              (currentPlayerIndex + 1) % activePlayers.length,
          })
          .eq("id", roomId);
    }
  };

  // --- TEMPS RÉEL + PRÉSENCE ---
  useEffect(() => {
    if (!roomId || !myId) return;

    const refresh = async () => {
      const { data: ps } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true });
      if (ps) setPlayers(ps);
      const { data: r } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (r) {
        setRoomHostId(r.host_id);
        setGameStatus(r.status);
        setCurrentPlayerIndex(r.current_player_index);
        setDraftPile(r.draft_pile || []);
        setDraftSubStep(r.draft_sub_step);
        if (r.status !== "waiting") setView("game");
      }
    };

    refresh();

    const channel = supabase.channel(`room-${roomId}`, {
      config: { presence: { key: myId } },
    });

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        refresh,
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const currentOnlineIds = Object.keys(state);
        setOnlineIds(currentOnlineIds);

        // --- LOGIQUE DE DÉLÉGATION D'HÔTE ---
        const activePlayers = playersRef.current.filter((p) =>
          currentOnlineIds.includes(p.user_id),
        );
        if (activePlayers.length > 0) {
          const hostOnline = currentOnlineIds.includes(roomHostIdRef.current);
          // Si l'hôte n'est plus là, le premier de la liste des actifs prend le relais
          if (!hostOnline) {
            const nextHost = activePlayers[0];
            if (nextHost.user_id === myIdRef.current) {
              console.log("Délégation : Je deviens l'hôte.");
              supabase
                .from("rooms")
                .update({ host_id: myIdRef.current })
                .eq("id", roomIdRef.current)
                .then();
            }
          }
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, myId]);

  // --- RENDU ---
  if (loading)
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-amber-500 font-bold uppercase tracking-[0.3em]">
        Citadelles...
      </div>
    );

  if (view === "login")
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-5xl font-black text-amber-500 mb-8 tracking-tighter">
          CITADELLES
        </h1>
        <div className="bg-slate-800 p-8 rounded-3xl w-full max-w-sm border border-slate-700 shadow-2xl">
          <input
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="w-full bg-slate-900 p-4 rounded-xl mb-4 border border-slate-700 outline-none focus:border-amber-500"
            placeholder="Ton pseudo..."
          />
          <button
            onClick={createRoom}
            className="w-full bg-amber-600 p-4 rounded-xl font-bold mb-4 hover:bg-amber-500 transition-colors"
          >
            CRÉER UNE TABLE
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-20 bg-slate-900 p-4 rounded-xl text-center font-mono"
              placeholder="CODE"
              maxLength={4}
            />
            <button
              onClick={joinRoom}
              className="flex-1 bg-slate-700 p-4 rounded-xl font-bold hover:bg-slate-600"
            >
              REJOINDRE
            </button>
          </div>
        </div>
      </div>
    );

  if (view === "lobby") {
    const activePlayers = players.filter((p) => onlineIds.includes(p.user_id));

    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center relative">
        <button
          onClick={leaveRoom}
          className="absolute top-6 right-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Quitter X
        </button>

        <div className="mt-12 text-center">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
            Code d'accès
          </p>
          <div className="bg-slate-800 px-10 py-5 rounded-3xl border-2 border-amber-500/20 shadow-2xl">
            <span className="text-5xl font-mono font-black text-amber-500 tracking-[0.2em] select-all">
              {roomCode}
            </span>
          </div>
        </div>

        <div className="w-full max-w-md mt-12 bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
          <h2 className="text-[10px] font-black text-slate-500 mb-6 uppercase tracking-widest">
            Garde rapprochée ({activePlayers.length})
          </h2>
          <div className="space-y-3">
            {activePlayers.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900/50 p-4 rounded-2xl flex justify-between items-center border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                  <span className="font-bold text-slate-200">{p.pseudo}</span>
                </div>
                {p.user_id === roomHostId && (
                  <span className="text-[9px] bg-amber-500 text-black px-2 py-1 rounded-md font-black">
                    HÔTE
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {myId === roomHostId ? (
          <button
            onClick={startGame}
            className="mt-10 bg-green-600 px-16 py-5 rounded-2xl font-black text-xl hover:bg-green-500 shadow-2xl shadow-green-900/40"
          >
            LANCER LA PARTIE
          </button>
        ) : (
          <p className="mt-10 text-slate-500 text-xs font-bold italic animate-pulse">
            L'hôte prépare les cartes...
          </p>
        )}
      </div>
    );
  }

  if (view === "game") {
    const me = players.find((p) => p.user_id === myId);
    const activePlayers = players.filter((p) => onlineIds.includes(p.user_id));
    const isMyTurn = activePlayers[currentPlayerIndex]?.user_id === myId;

    return (
      <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center">
        <div className="w-full max-w-4xl flex justify-between items-center bg-slate-800 p-4 rounded-2xl border-b-4 border-slate-700 mb-6 shadow-2xl">
          <span className="font-black text-amber-500 tracking-tighter">
            CITADELLES
          </span>
          <div className="flex gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 font-black uppercase">
                Trésor
              </span>
              <span className="text-yellow-500 font-black">{me?.gold} OR</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-black uppercase">
                Cartes
              </span>
              <span className="text-blue-500 font-black">
                {me?.hand?.length}
              </span>
            </div>
          </div>
        </div>

        {gameStatus === "drafting" ? (
          <div className="w-full max-w-4xl text-center">
            <h2 className="text-2xl font-black mb-8 tracking-widest text-slate-400 uppercase">
              Phase de Recrutement
            </h2>
            {isMyTurn ? (
              <div className="animate-fade-in">
                <div
                  className={`inline-block px-8 py-4 rounded-2xl border-2 mb-10 font-black uppercase tracking-widest transition-all ${draftSubStep === "discard" ? "bg-red-500/10 border-red-500 text-red-500" : "bg-green-500/10 border-green-500 text-green-500"}`}
                >
                  {draftSubStep === "discard"
                    ? "🔥 Défausser une carte"
                    : "👑 Choisir ton personnage"}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {draftPile.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => pickCharacter(c.id)}
                      className="bg-slate-800 border-2 border-slate-700 p-8 rounded-3xl hover:border-amber-500 transition-all flex flex-col items-center group shadow-xl hover:-translate-y-2"
                    >
                      <div className="w-14 h-14 bg-slate-700 rounded-full flex items-center justify-center mb-4 font-black text-xl group-hover:bg-amber-500 group-hover:text-black transition-colors">
                        {c.id}
                      </div>
                      <span className="font-black text-lg tracking-tight">
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/30 p-16 rounded-[3rem] border border-slate-700/50 backdrop-blur-sm">
                <p className="text-xl text-slate-500 font-bold uppercase tracking-widest">
                  C'est au tour de{" "}
                  <span className="text-white underline decoration-amber-500 underline-offset-8">
                    {activePlayers[currentPlayerIndex]?.pseudo}
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center mt-20">
            <h1 className="text-6xl font-black text-green-500 mb-6 italic tracking-tighter underline">
              LE JEU COMMENCE !
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.5em] animate-pulse">
              L'appel des personnages arrive...
            </p>
          </div>
        )}
      </div>
    );
  }
}

export default App;
