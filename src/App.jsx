import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { DISTRICTS, CHARACTERS } from "./data/constants";

// IMPORT DES VUES ET COMPOSANTS
import LoadingScreen from "./components/LoadingScreen";
import NotificationBanner from "./components/NotificationBanner";
import LoginScreen from "./views/LoginScreen";
import LobbyScreen from "./views/LobbyScreen";
import GameScreen from "./views/GameScreen";
import EndScreen from "./views/EndScreen";

function App() {
  const hasSavedSession = !!(
    localStorage.getItem("citadelles_room_id") &&
    localStorage.getItem("citadelles_player_id")
  );
  const [loading, setLoading] = useState(hasSavedSession);
  const [view, setView] = useState("login");
  const [notification, setNotification] = useState(null);

  // USER DATA
  const [pseudo, setPseudo] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [myId, setMyId] = useState(null);

  // GAME STATE
  const [players, setPlayers] = useState([]);
  const [gameStatus, setGameStatus] = useState("waiting");
  const [roomHostId, setRoomHostId] = useState(null);
  const [kingPlayerId, setKingPlayerId] = useState(null);
  const [onlineIds, setOnlineIds] = useState([]);

  // TURN STATE
  const [currentTurnNumber, setCurrentTurnNumber] = useState(1);
  const [turnPhase, setTurnPhase] = useState("resource");
  const [draftPile, setDraftPile] = useState([]);
  const [draftSubStep, setDraftSubStep] = useState("pick");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [drawOptions, setDrawOptions] = useState([]);
  const [killedId, setKilledId] = useState(null);
  const [robbedId, setRobbedId] = useState(null);
  const [firstBuilderId, setFirstBuilderId] = useState(null);

  // REFS
  const myIdRef = useRef(null);
  const roomIdRef = useRef(null);
  const playersRef = useRef([]);
  const roomHostIdRef = useRef(null);
  const kingPlayerIdRef = useRef(null);

  useEffect(() => {
    myIdRef.current = myId;
    roomIdRef.current = roomId;
    playersRef.current = players;
    roomHostIdRef.current = roomHostId;
    kingPlayerIdRef.current = kingPlayerId;
  }, [myId, roomId, players, roomHostId, kingPlayerId]);

  const notify = (msg, type = "info") => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fullReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  // --- INITIALISATION TOLÉRANTE (FIX F5) ---
  useEffect(() => {
    if (!hasSavedSession) {
      setLoading(false);
      return;
    }

    const init = async () => {
      const sR = localStorage.getItem("citadelles_room_id");
      const sP = localStorage.getItem("citadelles_player_id");

      if (!sR || !sP) {
        setLoading(false);
        return;
      }

      // 1. Check Room
      const { data: rm, error: errRoom } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", sR)
        .single();

      // Si la room n'est pas trouvée (supprimée), on clean.
      if (!rm && !errRoom) {
        console.log("Room introuvable");
        localStorage.clear();
        setLoading(false);
        return;
      }
      // Si erreur technique, on reste en loading (ne pas détruire la session)
      if (errRoom) {
        console.warn("Erreur chargement room:", errRoom);
        // On tente quand même de charger le joueur, sinon on laisse l'utilisateur reset manuellement
      }

      // 2. Check Player
      const { data: p, error: errPlayer } = await supabase
        .from("players")
        .select("*")
        .eq("user_id", sP)
        .eq("room_id", sR)
        .single();

      // Si le joueur n'est pas trouvé (kick), on clean.
      if (!p && !errPlayer) {
        console.log("Joueur introuvable");
        localStorage.clear();
        setLoading(false);
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
        // Si on est ici, c'est qu'il y a eu un souci mais pas fatal. On enlève le loading pour laisser l'user voir l'accueil si besoin,
        // mais on ne clear pas forcément tout brutalement.
        setLoading(false);
      }
    };
    init();
  }, []);

  // --- ACTIONS ---
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
      if (r.status !== "waiting")
        return notify(
          "Impossible de rejoindre : La partie a déjà commencé !",
          "error",
        );
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

  const kickPlayer = async (userId) => {
    await supabase
      .from("players")
      .delete()
      .eq("user_id", userId)
      .eq("room_id", roomId);
  };

  const confirmLeaveGame = async () => {
    if (myId && roomId) {
      const { count } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId);
      if (count <= 1) await supabase.from("rooms").delete().eq("id", roomId);
      await supabase
        .from("players")
        .delete()
        .eq("user_id", myId)
        .eq("room_id", roomId);
    }
    localStorage.removeItem("citadelles_room_id");
    localStorage.removeItem("citadelles_player_id");
    setRoomId(null);
    setMyId(null);
    setPlayers([]);
    setView("login");
    setLoading(false);
  };

  // --- AUTO-CLEAN (Fermeture Onglet) ---
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      if (myId && roomId) {
        const { count } = await supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("room_id", roomId);
        if (count <= 1) supabase.from("rooms").delete().eq("id", roomId).then();
        supabase
          .from("players")
          .delete()
          .eq("user_id", myId)
          .eq("room_id", roomId)
          .then();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Watchdog Solitude (En jeu) - Désactivé si loading pour éviter faux positif au F5
    if (
      !loading &&
      gameStatus !== "waiting" &&
      gameStatus !== "finished" &&
      players.length === 1
    ) {
      const timer = setTimeout(() => {
        notify("Plus d'adversaires ! Retour au lobby...", "error");
        backToLobby();
      }, 5000); // 5s delai
      return () => clearTimeout(timer);
    }

    // Ghost Cleaner (Hôte seulement)
    const ghostInterval = setInterval(() => {
      if (myId === roomHostId && players.length > 0 && onlineIds.length > 0) {
        const ghosts = players.filter((p) => !onlineIds.includes(p.user_id));
        if (ghosts.length > 0) {
          ghosts.forEach((g) => {
            // On ne supprime que si ça fait un moment (ici on simplifie, suppression directe)
            if (g.user_id !== myId)
              supabase
                .from("players")
                .delete()
                .eq("user_id", g.user_id)
                .eq("room_id", roomId)
                .then();
          });
        }
      }
    }, 4000); // Check toutes les 4s

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(ghostInterval);
    };
  }, [myId, roomId, roomHostId, players, onlineIds, gameStatus, loading]);

  // --- GAME START LOGIC ---
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

  const startGame = async () => {
    const { data: latestPlayers } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });
    let deck = [];
    DISTRICTS.forEach((card) => {
      for (let i = 0; i < (card.qty || 1); i++) deck.push(card.id);
    });
    deck = shuffle(deck);
    for (const p of latestPlayers)
      await supabase
        .from("players")
        .update({ hand: deck.splice(0, 4) })
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
        district_stack: deck,
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

  // --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    if (!roomId) return;
    const fetchAll = async () => {
      const { data: ps } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true });
      if (ps && ps.length > 0) {
        setPlayers(ps);
        const amIHere = ps.find((p) => p.user_id === myId);
        // Seulement si je ne suis pas là ET que ce n'est pas un chargement initial
        if (myId && !amIHere && !loading) {
          localStorage.removeItem("citadelles_room_id");
          localStorage.removeItem("citadelles_player_id");
          setRoomId(null);
          setMyId(null);
          setPlayers([]);
          setView("login");
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
        // Auto-Host Promotion
        if (ps && ps.length > 0) {
          const hostExists = ps.find((p) => p.user_id === r.host_id);
          if (!hostExists) {
            const newHost = ps[0];
            if (newHost.user_id === myId) {
              await supabase
                .from("rooms")
                .update({ host_id: newHost.user_id })
                .eq("id", roomId);
              notify("L'hôte a quitté. Vous êtes le nouvel hôte !", "gold");
            }
          }
        }
        // Notifications
        if (r.king_player_id && r.king_player_id !== kingPlayerIdRef.current) {
          if (kingPlayerIdRef.current !== null)
            notify("Le Roi est mort, Vive le Roi !", "gold");
          kingPlayerIdRef.current = r.king_player_id;
        }
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

        // Sync State
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

        // View Routing
        if (r.status === "finished") setView("finished");
        else if (r.status !== "waiting") setView("game");
        else setView("lobby");
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

  if (loading)
    return <LoadingScreen onCancel={confirmLeaveGame} onReset={fullReset} />;

  return (
    <>
      <NotificationBanner
        message={notification?.message}
        type={notification?.type}
      />
      {view === "login" && (
        <LoginScreen
          pseudo={pseudo}
          setPseudo={setPseudo}
          roomCode={roomCode}
          setRoomCode={setRoomCode}
          createRoom={createRoom}
          joinRoom={joinRoom}
        />
      )}
      {view === "lobby" && (
        <LobbyScreen
          roomCode={roomCode}
          players={players}
          onlineIds={onlineIds}
          myId={myId}
          roomHostId={roomHostId}
          startGame={startGame}
          kickPlayer={kickPlayer}
          confirmLeaveGame={confirmLeaveGame}
        />
      )}
      {view === "game" && (
        <GameScreen
          myId={myId}
          roomId={roomId}
          roomHostId={roomHostId}
          players={players}
          gameStatus={gameStatus}
          currentTurnNumber={currentTurnNumber}
          turnPhase={turnPhase}
          setTurnPhase={setTurnPhase}
          draftPile={draftPile}
          draftSubStep={draftSubStep}
          currentPlayerIndex={currentPlayerIndex}
          drawOptions={drawOptions}
          setDrawOptions={setDrawOptions}
          killedId={killedId}
          robbedId={robbedId}
          kingPlayerId={kingPlayerId}
          firstBuilderId={firstBuilderId}
          onlineIds={onlineIds}
          notify={notify}
        />
      )}
      {view === "finished" && (
        <EndScreen
          players={players}
          myId={myId}
          roomHostId={roomHostId}
          backToLobby={backToLobby}
          firstBuilderId={firstBuilderId}
        />
      )}
    </>
  );
}

export default App;
