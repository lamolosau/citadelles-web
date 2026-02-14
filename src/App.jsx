import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

// ==========================================
// 1. DONNÉES OFFICIELLES (TRUE RNG)
// ==========================================
const CHARACTERS = [
  { id: 1, name: "Assassin", color: "gray" },
  { id: 2, name: "Voleur", color: "gray" },
  { id: 3, name: "Magicien", color: "gray" },
  { id: 4, name: "Roi", color: "yellow" },
  { id: 5, name: "Évêque", color: "blue" },
  { id: 6, name: "Marchand", color: "green" },
  { id: 7, name: "Architecte", color: "gray" },
  { id: 8, name: "Condottiere", color: "red" },
];

const DISTRICTS = [
  { id: 1, name: "Temple", cost: 1, color: "blue", qty: 3 },
  { id: 2, name: "Église", cost: 2, color: "blue", qty: 3 },
  { id: 3, name: "Monastère", cost: 3, color: "blue", qty: 3 },
  { id: 4, name: "Cathédrale", cost: 5, color: "blue", qty: 2 },
  { id: 5, name: "Tour de guet", cost: 1, color: "red", qty: 3 },
  { id: 6, name: "Prison", cost: 2, color: "red", qty: 3 },
  { id: 7, name: "Caserne", cost: 3, color: "red", qty: 3 },
  { id: 8, name: "Forteresse", cost: 5, color: "red", qty: 2 },
  { id: 9, name: "Manoir", cost: 3, color: "yellow", qty: 5 },
  { id: 10, name: "Château", cost: 4, color: "yellow", qty: 4 },
  { id: 11, name: "Palais", cost: 5, color: "yellow", qty: 3 },
  { id: 12, name: "Taverne", cost: 1, color: "green", qty: 5 },
  { id: 13, name: "Échoppe", cost: 2, color: "green", qty: 3 },
  { id: 14, name: "Marché", cost: 2, color: "green", qty: 4 },
  { id: 15, name: "Comptoir", cost: 3, color: "green", qty: 3 },
  { id: 16, name: "Port", cost: 4, color: "green", qty: 3 },
  { id: 17, name: "Hôtel de ville", cost: 5, color: "green", qty: 2 },
  { id: 18, name: "Cour des Miracles", cost: 2, color: "purple", qty: 1 },
  { id: 19, name: "Donjon", cost: 3, color: "purple", qty: 1 },
  { id: 20, name: "Laboratoire", cost: 5, color: "purple", qty: 1 },
  { id: 21, name: "Forge", cost: 5, color: "purple", qty: 1 },
  { id: 22, name: "Observatoire", cost: 5, color: "purple", qty: 1 },
  { id: 23, name: "Cimetière", cost: 5, color: "purple", qty: 1 },
  { id: 24, name: "Bibliothèque", cost: 6, color: "purple", qty: 1 },
  { id: 25, name: "École de Magie", cost: 6, color: "purple", qty: 1 },
  { id: 26, name: "Grande Muraille", cost: 6, color: "purple", qty: 1 },
  { id: 27, name: "Université", cost: 6, color: "purple", qty: 1 },
  { id: 28, name: "Dracoport", cost: 6, color: "purple", qty: 1 },
];

const WONDER_DESC = {
  "Cour des Miracles":
    "Compte comme la dernière couleur manquante pour le bonus de 3pts.",
  Donjon: "Indestructible face au Condottiere.",
  Laboratoire: "Action : Sacrifier 1 carte pour gagner 1 or.",
  Forge: "Action : Payer 2 or pour piocher 3 cartes.",
  Observatoire: "Piochez 3 cartes au lieu de 2.",
  Cimetière: "Récupérez un quartier détruit (Passif).",
  Bibliothèque: "Conservez les 2 cartes piochées.",
  "École de Magie":
    "Prend la couleur de votre personnage pour les revenus (Auto).",
  "Grande Muraille": "Vos quartiers coûtent +1 or à détruire.",
  Université: "Coûte 6, vaut 8 points.",
  Dracoport: "Coûte 6, vaut 8 points.",
};

const getCardDesc = (card) => {
  if (WONDER_DESC[card.name]) return WONDER_DESC[card.name];
  return `Quartier ${card.color === "yellow" ? "Noble" : card.color === "green" ? "Commerçant" : card.color === "blue" ? "Religieux" : "Militaire"}.`;
};

