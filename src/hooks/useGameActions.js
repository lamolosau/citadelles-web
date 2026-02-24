import { useRef, useState } from "react";
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
    setPlayers,
    setKilledId,
    setRobbedId,
    setKingPlayerId,
  } = props;

  const actionLockRef = useRef(false);
  const [animatingDraftCard, setAnimatingDraftCard] = useState(null);

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
    if (actionLockRef.current || players[currentPlayerIndex]?.user_id !== myId)
      return;
    const me = players.find((p) => p.user_id === myId);
    if ((me?.characters || []).includes(cid)) return;

    actionLockRef.current = true;

    const count = players.length;
    let remaining = draftPile.filter((c) => c.id !== cid);
    const kingIdx = players.findIndex((p) => p.user_id === kingPlayerId);
    const safeStart = kingIdx !== -1 ? kingIdx : 0;

    let isDraftOver = false;
    let nextIdx = currentPlayerIndex;
    let nextStep = draftSubStep;

    if (count === 2) {
      const p1Idx = safeStart;
      const p2Idx = (p1Idx + 1) % 2;
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
      } else if (remaining.length === 1) {
        isDraftOver = true;
        remaining = [];
      } else if (remaining.length === 0) {
        isDraftOver = true;
      }
    } else if (count >= 3 && count <= 6) {
      if (remaining.length === 1) {
        nextIdx = currentPlayerIndex;
        nextStep = "discard";
      } else if (remaining.length === 0) {
        isDraftOver = true;
      } else {
        nextIdx = (currentPlayerIndex + 1) % count;
        nextStep = "pick";
      }
    } else if (count === 7) {
      if (
        remaining.length === 1 &&
        currentPlayerIndex === (safeStart + 5) % 7
      ) {
        nextIdx = (currentPlayerIndex + 1) % 7;
        nextStep = "pick";
      } else if (
        remaining.length === 1 &&
        currentPlayerIndex === (safeStart + 6) % 7
      ) {
        nextIdx = currentPlayerIndex;
        nextStep = "discard";
      } else if (remaining.length === 0) {
        isDraftOver = true;
      } else {
        nextIdx = (currentPlayerIndex + 1) % 7;
        nextStep = "pick";
      }
    } else if (count === 8) {
      if (remaining.length === 0) isDraftOver = true;
      else {
        nextIdx = (currentPlayerIndex + 1) % count;
        nextStep = "pick";
      }
    }

    const isPick = draftSubStep === "pick";
    const nextPlayers = players.map((p) => ({ ...p }));
    if (isPick) {
      const pIdx = nextPlayers.findIndex((p) => p.user_id === myId);
      if (pIdx !== -1) {
        nextPlayers[pIdx].characters = [
          ...(nextPlayers[pIdx].characters || []),
          cid,
        ];
      }
    }

    supabase.functions
      .invoke("game-action", {
        body: {
          action: "PICK_CHARACTER",
          roomId,
          payload: {
            characterId: cid,
            remaining,
            nextIdx,
            nextStep,
            isDraftOver,
            isPick,
          },
        },
      })
      .catch(console.error);

    setDraftPile(remaining);
    if (setPlayers) setPlayers(nextPlayers);

    if (isDraftOver) {
      setGameStatus("playing");
      setCurrentTurnNumber(1);
      setTurnPhase("resource");
    } else {
      setCurrentPlayerIndex(nextIdx);
      setDraftSubStep(nextStep);
    }

    broadcastAction("sync_draft", {
      draftPile: remaining,
      currentPlayerIndex: nextIdx,
      draftSubStep: nextStep,
      isDraftOver,
      optimisticPlayers: nextPlayers,
    });

    actionLockRef.current = false;
  };

  const pickDrawnCard = async (cid) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;

    const rejected = removeOne(drawOptions, cid);
    supabase.functions
      .invoke("game-action", {
        body: {
          action: "PICK_DRAWN_CARD",
          roomId: roomId,
          payload: { pickedId: cid, rejectedIds: rejected },
        },
      })
      .catch(console.error);

    setDrawOptions([]);
    setTurnPhase("build");
    actionLockRef.current = false;
  };

  const takeGold = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setTurnPhase("build");
    if (setPlayers)
      setPlayers((prev) =>
        prev.map((p) => (p.user_id === myId ? { ...p, gold: p.gold + 2 } : p)),
      );
    supabase.functions
      .invoke("game-action", { body: { action: "TAKE_GOLD", roomId: roomId } })
      .catch(console.error);
    setTimeout(() => {
      actionLockRef.current = false;
    }, 200);
  };

  const startDraw = async () => {
    if (actionLockRef.current || isActionPending) return;
    actionLockRef.current = true;
    setIsActionPending(true);
    try {
      const { data, error } = await supabase.functions.invoke("game-action", {
        body: { action: "START_DRAW", roomId: roomId },
      });
      if (error || data?.error) return notify("Impossible de piocher", "error");
      setDrawOptions(data.drawOptions);
      setTurnPhase("drawing");
    } finally {
      actionLockRef.current = false;
      setIsActionPending(false);
    }
  };

  const buildDistrict = async (cid) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    const c = DISTRICT_MAP[cid];
    const me = playersRef.current.find((p) => p.user_id === myIdRef.current);
    if (me.gold < c.cost) {
      actionLockRef.current = false;
      return notify("Pas assez d'or !", "error");
    }
    const limit = currentTurnNumber === 7 ? 3 : 1;
    if (buildsCount >= limit) {
      actionLockRef.current = false;
      return notify("Limite atteinte !", "error");
    }

    setBuildsCount((p) => p + 1);
    if (setPlayers) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.user_id === myId
            ? {
                ...p,
                gold: p.gold - c.cost,
                city: [...(p.city || []), cid],
                hand: removeOne(p.hand || [], cid),
              }
            : p,
        ),
      );
    }
    notify(`Construction : ${c.name}`, "success");
    supabase.functions
      .invoke("game-action", {
        body: {
          action: "BUILD_DISTRICT",
          roomId: roomId,
          payload: { districtId: cid },
        },
      })
      .catch(console.error);
    setTimeout(() => {
      actionLockRef.current = false;
    }, 300);
  };

  const assassinKill = async (tid) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    if (setKilledId) setKilledId(tid);
    setTurnPhase("resource");
    const animData = { type: "assassin_kill", sourceId: myId, targetId: tid };
    setActiveAnimation(animData);
    setTimeout(() => setActiveAnimation(null), 2500);
    broadcastAction("play_animation", { data: animData });
    supabase.functions
      .invoke("game-action", {
        body: {
          action: "ASSASSIN_KILL",
          roomId: roomId,
          payload: { targetId: tid },
        },
      })
      .catch(console.error);
    setTimeout(() => {
      actionLockRef.current = false;
    }, 1000);
  };

  const thiefRob = async (tid) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    if (setRobbedId) setRobbedId(tid);
    setTurnPhase("resource");
    const animData = { type: "thief_rob", sourceId: myId, targetId: tid };
    setActiveAnimation(animData);
    setTimeout(() => setActiveAnimation(null), 2500);
    broadcastAction("play_animation", { data: animData });
    supabase.functions
      .invoke("game-action", {
        body: {
          action: "THIEF_ROB",
          roomId: roomId,
          payload: { targetId: tid },
        },
      })
      .catch(console.error);
    setTimeout(() => {
      actionLockRef.current = false;
    }, 1000);
  };

  const applyOptimisticTurn = (next) => {
    let nextPlayers = players.map((p) => ({ ...p }));
    let nextKingId = kingPlayerId;

    if (next === 4) {
      const kingOwner = nextPlayers.find((p) =>
        (p.characters || []).includes(4),
      );
      if (kingOwner) nextKingId = kingOwner.user_id;
    }

    if (killedId !== next) {
      if (robbedId === next) {
        const thief = nextPlayers.find((p) => (p.characters || []).includes(2));
        const victim = nextPlayers.find((p) =>
          (p.characters || []).includes(next),
        );
        if (thief && victim && victim.gold > 0) {
          thief.gold += victim.gold;
          victim.gold = 0;
        }
      }
      if (next === 6) {
        const merchant = nextPlayers.find((p) =>
          (p.characters || []).includes(6),
        );
        if (merchant) merchant.gold += 1;
      }
    }

    setCurrentTurnNumber(next);
    setTurnPhase("resource");
    if (setPlayers) setPlayers(nextPlayers);
    if (setKingPlayerId) {
      setKingPlayerId(nextKingId);
      if (kingPlayerIdRef) kingPlayerIdRef.current = nextKingId;
    }

    broadcastAction("next_turn", {
      turn: next,
      optimisticPlayers: nextPlayers,
      optimisticKing: nextKingId,
    });
  };

  const endTurn = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    playSound("wood-button.mp3", 0.4, null);
    const next = currentTurnNumber + 1;
    if (next <= 8) applyOptimisticTurn(next);
    supabase.functions
      .invoke("game-action", {
        body: { action: "ADVANCE_TURN", roomId, payload: { isEndTurn: true } },
      })
      .catch(console.error);
    setTimeout(() => {
      actionLockRef.current = false;
    }, 300);
  };

  const forceNextTurn = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    const next = currentTurnNumber + 1;
    if (next <= 8) applyOptimisticTurn(next);
    supabase.functions
      .invoke("game-action", {
        body: { action: "ADVANCE_TURN", roomId, payload: { isEndTurn: false } },
      })
      .catch(console.error);
    setTimeout(() => {
      actionLockRef.current = false;
    }, 300);
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
    animatingDraftCard: null,
  };
};
