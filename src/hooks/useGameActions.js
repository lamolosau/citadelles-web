import { useRef } from "react";
import { playSound } from "../utils/soundManager";
import { CHARACTERS, DISTRICTS } from "../data/gameData";
import { shuffle, removeOne, DISTRICT_MAP } from "../utils/gameLogic";

export const useGameActions = (props) => {
  const {
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
    gameStatus,
    setGameStatus,
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
  } = props;

  const actionLockRef = useRef(false);

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

    const discarded = [];
    DISTRICTS.forEach((card) => {
      const total = card.qty || 1;
      const used = countsInPlay[card.id] || 0;
      for (let i = 0; i < total - used; i++) discarded.push(card.id);
    });

    return [...currentStack, ...shuffle(discarded)];
  };

  const pickCharacter = async (cid) => {
    if (
      actionLockRef.current ||
      isActionPending ||
      players[currentPlayerIndex]?.user_id !== myId
    )
      return;

    actionLockRef.current = true;
    setIsActionPending(true);

    try {
      const me = players.find((p) => p.user_id === myId);
      if ((me?.characters || []).includes(cid)) return;

      const count = players.length;
      const remaining = draftPile.filter((c) => c.id !== cid);
      let updateRoom = {};
      const promises = [];

      setDraftPile(remaining);

      if (count === 2) {
        const kingIdx = players.findIndex((p) => p.user_id === kingPlayerId);
        const p1Idx = kingIdx !== -1 ? kingIdx : 0;
        const p2Idx = (p1Idx + 1) % 2;

        if ([6, 5, 3, 1].includes(remaining.length)) {
          promises.push(
            supabase
              .from("players")
              .update({ characters: [...(me.characters || []), cid] })
              .eq("user_id", myId)
              .eq("room_id", roomId),
          );
        }

        if (remaining.length === 1) {
          setGameStatus("playing");
          setCurrentTurnNumber(1);
          setTurnPhase("resource");
          updateRoom = {
            status: "playing",
            draft_pile: [],
            current_character_turn: 1,
          };
        } else {
          let nextIdx = currentPlayerIndex;
          let nextStep = draftSubStep;

          if (remaining.length === 6) {
            nextIdx = p2Idx;
            nextStep = "pick";
          } else if (remaining.length === 5) {
            nextIdx = p2Idx;
            nextStep = "discard";
          } else if (remaining.length === 4) {
            nextIdx = p1Idx;
            nextStep = "pick";
          } else if (remaining.length === 3) {
            nextIdx = p1Idx;
            nextStep = "discard";
          } else if (remaining.length === 2) {
            nextIdx = p2Idx;
            nextStep = "pick";
          }

          setCurrentPlayerIndex(nextIdx);
          setDraftSubStep(nextStep);
          updateRoom = {
            draft_pile: remaining,
            current_player_index: nextIdx,
            draft_sub_step: nextStep,
          };
        }
      } else {
        promises.push(
          supabase
            .from("players")
            .update({ characters: [...(me.characters || []), cid] })
            .eq("user_id", myId)
            .eq("room_id", roomId),
        );

        const nextIdx = (currentPlayerIndex + 1) % count;
        const safeStart =
          players.findIndex((p) => p.user_id === kingPlayerId) !== -1
            ? players.findIndex((p) => p.user_id === kingPlayerId)
            : 0;

        if (
          (count === 3 && remaining.length === 1) ||
          (count > 3 && nextIdx === safeStart)
        ) {
          setGameStatus("playing");
          setCurrentTurnNumber(1);
          setTurnPhase("resource");
          updateRoom = {
            status: "playing",
            draft_pile: [],
            current_character_turn: 1,
          };
        } else {
          setCurrentPlayerIndex(nextIdx);
          updateRoom = { draft_pile: remaining, current_player_index: nextIdx };
        }
      }

      promises.push(supabase.from("rooms").update(updateRoom).eq("id", roomId));
      await Promise.all(promises);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const takeGold = async () => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      const me = players.find((p) => p.user_id === myId);
      setTurnPhase("build");
      await Promise.all([
        supabase
          .from("players")
          .update({ gold: (me.gold || 0) + 2 })
          .eq("user_id", myId)
          .eq("room_id", roomId),
        supabase
          .from("rooms")
          .update({ current_turn_phase: "build" })
          .eq("id", roomId),
      ]);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const startDraw = async () => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      const me = players.find((p) => p.user_id === myId);
      const { data: r } = await supabase
        .from("rooms")
        .select("district_stack")
        .eq("id", roomId)
        .single();

      let s = r.district_stack || [];
      const hasObs = (me.city || []).some(
        (id) => DISTRICT_MAP[id]?.name === "Observatoire",
      );
      const count = hasObs ? 3 : 2;

      s = await rebuildDeckIfNeeded(s, count);
      if (s.length < count) return notify("La pioche est épuisée !", "error");

      const opts = s.splice(0, count);
      setDrawOptions(opts);
      setTurnPhase("drawing");
      await supabase
        .from("rooms")
        .update({ district_stack: s, current_turn_phase: "drawing" })
        .eq("id", roomId);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const pickDrawnCard = async (cid) => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      const me = players.find((p) => p.user_id === myId);
      const hasLibrary = (me.city || []).some(
        (id) => DISTRICT_MAP[id]?.name === "Bibliothèque",
      );
      const kept = hasLibrary ? drawOptions : [cid];
      const rejected = hasLibrary ? [] : removeOne(drawOptions, cid);
      const { data: r } = await supabase
        .from("rooms")
        .select("district_stack")
        .eq("id", roomId)
        .single();

      setDrawOptions([]);
      setTurnPhase("build");

      if (hasLibrary)
        notify("Bibliothèque : Vous gardez toutes les cartes !", "success");

      await Promise.all([
        supabase
          .from("rooms")
          .update({
            district_stack: [...(r.district_stack || []), ...rejected],
            current_turn_phase: "build",
          })
          .eq("id", roomId),
        supabase
          .from("players")
          .update({ hand: [...(me.hand || []), ...kept] })
          .eq("user_id", myId)
          .eq("room_id", roomId),
      ]);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const buildDistrict = async (cid) => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      const me = playersRef.current.find((p) => p.user_id === myIdRef.current);
      if (!me) return;

      const c = DISTRICT_MAP[cid];
      if (me.gold < c.cost) return notify("Pas assez d'or !", "error");

      const limit = currentTurnNumber === 7 ? 3 : 1;
      if (buildsCount >= limit) return notify("Limite atteinte !", "error");

      const newCity = [...(me.city || []), cid];
      setBuildsCount((p) => p + 1);
      notify(`Construction : ${c.name}`, "success");

      const promises = [
        supabase
          .from("players")
          .update({
            city: newCity,
            hand: removeOne(me.hand || [], cid),
            gold: me.gold - c.cost,
          })
          .eq("user_id", myId)
          .eq("room_id", roomId),
      ];
      if (newCity.length >= 8 && !firstBuilderId)
        promises.push(
          supabase
            .from("rooms")
            .update({ first_builder_id: myId })
            .eq("id", roomId),
        );

      await Promise.all(promises);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const destroyDistrict = async (targetPlayerId, districtId, cost) => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      const me = players.find((p) => p.user_id === myId);
      const target = players.find((p) => p.user_id === targetPlayerId);
      const isBishop = (target.characters || []).includes(5);

      if (isBishop && killedId !== 5)
        return notify("L'Évêque est protégé par l'Église.", "error");

      const hasGreatWall = (target.city || []).some(
        (id) => DISTRICT_MAP[id]?.name === "Grande Muraille",
      );
      const destCost = cost - 1 + (hasGreatWall ? 1 : 0);

      if (me.gold < destCost)
        return notify(
          hasGreatWall ? "Grande Muraille : Coût +1 Or !" : "Pas assez d'or !",
          "error",
        );

      const c = DISTRICT_MAP[districtId];
      if (c.name === "Donjon")
        return notify("Le Donjon est indestructible !", "error");

      setWarMode(false);
      setAbilityUsed(true);

      const animData = {
        type: "condottiere_destroy",
        sourceId: myId,
        targetId: targetPlayerId,
        districtId: districtId,
      };
      setActiveAnimation(animData);
      setTimeout(() => setActiveAnimation(null), 2500);
      broadcastAction("play_animation", { data: animData });
      broadcastNotify(
        `Le Condottiere a détruit le quartier ${c.name} de ${target.pseudo}.`,
        "error",
      );

      await Promise.all([
        supabase
          .from("players")
          .update({ gold: me.gold - destCost })
          .eq("user_id", myId)
          .eq("room_id", roomId),
        supabase
          .from("players")
          .update({ city: removeOne(target.city || [], districtId) })
          .eq("user_id", targetPlayerId)
          .eq("room_id", roomId),
      ]);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const useLab = async (cid) => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      const me = players.find((p) => p.user_id === myId);
      setLabUsed(true);
      setShowLabModal(false);
      notify("Laboratoire : Carte transformée en Or.", "gold");
      await supabase
        .from("players")
        .update({ hand: removeOne(me.hand || [], cid), gold: me.gold + 1 })
        .eq("user_id", myId);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const useSmithy = async () => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
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
      setSmithyUsed(true);
      notify("Forge : 3 Cartes forgées !", "success");

      await Promise.all([
        supabase.from("rooms").update({ district_stack: s }).eq("id", roomId),
        supabase
          .from("players")
          .update({ hand: [...(me.hand || []), ...drawn], gold: me.gold - 2 })
          .eq("user_id", myId),
      ]);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const magicianSwapPlayer = async (tid) => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      const me = players.find((p) => p.user_id === myId);
      const target = players.find((p) => p.user_id === tid);

      setMagicMode(null);
      setAbilityUsed(true);

      const animData = {
        type: "magic_swap",
        sourceId: myId,
        targetId: tid,
        from: myId,
        to: tid,
      };
      setActiveAnimation(animData);
      setTimeout(() => setActiveAnimation(null), 2500);
      broadcastAction("play_animation", { data: animData });
      broadcastNotify(
        `Le Magicien a échangé son jeu avec ${target.pseudo}.`,
        "info",
      );

      await Promise.all([
        supabase
          .from("players")
          .update({ hand: target.hand || [] })
          .eq("user_id", myId)
          .eq("room_id", roomId),
        supabase
          .from("players")
          .update({ hand: me.hand || [] })
          .eq("user_id", tid)
          .eq("room_id", roomId),
      ]);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const magicianSwapDeck = async () => {
    if (actionLockRef.current || isActionPending) return;
    if (magicSelectedCards.length === 0) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      const me = players.find((p) => p.user_id === myId);
      const { data: r } = await supabase
        .from("rooms")
        .select("district_stack")
        .eq("id", roomId)
        .single();

      let stack = r.district_stack || [];
      stack = await rebuildDeckIfNeeded(stack, magicSelectedCards.length);
      if (stack.length < magicSelectedCards.length)
        return notify("Pas assez de cartes !", "error");

      const drawn = stack.splice(0, magicSelectedCards.length);
      const currentHand = me.hand || [];
      const cardsToPutBack = magicSelectedCards.map((idx) => currentHand[idx]);
      const newHand = currentHand.filter(
        (_, idx) => !magicSelectedCards.includes(idx),
      );

      setMagicMode(null);
      setMagicSelectedCards([]);
      setAbilityUsed(true);

      const animData = { type: "magic_swap_deck", player: myId };
      setActiveAnimation(animData);
      setTimeout(() => setActiveAnimation(null), 2500);
      broadcastAction("play_animation", { data: animData });
      broadcastNotify(
        `Le Magicien a échangé ${drawn.length} cartes avec la pioche.`,
        "info",
      );

      await Promise.all([
        supabase
          .from("rooms")
          .update({ district_stack: [...stack, ...cardsToPutBack] })
          .eq("id", roomId),
        supabase
          .from("players")
          .update({ hand: [...newHand, ...drawn] })
          .eq("user_id", myId)
          .eq("room_id", roomId),
      ]);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const thiefRob = async (tid) => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      const me = players.find((p) => p.user_id === myId);
      if (me && (me.characters || []).includes(tid))
        return notify("Auto-vol interdit !", "error");
      if (tid === killedId) return notify("Déjà mort !", "error");
      if (tid === 1) return notify("Impossible !", "error");

      setTurnPhase("resource");
      const animData = { type: "thief_rob", sourceId: myId, targetId: tid };
      setActiveAnimation(animData);
      setTimeout(() => setActiveAnimation(null), 2500);
      broadcastAction("play_animation", { data: animData });
      await supabase
        .from("rooms")
        .update({ robbed_char_id: tid })
        .eq("id", roomId);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const assassinKill = async (tid) => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      const me = playersRef.current.find((p) => p.user_id === myIdRef.current);
      if (me && (me.characters || []).includes(tid))
        return notify("Suicide interdit !", "error");

      setTurnPhase("resource");
      const animData = { type: "assassin_kill", sourceId: myId, targetId: tid };
      setActiveAnimation(animData);
      setTimeout(() => setActiveAnimation(null), 2500);
      broadcastAction("play_animation", { data: animData });
      await supabase
        .from("rooms")
        .update({ killed_char_id: tid })
        .eq("id", roomId);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const forceNextTurn = async () => {
    const next = currentTurnNumber + 1;
    if (next > 8) {
      setGameStatus("drafting");
      const { data: ps } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId);
      if (ps.some((p) => (p.city || []).length >= 8)) {
        await supabase
          .from("rooms")
          .update({ status: "finished" })
          .eq("id", roomId);
      } else {
        const { data: r } = await supabase
          .from("rooms")
          .select("district_stack")
          .eq("id", roomId)
          .single();
        await prepareDraft(r.district_stack);
      }
    } else {
      setCurrentTurnNumber(next);
      setTurnPhase("resource");
      broadcastAction("next_turn", { turn: next });
      await supabase
        .from("rooms")
        .update({
          current_character_turn: next,
          current_turn_phase: "resource",
        })
        .eq("id", roomId);
    }
  };

  const endTurn = async () => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    playSound("wood-button.mp3", 0.4, null);
    try {
      const me = players.find((p) => p.user_id === myId);
      await Promise.all([
        supabase
          .from("players")
          .update({
            played_characters: [
              ...(me.played_characters || []),
              currentTurnNumber,
            ],
          })
          .eq("user_id", myId)
          .eq("room_id", roomId),
        forceNextTurn(),
      ]);
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const prepareDraft = async (stack) => {
    const pc = playersRef.current.length;
    let c = shuffle([...CHARACTERS]);
    const fd = c.pop();
    let fuCount = pc === 4 ? 2 : pc === 5 ? 1 : 0;
    const fu = c.splice(0, fuCount);

    await Promise.all([
      supabase
        .from("players")
        .update({ characters: [], played_characters: [] })
        .eq("room_id", roomId),
      supabase
        .from("rooms")
        .update({
          status: "drafting",
          district_stack: stack || [],
          draft_pile: c,
          face_down_char: fd.id,
          face_up_chars: fu,
          current_player_index:
            playersRef.current.findIndex(
              (p) => p.user_id === kingPlayerIdRef.current,
            ) === -1
              ? 0
              : playersRef.current.findIndex(
                  (p) => p.user_id === kingPlayerIdRef.current,
                ),
          current_character_turn: 1,
          draft_sub_step: "pick",
          killed_char_id: null,
          robbed_char_id: null,
          current_turn_phase: "resource",
        })
        .eq("id", roomId),
    ]);
  };

  const collectCharacterIncome = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      const me = players.find((p) => p.user_id === myId);
      if (turnStartIncome > 0) {
        setIncomeCollected(true);
        notify(`Revenus : +${turnStartIncome} Or`, "gold");
        await supabase
          .from("players")
          .update({ gold: me.gold + turnStartIncome })
          .eq("user_id", myId);
      }
    } finally {
      actionLockRef.current = false;
    }
  };

  const quitGame = async () => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      await supabase
        .from("players")
        .delete()
        .eq("user_id", myId)
        .eq("room_id", roomId);
      window.location.reload();
    } catch (error) {
      console.error(error);
      notify("Erreur lors de la tentative de fuite...", "error");
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  return {
    rebuildDeckIfNeeded,
    pickCharacter,
    takeGold,
    startDraw,
    pickDrawnCard,
    buildDistrict,
    destroyDistrict,
    useLab,
    useSmithy,
    magicianSwapPlayer,
    magicianSwapDeck,
    thiefRob,
    assassinKill,
    endTurn,
    forceNextTurn,
    collectCharacterIncome,
    quitGame,
  };
};
