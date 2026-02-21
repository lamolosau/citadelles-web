import { GLOBAL_STYLES, getCharColors } from "../utils/theme";
import { CHARACTERS, DISTRICTS, getCardDesc } from "../data/gameData";
import NotificationBanner from "../components/NotificationBanner";
import DistrictCard from "../components/DistrictCard";

// ==========================================
// VUE : GameView
// ==========================================

const GameView = ({
  players,
  myId,
  opponents,
  notification,
  tooltip,
  setTooltip,
  showLabModal,
  setShowLabModal,
  turnPhase,
  setTurnPhase,
  magicMode,
  setMagicMode,
  magicSelectedCards,
  setMagicSelectedCards,
  drawOptions,
  gameStatus,
  currentPlayerIndex,
  draftPile,
  draftSubStep,
  pickCharacter,
  currentTurnNumber,
  killedId,
  roomHostId,
  forceNextTurn,
  abilityUsed,
  magicianSwapPlayer,
  magicianSwapDeck,
  takeGold,
  startDraw,
  pickDrawnCard,
  assassinKill,
  robbedId,
  thiefRob,
  warMode,
  setWarMode,
  turnStartIncome,
  incomeCollected,
  collectCharacterIncome,
  labUsed,
  smithyUsed,
  useSmithy,
  endTurn,
  buildDistrict,
  destroyDistrict,
  kingPlayerId,
  useLab,
}) => {
  const me = players.find((p) => p.user_id === myId);

  if (!me)
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-amber-500 font-bold text-2xl animate-pulse">
        Chargement du Royaume...
      </div>
    );

  const opponentsRender = opponents.map((opp) => (
    <div
      key={opp.id}
      className="min-w-[180px] h-[120px] bg-stone-800/50 rounded border-2 border-stone-700 p-2 flex flex-col gap-1 relative shadow-lg"
    >
      <div className="flex justify-between items-center border-b border-stone-700 pb-1">
        <span className="font-bold text-amber-100 truncate max-w-[90px] text-sm tracking-wide">
          {opp.pseudo}
        </span>
        <div className="flex gap-2 text-[10px]">
          <span className="text-yellow-500 font-bold">💰{opp.gold}</span>
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
  ));

  const myHandRender = (me.hand || []).map((hid, idx) => {
    const total = (me.hand || []).length;
    const center = (total - 1) / 2;
    const dist = idx - center;
    const rot = dist * 5;
    const ty = Math.abs(dist) * 6;
    const canBuild =
      turnPhase === "build" &&
      me.gold >= (DISTRICTS.find((d) => d.id === hid)?.cost || 0);
    const isMagicSelected =
      magicMode === "deck" && magicSelectedCards.includes(idx); // <-- ICI on utilise l'index
    return (
      <div
        key={idx}
        onClick={() =>
          magicMode === "deck" &&
          setMagicSelectedCards(
            (p) => (p.includes(idx) ? p.filter((x) => x !== idx) : [...p, idx]), // <-- ICI aussi
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
          onClick={() => canBuild && !magicMode && buildDistrict(hid)}
          disabled={(!canBuild && !magicMode) || turnPhase !== "build"}
          setTooltip={setTooltip}
        />
      </div>
    );
  });

  const myCityRender = (me.city || []).map((cid, i) => (
    <DistrictCard key={i} id={cid} small disabled setTooltip={setTooltip} />
  ));

  const isMyDraftTurn =
    gameStatus === "drafting" && players[currentPlayerIndex]?.user_id === myId;
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
  const hasLab = (me.city || []).some(
    (id) => DISTRICTS.find((d) => d.id == id)?.name === "Laboratoire",
  );
  const hasSmithy = (me.city || []).some(
    (id) => DISTRICTS.find((d) => d.id == id)?.name === "Forge",
  );
  const canCollectIncome =
    [4, 5, 6, 8].includes(currentTurnNumber) &&
    !incomeCollected &&
    turnStartIncome > 0;

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
            <span className="text-yellow-500 font-bold">💰 {tooltip.cost}</span>
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
      {isMyCharTurn && turnPhase === "drawing" && drawOptions.length === 0 && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[100]">
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
        {opponentsRender}
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
                  {activeChar?.name || "Inconnu"}
                </h2>
              </div>
              {isDead && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                  <div className="bg-red-950/90 border-4 border-red-600 text-red-500 text-5xl font-black uppercase tracking-[0.4em] px-8 py-4 rounded-xl transform -rotate-12 shadow-[0_0_60px_rgba(220,38,38,0.8)] animate-pulse backdrop-blur-sm">
                    MORT
                  </div>
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
              <div className="bg-[#1a1614] border-4 border-amber-700/50 p-6 rounded-lg max-w-2xl w-full shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom-5 fade-in duration-500 inner-shadow max-h-[calc(100vh-420px)] overflow-y-auto custom-scrollbar z-[60]">
                <h3 className="text-xl text-center text-amber-100 mb-4 uppercase tracking-[0.3em] border-b-2 border-stone-800 pb-2">
                  Votre Tour, Messire
                </h3>
                {currentTurnNumber === 3 && magicMode && !abilityUsed && (
                  <div className="mb-4 bg-purple-900/30 p-3 rounded border border-purple-500">
                    <h4 className="text-purple-300 font-bold mb-2">GRIMOIRE</h4>
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
                      <span className="font-bold text-stone-200">PIOCHER</span>
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
                              c.id > 1 && !(me.characters || []).includes(c.id),
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
                    {currentTurnNumber === 3 && !magicMode && !abilityUsed && (
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
                          💰 Percevoir Revenus ({turnStartIncome})
                        </button>
                      )}
                      {hasLab && !labUsed && (
                        <button
                          onClick={() => {
                            if ((me.hand || []).length > 0)
                              setShowLabModal(true);
                            else notification("Main vide !", "error");
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

      <div className="h-[250px] shrink-0 border-t-4 border-stone-800 bg-[#140f0c] shadow-[0_-20px_60px_rgba(0,0,0,0.9)] z-50 px-6 py-4 flex gap-6 items-end inner-shadow relative pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-amber-900/10 to-transparent pointer-events-none"></div>
        <div className="w-64 h-full bg-stone-900/80 rounded-lg border-2 border-stone-700 p-4 flex flex-col gap-4 shadow-2xl relative z-10 pointer-events-auto">
          <div className="bg-black/50 p-3 rounded border border-amber-900/50 flex justify-between items-center inner-shadow">
            <span className="text-stone-400 text-[10px] uppercase font-bold tracking-[0.2em]">
              Trésor
            </span>
            <span className="text-3xl text-amber-500 font-bold drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]">
              {me.gold} 🟡
            </span>
            {isKing && (
              <span className="text-2xl animate-pulse" title="Vous êtes le Roi">
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
                    {char?.name || "Inconnu"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex-1 h-full flex items-end justify-center pb-4 relative group z-20 perspective-1000 pointer-events-auto">
          <div className="absolute bottom-0 text-[10px] text-stone-500 font-bold uppercase tracking-[0.4em] opacity-30 group-hover:opacity-0 transition-opacity pointer-events-none mb-1">
            Votre Main
          </div>
          <div className="flex justify-center items-end w-full h-full">
            {myHandRender}
          </div>
        </div>
        <div className="w-80 h-full bg-stone-900/80 rounded-lg border-2 border-stone-700 p-3 shadow-2xl flex flex-col relative overflow-hidden z-10 pointer-events-auto">
          <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-stone-900 via-stone-900/80 to-transparent z-10 pointer-events-none" />
          <h3 className="text-center text-xs text-stone-300 font-bold uppercase tracking-[0.3em] mb-3 pt-1 sticky top-0 z-20 drop-shadow-md">
            Votre Cité ({(me.city || []).length}/8)
          </h3>
          <div className="flex-1 overflow-y-auto flex flex-wrap content-start gap-2 pr-1 pb-2 custom-scrollbar bg-black/30 p-2 rounded inner-shadow">
            {myCityRender}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameView;
