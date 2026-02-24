import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

// ==========================================
// IMPORTS : Composants et Vues
// ==========================================
import LoadingScreen from "./components/LoadingScreen";
import LoginView from "./views/LoginView";
import LobbyView from "./views/LobbyView";
import FinishedView from "./views/FinishedView";
import GameView from "./views/GameView";

// ==========================================
// IMPORTS : Custom Hooks
// ==========================================
import { useRoomConnection } from "./hooks/useRoomConnection";
import { useGameActions } from "./hooks/useGameActions";
import { useSupabaseSync } from "./hooks/useSupabaseSync";

function App() {
  // ----------------------------------------
  // 1. ÉTATS GLOBAUX DE L'APPLICATION
  // ----------------------------------------
  const hasSavedSession = !!(
    localStorage.getItem("citadelles_room_id") &&
    localStorage.getItem("citadelles_player_id")
  );

  const [loading, setLoading] = useState(hasSavedSession);
  const [view, setView] = useState("login");
  const [notification, setNotification] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  // États du Joueur & Salle
  const [pseudo, setPseudo] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [myId, setMyId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [onlineIds, setOnlineIds] = useState([]);

  // États de la Partie
  const [gameStatus, setGameStatus] = useState("waiting");
  const [roomHostId, setRoomHostId] = useState(null);
  const [kingPlayerId, setKingPlayerId] = useState(null);
  const [currentTurnNumber, setCurrentTurnNumber] = useState(1);
  const [turnPhase, setTurnPhase] = useState("resource");

  const [draftPile, setDraftPile] = useState([]);
  const [draftSubStep, setDraftSubStep] = useState("pick");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  // États spécifiques au Tour
  const [drawOptions, setDrawOptions] = useState([]);
  const [killedId, setKilledId] = useState(null);
  const [robbedId, setRobbedId] = useState(null);
  const [buildsCount, setBuildsCount] = useState(0);
  const [firstBuilderId, setFirstBuilderId] = useState(null);

  // Capacités spéciales & Actions UI
  const [magicMode, setMagicMode] = useState(null);
  const [magicSelectedCards, setMagicSelectedCards] = useState([]);
  const [warMode, setWarMode] = useState(false);
  const [abilityUsed, setAbilityUsed] = useState(false);
  const [labUsed, setLabUsed] = useState(false);
  const [smithyUsed, setSmithyUsed] = useState(false);

  const [incomeCollected, setIncomeCollected] = useState(false);
  const [turnStartIncome, setTurnStartIncome] = useState(0);

  // Interface de gestion
  const [showLabModal, setShowLabModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [playerToKickId, setPlayerToKickId] = useState(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState(null); // ⚡ NOUVEAU : Gère les animations visuelles

  // ----------------------------------------
  // 2. RÉFÉRENCES MUTABLES (Pour les effets)
  // ----------------------------------------
  const myIdRef = useRef(null);
  const roomIdRef = useRef(null);
  const playersRef = useRef([]);
  const roomHostIdRef = useRef(null);
  const kingPlayerIdRef = useRef(null);
  const lastKilledRef = useRef(null);
  const lastRobbedRef = useRef(null);
  const ghostTimersRef = useRef({});
  const channelRef = useRef(null);

  useEffect(() => {
    myIdRef.current = myId;
    roomIdRef.current = roomId;
    playersRef.current = players;
    roomHostIdRef.current = roomHostId;
    kingPlayerIdRef.current = kingPlayerId;
  }, [myId, roomId, players, roomHostId, kingPlayerId]);

  // ----------------------------------------
  // 3. FONCTIONS UTILITAIRES DE L'APP
  // ----------------------------------------
  const opponents = players.filter((p) => p.user_id !== myId);

  const notify = (msg, type = "info") => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const broadcastNotify = (msg, type = "info") => {
    notify(msg, type); // On l'affiche pour soi-même
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "global_notify",
        payload: { message: msg, type },
      });
    }
  };
  // NOUVEAU : Le Mégaphone invisible pour synchroniser les écrans instantanément !
  const broadcastAction = (action, payload) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "sync_action",
        payload: { action, ...payload },
      });
    }
  };

  const fullReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  // ----------------------------------------
  // 4. BRANCHEMENT DES HOOKS LOGIQUES
  // ----------------------------------------

  // Hook de gestion du Lobby
  const room = useRoomConnection({
    supabase,
    pseudo,
    roomCode,
    roomId,
    myId,
    setMyId,
    setRoomId,
    setRoomCode,
    setView,
    setLoading,
    setPlayers,
    setShowLeaveModal,
    playerToKickId,
    setPlayerToKickId,
    notify,
  });

  // Hook des Actions de Jeu
  const actions = useGameActions({
    supabase,
    myId,
    myIdRef,
    roomId,
    players,
    playersRef,
    draftPile,
    setDraftPile,
    draftSubStep,
    setDraftSubStep,
    currentPlayerIndex,
    setCurrentPlayerIndex,
    kingPlayerId,
    kingPlayerIdRef,
    drawOptions,
    setDrawOptions,
    currentTurnNumber,
    setCurrentTurnNumber,
    killedId,
    robbedId,
    buildsCount,
    setBuildsCount,
    firstBuilderId,
    setTurnPhase,
    setWarMode,
    setAbilityUsed,
    setShowLabModal,
    setLabUsed,
    setSmithyUsed,
    setMagicMode,
    magicSelectedCards,
    setMagicSelectedCards,
    turnStartIncome,
    setIncomeCollected,
    isActionPending,
    setIsActionPending,
    notify,
    broadcastNotify,
    broadcastAction,
    setActiveAnimation,
    gameStatus,
    setGameStatus,
  });

  // Hook de Synchronisation Supabase (Temps réel & Événements)
  useSupabaseSync({
    supabase,
    hasSavedSession,
    loading,
    setLoading,
    setView,
    setMyId,
    setRoomId,
    setRoomCode,
    setPseudo,
    myId,
    roomId,
    players,
    setPlayers,
    gameStatus,
    setGameStatus,
    roomHostId,
    setRoomHostId,
    kingPlayerId,
    setKingPlayerId,
    onlineIds,
    setOnlineIds,
    currentTurnNumber,
    setCurrentTurnNumber,
    turnPhase,
    setTurnPhase,
    setDraftPile,
    setDraftSubStep,
    setCurrentPlayerIndex,
    killedId,
    setKilledId,
    robbedId,
    setRobbedId,
    setFirstBuilderId,
    notify,
    backToLobby: room.backToLobby,
    ghostTimersRef,
    myIdRef,
    roomIdRef,
    playersRef,
    roomHostIdRef,
    kingPlayerIdRef,
    lastKilledRef,
    lastRobbedRef,
    setBuildsCount,
    setWarMode,
    setMagicMode,
    setMagicSelectedCards,
    setAbilityUsed,
    setLabUsed,
    setSmithyUsed,
    setIncomeCollected,
    setShowLabModal,
    setTurnStartIncome,
    turnStartIncome,
    rebuildDeckIfNeeded: actions.rebuildDeckIfNeeded,
    forceNextTurn: actions.forceNextTurn,
    channelRef,
    setActiveAnimation,
  });

  // ----------------------------------------
  // 5. ROUTAGE DE L'AFFICHAGE (Render)
  // ----------------------------------------

  if (loading) {
    return (
      <LoadingScreen onCancel={room.confirmLeaveGame} onReset={fullReset} />
    );
  }

  if (view === "login") {
    return (
      <LoginView
        pseudo={pseudo}
        setPseudo={setPseudo}
        createRoom={room.createRoom}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        joinRoom={room.joinRoom}
      />
    );
  }

  if (view === "lobby") {
    return (
      <LobbyView
        setShowLeaveModal={setShowLeaveModal}
        roomCode={roomCode}
        players={players}
        onlineIds={onlineIds}
        roomHostId={roomHostId}
        myId={myId}
        setPlayerToKickId={setPlayerToKickId}
        startGame={room.startGame}
        showLeaveModal={showLeaveModal}
        confirmLeaveGame={room.confirmLeaveGame}
        playerToKickId={playerToKickId}
        confirmKick={room.confirmKick}
      />
    );
  }

  if (view === "finished") {
    return (
      <FinishedView
        players={players}
        myId={myId}
        roomHostId={roomHostId}
        backToLobby={room.backToLobby}
        firstBuilderId={firstBuilderId}
      />
    );
  }

  if (view === "game") {
    return (
      <GameView
        players={players}
        myId={myId}
        opponents={opponents}
        notification={notification}
        tooltip={tooltip}
        setTooltip={setTooltip}
        showLabModal={showLabModal}
        setShowLabModal={setShowLabModal}
        turnPhase={turnPhase}
        setTurnPhase={setTurnPhase}
        magicMode={magicMode}
        setMagicMode={setMagicMode}
        magicSelectedCards={magicSelectedCards}
        setMagicSelectedCards={setMagicSelectedCards}
        drawOptions={drawOptions}
        gameStatus={gameStatus}
        currentPlayerIndex={currentPlayerIndex}
        draftPile={draftPile}
        draftSubStep={draftSubStep}
        currentTurnNumber={currentTurnNumber}
        killedId={killedId}
        robbedId={robbedId}
        roomHostId={roomHostId}
        kingPlayerId={kingPlayerId}
        warMode={warMode}
        setWarMode={setWarMode}
        turnStartIncome={turnStartIncome}
        incomeCollected={incomeCollected}
        abilityUsed={abilityUsed}
        labUsed={labUsed}
        smithyUsed={smithyUsed}
        // Actions liées au Hook "useGameActions"
        pickCharacter={actions.pickCharacter}
        takeGold={actions.takeGold}
        startDraw={actions.startDraw}
        pickDrawnCard={actions.pickDrawnCard}
        buildDistrict={actions.buildDistrict}
        destroyDistrict={actions.destroyDistrict}
        magicianSwapPlayer={actions.magicianSwapPlayer}
        magicianSwapDeck={actions.magicianSwapDeck}
        thiefRob={actions.thiefRob}
        assassinKill={actions.assassinKill}
        useLab={actions.useLab}
        useSmithy={actions.useSmithy}
        collectCharacterIncome={actions.collectCharacterIncome}
        endTurn={actions.endTurn}
        forceNextTurn={actions.forceNextTurn}
        activeAnimation={activeAnimation}
        quitGame={actions.quitGame}
      />
    );
  }

  return null;
}

export default App;