// ==========================================
// 2. STYLES & ASSETS
// ==========================================
const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');
body { font-family: 'MedievalSharp', cursive; background-color: #0c0a09; color: #fffbeb; overflow: hidden; cursor: default; }
.card-shadow { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3); }
.inner-shadow { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.6); }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #1c1917; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #78350f; border-radius: 3px; }
@keyframes slide-down { 0% { transform: translateY(-100%) translateX(-50%); opacity: 0; } 10% { transform: translateY(0) translateX(-50%); opacity: 1; } 90% { transform: translateY(0) translateX(-50%); opacity: 1; } 100% { transform: translateY(-100%) translateX(-50%); opacity: 0; } }
.toast-anim { animation: slide-down 4s forwards ease-in-out; }
.tooltip { pointer-events: none; z-index: 9999; }
.modal-overlay { background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(4px); }
`;

const getCharColors = (id) => {
  const c = CHARACTERS.find((x) => x.id == id); // Loose equality
  if (!c)
    return {
      border: "border-stone-500",
      bg: "bg-stone-800",
      text: "text-stone-300",
    };
  switch (c.color) {
    case "yellow":
      return {
        border: "border-amber-500",
        bg: "bg-amber-950",
        text: "text-amber-500",
      };
    case "blue":
      return {
        border: "border-sky-600",
        bg: "bg-sky-950",
        text: "text-sky-400",
      };
    case "green":
      return {
        border: "border-emerald-600",
        bg: "bg-emerald-950",
        text: "text-emerald-400",
      };
    case "red":
      return {
        border: "border-red-600",
        bg: "bg-red-950",
        text: "text-red-500",
      };
    default:
      return {
        border: "border-stone-400",
        bg: "bg-stone-800",
        text: "text-stone-300",
      };
  }
};

// ==========================================
// 3. COMPOSANTS UI
// ==========================================
const NotificationBanner = ({ message, type }) => {
  if (!message) return null;
  let style = "bg-stone-800 border-stone-500 text-stone-200";
  if (type === "error") style = "bg-red-900/95 border-red-500 text-red-100";
  if (type === "success")
    style = "bg-green-900/95 border-green-500 text-green-100";
  if (type === "info") style = "bg-blue-900/95 border-blue-500 text-blue-100";
  if (type === "gold")
    style = "bg-amber-900/95 border-amber-500 text-amber-100";
  return (
    <div
      className={`fixed top-6 left-1/2 z-[100] px-10 py-4 rounded border-4 shadow-[0_0_20px_rgba(0,0,0,0.8)] text-xl font-bold uppercase tracking-widest text-center toast-anim ${style} min-w-[320px]`}
    >
      {message}
    </div>
  );
};

const DistrictCard = ({
  id,
  small,
  onClick,
  disabled,
  destroyable,
  setTooltip,
}) => {
  const c = DISTRICTS.find((d) => d.id == id);
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

  const handleEnter = (e) =>
    setTooltip &&
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      name: c.name,
      cost: c.cost,
      desc: getCardDesc(c),
      color: c.color,
    });
  const handleLeave = () => setTooltip && setTooltip(null);
  const handleMove = (e) =>
    setTooltip &&
    setTooltip((prev) =>
      prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
    );

  return (
    <div
      onClick={!disabled ? onClick : null}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
      className={`relative flex flex-col border-[3px] rounded-lg overflow-hidden transition-all duration-300
            ${small ? "w-10 h-14 text-[6px]" : "w-32 h-52 text-xs"} ${colors.border}
            ${disabled ? "cursor-default" : "cursor-pointer card-shadow hover:-translate-y-6 hover:scale-110 hover:z-50"}
            ${destroyable ? "animate-pulse cursor-crosshair ring-4 ring-red-600" : ""}
            bg-gradient-to-br from-stone-800 to-stone-950`}
    >
      <div
        className={`p-1 flex justify-between items-center ${colors.bg} border-b ${colors.border}`}
      >
        <div
          className={`rounded-full border ${colors.border} bg-stone-900 flex items-center justify-center font-bold ${small ? "w-3 h-3" : "w-6 h-6"} ${colors.text}`}
        >
          {c.cost}
        </div>
      </div>
      <div className="flex-1 relative opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent to-black">
        <div
          className={`absolute inset-2 border border-dashed ${colors.border} rounded opacity-50`}
        ></div>
      </div>
      <div
        className={`p-1 text-center font-bold uppercase tracking-tighter ${colors.bg} border-t ${colors.border} ${colors.text} leading-tight truncate`}
      >
        {c.name}
      </div>
      {destroyable && (
        <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center font-black text-red-100 text-sm">
          CIBLER
        </div>
      )}
    </div>
  );
};

const LoadingScreen = ({ onCancel }) => (
  <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-amber-600 font-family-medieval relative">
    <style>{GLOBAL_STYLES}</style>
    <div className="text-6xl mb-4 animate-pulse">🏰</div>
    <h2 className="text-3xl font-bold uppercase tracking-[0.3em] animate-pulse">
      Restauration du Royaume...
    </h2>
    <button
      onClick={onCancel}
      className="mt-8 text-xs text-stone-500 hover:text-stone-300 underline"
    >
      Annuler et revenir au menu
    </button>
  </div>
);

const LeaveButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute top-4 left-4 z-50 bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-600 w-10 h-10 flex items-center justify-center rounded-full font-bold shadow-lg transition-transform active:scale-95"
    title="Quitter la partie"
  >
    ✕
  </button>
);

// ==========================================
// 4. LOGIQUE APP
// ==========================================
function App() {
  const hasSavedSession = !!(
    localStorage.getItem("citadelles_room_id") &&
    localStorage.getItem("citadelles_player_id")
  );
  const [loading, setLoading] = useState(hasSavedSession);

  const [view, setView] = useState("login");
  const [notification, setNotification] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const [pseudo, setPseudo] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [myId, setMyId] = useState(null);

  const [players, setPlayers] = useState([]);
  const [gameStatus, setGameStatus] = useState("waiting");
  const [roomHostId, setRoomHostId] = useState(null);
  const [kingPlayerId, setKingPlayerId] = useState(null);
  const [onlineIds, setOnlineIds] = useState([]);

  const [currentTurnNumber, setCurrentTurnNumber] = useState(1);
  const [turnPhase, setTurnPhase] = useState("resource");
  const [draftPile, setDraftPile] = useState([]);
  const [draftSubStep, setDraftSubStep] = useState("pick");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  const [drawOptions, setDrawOptions] = useState([]);
  const [killedId, setKilledId] = useState(null);
  const [robbedId, setRobbedId] = useState(null);
  const [buildsCount, setBuildsCount] = useState(0);
  const [firstBuilderId, setFirstBuilderId] = useState(null);

  const [magicMode, setMagicMode] = useState(null);
  const [magicSelectedCards, setMagicSelectedCards] = useState([]);
  const [warMode, setWarMode] = useState(false);
  const [abilityUsed, setAbilityUsed] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [playerToKickId, setPlayerToKickId] = useState(null);

  const [labUsed, setLabUsed] = useState(false);
  const [smithyUsed, setSmithyUsed] = useState(false);
  const [incomeCollected, setIncomeCollected] = useState(false);
  const [turnStartIncome, setTurnStartIncome] = useState(0);

  const myIdRef = useRef(null);
  const roomIdRef = useRef(null);
  const playersRef = useRef([]);
  const roomHostIdRef = useRef(null);
  const lastKilledRef = useRef(null);
  const lastRobbedRef = useRef(null);
  const kingPlayerIdRef = useRef(null);

  useEffect(() => {
    myIdRef.current = myId;
    roomIdRef.current = roomId;
    playersRef.current = players;
    roomHostIdRef.current = roomHostId;
    kingPlayerIdRef.current = kingPlayerId;
  }, [myId, roomId, players, roomHostId, kingPlayerId]);
  const opponents = players.filter((p) => p.user_id !== myId);
  const notify = (msg, type = "info") => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- INIT ROBUSTE ---
  useEffect(() => {
    if (!hasSavedSession) {
      setLoading(false);
      return;
    }
    const init = async () => {
      const sR = localStorage.getItem("citadelles_room_id");
      const sP = localStorage.getItem("citadelles_player_id");
      const { data: rm, error: errRoom } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", sR)
        .single();
      if (errRoom) {
        if (errRoom.code === "PGRST116") {
          localStorage.clear();
          setLoading(false);
          return;
        }
        return;
      }
      if (!rm) {
        localStorage.clear();
        setLoading(false);
        return;
      }
      const { data: p, error: errPlayer } = await supabase
        .from("players")
        .select("*")
        .eq("user_id", sP)
        .eq("room_id", sR)
        .single();
      if (errPlayer) {
        if (errPlayer.code === "PGRST116") {
          localStorage.clear();
          setLoading(false);
          return;
        }
        return;
      }
      if (rm && p) {
        setMyId(sP);
        setRoomId(sR);
        setRoomCode(rm.code);
        setPseudo(p.pseudo);
        setView(
          rm.status === "waiting"
            ? "lobby"
            : rm.status === "finished"
              ? "finished"
              : "game",
        );
        setLoading(false);
      } else {
        localStorage.clear();
        setLoading(false);
      }
    };
    init();
  }, []);

  const kickPlayer = async (userId) => {
    await supabase
      .from("players")
      .delete()
      .eq("user_id", userId)
      .eq("room_id", roomId);
    setPlayerToKickId(null);
  };

  const confirmLeaveGame = async () => {
    if (myId && roomId)
      await supabase
        .from("players")
        .delete()
        .eq("user_id", myId)
        .eq("room_id", roomId);
    localStorage.removeItem("citadelles_room_id");
    localStorage.removeItem("citadelles_player_id");
    setRoomId(null);
    setMyId(null);
    setPlayers([]);
    setView("login");
    setLoading(false);
    setShowLeaveModal(false);
  };

  // --- HELPER DECK ---
  const shuffle = (array) => {
    let i = array.length,
      r;
    const n = [...array];
    while (i !== 0) {
      r = Math.floor(Math.random() * i);
      i--;
      [n[i], n[r]] = [n[r], n[i]];
    }
    return n;
  };
  const generateFullDeck = () => {
    let deck = [];
    DISTRICTS.forEach((card) => {
      for (let i = 0; i < (card.qty || 1); i++) deck.push(card.id);
    });
    return shuffle(deck);
  };

  const rebuildDeckIfNeeded = async (currentStack, neededCount) => {
    if (currentStack.length >= neededCount) return currentStack;
    const { data: allPlayers } = await supabase
      .from("players")
      .select("hand, city")
      .eq("room_id", roomId);
    const countsInPlay = {};
    currentStack.forEach(
      (id) => (countsInPlay[id] = (countsInPlay[id] || 0) + 1),
    );
    if (allPlayers) {
      allPlayers.forEach((p) => {
        (p.hand || []).forEach(
          (id) => (countsInPlay[id] = (countsInPlay[id] || 0) + 1),
        );
        (p.city || []).forEach(
          (id) => (countsInPlay[id] = (countsInPlay[id] || 0) + 1),
        );
      });
    }
    let discarded = [];
    DISTRICTS.forEach((card) => {
      const totalExisting = card.qty || 1;
      const currentlyInUse = countsInPlay[card.id] || 0;
      const inDiscard = totalExisting - currentlyInUse;
      for (let i = 0; i < inDiscard; i++) discarded.push(card.id);
    });
    const newStack = [...currentStack, ...shuffle(discarded)];
    notify("La pioche a été reconstituée.", "info");
    return newStack;
  };

  // --- HELPER ARRAY REMOVE ONE ITEM ---
  const removeOne = (arr, val) => {
    const idx = arr.indexOf(val);
    if (idx === -1) return arr;
    const newArr = [...arr];
    newArr.splice(idx, 1);
    return newArr;
  };

  // --- REALTIME ---
  useEffect(() => {
    if (!roomId) return;
    const fetchAll = async () => {
      const { data: ps } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true });
      if (ps) {
        setPlayers(ps);
        const amIHere = ps.find((p) => p.user_id === myId);
        if (myId && !amIHere) {
          localStorage.removeItem("citadelles_room_id");
          localStorage.removeItem("citadelles_player_id");
          setRoomId(null);
          setMyId(null);
          setPlayers([]);
          setView("login");
          setLoading(false);
          if (view !== "login")
            notify("Vous avez été exclu par l'hôte.", "error");
          return;
        }
      }
      const { data: r } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (r) {
        if (r.king_player_id && r.king_player_id !== kingPlayerIdRef.current)
          notify("Le Roi est mort, Vive le Roi !", "gold");
        if (r.killed_char_id && r.killed_char_id !== lastKilledRef.current) {
          const n = CHARACTERS.find((c) => c.id == r.killed_char_id)?.name;
          notify(`L'Assassin a tué ${n} !`, "error");
          lastKilledRef.current = r.killed_char_id;
        }
        if (r.robbed_char_id && r.robbed_char_id !== lastRobbedRef.current) {
          const n = CHARACTERS.find((c) => c.id == r.robbed_char_id)?.name;
          notify(`Le Voleur a détroussé ${n} !`, "info");
          lastRobbedRef.current = r.robbed_char_id;
        }
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
        if (r.current_turn_phase) setTurnPhase(r.current_turn_phase);
        if (r.status === "finished") setView("finished");
        else if (r.status !== "waiting") setView("game");
        else setView("lobby");
        setLoading(false);
      }
    };
    fetchAll();
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
        fetchAll,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        fetchAll,
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineIds(Object.keys(state));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && myId)
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: myId,
          });
      });
    return () => supabase.removeChannel(channel);
  }, [roomId, myId]);

  // --- LOGIQUE TOUR ---
  useEffect(() => {
    if (gameStatus !== "playing") return;
    setBuildsCount(0);
    setWarMode(false);
    setMagicMode(null);
    setMagicSelectedCards([]);
    setAbilityUsed(false);
    setLabUsed(false);
    setSmithyUsed(false);
    setIncomeCollected(false);
    setShowLabModal(false);
    setTurnStartIncome(0);
    let kingInterval = null;
    if (myId === roomHostId && currentTurnNumber === 4) {
      kingInterval = setInterval(async () => {
        const kingOwner = playersRef.current.find((p) =>
          (p.characters || []).includes(4),
        );
        if (kingOwner && kingOwner.user_id !== kingPlayerIdRef.current)
          await supabase
            .from("rooms")
            .update({ king_player_id: kingOwner.user_id })
            .eq("id", roomId);
      }, 2000);
    }
    if (myId === roomHostId && killedId === currentTurnNumber) {
      const t = setTimeout(() => forceNextTurn(), 4000);
      return () => {
        clearTimeout(t);
        if (kingInterval) clearInterval(kingInterval);
      };
    }
    const me = players.find((p) => p.user_id === myId);
    if (
      me &&
      (me.characters || []).includes(currentTurnNumber) &&
      turnPhase === "resource"
    ) {
      // SNAPSHOT REVENUS
      let targetColor =
        currentTurnNumber === 4
          ? "yellow"
          : currentTurnNumber === 5
            ? "blue"
            : currentTurnNumber === 6
              ? "green"
              : "red";
      let amount = (me.city || []).filter((id) => {
        const d = DISTRICTS.find((x) => x.id == id);
        return d && (d.color === targetColor || d.name === "École de Magie");
      }).length;
      setTurnStartIncome(amount);
      if (robbedId === currentTurnNumber && killedId !== currentTurnNumber) {
        const thief = players.find((p) => (p.characters || []).includes(2));
        if (thief && me.gold > 0) {
          const amount = me.gold;
          supabase
            .from("players")
            .update({ gold: 0 })
            .eq("user_id", myId)
            .eq("room_id", roomId)
            .then();
          supabase
            .from("players")
            .update({ gold: thief.gold + amount })
            .eq("user_id", thief.user_id)
            .eq("room_id", roomId)
            .then();
          notify(`VOUS AVEZ ÉTÉ VOLÉ ! (-${amount} Or)`, "error");
        }
      }
      if (currentTurnNumber === 6 && killedId !== 6)
        supabase
          .from("players")
          .update({ gold: me.gold + 1 })
          .eq("user_id", myId)
          .then(() => notify("Bonus Marchand : +1 Or", "gold"));
      if (currentTurnNumber === 7 && killedId !== 7) {
        const fetchBonus = async () => {
          const { data: r } = await supabase
            .from("rooms")
            .select("district_stack")
            .eq("id", roomId)
            .single();
          const freshStack = await rebuildDeckIfNeeded(
            r.district_stack || [],
            2,
          );
          let stack = [...freshStack];
          const drawn = stack.splice(0, 2);
          await supabase
            .from("rooms")
            .update({ district_stack: stack })
            .eq("id", roomId);
          await supabase
            .from("players")
            .update({ hand: [...(me.hand || []), ...drawn] })
            .eq("user_id", myId);
          notify("Architecte : +2 Cartes", "info");
        };
        fetchBonus();
      }
    }
    return () => {
      if (kingInterval) clearInterval(kingInterval);
    };
  }, [currentTurnNumber, gameStatus, killedId]);

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
      const { count } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", r.id);
      if (count >= 7) return notify("Cette table est complète !", "error");
      await supabase
        .from("players")
        .insert([{ room_id: r.id, user_id: u, pseudo, gold: 2 }]);
      localStorage.setItem("citadelles_room_id", r.id);
      localStorage.setItem("citadelles_player_id", u);
      setMyId(u);
      setRoomId(r.id);
      setView("lobby");
    } else {
      notify("Code invalide", "error");
    }
  };
  const startGame = async () => {
    const { data: latestPlayers } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });
    const d = generateFullDeck();
    for (const p of latestPlayers)
      await supabase
        .from("players")
        .update({ hand: d.splice(0, 4) })
        .eq("user_id", p.user_id)
        .eq("room_id", roomId);
    const pc = latestPlayers.length;
    let c = shuffle([...CHARACTERS]);
    const fd = c.pop();
    const fu = c.splice(0, pc === 4 ? 2 : pc === 5 ? 1 : 0);
    await supabase
      .from("rooms")
      .update({
        status: "drafting",
        district_stack: d,
        draft_pile: c,
        face_down_char: fd.id,
        face_up_chars: fu,
        current_player_index: 0,
        current_character_turn: 1,
      })
      .eq("id", roomId);
  };
  const backToLobby = async () => {
    await supabase
      .from("rooms")
      .update({ status: "waiting", first_builder_id: null })
      .eq("id", roomId);
    await supabase
      .from("players")
      .update({
        city: [],
        hand: [],
        gold: 2,
        characters: [],
        played_characters: [],
      })
      .eq("room_id", roomId);
  };

  const calculateScore = (p) => {
    let score = 0;
    const colors = new Set();
    const hasHauntedCity = (p.city || []).some(
      (id) =>
        (DISTRICTS.find((d) => d.id == id)?.name || "") === "Cour des Miracles",
    );
    (p.city || []).forEach((id) => {
      const c = DISTRICTS.find((d) => d.id == id);
      if (c) {
        score += c.cost;
        colors.add(c.color);
      }
    });
    if (colors.size >= 5 || (hasHauntedCity && colors.size === 4)) score += 3;
    if (p.user_id === firstBuilderId) score += 4;
    else if ((p.city || []).length >= 8) score += 2;
    return score;
  };

  // --- ACTIONS ---
  const pickCharacter = async (cid) => {
    const me = players.find((p) => p.user_id === myId);
    if ((me?.characters || []).includes(cid)) return;
    const count = players.length;
    let updateRoom = {};
    if (count === 2) {
      const remaining = draftPile.filter((c) => c.id !== cid);
      if (draftSubStep === "pick") {
        const newC = [...(me.characters || []), cid];
        await supabase
          .from("players")
          .update({ characters: newC })
          .eq("user_id", myId)
          .eq("room_id", roomId);
        if (remaining.length === 1)
          updateRoom = {
            status: "playing",
            draft_pile: [],
            current_character_turn: 1,
          };
        else if (draftPile.length === 7)
          updateRoom = {
            draft_pile: remaining,
            current_player_index: (currentPlayerIndex + 1) % 2,
          };
        else updateRoom = { draft_pile: remaining, draft_sub_step: "discard" };
      } else {
        updateRoom = {
          draft_pile: remaining,
          draft_sub_step: "pick",
          current_player_index: (currentPlayerIndex + 1) % 2,
        };
      }
    } else {
      await supabase
        .from("players")
        .update({ characters: [...(me.characters || []), cid] })
        .eq("user_id", myId)
        .eq("room_id", roomId);
      const remaining = draftPile.filter((c) => c.id !== cid);
      const next = (currentPlayerIndex + 1) % count;
      const startIdx = players.findIndex((p) => p.user_id === kingPlayerId);
      const safeStart = startIdx === -1 ? 0 : startIdx;
      if (
        (count === 3 && remaining.length === 1) ||
        (count > 3 && next === safeStart)
      )
        updateRoom = {
          status: "playing",
          draft_pile: [],
          current_character_turn: 1,
        };
      else updateRoom = { draft_pile: remaining, current_player_index: next };
    }
    await supabase.from("rooms").update(updateRoom).eq("id", roomId);
  };
  const takeGold = async () => {
    const me = players.find((p) => p.user_id === myId);
    await supabase
      .from("players")
      .update({ gold: (me.gold || 0) + 2 })
      .eq("user_id", myId)
      .eq("room_id", roomId);
    await supabase
      .from("rooms")
      .update({ current_turn_phase: "build" })
      .eq("id", roomId);
    setTurnPhase("build");
  };
  const startDraw = async () => {
    const me = players.find((p) => p.user_id === myId);
    const { data: r } = await supabase
      .from("rooms")
      .select("district_stack")
      .eq("id", roomId)
      .single();
    let s = r.district_stack || [];
    const hasObs = (me.city || []).some(
      (id) => DISTRICTS.find((d) => d.id == id)?.name === "Observatoire",
    );
    const count = hasObs ? 3 : 2;
    s = await rebuildDeckIfNeeded(s, count);
    if (s.length < count) {
      notify("La pioche est épuisée !", "error");
      return;
    }
    const opts = s.splice(0, count);
    setDrawOptions(opts);
    await supabase
      .from("rooms")
      .update({ district_stack: s, current_turn_phase: "drawing" })
      .eq("id", roomId);
    setTurnPhase("drawing");
  };
  const pickDrawnCard = async (cid) => {
    const me = players.find((p) => p.user_id === myId);
    const hasLibrary = (me.city || []).some(
      (id) => DISTRICTS.find((d) => d.id == id)?.name === "Bibliothèque",
    );
    const kept = hasLibrary ? drawOptions : [cid];
    const rejected = hasLibrary ? [] : removeOne(drawOptions, cid);
    const { data: r } = await supabase
      .from("rooms")
      .select("district_stack")
      .eq("id", roomId)
      .single();
    await supabase
      .from("rooms")
      .update({
        district_stack: [...(r.district_stack || []), ...rejected],
        current_turn_phase: "build",
      })
      .eq("id", roomId);
    await supabase
      .from("players")
      .update({ hand: [...(me.hand || []), ...kept] })
      .eq("user_id", myId)
      .eq("room_id", roomId);
    setDrawOptions([]);
    setTurnPhase("build");
    if (hasLibrary)
      notify("Bibliothèque : Vous gardez toutes les cartes !", "success");
  };
  const buildDistrict = async (cid) => {
    const me = playersRef.current.find((p) => p.user_id === myIdRef.current);
    if (!me) return notify("Erreur sync", "error");
    const c = DISTRICTS.find((d) => d.id == cid);
    if (me.gold < c.cost) return notify("Pas assez d'or !", "error");
    const limit = currentTurnNumber === 7 ? 3 : 1;
    if (buildsCount >= limit) return notify("Limite atteinte !", "error");
    const newCity = [...(me.city || []), cid];
    const { error } = await supabase
      .from("players")
      .update({
        city: newCity,
        hand: removeOne(me.hand || [], cid),
        gold: me.gold - c.cost,
      })
      .eq("user_id", myId)
      .eq("room_id", roomId);
    if (error) notify("Échec construction", "error");
    else {
      setBuildsCount((p) => p + 1);
      notify(`Construction : ${c.name}`, "success");
      if (newCity.length >= 8 && !firstBuilderId)
        await supabase
          .from("rooms")
          .update({ first_builder_id: myId })
          .eq("id", roomId);
    }
  };
  const destroyDistrict = async (targetPlayerId, districtId, cost) => {
    const me = players.find((p) => p.user_id === myId);
    const target = players.find((p) => p.user_id === targetPlayerId);
    const isBishop = (target.characters || []).includes(5);
    if (isBishop && killedId !== 5)
      return notify("Impossible ! L'Évêque est protégé par l'Église.", "error");
    const hasGreatWall = (target.city || []).some(
      (id) => DISTRICTS.find((d) => d.id == id)?.name === "Grande Muraille",
    );
    const destCost = cost - 1 + (hasGreatWall ? 1 : 0);
    if (me.gold < destCost)
      return notify(
        hasGreatWall ? "Grande Muraille : Coût +1 Or !" : "Pas assez d'or !",
        "error",
      );
    if (DISTRICTS.find((d) => d.id == districtId)?.name === "Donjon")
      return notify("Le Donjon est indestructible !", "error");
    await supabase
      .from("players")
      .update({ gold: me.gold - destCost })
      .eq("user_id", myId)
      .eq("room_id", roomId);
    await supabase
      .from("players")
      .update({ city: removeOne(target.city || [], districtId) })
      .eq("user_id", targetPlayerId)
      .eq("room_id", roomId);
    setWarMode(false);
    setAbilityUsed(true);
    notify("Quartier détruit !", "success");
  };
  const useLab = async (cid) => {
    const me = players.find((p) => p.user_id === myId);
    await supabase
      .from("players")
      .update({ hand: removeOne(me.hand || [], cid), gold: me.gold + 1 })
      .eq("user_id", myId);
    setLabUsed(true);
    setShowLabModal(false);
    notify("Laboratoire : Carte transformée en Or.", "gold");
  };
  const useSmithy = async () => {
    const me = players.find((p) => p.user_id === myId);
    if (me.gold < 2) return notify("Pas assez d'or pour la Forge !", "error");
    const { data: r } = await supabase
      .from("rooms")
      .select("district_stack")
      .eq("id", roomId)
      .single();
    let s = r.district_stack || [];
    s = await rebuildDeckIfNeeded(s, 3);
    if (s.length < 3) return notify("Pioche épuisée pour la Forge.", "error");
    const drawn = s.splice(0, 3);
    await supabase.from("rooms").update({ district_stack: s }).eq("id", roomId);
    await supabase
      .from("players")
      .update({ hand: [...(me.hand || []), ...drawn], gold: me.gold - 2 })
      .eq("user_id", myId);
    setSmithyUsed(true);
    notify("Forge : 3 Cartes forgées !", "success");
  };
  const magicianSwapPlayer = async (tid) => {
    const me = players.find((p) => p.user_id === myId);
    const target = players.find((p) => p.user_id === tid);
    await supabase
      .from("players")
      .update({ hand: target.hand || [] })
      .eq("user_id", myId)
      .eq("room_id", roomId);
    await supabase
      .from("players")
      .update({ hand: me.hand || [] })
      .eq("user_id", tid)
      .eq("room_id", roomId);
    setMagicMode(null);
    setAbilityUsed(true);
    notify("Mains échangées !", "success");
  };
  const magicianSwapDeck = async () => {
    if (magicSelectedCards.length === 0) return;
    const me = players.find((p) => p.user_id === myId);
    const { data: r } = await supabase
      .from("rooms")
      .select("district_stack")
      .eq("id", roomId)
      .single();
    let stack = r.district_stack || [];
    stack = await rebuildDeckIfNeeded(stack, magicSelectedCards.length);
    if (stack.length < magicSelectedCards.length)
      return notify(
        "Pas assez de cartes dans la pioche pour échanger.",
        "error",
      );
    const drawn = stack.splice(0, magicSelectedCards.length);
    await supabase
      .from("rooms")
      .update({ district_stack: [...stack, ...magicSelectedCards] })
      .eq("id", roomId);
    let newHand = [...(me.hand || [])];
    magicSelectedCards.forEach((c) => {
      newHand = removeOne(newHand, c);
    });
    await supabase
      .from("players")
      .update({ hand: [...newHand, ...drawn] })
      .eq("user_id", myId)
      .eq("room_id", roomId);
    setMagicMode(null);
    setMagicSelectedCards([]);
    setAbilityUsed(true);
    notify(`${drawn.length} cartes échangées`, "success");
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
    forceNextTurn();
    setTurnPhase("resource");
  };
  const forceNextTurn = async () => {
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
        await prepareDraft(r.district_stack);
      }
    } else {
      await supabase
        .from("rooms")
        .update({
          current_character_turn: next,
          current_turn_phase: "resource",
        })
        .eq("id", roomId);
    }
  };
  const prepareDraft = async (stack) => {
    const pc = playersRef.current.length;
    let c = shuffle([...CHARACTERS]);
    const fd = c.pop();
    let fuCount = pc === 4 ? 2 : pc === 5 ? 1 : 0;
    const fu = c.splice(0, fuCount);
    await supabase
      .from("players")
      .update({ characters: [], played_characters: [] })
      .eq("room_id", roomId);
    let si = playersRef.current.findIndex(
      (p) => p.user_id === kingPlayerIdRef.current,
    );
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
        current_turn_phase: "resource",
      })
      .eq("id", roomId);
  };

  // FIX CRASH INCOME (Array vs Null)
  const getIncomeAmount = () => {
    const me = players.find((p) => p.user_id === myId);
    if (!me) return 0;
    let targetColor =
      currentTurnNumber === 4
        ? "yellow"
        : currentTurnNumber === 5
          ? "blue"
          : currentTurnNumber === 6
            ? "green"
            : "red";
    let amount = (me.city || []).filter((id) => {
      const d = DISTRICTS.find((x) => x.id == id);
      return d && (d.color === targetColor || d.name === "École de Magie");
    }).length;
    return amount;
  };
  const collectCharacterIncome = async () => {
    const amount = getIncomeAmount();
    const me = players.find((p) => p.user_id === myId);
    if (amount > 0) {
      await supabase
        .from("players")
        .update({ gold: me.gold + amount })
        .eq("user_id", myId);
      notify(`Revenus : +${amount} Or`, "gold");
    }
    setIncomeCollected(true);
  };

  if (loading) return <LoadingScreen onCancel={confirmLeaveGame} />;

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
          {myId === roomHostId && (
            <button
              onClick={startGame}
              className="w-full mt-4 bg-green-900 hover:bg-green-800 text-green-100 p-5 rounded border-b-4 border-green-950 font-bold text-2xl uppercase shadow-lg tracking-[0.2em] transition-all"
            >
              Commencer
            </button>
          )}
        </div>
        {showLeaveModal && (
          <div className="fixed inset-0 z-[10000] modal-overlay flex items-center justify-center">
            <div className="bg-stone-900 border-4 border-red-600 p-6 rounded-lg text-center shadow-2xl max-w-sm">
              <h3 className="text-2xl text-red-500 font-bold mb-4 uppercase tracking-widest">
                Déserter ?
              </h3>
              <p className="text-stone-300 mb-6 italic">
                Voulez-vous vraiment quitter le Royaume et abandonner votre Cité
                ?
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
  if (view === "finished") {
    const sortedPlayers = [...players].sort(
      (a, b) => calculateScore(b) - calculateScore(a),
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
                className={`flex justify-between items-center p-4 rounded border-2 ${i === 0 ? "bg-amber-900/40 border-amber-500" : "bg-stone-800/50 border-stone-700"}`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`text-4xl font-bold ${i === 0 ? "text-amber-400" : "text-stone-500"}`}
                  >
                    #{i + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{p.pseudo}</span>
                    <span className="text-xs text-stone-400">
                      {p.city.length} quartiers bâtis
                    </span>
                  </div>
                </div>
                <span className="text-4xl font-black text-amber-100">
                  {calculateScore(p)} pts
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
  }

  if (view === "game") {
    const me = players.find((p) => p.user_id === myId);
    if (!me)
      return (
        <div className="h-screen w-screen bg-black flex items-center justify-center text-amber-500 font-bold text-2xl animate-pulse">
          Chargement du Royaume...
        </div>
      );
    const isMyDraftTurn =
      gameStatus === "drafting" &&
      players[currentPlayerIndex]?.user_id === myId;
    const activeChar = CHARACTERS.find((c) => c.id === currentTurnNumber);
    const isDead = currentTurnNumber === killedId;
    const isMyCharTurn =
      gameStatus === "playing" &&
      (me?.characters || []).includes(currentTurnNumber) &&
      !(me?.played_characters || []).includes(currentTurnNumber) &&
      !isDead;
    const isKing = myId === kingPlayerId;
    const someoneHasActiveChar = players.some((p) =>
      (p.characters || []).includes(currentTurnNumber),
    );
    // Wonder Flags
    const hasLab = (me.city || []).some(
      (id) => DISTRICTS.find((d) => d.id == id)?.name === "Laboratoire",
    );
    const hasSmithy = (me.city || []).some(
      (id) => DISTRICTS.find((d) => d.id == id)?.name === "Forge",
    );
    const incomeAmount = getIncomeAmount(); // CALCUL AVANT LE RENDU
    const canCollectIncome =
      [4, 5, 6, 8].includes(currentTurnNumber) &&
      !incomeCollected &&
      incomeAmount > 0; // CONDITION DE VISIBILITE

    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0c0a09] text-amber-50 select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 via-black to-black">
        <style>{GLOBAL_STYLES}</style>
        <NotificationBanner
          message={notification?.message}
          type={notification?.type}
        />
        {tooltip && (
          <div
            className="fixed bg-black/95 border-2 border-amber-600 p-4 rounded text-amber-50 max-w-xs tooltip shadow-2xl"
            style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}
          >
            <h4 className="font-bold uppercase tracking-widest text-amber-500 mb-1">
              {tooltip.name}
            </h4>
            <div className="flex gap-2 text-xs mb-2">
              <span className="text-yellow-500 font-bold">
                💰 {tooltip.cost}
              </span>
              <span
                className={`uppercase font-bold ${tooltip.color === "yellow" ? "text-amber-600" : tooltip.color === "blue" ? "text-sky-500" : tooltip.color === "green" ? "text-emerald-500" : tooltip.color === "red" ? "text-red-500" : "text-purple-400"}`}
              >
                {tooltip.color === "yellow"
                  ? "Noble"
                  : tooltip.color === "blue"
                    ? "Religieux"
                    : tooltip.color === "green"
                      ? "Commerçant"
                      : tooltip.color === "red"
                        ? "Militaire"
                        : "Merveille"}
              </span>
            </div>
            <p className="text-xs italic text-stone-400 leading-relaxed">
              {tooltip.desc}
            </p>
          </div>
        )}

        {/* BOUTON SECOURS (PIOCE VIDE) */}
        {isMyCharTurn &&
          turnPhase === "drawing" &&
          drawOptions.length === 0 && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-50">
              <div className="text-amber-500 font-bold animate-pulse text-xl">
                Aucune carte à piocher !
              </div>
              <button
                onClick={() => setTurnPhase("resource")}
                className="px-6 py-3 bg-red-900 hover:bg-red-800 text-red-100 rounded border border-red-500 font-bold uppercase shadow-lg"
              >
                Annuler la Pioche
              </button>
            </div>
          )}

        {showLabModal && (
          <div className="fixed inset-0 z-[9999] modal-overlay flex flex-col items-center justify-center p-8">
            <h3 className="text-4xl text-amber-500 font-bold mb-8 uppercase tracking-[0.2em] drop-shadow-lg">
              Le Laboratoire
            </h3>
            <p className="text-xl text-stone-300 mb-8">
              Choisissez une carte à sacrifier pour{" "}
              <span className="text-yellow-500 font-bold">1 Or</span>
            </p>
            <div className="flex gap-4 overflow-x-auto p-4 max-w-full">
              {(me.hand || []).map((hid) => (
                <div
                  key={hid}
                  className="hover:-translate-y-4 transition-transform cursor-pointer"
                  onClick={() => useLab(hid)}
                >
                  <DistrictCard id={hid} disabled />
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowLabModal(false)}
              className="mt-8 px-8 py-3 bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-600 rounded font-bold uppercase tracking-wider"
            >
              Fermer
            </button>
          </div>
        )}

        <div className="h-[140px] shrink-0 bg-stone-900/90 border-b-4 border-stone-800 shadow-xl flex items-center px-4 gap-4 overflow-x-auto z-20 inner-shadow">
          {opponents.map((opp) => (
            <div
              key={opp.id}
              className="min-w-[180px] h-[120px] bg-stone-800/50 rounded border-2 border-stone-700 p-2 flex flex-col gap-1 relative shadow-lg"
            >
              <div className="flex justify-between items-center border-b border-stone-700 pb-1">
                <span className="font-bold text-amber-100 truncate max-w-[90px] text-sm tracking-wide">
                  {opp.pseudo}
                </span>
                <div className="flex gap-2 text-[10px]">
                  <span className="text-yellow-500 font-bold">
                    💰{opp.gold}
                  </span>
                  <span className="text-blue-400 font-bold">
                    🎴{(opp.hand || []).length}
                  </span>
                </div>
              </div>
              <div className="flex-1 flex flex-wrap content-start gap-1 overflow-hidden bg-black/30 p-1 rounded inner-shadow">
                {(opp.city || []).map((cid, i) => {
                  const c = DISTRICTS.find((d) => d.id == cid);
                  if (!c) return null;
                  const isBishop =
                    (opp.characters || []).includes(5) &&
                    !(opp.played_characters || []).includes(5);
                  const canDestroy =
                    warMode &&
                    currentTurnNumber === 8 &&
                    !isBishop &&
                    c.name !== "Donjon";
                  return (
                    <div
                      key={i}
                      onClick={() =>
                        canDestroy && destroyDistrict(opp.user_id, cid, c.cost)
                      }
                      className={`w-5 h-7 rounded border ${canDestroy ? "cursor-crosshair animate-pulse border-red-500" : "bg-stone-700 border-stone-500"}`}
                      style={{
                        backgroundColor: canDestroy
                          ? undefined
                          : c.color === "yellow"
                            ? "#b45309"
                            : c.color === "blue"
                              ? "#0369a1"
                              : c.color === "green"
                                ? "#047857"
                                : c.color === "red"
                                  ? "#b91c1c"
                                  : "#7e22ce",
                      }}
                      title={c.name}
                      onMouseEnter={(e) =>
                        setTooltip({
                          visible: true,
                          x: e.clientX,
                          y: e.clientY,
                          name: c.name,
                          cost: c.cost,
                          desc: getCardDesc(c),
                          color: c.color,
                        })
                      }
                      onMouseLeave={() => setTooltip(null)}
                      onMouseMove={(e) =>
                        setTooltip((p) =>
                          p ? { ...p, x: e.clientX, y: e.clientY } : null,
                        )
                      }
                    />
                  );
                })}
              </div>
              {opp.user_id === kingPlayerId && (
                <div className="absolute -top-2 -right-2 text-2xl drop-shadow-md">
                  👑
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex-1 relative flex flex-col items-center justify-center p-2 overflow-hidden z-40">
          {isMyDraftTurn && (
            <div className="bg-stone-900/95 p-6 rounded-lg border-4 border-amber-800 shadow-[0_0_100px_rgba(0,0,0,1)] text-center z-50 animate-in fade-in zoom-in duration-300 max-h-full overflow-y-auto custom-scrollbar">
              <h3 className="text-3xl text-amber-500 mb-2 uppercase tracking-[0.2em]">
                {draftSubStep === "discard" ? "Défausser" : "Recruter"}
              </h3>
              <div className="flex flex-wrap gap-4 justify-center">
                {draftPile.map((c) => {
                  const style = getCharColors(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => pickCharacter(c.id)}
                      className={`w-28 h-44 rounded-lg border-4 ${style.border} ${style.bg} flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform shadow-2xl relative overflow-hidden group`}
                    >
                      <span
                        className={`text-6xl font-black ${style.text} drop-shadow-lg`}
                      >
                        {c.id}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-widest ${style.text}`}
                      >
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {gameStatus === "playing" && !isMyDraftTurn && (
            <div className="flex flex-col items-center w-full h-full justify-center">
              <div className="flex flex-col items-center mb-4 relative scale-90 transition-all duration-500">
                <div
                  className={`w-24 h-24 rounded-full border-[6px] ${getCharColors(currentTurnNumber).border} bg-stone-900 flex items-center justify-center text-5xl font-bold shadow-[0_0_40px_rgba(0,0,0,0.8)] z-10 ${getCharColors(currentTurnNumber).text}`}
                >
                  {currentTurnNumber}
                </div>
                <div
                  className={`mt-[-16px] pt-6 pb-2 px-10 ${getCharColors(currentTurnNumber).bg} border-x-4 border-b-4 ${getCharColors(currentTurnNumber).border} rounded-b-xl shadow-lg`}
                >
                  <h2
                    className={`text-xl font-bold uppercase tracking-[0.2em] ${getCharColors(currentTurnNumber).text}`}
                  >
                    {activeChar?.name}
                  </h2>
                </div>
                {isDead && (
                  <div className="absolute top-0 text-red-600 text-8xl font-black opacity-80 animate-pulse">
                    X
                  </div>
                )}
              </div>
              {isKing && (!someoneHasActiveChar || isDead) && !isMyCharTurn && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-pulse">
                  <button
                    onClick={forceNextTurn}
                    className="bg-stone-800 hover:bg-stone-700 text-stone-400 border border-stone-600 rounded p-4 text-xs font-bold uppercase tracking-widest shadow-lg"
                  >
                    Silence...
                    <br />
                    Appeler Suivant ⏩
                  </button>
                </div>
              )}
              {isMyCharTurn && (
                <div className="bg-[#1a1614] border-4 border-amber-700/50 p-6 rounded-lg max-w-2xl w-full shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom-5 fade-in duration-500 inner-shadow max-h-[calc(100vh-420px)] overflow-y-auto custom-scrollbar">
                  <h3 className="text-xl text-center text-amber-100 mb-4 uppercase tracking-[0.3em] border-b-2 border-stone-800 pb-2">
                    Votre Tour, Messire
                  </h3>
                  {currentTurnNumber === 3 && magicMode && !abilityUsed && (
                    <div className="mb-4 bg-purple-900/30 p-3 rounded border border-purple-500">
                      <h4 className="text-purple-300 font-bold mb-2">
                        GRIMOIRE
                      </h4>
                      {magicMode === "player" && (
                        <div className="flex gap-2 overflow-x-auto">
                          {opponents.map((o) => (
                            <button
                              key={o.id}
                              onClick={() => magicianSwapPlayer(o.user_id)}
                              className="bg-purple-800 px-3 py-1 rounded text-xs"
                            >
                              Échanger avec {o.pseudo}
                            </button>
                          ))}
                        </div>
                      )}
                      {magicMode === "deck" && (
                        <div className="text-center">
                          <p className="text-xs mb-2">
                            Sélectionnez vos cartes en main, puis validez.
                          </p>
                          <button
                            onClick={magicianSwapDeck}
                            className="bg-purple-600 px-4 py-2 rounded font-bold"
                          >
                            ÉCHANGER ({magicSelectedCards.length})
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => setMagicMode(null)}
                        className="text-xs text-red-400 mt-2 underline"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                  {(turnPhase === "resource" || !turnPhase) && (
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={takeGold}
                        className="flex-1 bg-amber-900 hover:bg-amber-800 p-4 rounded-lg border-b-4 border-amber-950 flex flex-col items-center gap-2 transition-transform active:scale-95 group shadow-xl"
                      >
                        <span className="text-4xl">💰</span>
                        <span className="font-bold text-amber-200">2 OR</span>
                      </button>
                      <button
                        onClick={startDraw}
                        className="flex-1 bg-stone-800 hover:bg-stone-700 p-4 rounded-lg border-b-4 border-stone-950 flex flex-col items-center gap-2 transition-transform active:scale-95 group shadow-xl"
                      >
                        <span className="text-4xl">🎴</span>
                        <span className="font-bold text-stone-200">
                          PIOCHER
                        </span>
                      </button>
                    </div>
                  )}
                  {turnPhase === "drawing" && (
                    <div className="flex gap-4 justify-center">
                      {drawOptions.map((id) => (
                        <DistrictCard
                          key={id}
                          id={id}
                          onClick={() => pickDrawnCard(id)}
                          setTooltip={setTooltip}
                        />
                      ))}
                    </div>
                  )}
                  {turnPhase === "build" && (
                    <div className="space-y-4">
                      {currentTurnNumber === 1 && !killedId && (
                        <div className="bg-red-950/40 p-3 rounded border-red-900/50 text-center">
                          <p className="text-[10px] font-bold text-red-500 uppercase mb-2">
                            Cible
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {CHARACTERS.filter(
                              (c) =>
                                c.id > 1 &&
                                !(me.characters || []).includes(c.id),
                            ).map((c) => (
                              <button
                                key={c.id}
                                onClick={() => assassinKill(c.id)}
                                className="bg-red-900 hover:bg-red-800 text-red-100 text-[10px] px-3 py-1 rounded border border-red-700 uppercase font-bold tracking-wider"
                              >
                                Tuer {c.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {currentTurnNumber === 2 && !robbedId && (
                        <div className="bg-blue-950/40 p-3 rounded border-blue-900/50 text-center">
                          <p className="text-[10px] font-bold text-blue-500 uppercase mb-2">
                            Victime
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {CHARACTERS.filter(
                              (c) =>
                                c.id > 2 &&
                                c.id !== killedId &&
                                !(me.characters || []).includes(c.id),
                            ).map((c) => (
                              <button
                                key={c.id}
                                onClick={() => thiefRob(c.id)}
                                className="bg-blue-900 hover:bg-blue-800 text-blue-100 text-[10px] px-3 py-1 rounded border border-blue-700 uppercase font-bold tracking-wider"
                              >
                                Voler {c.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {currentTurnNumber === 3 &&
                        !magicMode &&
                        !abilityUsed && (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setMagicMode("player")}
                              className="bg-purple-900 px-3 py-1 rounded text-purple-200 border border-purple-500"
                            >
                              Échanger Joueur
                            </button>
                            <button
                              onClick={() => setMagicMode("deck")}
                              className="bg-purple-900 px-3 py-1 rounded text-purple-200 border border-purple-500"
                            >
                              Échanger Pioche
                            </button>
                          </div>
                        )}
                      {currentTurnNumber === 8 && !warMode && !abilityUsed && (
                        <button
                          onClick={() => setWarMode(true)}
                          className="w-full py-2 bg-red-900 hover:bg-red-800 text-red-100 font-bold border border-red-600 rounded"
                        >
                          ⚔️ DÉTRUIRE UN QUARTIER ⚔️
                        </button>
                      )}
                      {warMode && (
                        <div className="text-center text-red-500 font-bold animate-pulse">
                          CLIQUEZ SUR UN QUARTIER ADVERSE (HAUT DE L'ÉCRAN)
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 justify-center border-t border-stone-800 pt-3">
                        {canCollectIncome && (
                          <button
                            onClick={collectCharacterIncome}
                            className={`px-2 py-1 rounded text-[10px] border font-bold animate-pulse ${currentTurnNumber === 4 ? "bg-amber-700 border-amber-500 text-amber-100" : currentTurnNumber === 5 ? "bg-blue-800 border-blue-500 text-blue-100" : currentTurnNumber === 6 ? "bg-green-800 border-green-500 text-green-100" : "bg-red-800 border-red-500 text-red-100"}`}
                          >
                            💰 Percevoir Revenus ({incomeAmount})
                          </button>
                        )}
                        {hasLab && !labUsed && (
                          <button
                            onClick={() => {
                              if ((me.hand || []).length > 0)
                                setShowLabModal(true);
                              else notify("Main vide !", "error");
                            }}
                            className="bg-purple-900 px-2 py-1 rounded text-[10px] border border-purple-500 text-purple-200 hover:bg-purple-800"
                          >
                            ⚗️ Laboratoire
                          </button>
                        )}
                        {hasSmithy && !smithyUsed && (
                          <button
                            onClick={useSmithy}
                            className="bg-purple-900 px-2 py-1 rounded text-[10px] border border-purple-500 text-purple-200 hover:bg-purple-800"
                          >
                            🔨 Forge
                          </button>
                        )}
                      </div>
                      <div className="text-center text-stone-400 italic tracking-wider text-xs pt-4">
                        Construisez un quartier ou terminez votre tour.
                      </div>
                      <button
                        onClick={endTurn}
                        className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-amber-500 font-bold uppercase tracking-[0.3em] rounded border-b-4 border-black transition-colors shadow-lg text-lg"
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
        <div className="h-[250px] shrink-0 border-t-4 border-stone-800 bg-[#140f0c] shadow-[0_-20px_60px_rgba(0,0,0,0.9)] z-50 px-6 py-4 flex gap-6 items-end inner-shadow relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-amber-900/10 to-transparent pointer-events-none"></div>
          <div className="w-64 h-full bg-stone-900/80 rounded-lg border-2 border-stone-700 p-4 flex flex-col gap-4 shadow-2xl relative z-10">
            <div className="bg-black/50 p-3 rounded border border-amber-900/50 flex justify-between items-center inner-shadow">
              <span className="text-stone-400 text-[10px] uppercase font-bold tracking-[0.2em]">
                Trésor
              </span>
              <span className="text-3xl text-amber-500 font-bold drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]">
                {me.gold} 🟡
              </span>
              {isKing && (
                <span
                  className="text-2xl animate-pulse"
                  title="Vous êtes le Roi"
                >
                  👑
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              <p className="text-[8px] text-stone-500 uppercase font-bold text-center tracking-[0.2em] mb-1">
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
                    className={`p-1.5 rounded border-2 flex items-center gap-2 transition-all ${played ? "opacity-40 grayscale bg-stone-950 border-stone-800" : `${style.bg} ${style.border}`}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs bg-black/60 ${style.text} ${style.border}`}
                    >
                      {cid}
                    </div>
                    <span
                      className={`text-xs font-bold uppercase tracking-wide ${dead ? "line-through text-red-600Decoration-4" : "text-stone-100"}`}
                    >
                      {char.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex-1 h-full flex items-end justify-center pb-4 relative group z-20 perspective-1000">
            <div className="absolute bottom-0 text-[10px] text-stone-500 font-bold uppercase tracking-[0.4em] opacity-30 group-hover:opacity-0 transition-opacity pointer-events-none mb-1">
              Votre Main
            </div>
            <div className="flex justify-center items-end w-full h-full">
              {(me.hand || []).map((hid, idx) => {
                const total = (me.hand || []).length;
                const center = (total - 1) / 2;
                const dist = idx - center;
                const rot = dist * 5;
                const ty = Math.abs(dist) * 6;
                const canBuild =
                  turnPhase === "build" &&
                  me.gold >= (DISTRICTS.find((d) => d.id === hid)?.cost || 0);
                const isMagicSelected =
                  magicMode === "deck" && magicSelectedCards.includes(hid);
                return (
                  <div
                    key={idx}
                    onClick={() =>
                      magicMode === "deck" &&
                      setMagicSelectedCards((p) =>
                        p.includes(hid)
                          ? p.filter((x) => x !== hid)
                          : [...p, hid],
                      )
                    }
                    className={`first:ml-0 -ml-16 transition-all duration-300 origin-bottom hover:z-[100] hover:-translate-y-24 hover:scale-105 hover:rotate-0 will-change-transform ${isMagicSelected ? "-translate-y-10 ring-4 ring-purple-500" : ""}`}
                    style={{
                      transform: isMagicSelected
                        ? "rotate(0)"
                        : `rotate(${rot}deg) translateY(${ty}px)`,
                    }}
                  >
                    <DistrictCard
                      id={hid}
                      onClick={() =>
                        canBuild && !magicMode && buildDistrict(hid)
                      }
                      disabled={
                        (!canBuild && !magicMode) || turnPhase !== "build"
                      }
                      setTooltip={setTooltip}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-80 h-full bg-stone-900/80 rounded-lg border-2 border-stone-700 p-3 shadow-2xl flex flex-col relative overflow-hidden z-10">
            <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-stone-900 via-stone-900/80 to-transparent z-10 pointer-events-none" />
            <h3 className="text-center text-xs text-stone-300 font-bold uppercase tracking-[0.3em] mb-3 pt-1 sticky top-0 z-20 drop-shadow-md">
              Votre Cité ({(me.city || []).length}/8)
            </h3>
            <div className="flex-1 overflow-y-auto flex flex-wrap content-start gap-2 pr-1 pb-2 custom-scrollbar bg-black/30 p-2 rounded inner-shadow">
              {(me.city || []).map((cid, i) => (
                <DistrictCard
                  key={i}
                  id={cid}
                  small
                  disabled
                  setTooltip={setTooltip}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default App;
