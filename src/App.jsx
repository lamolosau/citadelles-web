import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { DISTRICTS, CHARACTERS } from "./cards";

// --- FONTS & STYLES CSS PURES ---
const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');
body { font-family: 'MedievalSharp', cursive; background-color: #0c0a09; color: #fffbeb; overflow: hidden; }
.card-shadow { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3); }
.inner-shadow { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.6); }
`;

const getCharColors = (id) => {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c)
    return {
      border: "border-stone-600",
      bg: "bg-stone-800",
      text: "text-stone-400",
    };
  switch (c.color) {
    case "yellow":
      return {
        border: "border-amber-500",
        bg: "bg-amber-900/50",
        text: "text-amber-500",
      };
    case "blue":
      return {
        border: "border-sky-600",
        bg: "bg-sky-900/50",
        text: "text-sky-400",
      };
    case "green":
      return {
        border: "border-emerald-600",
        bg: "bg-emerald-900/50",
        text: "text-emerald-400",
      };
    case "red":
      return {
        border: "border-red-600",
        bg: "bg-red-900/50",
        text: "text-red-500",
      };
    default:
      return {
        border: "border-stone-400",
        bg: "bg-stone-700/50",
        text: "text-stone-300",
      };
  }
};

// --- COMPOSANT CARTE (CSS PUR) ---
const DistrictCard = ({ id, small, onClick, disabled }) => {
  const c = DISTRICTS.find((d) => d.id === id);
  if (!c) return null;

  let colors = {
    border: "border-purple-500",
    bg: "bg-purple-950",
    text: "text-purple-300",
  };
  if (c.color === "yellow")
    colors = {
      border: "border-amber-500",
      bg: "bg-amber-950",
      text: "text-amber-300",
    };
  if (c.color === "blue")
    colors = {
      border: "border-sky-600",
      bg: "bg-sky-950",
      text: "text-sky-300",
    };
  if (c.color === "green")
    colors = {
      border: "border-emerald-600",
      bg: "bg-emerald-950",
      text: "text-emerald-300",
    };
  if (c.color === "red")
    colors = {
      border: "border-red-600",
      bg: "bg-red-950",
      text: "text-red-300",
    };

  return (
    <div
      onClick={!disabled ? onClick : null}
      className={`relative flex flex-col border-[3px] rounded-lg overflow-hidden transition-all duration-300
            ${small ? "w-12 h-16 text-[8px]" : "w-28 h-44 text-xs"} ${colors.border}
            ${disabled ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer card-shadow"}
            bg-gradient-to-br from-stone-800 to-stone-950`}
    >
      {/* En-tête (Coût) */}
      <div
        className={`p-1 flex justify-between items-center ${colors.bg} border-b ${colors.border}`}
      >
        <div
          className={`rounded-full border ${colors.border} bg-stone-900 flex items-center justify-center font-bold ${small ? "w-4 h-4" : "w-6 h-6"} ${colors.text}`}
        >
          {c.cost}
        </div>
      </div>

      {/* Corps (Placeholder visuel) */}
      <div className="flex-1 relative opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent to-black">
        <div
          className={`absolute inset-2 border border-dashed ${colors.border} rounded opacity-50`}
        ></div>
      </div>

      {/* Pied de page (Nom) */}
      <div
        className={`p-1 text-center font-bold uppercase tracking-tighter ${colors.bg} border-t ${colors.border} ${colors.text} leading-tight truncate`}
      >
        {c.name}
      </div>
    </div>
  );
};

function App() {
  // --- ÉTATS (Logique V44 préservée) ---
  const [view, setView] = useState("login");
  const [pseudo, setPseudo] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [onlineIds, setOnlineIds] = useState([]);
  const [myId, setMyId] = useState(null);
  const [roomHostId, setRoomHostId] = useState(null);
  const [kingPlayerId, setKingPlayerId] = useState(null);
  const [gameStatus, setGameStatus] = useState("waiting");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [draftPile, setDraftPile] = useState([]);
  const [faceUpChars, setFaceUpChars] = useState([]);
  const [draftSubStep, setDraftSubStep] = useState("pick");
  const [currentTurnNumber, setCurrentTurnNumber] = useState(1);
  const [turnPhase, setTurnPhase] = useState("resource");
  const [drawOptions, setDrawOptions] = useState([]);
  const [killedId, setKilledId] = useState(null);
  const [robbedId, setRobbedId] = useState(null);
  const [taxCollected, setTaxCollected] = useState(false);
  const [buildsCount, setBuildsCount] = useState(0);
  const [firstBuilderId, setFirstBuilderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const myIdRef = useRef(null);
  const roomIdRef = useRef(null);
  const playersRef = useRef([]);
  const roomHostIdRef = useRef(null);
  const gameStatusRef = useRef("waiting");
  const hostTransferTimeoutRef = useRef(null);

  useEffect(() => {
    myIdRef.current = myId;
    roomIdRef.current = roomId;
    playersRef.current = players;
    roomHostIdRef.current = roomHostId;
    gameStatusRef.current = gameStatus;
  }, [myId, roomId, players, roomHostId, gameStatus]);

  // --- LOGIQUE (Restauration, Realtime, Game Loop) ---
  useEffect(() => {
    const restore = async () => {
      setLoading(true);
      const sR = localStorage.getItem("citadelles_room_id");
      const sP = localStorage.getItem("citadelles_player_id");
      if (sR && sP) {
        const { data: rm } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", sR)
          .single();
        if (rm) {
          const { data: p } = await supabase
            .from("players")
            .select("*")
            .eq("user_id", sP)
            .eq("room_id", sR)
            .single();
          if (p) {
            setMyId(sP);
            setRoomId(sR);
            setRoomCode(rm.code);
            setPseudo(p.pseudo);
            setGameStatus(rm.status);
            setRoomHostId(rm.host_id);
            setKingPlayerId(rm.king_player_id);
            setCurrentTurnNumber(rm.current_character_turn || 1);
            setKilledId(rm.killed_char_id);
            setRobbedId(rm.robbed_char_id);
            setFirstBuilderId(rm.first_builder_id);
            setFaceUpChars(rm.face_up_chars || []);
            setView(
              rm.status === "waiting"
                ? "lobby"
                : rm.status === "finished"
                  ? "finished"
                  : "game",
            );
          }
        }
      }
      setLoading(false);
    };
    restore();
  }, []);
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
        setKilledId(r.killed_char_id);
        setRobbedId(r.robbed_char_id);
        setKingPlayerId(r.king_player_id);
        setFirstBuilderId(r.first_builder_id);
        setFaceUpChars(r.face_up_chars || []);
        if (r.status === "finished") setView("finished");
        else if (r.status !== "waiting") setView("game");
        else setView("lobby");
        const hostExists = ps.some((p) => p.user_id === r.host_id);
        if (!hostExists && ps.length > 0 && ps[0].user_id === myId) {
          await supabase
            .from("rooms")
            .update({ host_id: myId })
            .eq("id", roomId);
        }
      }
    };
    refresh();
    const c = supabase.channel(`room-${roomId}`, {
      config: { presence: { key: myId } },
    });
    c.on(
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
        const s = c.presenceState();
        const on = Object.keys(s);
        setOnlineIds(on);
        const chi = roomHostIdRef.current;
        if (on.includes(chi)) {
          if (hostTransferTimeoutRef.current)
            clearTimeout(hostTransferTimeoutRef.current);
        } else if (!hostTransferTimeoutRef.current) {
          const d = gameStatusRef.current === "waiting" ? 3000 : 15000;
          hostTransferTimeoutRef.current = setTimeout(async () => {
            const me = playersRef.current.find(
              (p) => p.user_id === myIdRef.current,
            );
            const act = playersRef.current.filter((p) =>
              on.includes(p.user_id),
            );
            if (me && act.length > 0 && act[0].user_id === myIdRef.current)
              await supabase
                .from("rooms")
                .update({ host_id: myIdRef.current })
                .eq("id", roomIdRef.current);
          }, d);
        }
      })
      .subscribe(async (s) => {
        if (s === "SUBSCRIBED")
          await c.track({ online_at: new Date().toISOString() });
      });
    return () => {
      supabase.removeChannel(c);
      if (hostTransferTimeoutRef.current)
        clearTimeout(hostTransferTimeoutRef.current);
    };
  }, [roomId, myId]);

  // --- ACTIONS (Draft & Jeu) ---
  const pickCharacter = async (cid) => {
    const me = players.find((p) => p.user_id === myId);
    if ((me?.characters || []).includes(cid)) return;
    const pc = players.length;
    if (pc === 2) {
      const pile = draftPile.filter((x) => x.id !== cid);
      if (draftSubStep === "pick") {
        const newC = [...(me.characters || []), cid];
        await supabase
          .from("players")
          .update({ characters: newC })
          .eq("user_id", myId)
          .eq("room_id", roomId);
        if (pile.length === 1)
          await supabase
            .from("rooms")
            .update({
              status: "playing",
              draft_pile: [],
              current_character_turn: 1,
            })
            .eq("id", roomId);
        else if (draftPile.length === 7)
          await supabase
            .from("rooms")
            .update({
              draft_pile: pile,
              current_player_index: (currentPlayerIndex + 1) % 2,
            })
            .eq("id", roomId);
        else
          await supabase
            .from("rooms")
            .update({ draft_pile: pile, draft_sub_step: "discard" })
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
    } else {
      const newC = [...(me.characters || []), cid];
      await supabase
        .from("players")
        .update({ characters: newC })
        .eq("user_id", myId)
        .eq("room_id", roomId);
      const pile = draftPile.filter((x) => x.id !== cid);
      const next = (currentPlayerIndex + 1) % pc;
      const start = players.findIndex((p) => p.user_id === kingPlayerId) || 0;
      if (pc === 3 && pile.length === 1)
        await supabase
          .from("rooms")
          .update({
            status: "playing",
            draft_pile: [],
            current_character_turn: 1,
          })
          .eq("id", roomId);
      else if (pc > 3 && next === start)
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
          .update({ draft_pile: pile, current_player_index: next })
          .eq("id", roomId);
    }
  };
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
    const me = players.find((p) => p.user_id === myId);
    const { data: r } = await supabase
      .from("rooms")
      .select("district_stack")
      .eq("id", roomId)
      .single();
    let s = (r.district_stack || []).map((i) =>
      typeof i === "object" ? i.id : i,
    );
    const hasObs = (me?.city || []).some(
      (id) => DISTRICTS.find((d) => d.id === id).name === "Observatoire",
    );
    const count = hasObs ? 3 : 2;
    const opts = s.splice(0, count);
    setDrawOptions(opts);
    await supabase.from("rooms").update({ district_stack: s }).eq("id", roomId);
    setTurnPhase("drawing");
  };
  const pickDrawnCard = async (cid) => {
    const me = players.find((p) => p.user_id === myId);
    const unpicked = drawOptions.filter((id) => id !== cid);
    const { data: r } = await supabase
      .from("rooms")
      .select("district_stack")
      .eq("id", roomId)
      .single();
    await supabase
      .from("rooms")
      .update({ district_stack: [...(r.district_stack || []), ...unpicked] })
      .eq("id", roomId);
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
    const c = DISTRICTS.find((d) => d.id === cid);
    if (me.gold < c.cost) return alert("Pas assez d'or");
    const nc = [...(me.city || []), cid];
    await supabase
      .from("players")
      .update({
        city: nc,
        hand: me.hand.filter((id) => id !== cid),
        gold: me.gold - c.cost,
      })
      .eq("user_id", myId)
      .eq("room_id", roomId);
    setBuildsCount((p) => p + 1);
    if (buildsCount + 1 >= (currentTurnNumber === 7 ? 3 : 1))
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
    const next = currentTurnNumber + 1;
    if (next > 8) {
      const { data: ps } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId);
      if (ps.some((p) => (p.city || []).length >= 8))
        await supabase
          .from("rooms")
          .update({ status: "finished" })
          .eq("id", roomId);
      else {
        const { data: r } = await supabase
          .from("rooms")
          .select("district_stack")
          .eq("id", roomId)
          .single();
        prepareDraft(r.district_stack);
      }
    } else
      await supabase
        .from("rooms")
        .update({ current_character_turn: next })
        .eq("id", roomId);
    setTurnPhase("resource");
  };
  const useAssassinPower = async (tid) => {
    await supabase
      .from("rooms")
      .update({ killed_char_id: tid })
      .eq("id", roomId);
    setTurnPhase("resource");
  };

  // --- NAVIGATION ---
  const getUserId = async () => {
    const { data } = await supabase.auth.getSession();
    return (
      data.session?.user?.id ||
      (await supabase.auth.signInAnonymously()).data.user.id
    );
  };
  const createRoom = async () => {
    if (!pseudo) return;
    const u = await getUserId();
    const c = Math.random().toString(36).substring(2, 6).toUpperCase();
    const { data: r } = await supabase
      .from("rooms")
      .insert([{ code: c, host_id: u, king_player_id: u }])
      .select()
      .single();
    await supabase
      .from("players")
      .insert([{ room_id: r.id, user_id: u, pseudo, gold: 2 }]);
    localStorage.setItem("citadelles_room_id", r.id);
    localStorage.setItem("citadelles_player_id", u);
    setMyId(u);
    setRoomId(r.id);
    setRoomCode(c);
    setView("lobby");
  };
  const joinRoom = async () => {
    if (!pseudo || !roomCode) return;
    const u = await getUserId();
    const { data: r } = await supabase
      .from("rooms")
      .select()
      .eq("code", roomCode)
      .single();
    if (r) {
      await supabase
        .from("players")
        .insert([{ room_id: r.id, user_id: u, pseudo, gold: 2 }]);
      localStorage.setItem("citadelles_room_id", r.id);
      localStorage.setItem("citadelles_player_id", u);
      setMyId(u);
      setRoomId(r.id);
      setView("lobby");
    }
  };
  const startGame = async () => {
    const d = DISTRICTS.sort(() => Math.random() - 0.5);
    for (const p of players)
      await supabase
        .from("players")
        .update({ hand: d.splice(0, 4).map((c) => c.id) })
        .eq("id", p.id);
    const pc = players.length;
    let c = CHARACTERS.sort(() => Math.random() - 0.5);
    const fd = c.pop();
    const fu = c.splice(0, pc === 4 ? 2 : pc === 5 ? 1 : 0);
    await supabase
      .from("rooms")
      .update({
        status: "drafting",
        district_stack: d.map((c) => c.id),
        draft_pile: c,
        face_down_char: fd.id,
        face_up_chars: fu,
        current_player_index: 0,
        current_character_turn: 1,
      })
      .eq("id", roomId);
  };
  const prepareDraft = async (stack) => {
    const pc = playersRef.current.length;
    let c = CHARACTERS.sort(() => Math.random() - 0.5);
    const fd = c.pop();
    let fuCount = pc === 4 ? 2 : pc === 5 ? 1 : 0;
    const fu = c.splice(0, fuCount);
    await supabase
      .from("players")
      .update({ characters: [], played_characters: [] })
      .eq("room_id", roomId);
    let si = playersRef.current.findIndex((p) => p.user_id === kingPlayerId);
    if (si === -1) si = 0;
    await supabase
      .from("rooms")
      .update({
        status: "drafting",
        district_stack: stack,
        draft_pile: c,
        face_down_char: fd.id,
        face_up_chars: fu,
        current_player_index: si,
        current_character_turn: 1,
        draft_sub_step: "pick",
        killed_char_id: null,
        robbed_char_id: null,
      })
      .eq("id", roomId);
  };

  // --- RENDU (Design Médiéval V49 - FIXED PROPORTIONS) ---
  if (view === "login")
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

  if (view === "lobby")
    return (
      <div className="min-h-screen flex flex-col items-center p-10 bg-gradient-to-b from-stone-900 to-black text-amber-50 relative">
        <style>{GLOBAL_STYLES}</style>
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
                {p.user_id === roomHostId && (
                  <span className="text-xs bg-amber-900/50 text-amber-500 px-2 py-1 rounded border border-amber-800 uppercase font-bold">
                    Hôte
                  </span>
                )}
              </div>
            ))}
          </div>
          {myId === roomHostId && (
            <button
              onClick={startGame}
              className="w-full mt-4 bg-green-900 hover:bg-green-800 text-green-100 p-5 rounded border-b-4 border-green-950 font-bold text-2xl uppercase shadow-lg tracking-[0.2em] transition-all"
            >
              Commencer
            </button>
          )}
        </div>
      </div>
    );

  if (view === "game") {
    const me = players.find((p) => p.user_id === myId);
    if (!me) return null;
    const isMyDraftTurn =
      gameStatus === "drafting" &&
      players[currentPlayerIndex]?.user_id === myId;
    const activeChar = CHARACTERS.find((c) => c.id === currentTurnNumber);
    const isMyCharTurn =
      gameStatus === "playing" &&
      (me?.characters || []).includes(currentTurnNumber) &&
      !(me?.played_characters || []).includes(currentTurnNumber);
    const opponents = players.filter((p) => p.user_id !== myId);

    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0c0a09] text-amber-50 select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 via-black to-black">
        <style>{GLOBAL_STYLES}</style>

        {/* 1. ADVERSAIRES (Haut - Fixe 180px) */}
        <div className="h-[180px] shrink-0 bg-stone-900/90 border-b-4 border-stone-800 shadow-xl flex items-center px-4 gap-4 overflow-x-auto z-20 inner-shadow">
          {opponents.map((opp) => (
            <div
              key={opp.id}
              className="min-w-[200px] h-[150px] bg-stone-800/50 rounded border-2 border-stone-700 p-3 flex flex-col gap-2 relative shadow-lg"
            >
              <div className="flex justify-between items-center border-b border-stone-700 pb-1 mb-1">
                <span className="font-bold text-amber-100 truncate max-w-[100px] tracking-wide">
                  {opp.pseudo}
                </span>
                <div className="flex gap-2 text-xs">
                  <span className="text-yellow-500 font-bold">
                    💰{opp.gold}
                  </span>
                  <span className="text-blue-400 font-bold">
                    🎴{opp.hand.length}
                  </span>
                </div>
              </div>
              <div className="flex-1 flex flex-wrap content-start gap-1 overflow-hidden bg-black/30 p-1 rounded inner-shadow">
                {opp.city.map((cid, i) => {
                  const c = DISTRICTS.find((d) => d.id === cid);
                  let color = "bg-stone-700 border-stone-500";
                  if (c.color === "yellow")
                    color = "bg-amber-600 border-amber-400";
                  if (c.color === "blue") color = "bg-sky-600 border-sky-400";
                  if (c.color === "green")
                    color = "bg-emerald-600 border-emerald-400";
                  if (c.color === "red") color = "bg-red-600 border-red-400";
                  if (c.color === "purple")
                    color = "bg-purple-600 border-purple-400";
                  return (
                    <div
                      key={i}
                      className={`w-6 h-8 rounded border-2 ${color}`}
                      title={c.name}
                    />
                  );
                })}
              </div>
              {opp.user_id === kingPlayerId && (
                <div className="absolute -top-3 -right-3 text-3xl drop-shadow-md">
                  👑
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 2. PLATEAU CENTRAL (Flexible) */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-6 overflow-hidden">
          {/* DRAFT */}
          {isMyDraftTurn && (
            <div className="bg-stone-900/95 p-8 rounded-lg border-4 border-amber-800 shadow-[0_0_100px_rgba(0,0,0,1)] text-center z-50 animate-in fade-in zoom-in duration-300 max-h-full overflow-y-auto">
              <h3 className="text-4xl text-amber-500 mb-2 uppercase tracking-[0.2em]">
                {draftSubStep === "discard" ? "Défausser" : "Recruter"}
              </h3>
              <p className="text-stone-400 mb-8 italic tracking-wider">
                {draftSubStep === "discard"
                  ? "Cliquez sur une carte pour l'éliminer face cachée."
                  : "Choisissez le personnage que vous incarnerez."}
              </p>
              <div className="flex flex-wrap gap-6 justify-center">
                {draftPile.map((c) => {
                  const style = getCharColors(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => pickCharacter(c.id)}
                      className={`w-36 h-52 rounded-lg border-4 ${style.border} ${style.bg} flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform shadow-2xl relative overflow-hidden group`}
                    >
                      <span
                        className={`text-7xl font-black ${style.text} drop-shadow-lg`}
                      >
                        {c.id}
                      </span>
                      <span
                        className={`text-sm uppercase font-bold tracking-widest ${style.text}`}
                      >
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TOUR ACTIF */}
          {gameStatus === "playing" && !isMyDraftTurn && (
            <div className="flex flex-col items-center max-w-2xl w-full h-full justify-center pb-10">
              <div className="flex flex-col items-center mb-8 relative scale-125">
                <div
                  className={`w-32 h-32 rounded-full border-[6px] ${getCharColors(currentTurnNumber).border} bg-stone-900 flex items-center justify-center text-6xl font-bold shadow-[0_0_40px_rgba(0,0,0,0.8)] z-10 ${getCharColors(currentTurnNumber).text}`}
                >
                  {currentTurnNumber}
                </div>
                <div
                  className={`mt-[-20px] pt-8 pb-3 px-12 ${getCharColors(currentTurnNumber).bg} border-x-4 border-b-4 ${getCharColors(currentTurnNumber).border} rounded-b-2xl shadow-lg`}
                >
                  <h2
                    className={`text-2xl font-bold uppercase tracking-[0.2em] ${getCharColors(currentTurnNumber).text}`}
                  >
                    {activeChar?.name}
                  </h2>
                </div>
                {killedId === currentTurnNumber && (
                  <div className="absolute top-0 text-red-600 text-9xl font-black opacity-80 animate-pulse">
                    X
                  </div>
                )}
              </div>

              {isMyCharTurn && (
                <div className="bg-[#1a1614] border-4 border-amber-700/50 p-8 rounded-lg w-full shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom-10 fade-in duration-500 inner-shadow">
                  <h3 className="text-2xl text-center text-amber-100 mb-6 uppercase tracking-[0.3em] border-b-2 border-stone-800 pb-4">
                    Votre Tour, Messire
                  </h3>

                  {turnPhase === "resource" && (
                    <div className="flex gap-8 justify-center">
                      <button
                        onClick={takeGold}
                        className="flex-1 bg-amber-900 hover:bg-amber-800 p-6 rounded-lg border-b-4 border-amber-950 flex flex-col items-center gap-3 transition-transform active:scale-95 group shadow-xl"
                      >
                        <span className="text-5xl group-hover:scale-110 transition-transform drop-shadow-md">
                          💰
                        </span>
                        <span className="font-bold text-amber-200 text-xl tracking-widest">
                          2 OR
                        </span>
                      </button>
                      <button
                        onClick={startDraw}
                        className="flex-1 bg-stone-800 hover:bg-stone-700 p-6 rounded-lg border-b-4 border-stone-950 flex flex-col items-center gap-3 transition-transform active:scale-95 group shadow-xl"
                      >
                        <span className="text-5xl group-hover:scale-110 transition-transform drop-shadow-md">
                          🎴
                        </span>
                        <span className="font-bold text-stone-200 text-xl tracking-widest">
                          PIOCHER
                        </span>
                      </button>
                    </div>
                  )}
                  {turnPhase === "drawing" && (
                    <div className="flex gap-6 justify-center">
                      {drawOptions.map((id) => (
                        <DistrictCard
                          key={id}
                          id={id}
                          onClick={() => pickDrawnCard(id)}
                        />
                      ))}
                    </div>
                  )}
                  {turnPhase === "build" && (
                    <div className="space-y-6">
                      {currentTurnNumber === 1 && !killedId && (
                        <div className="p-4 bg-red-950/40 border-2 border-red-900/50 rounded-lg text-center">
                          <p className="text-xs font-bold text-red-500 uppercase tracking-[0.2em] mb-3">
                            Contrat de Mort
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {CHARACTERS.filter((c) => c.id > 1).map((c) => (
                              <button
                                key={c.id}
                                onClick={() => useAssassinPower(c.id)}
                                className="bg-red-900 hover:bg-red-800 text-red-100 text-xs px-4 py-2 rounded border border-red-700 uppercase font-bold tracking-wider transition-colors"
                              >
                                Tuer {c.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-center text-stone-400 italic tracking-wider">
                        Construisez un quartier ou terminez votre tour.
                      </div>
                      <button
                        onClick={endTurn}
                        className="w-full py-5 bg-stone-900 hover:bg-stone-800 text-amber-500 font-bold uppercase tracking-[0.3em] rounded border-b-4 border-black transition-colors shadow-lg text-xl"
                      >
                        Fin du Tour
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. ZONE JOUEUR (Bas - Fixe 280px) */}
        <div className="h-[320px] shrink-0 border-t-4 border-stone-800 bg-[#140f0c] shadow-[0_-20px_60px_rgba(0,0,0,0.9)] z-30 px-8 py-6 flex gap-10 items-end inner-shadow relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-amber-900/10 to-transparent pointer-events-none"></div>

          {/* Stats (Gauche) */}
          <div className="w-72 h-full bg-stone-900/80 rounded-lg border-2 border-stone-700 p-5 flex flex-col gap-6 shadow-2xl relative z-10">
            <div className="bg-black/50 p-4 rounded border border-amber-900/50 flex justify-between items-center inner-shadow">
              <span className="text-stone-400 text-xs uppercase font-bold tracking-[0.2em]">
                Trésor
              </span>
              <span className="text-4xl text-amber-500 font-bold drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]">
                {me.gold} 🟡
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              <p className="text-[10px] text-stone-500 uppercase font-bold text-center tracking-[0.2em] mb-2">
                Vos Rôles
              </p>
              {me.characters.map((cid) => {
                const char = CHARACTERS.find((c) => c.id === cid);
                const played = (me.played_characters || []).includes(cid);
                const dead = killedId === cid;
                const style = getCharColors(cid);
                return (
                  <div
                    key={cid}
                    className={`p-2 rounded border-2 flex items-center gap-3 transition-all ${played ? "opacity-40 grayscale bg-stone-950 border-stone-800" : `${style.bg} ${style.border}`}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm bg-black/60 ${style.text} ${style.border}`}
                    >
                      {cid}
                    </div>
                    <span
                      className={`text-sm font-bold uppercase tracking-wide ${dead ? "line-through text-red-600Decoration-4" : "text-stone-100"}`}
                    >
                      {char.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main (Centre) */}
          <div className="flex-1 h-full flex items-end justify-center pb-8 relative group z-20 perspective-1000">
            <div className="absolute bottom-0 text-xs text-stone-500 font-bold uppercase tracking-[0.4em] opacity-30 group-hover:opacity-0 transition-opacity pointer-events-none mb-2">
              Votre Main
            </div>
            <div className="flex justify-center items-end w-full h-full">
              {me.hand.map((hid, idx) => {
                const total = me.hand.length;
                const center = (total - 1) / 2;
                const dist = idx - center;
                const rot = dist * 6;
                const ty = Math.abs(dist) * 8;
                const canBuild =
                  turnPhase === "build" &&
                  me.gold >= (DISTRICTS.find((d) => d.id === hid)?.cost || 0);
                return (
                  <div
                    key={idx}
                    className="first:ml-0 -ml-16 transition-all duration-300 origin-bottom hover:z-[100] hover:-translate-y-24 hover:scale-110 hover:rotate-0 will-change-transform"
                    style={{
                      transform: `rotate(${rot}deg) translateY(${ty}px)`,
                    }}
                  >
                    <DistrictCard
                      id={hid}
                      onClick={() => canBuild && buildDistrict(hid)}
                      disabled={turnPhase !== "build" || !canBuild}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cité (Droite) */}
          <div className="w-96 h-full bg-stone-900/80 rounded-lg border-2 border-stone-700 p-4 shadow-2xl flex flex-col relative overflow-hidden z-10">
            <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-stone-900 via-stone-900/80 to-transparent z-10 pointer-events-none" />
            <h3 className="text-center text-sm text-stone-300 font-bold uppercase tracking-[0.3em] mb-4 pt-2 sticky top-0 z-20 drop-shadow-md">
              Votre Cité ({me.city.length}/8)
            </h3>
            <div className="flex-1 overflow-y-auto flex flex-wrap content-start gap-3 pr-1 pb-4 custom-scrollbar bg-black/30 p-3 rounded inner-shadow">
              {me.city.map((cid, i) => (
                <DistrictCard key={i} id={cid} small disabled />
              ))}
              {me.city.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-stone-600 text-sm italic tracking-widest">
                  Aucune pierre posée...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default App;
