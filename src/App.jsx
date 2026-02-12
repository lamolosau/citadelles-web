import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

function App() {
  const [view, setView] = useState("login");
  const [pseudo, setPseudo] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomId, setRoomId] = useState(null);

  const [players, setPlayers] = useState([]);
  const [myId, setMyId] = useState(null);
  const [roomHostId, setRoomHostId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Refs pour la logique temps réel
  const myIdRef = useRef(null);
  const roomHostIdRef = useRef(null);
  const roomIdRef = useRef(null);
  const isSystemReadyRef = useRef(false); // Sécurité : "Temps de chauffe"

  useEffect(() => {
    myIdRef.current = myId;
    roomHostIdRef.current = roomHostId;
    roomIdRef.current = roomId;
  }, [myId, roomHostId, roomId]);

  // --- 1. RESTAURATION ---
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    setLoading(true);
    const savedRoom = localStorage.getItem("citadelles_room_id");
    const savedPlayerId = localStorage.getItem("citadelles_player_id");
    const savedCode = localStorage.getItem("citadelles_room_code");

    if (savedRoom && savedPlayerId && savedCode) {
      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", savedRoom)
        .single();

      if (room) {
        setRoomId(savedRoom);
        setMyId(savedPlayerId);
        setRoomCode(savedCode);
        setRoomHostId(room.host_id);

        const { data: pData } = await supabase
          .from("players")
          .select("pseudo")
          .eq("user_id", savedPlayerId)
          .eq("room_id", savedRoom)
          .single();
        if (pData) {
          setPseudo(pData.pseudo);
          setView("lobby");
        } else {
          clearSession();
        }
      } else {
        clearSession();
      }
    }
    setLoading(false);
  };

  const clearSession = () => {
    localStorage.clear();
    setView("login");
    setPlayers([]);
    setPseudo("");
    setRoomCode("");
    setRoomHostId(null);
    setMyId(null);
    setLoading(false);
  };

  // --- 2. ACTIONS ---

  const getUserId = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return data.session.user.id;
    const { data: authData } = await supabase.auth.signInAnonymously();
    return authData.user.id;
  };

  const createRoom = async () => {
    if (!pseudo) return alert("Choisis un pseudo !");
    setLoading(true);
    try {
      const userId = await getUserId();
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();

      const { data: room, error } = await supabase
        .from("rooms")
        .insert([{ code, host_id: userId, status: "waiting" }])
        .select()
        .single();

      if (error) throw error;

      await addPlayerToRoom(room.id, userId, pseudo);
      saveSession(room.id, userId, code);

      setMyId(userId);
      setRoomHostId(userId);
      setRoomCode(code);
      setRoomId(room.id);
      setView("lobby");
    } catch (e) {
      setErrorMsg(e.message);
    }
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!pseudo || !roomCode) return alert("Infos manquantes");
    setLoading(true);
    try {
      const userId = await getUserId();
      const { data: room, error } = await supabase
        .from("rooms")
        .select()
        .eq("code", roomCode)
        .single();

      if (error || !room) {
        setLoading(false);
        return alert("Room introuvable");
      }

      const { data: existing } = await supabase
        .from("players")
        .select()
        .eq("room_id", room.id)
        .eq("user_id", userId)
        .single();

      if (!existing) {
        await addPlayerToRoom(room.id, userId, pseudo);
      } else {
        if (existing.pseudo !== pseudo)
          await supabase
            .from("players")
            .update({ pseudo })
            .eq("id", existing.id);
      }

      saveSession(room.id, userId, roomCode);
      setMyId(userId);
      setRoomHostId(room.host_id);
      setRoomId(room.id);
      setView("lobby");
    } catch (e) {
      setErrorMsg(e.message);
    }
    setLoading(false);
  };

  const leaveRoom = async () => {
    if (myId && roomId) {
      await supabase
        .from("players")
        .delete()
        .match({ user_id: myId, room_id: roomId });
      if (myId === roomHostId && players.length > 1) {
        const nextPlayer = players.find((p) => p.user_id !== myId);
        if (nextPlayer) {
          await supabase
            .from("rooms")
            .update({ host_id: nextPlayer.user_id })
            .eq("id", roomId);
        }
      }
    }
    clearSession();
  };

  const saveSession = (rId, uId, code) => {
    localStorage.setItem("citadelles_room_id", rId);
    localStorage.setItem("citadelles_player_id", uId);
    localStorage.setItem("citadelles_room_code", code);
  };

  const addPlayerToRoom = async (roomId, userId, name) => {
    await supabase.from("players").insert([
      {
        room_id: roomId,
        user_id: userId,
        pseudo: name,
        joined_at: new Date(),
      },
    ]);
  };

  // --- 3. TEMPS RÉEL + NETTOYAGE SÉCURISÉ ---

  useEffect(() => {
    if (view !== "lobby" || !roomId || !myId) return;

    // RESET DU SYSTEME DE SECURITE
    isSystemReadyRef.current = false;
    // On ne permet le nettoyage que dans 3 secondes (Temps de chauffe)
    const safetyTimer = setTimeout(() => {
      isSystemReadyRef.current = true;
      console.log("Système de nettoyage : ACTIVÉ");
    }, 3000);

    const refreshState = async () => {
      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true });
      if (playersData) setPlayers(playersData);

      const { data: roomData } = await supabase
        .from("rooms")
        .select("host_id")
        .eq("id", roomId)
        .single();
      if (roomData) setRoomHostId(roomData.host_id);
    };

    refreshState();

    const channel = supabase.channel(`room_safe_${roomId}`, {
      config: { presence: { key: myId } },
    });

    // Écoute standard
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "players",
        filter: `room_id=eq.${roomId}`,
      },
      refreshState,
    );
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      },
      refreshState,
    );

    // ÉCOUTE DE PRÉSENCE (Le Nettoyeur)
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const onlineUserIds = Object.keys(state);

      // On lance le nettoyage
      secureCleanup(onlineUserIds);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          online_at: new Date().toISOString(),
          user_id: myId,
        });
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      supabase.removeChannel(channel);
    };
  }, [roomId, view, myId]);

  // Fonction de nettoyage BLINDÉE
  const secureCleanup = async (onlineUserIds) => {
    // 1. Si le système chauffe encore, on ne fait RIEN.
    if (!isSystemReadyRef.current) return;

    // 2. Si je ne suis pas l'hôte OFFICIEL (DB), je ne touche à rien.
    if (myIdRef.current !== roomHostIdRef.current) return;

    // 3. Récupérer la vraie liste DB
    const { data: dbPlayers } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomIdRef.current);
    if (!dbPlayers) return;

    // 4. Identifier les fantômes (Ceux en DB mais pas Online)
    const ghosts = dbPlayers.filter((p) => !onlineUserIds.includes(p.user_id));

    // 5. FILTRAGE DE SECURITE (Interdiction de se tuer soi-même)
    const ghostsToKill = ghosts.filter((g) => g.user_id !== myIdRef.current);

    if (ghostsToKill.length > 0) {
      console.log(
        "Nettoyage sécurisé des fantômes :",
        ghostsToKill.map((g) => g.pseudo),
      );
      const ids = ghostsToKill.map((g) => g.user_id);
      await supabase
        .from("players")
        .delete()
        .in("user_id", ids)
        .eq("room_id", roomIdRef.current);
    }
  };

  // --- RENDU ---
  if (loading)
    return (
      <div className="min-h-screen bg-slate-900 text-amber-500 flex items-center justify-center">
        Chargement...
      </div>
    );

  const isAmHost = myId && roomHostId && myId === roomHostId;

  if (view === "login") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-6xl font-extrabold text-amber-500 mb-8 uppercase tracking-widest">
          Citadelles
        </h1>
        {errorMsg && (
          <div className="text-red-400 mb-4 bg-red-900/20 p-2 rounded">
            {errorMsg}
          </div>
        )}
        <div className="bg-slate-800 p-8 rounded-2xl w-full max-w-md space-y-6 shadow-2xl border border-slate-700">
          <input
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 px-4 focus:border-amber-500 outline-none"
            placeholder="Ton Pseudo"
          />
          <button
            onClick={createRoom}
            className="w-full bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
          >
            CRÉER UNE TABLE
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-4 text-center font-mono uppercase"
              placeholder="CODE"
              maxLength={4}
            />
            <button
              onClick={joinRoom}
              className="flex-1 bg-slate-700 hover:bg-slate-600 font-bold py-3 rounded-xl"
            >
              REJOINDRE
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "lobby") {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center">
        <div className="w-full max-w-2xl mt-10 text-center relative">
          <button
            onClick={leaveRoom}
            className="absolute -top-10 right-0 text-red-500 hover:text-red-400 text-sm font-bold flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full border border-red-900"
          >
            QUITTER X
          </button>
          <p className="text-slate-400 uppercase tracking-widest text-sm mb-2">
            Code de la salle
          </p>
          <div className="bg-slate-800 border-2 border-amber-500/50 rounded-2xl p-6 mb-8 inline-block shadow-lg">
            <span className="text-5xl font-mono font-bold text-amber-500 tracking-[0.5em] ml-4">
              {roomCode}
            </span>
          </div>
        </div>
        <div className="w-full max-w-2xl bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-slate-300 mb-6 flex items-center gap-2">
            JOUEURS{" "}
            <span className="bg-amber-600 text-slate-900 text-xs px-2 py-1 rounded-full">
              {players.length}/8
            </span>
          </h2>
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center bg-slate-700/50 p-4 rounded-xl border border-slate-600"
              >
                <div className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center font-bold text-white mr-4">
                  {player.pseudo ? player.pseudo.charAt(0).toUpperCase() : "?"}
                </div>
                <span className="font-medium text-lg text-slate-200">
                  {player.pseudo}
                </span>
                {player.user_id === roomHostId && (
                  <span className="ml-auto text-xs text-amber-500 font-bold uppercase">
                    Hôte
                  </span>
                )}
                {player.user_id === myId && (
                  <span className="ml-2 text-xs text-slate-400 italic">
                    (Toi)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {isAmHost ? (
          <button className="mt-8 w-full max-w-md bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg text-xl transition-transform active:scale-95">
            LANCER LA PARTIE
          </button>
        ) : (
          <p className="mt-8 text-slate-500 animate-pulse">
            En attente de l'hôte...
          </p>
        )}
      </div>
    );
  }
  return <div>Erreur</div>;
}

export default App;
