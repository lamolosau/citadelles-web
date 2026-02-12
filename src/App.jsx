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
  const [currentTurnNumber, setCurrentTurnNumber] = useState(1);
  const [turnPhase, setTurnPhase] = useState("resource");
  const [drawOptions, setDrawOptions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getCharStyle = (charId) => {
    const char = CHARACTERS.find((c) => c.id === charId);
    if (!char) return "bg-slate-700 border-slate-500 text-slate-300";
    switch (char.color) {
      case "yellow":
        return "bg-yellow-900/50 border-yellow-500 text-yellow-500";
      case "blue":
        return "bg-blue-900/50 border-blue-500 text-blue-500";
      case "green":
        return "bg-green-900/50 border-green-500 text-green-500";
      case "red":
        return "bg-red-900/50 border-red-500 text-red-500";
      default:
        return "bg-slate-700 border-slate-400 text-slate-200";
    }
  };

  useEffect(() => {
    const restore = async () => {
      setLoading(true);
      const sRoomId = localStorage.getItem("citadelles_room_id");
      const sPlayerId = localStorage.getItem("citadelles_player_id");
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
            setRoomCode(room.code);
            setPseudo(p.pseudo);
            setGameStatus(room.status);
            setRoomHostId(room.host_id);
            setCurrentTurnNumber(room.current_character_turn || 1);
            setView(room.status === "waiting" ? "lobby" : "game");
          }
        }
      }
      setLoading(false);
    };
    restore();
  }, []);

  const clearSession = () => {
    localStorage.clear();
    setView("login");
    setRoomId(null);
    setMyId(null);
  };

  const createRoom = async () => {
    if (!pseudo) return;
    setLoading(true);
    const uid = await (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return data.session.user.id;
      const { data: authData } = await supabase.auth.signInAnonymously();
      return authData.user.id;
    })();
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const { data: room } = await supabase
      .from("rooms")
      .insert([{ code, host_id: uid, status: "waiting" }])
      .select()
      .single();
    await supabase.from("players").insert([
      {
        room_id: room.id,
        user_id: uid,
        pseudo,
        joined_at: new Date(),
        gold: 2,
        hand: [],
        city: [],
        characters: [],
        played_characters: [],
      },
    ]);
    localStorage.setItem("citadelles_room_id", room.id);
    localStorage.setItem("citadelles_player_id", uid);
    setMyId(uid);
    setRoomId(room.id);
    setRoomCode(code);
    setRoomHostId(uid);
    setView("lobby");
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!pseudo || !roomCode) return;
    setLoading(true);
    const uid = await (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return data.session.user.id;
      const { data: authData } = await supabase.auth.signInAnonymously();
      return authData.user.id;
    })();
    const { data: room } = await supabase
      .from("rooms")
      .select()
      .eq("code", roomCode)
      .single();
    if (room) {
      const { data: ex } = await supabase
        .from("players")
        .select()
        .eq("room_id", room.id)
        .eq("user_id", uid)
        .single();
      if (!ex)
        await supabase.from("players").insert([
          {
            room_id: room.id,
            user_id: uid,
            pseudo,
            joined_at: new Date(),
            gold: 2,
            hand: [],
            city: [],
            characters: [],
            played_characters: [],
          },
        ]);
      localStorage.setItem("citadelles_room_id", room.id);
      localStorage.setItem("citadelles_player_id", uid);
      setMyId(uid);
      setRoomId(room.id);
      setRoomHostId(room.host_id);
      setView("lobby");
    }
    setLoading(false);
  };

  const leaveRoom = async () => {
    if (myId && roomId)
      await supabase
        .from("players")
        .delete()
        .match({ user_id: myId, room_id: roomId });
    clearSession();
  };

  const shuffle = (array) => {
    let m = array.length,
      t,
      i;
    while (m) {
      i = Math.floor(Math.random() * m--);
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
    return array;
  };

  const startGame = async () => {
    const active = players.filter((p) => onlineIds.includes(p.user_id));
    if (active.length < 2) return alert("2 joueurs min.");
    setLoading(true);
    let d = shuffle([...DISTRICTS]);
    for (const p of active) {
      const initialHand = d.splice(0, 4).map((c) => c.id);
      await supabase
        .from("players")
        .update({
          gold: 2,
          hand: initialHand,
          city: [],
          characters: [],
          played_characters: [],
        })
        .eq("id", p.id);
    }
    await prepareDraft(d.map((c) => c.id));
    setLoading(false);
  };

  const prepareDraft = async (idStack) => {
    let c = shuffle([...CHARACTERS]);
    const fd = c.pop();
    await supabase
      .from("players")
      .update({ characters: [], played_characters: [] })
      .eq("room_id", roomId);
    await supabase
      .from("rooms")
      .update({
        status: "drafting",
        district_stack: idStack,
        draft_pile: c,
        face_down_char: fd.id,
        current_player_index: 0,
        current_character_turn: 1,
        draft_sub_step: "pick",
      })
      .eq("id", roomId);
  };

  // --- LOGIQUE DRAFT 2 JOUEURS (RÈGLE DUEL CORRIGÉE) ---
  const pickCharacter = async (cid) => {
    const active = players.filter((p) => onlineIds.includes(p.user_id));
    const me = active.find((p) => p.user_id === myId);
    const pile = draftPile.filter((x) => x.id !== cid);

    if (active.length === 2) {
      if (draftSubStep === "pick") {
        const newChars = [...(me.characters || []), cid];
        await supabase
          .from("players")
          .update({ characters: newChars })
          .eq("user_id", myId)
          .eq("room_id", roomId);

        // RÈGLE DU DERNIER CHOIX : S'il ne reste qu'une carte après mon choix, le draft s'arrête net.
        if (pile.length === 1) {
          await supabase
            .from("rooms")
            .update({
              status: "playing",
              draft_pile: [],
              draft_sub_step: "pick",
              current_character_turn: 1,
            })
            .eq("id", roomId);
        }
        // RÈGLE DU PREMIER CHOIX : Pile de 7 -> 6, on passe sans défausser.
        else if (draftPile.length === 7) {
          await supabase
            .from("rooms")
            .update({
              draft_pile: pile,
              current_player_index: (currentPlayerIndex + 1) % 2,
            })
            .eq("id", roomId);
        }
        // CAS GÉNÉRAL : On doit défausser
        else {
          await supabase
            .from("rooms")
            .update({
              draft_pile: pile,
              draft_sub_step: "discard",
            })
            .eq("id", roomId);
        }
      } else {
        // ÉTAPE DÉFAUSSE : On retire la carte et on passe au suivant.
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
  };

  // --- ACTIONS DE TOUR ---
  const takeGold = async () => {
    const me = players.find((p) => p.user_id === myId);
    await supabase
      .from("players")
      .update({ gold: (me.gold || 0) + 2 })
      .eq("user_id", myId)
      .eq("room_id", roomId);
    setTurnPhase("build");
  };

  const startDraw = async () => {
    try {
      const { data: r } = await supabase
        .from("rooms")
        .select("district_stack")
        .eq("id", roomId)
        .single();
      let stack = (r.district_stack || []).map((item) =>
        typeof item === "object" ? item.id : item,
      );
      if (stack.length < 2) stack = shuffle([...DISTRICTS]).map((c) => c.id);
      const stackToUse = [...stack];
      const opts = stackToUse.splice(0, 2);
      setDrawOptions(opts);
      await supabase
        .from("rooms")
        .update({ district_stack: stackToUse })
        .eq("id", roomId);
      setTurnPhase("drawing");
    } catch (err) {
      setTurnPhase("resource");
    }
  };

  const pickDrawnCard = async (cid) => {
    const me = players.find((p) => p.user_id === myId);
    await supabase
      .from("players")
      .update({ hand: [...(me.hand || []), cid] })
      .eq("user_id", myId)
      .eq("room_id", roomId);
    setDrawOptions([]);
    setTurnPhase("build");
  };

  const buildDistrict = async (cid) => {
    const me = players.find((p) => p.user_id === myId);
    const card = DISTRICTS.find((d) => d.id === cid);
    if (!card || me.gold < card.cost) return;
    await supabase
      .from("players")
      .update({
        city: [...(me.city || []), cid],
        hand: (me.hand || []).filter((id) => id !== cid),
        gold: me.gold - card.cost,
      })
      .eq("user_id", myId)
      .eq("room_id", roomId);
    setTurnPhase("end");
  };

  const endTurn = async () => {
    const me = players.find((p) => p.user_id === myId);
    await supabase
      .from("players")
      .update({
        played_characters: [...(me.played_characters || []), currentTurnNumber],
      })
      .eq("user_id", myId)
      .eq("room_id", roomId);
    const nextCall = currentTurnNumber + 1;
    if (nextCall > 8) {
      const { data: r } = await supabase
        .from("rooms")
        .select("district_stack")
        .eq("id", roomId)
        .single();
      await prepareDraft(r.district_stack || []);
    } else {
      await supabase
        .from("rooms")
        .update({ current_character_turn: nextCall })
        .eq("id", roomId);
    }
    setTurnPhase("resource");
  };

  const skipChar = async () => {
    const next = currentTurnNumber + 1;
    if (next > 8) {
      const { data: r } = await supabase
        .from("rooms")
        .select("district_stack")
        .eq("id", roomId)
        .single();
      await prepareDraft(r.district_stack || []);
    } else
      await supabase
        .from("rooms")
        .update({ current_character_turn: next })
        .eq("id", roomId);
  };

  // --- TEMPS RÉEL ---
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
        setCurrentTurnNumber(r.current_character_turn || 1);
        if (r.status !== "waiting") setView("game");
        else setView("lobby");
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
        const cOn = Object.keys(state);
        setOnlineIds(cOn);
        const active = playersRef.current.filter((p) =>
          cOn.includes(p.user_id),
        );
        if (active.length > 0 && !cOn.includes(roomHostIdRef.current)) {
          setTimeout(() => {
            if (active[0].user_id === myIdRef.current)
              supabase
                .from("rooms")
                .update({ host_id: myIdRef.current })
                .eq("id", roomIdRef.current)
                .then();
          }, 5000);
        }
      })
      .subscribe(async (s) => {
        if (s === "SUBSCRIBED")
          await channel.track({ online_at: new Date().toISOString() });
      });
    return () => supabase.removeChannel(channel);
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
    const active = players.filter((p) => onlineIds.includes(p.user_id));
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
            Garde rapprochée ({active.length})
          </h2>
          <div className="space-y-3">
            {active.map((p) => (
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
    const activeOn = players.filter((p) => onlineIds.includes(p.user_id));
    const activeChar = CHARACTERS.find((c) => c.id === currentTurnNumber);
    const isMyCharTurn =
      (me?.characters || []).includes(currentTurnNumber) &&
      !(me?.played_characters || []).includes(currentTurnNumber);
    const owner = players.find((p) =>
      (p.characters || []).includes(currentTurnNumber),
    );

    return (
      <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center w-full">
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
            {activeOn[currentPlayerIndex]?.user_id === myId ? (
              <div className="animate-fade-in">
                <div
                  className={`inline-block px-8 py-4 rounded-2xl border-2 mb-10 font-black uppercase tracking-widest transition-all ${draftSubStep === "discard" ? "bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "bg-green-500/10 border-green-500 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]"}`}
                >
                  {draftSubStep === "discard"
                    ? "🔥 Défausser une carte (SECRET)"
                    : "👑 Choisir ton personnage"}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {draftPile.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => pickCharacter(c.id)}
                      className="bg-slate-800 border-2 border-slate-700 p-8 rounded-3xl hover:border-amber-500 transition-all flex flex-col items-center group shadow-xl hover:-translate-y-2"
                    >
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 font-black text-xl border-2 transition-colors ${getCharStyle(c.id)}`}
                      >
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
                    {activeOn[currentPlayerIndex]?.pseudo}
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest text-center">
                Ma Cité ({(me?.city || []).length})
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {(me?.city || []).map((id) => {
                  const c = DISTRICTS.find((d) => d.id === id);
                  if (!c) return null;
                  return (
                    <div
                      key={id}
                      className={`p-3 rounded-xl text-xs font-bold border ${c.color === "blue" ? "bg-blue-900/40 border-blue-500 text-blue-300" : c.color === "red" ? "bg-red-900/40 border-red-500 text-red-300" : c.color === "green" ? "bg-green-900/40 border-green-500 text-green-300" : c.color === "yellow" ? "bg-yellow-900/40 border-yellow-500 text-yellow-300" : "bg-purple-900/40 border-purple-500 text-purple-300"}`}
                    >
                      {c.name}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl relative overflow-hidden">
                <div className="absolute top-4 right-6 text-[10px] font-black text-slate-600 uppercase">
                  Appel {currentTurnNumber}/8
                </div>
                <div className="flex flex-col items-center mb-8">
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 font-black text-3xl border-4 ${getCharStyle(currentTurnNumber)}`}
                  >
                    {currentTurnNumber}
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter">
                    {activeChar?.name}
                  </h2>
                </div>

                {isMyCharTurn ? (
                  <div className="space-y-6">
                    {turnPhase === "resource" && (
                      <div className="grid grid-cols-2 gap-4 animate-fade-in">
                        <button
                          onClick={takeGold}
                          className="bg-yellow-600 p-6 rounded-2xl font-black text-xl hover:bg-yellow-500 shadow-lg"
                        >
                          PRENDRE 2 OR
                        </button>
                        <button
                          onClick={startDraw}
                          className="bg-blue-600 p-6 rounded-2xl font-black text-xl hover:bg-blue-500 shadow-lg"
                        >
                          PIOCHER 2
                        </button>
                      </div>
                    )}
                    {turnPhase === "drawing" && (
                      <div className="grid grid-cols-2 gap-4 animate-fade-in">
                        {drawOptions.map((id) => {
                          const c = DISTRICTS.find((d) => d.id === id);
                          if (!c) return null;
                          return (
                            <button
                              key={id}
                              onClick={() => pickDrawnCard(id)}
                              className="bg-slate-700 p-5 rounded-2xl border-2 border-blue-500 font-bold hover:bg-slate-600 text-sm text-left"
                            >
                              <p className="font-black text-lg">{c.name}</p>
                              <p className="text-xs opacity-60 italic">
                                {c.color} - {c.cost} PO
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {turnPhase === "build" && (
                      <div className="space-y-4 animate-fade-in">
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest text-center">
                          Bâtir un quartier ?
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center p-2">
                          {(me?.hand || []).map((id) => {
                            const c = DISTRICTS.find((d) => d.id === id);
                            if (!c) return null;
                            const can =
                              (me?.gold || 0) >= c.cost &&
                              !(me?.city || []).includes(id);
                            return (
                              <button
                                key={id}
                                onClick={() => buildDistrict(id)}
                                disabled={!can}
                                className={`w-[130px] p-4 rounded-2xl border-2 text-center transition-all ${can ? "bg-slate-700 border-green-500 hover:-translate-y-1" : "opacity-20 grayscale border-slate-700"}`}
                              >
                                <span className="block font-black text-xs mb-1 leading-tight">
                                  {c.name}
                                </span>
                                <span className="text-[10px] font-bold text-yellow-500">
                                  {c.cost} PO
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setTurnPhase("end")}
                          className="w-full text-slate-500 font-black text-[10px] uppercase hover:text-white pt-2"
                        >
                          Ne rien bâtir
                        </button>
                      </div>
                    )}
                    {turnPhase === "end" && (
                      <button
                        onClick={endTurn}
                        className="w-full bg-amber-600 p-6 rounded-2xl font-black text-xl shadow-xl shadow-amber-900/20 hover:bg-amber-500 animate-fade-in"
                      >
                        TERMINER MON TOUR
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 opacity-50">
                    {owner ? (
                      <p className="font-bold text-xl uppercase tracking-widest italic">
                        Tour de {owner.pseudo}...
                      </p>
                    ) : (
                      <div>
                        <p className="font-bold text-slate-500 uppercase tracking-widest mb-4">
                          Personnage absent
                        </p>
                        {myId === roomHostId && (
                          <button
                            onClick={skipChar}
                            className="bg-slate-700 px-6 py-2 rounded-full text-[10px] font-black hover:bg-slate-600 transition-colors"
                          >
                            PASSER AU SUIVANT (HÔTE)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700">
                <h3 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">
                  Ma Main ({(me?.hand || []).length})
                </h3>
                <div className="flex flex-wrap gap-2 pb-2">
                  {(me?.hand || []).map((id) => {
                    const c = DISTRICTS.find((d) => d.id === id);
                    if (!c) return null;
                    return (
                      <div
                        key={id}
                        className="w-[100px] bg-slate-900 border border-slate-700 p-3 rounded-xl flex flex-col items-center text-center shadow-lg"
                      >
                        <div
                          className={`w-3 h-3 rounded-full mb-2 ${c.color === "blue" ? "bg-blue-500" : c.color === "red" ? "bg-red-500" : c.color === "green" ? "bg-green-500" : c.color === "yellow" ? "bg-yellow-500" : "bg-purple-500"}`}
                        ></div>
                        <span className="text-[10px] font-black leading-tight mb-1">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-yellow-500 font-bold">
                          {c.cost} PO
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default App;
