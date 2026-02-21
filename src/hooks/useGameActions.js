import { CHARACTERS, DISTRICTS } from "../data/gameData";
import { shuffle, removeOne } from "../utils/gameLogic";

// ==========================================
// HOOK : Actions de Jeu (Version Ultra Rapide ⚡)
// ==========================================

export const useGameActions = ({
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
}) => {
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
      const total = card.qty || 1;
      const used = countsInPlay[card.id] || 0;
      const inDisc = total - used;
      for (let i = 0; i < inDisc; i++) discarded.push(card.id);
    });
    return [...currentStack, ...shuffle(discarded)];
  };

  const pickCharacter = async (cid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    const me = players.find((p) => p.user_id === myId);
    if ((me?.characters || []).includes(cid)) {
      setIsActionPending(false);
      return;
    }

    const count = players.length;
    let updateRoom = {};
    const promises = [];
    const remaining = draftPile.filter((c) => c.id !== cid);

    setDraftPile(remaining);

    if (count === 2) {
      if (draftSubStep === "pick") {
        promises.push(
          supabase
            .from("players")
            .update({ characters: [...(me.characters || []), cid] })
            .eq("user_id", myId)
            .eq("room_id", roomId),
        );
        if (remaining.length === 1) {
          updateRoom = {
            status: "playing",
            draft_pile: [],
            current_character_turn: 1,
          };
        } else if (draftPile.length === 7) {
          updateRoom = {
            draft_pile: remaining,
            current_player_index: (currentPlayerIndex + 1) % 2,
          };
          setCurrentPlayerIndex((currentPlayerIndex + 1) % 2);
        } else {
          updateRoom = { draft_pile: remaining, draft_sub_step: "discard" };
          setDraftSubStep("discard");
        }
      } else {
        updateRoom = {
          draft_pile: remaining,
          draft_sub_step: "pick",
          current_player_index: (currentPlayerIndex + 1) % 2,
        };
        setDraftSubStep("pick");
        setCurrentPlayerIndex((currentPlayerIndex + 1) % 2);
      }
    } else {
      promises.push(
        supabase
          .from("players")
          .update({ characters: [...(me.characters || []), cid] })
          .eq("user_id", myId)
          .eq("room_id", roomId),
      );
      const next = (currentPlayerIndex + 1) % count;
      const startIdx = players.findIndex((p) => p.user_id === kingPlayerId);
      const safeStart = startIdx === -1 ? 0 : startIdx;

      if (
        (count === 3 && remaining.length === 1) ||
        (count > 3 && next === safeStart)
      ) {
        updateRoom = {
          status: "playing",
          draft_pile: [],
          current_character_turn: 1,
        };
      } else {
        updateRoom = { draft_pile: remaining, current_player_index: next };
        setCurrentPlayerIndex(next);
      }
    }

    promises.push(supabase.from("rooms").update(updateRoom).eq("id", roomId));
    await Promise.all(promises);
    setIsActionPending(false);
  };

  const takeGold = async () => {
    if (isActionPending) return;
    setIsActionPending(true);
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
    setIsActionPending(false);
  };

  const startDraw = async () => {
    if (isActionPending) return;
    setIsActionPending(true);
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
      return setIsActionPending(false);
    }

    const opts = s.splice(0, count);
    setDrawOptions(opts);
    setTurnPhase("drawing");
    await supabase
      .from("rooms")
      .update({ district_stack: s, current_turn_phase: "drawing" })
      .eq("id", roomId);
    setIsActionPending(false);
  };

  const pickDrawnCard = async (cid) => {
    if (isActionPending) return;
    setIsActionPending(true);
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
    setIsActionPending(false);
  };

  const buildDistrict = async (cid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    const me = playersRef.current.find((p) => p.user_id === myIdRef.current);
    if (!me) return setIsActionPending(false);

    const c = DISTRICTS.find((d) => d.id == cid);
    if (me.gold < c.cost) {
      notify("Pas assez d'or !", "error");
      return setIsActionPending(false);
    }
    const limit = currentTurnNumber === 7 ? 3 : 1;
    if (buildsCount >= limit) {
      notify("Limite atteinte !", "error");
      return setIsActionPending(false);
    }

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
    setIsActionPending(false);
  };

  const destroyDistrict = async (targetPlayerId, districtId, cost) => {
    if (isActionPending) return;
    setIsActionPending(true);
    const me = players.find((p) => p.user_id === myId);
    const target = players.find((p) => p.user_id === targetPlayerId);
    const isBishop = (target.characters || []).includes(5);

    if (isBishop && killedId !== 5) {
      notify("L'Évêque est protégé par l'Église.", "error");
      return setIsActionPending(false);
    }
    const hasGreatWall = (target.city || []).some(
      (id) => DISTRICTS.find((d) => d.id == id)?.name === "Grande Muraille",
    );
    const destCost = cost - 1 + (hasGreatWall ? 1 : 0);

    if (me.gold < destCost) {
      notify(
        hasGreatWall ? "Grande Muraille : Coût +1 Or !" : "Pas assez d'or !",
        "error",
      );
      return setIsActionPending(false);
    }
    const c = DISTRICTS.find((d) => d.id == districtId);
    if (c.name === "Donjon") {
      notify("Le Donjon est indestructible !", "error");
      return setIsActionPending(false);
    }

    setWarMode(false);
    setAbilityUsed(true);
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
    setIsActionPending(false);
  };

  const useLab = async (cid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    const me = players.find((p) => p.user_id === myId);
    setLabUsed(true);
    setShowLabModal(false);
    notify("Laboratoire : Carte transformée en Or.", "gold");
    await supabase
      .from("players")
      .update({ hand: removeOne(me.hand || [], cid), gold: me.gold + 1 })
      .eq("user_id", myId);
    setIsActionPending(false);
  };

  const useSmithy = async () => {
    if (isActionPending) return;
    setIsActionPending(true);
    const me = players.find((p) => p.user_id === myId);
    if (me.gold < 2) {
      notify("Pas assez d'or pour la Forge !", "error");
      return setIsActionPending(false);
    }

    const { data: r } = await supabase
      .from("rooms")
      .select("district_stack")
      .eq("id", roomId)
      .single();
    let s = r.district_stack || [];
    s = await rebuildDeckIfNeeded(s, 3);
    if (s.length < 3) {
      notify("Pioche épuisée pour la Forge.", "error");
      return setIsActionPending(false);
    }

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
    setIsActionPending(false);
  };

  const magicianSwapPlayer = async (tid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    const me = players.find((p) => p.user_id === myId);
    const target = players.find((p) => p.user_id === tid);
    setMagicMode(null);
    setAbilityUsed(true);
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
    setIsActionPending(false);
  };

  const magicianSwapDeck = async () => {
    if (isActionPending) return;
    setIsActionPending(true);
    if (magicSelectedCards.length === 0) return setIsActionPending(false);

    const me = players.find((p) => p.user_id === myId);
    const { data: r } = await supabase
      .from("rooms")
      .select("district_stack")
      .eq("id", roomId)
      .single();
    let stack = r.district_stack || [];
    stack = await rebuildDeckIfNeeded(stack, magicSelectedCards.length);

    if (stack.length < magicSelectedCards.length) {
      notify("Pas assez de cartes !", "error");
      return setIsActionPending(false);
    }

    const drawn = stack.splice(0, magicSelectedCards.length);
    const currentHand = me.hand || [];
    const cardsToPutBack = magicSelectedCards.map((idx) => currentHand[idx]);
    const newHand = currentHand.filter(
      (_, idx) => !magicSelectedCards.includes(idx),
    );

    setMagicMode(null);
    setMagicSelectedCards([]);
    setAbilityUsed(true);
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
    setIsActionPending(false);
  };

  const thiefRob = async (tid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    const me = players.find((p) => p.user_id === myId);
    if (me && (me.characters || []).includes(tid)) {
      notify("Auto-vol interdit !", "error");
      return setIsActionPending(false);
    }
    if (tid === killedId) {
      notify("Déjà mort !", "error");
      return setIsActionPending(false);
    }
    if (tid === 1) {
      notify("Impossible !", "error");
      return setIsActionPending(false);
    }

    setTurnPhase("resource");
    // Suppression de la notification locale : la DB s'occupe de le dire à tout le monde !
    await supabase
      .from("rooms")
      .update({ robbed_char_id: tid })
      .eq("id", roomId);
    setIsActionPending(false);
  };

  const assassinKill = async (tid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    const me = playersRef.current.find((p) => p.user_id === myIdRef.current);
    if (me && (me.characters || []).includes(tid)) {
      notify("Suicide interdit !", "error");
      return setIsActionPending(false);
    }

    setTurnPhase("resource");
    // Suppression de la notification locale : la DB s'occupe de le dire à tout le monde !
    await supabase
      .from("rooms")
      .update({ killed_char_id: tid })
      .eq("id", roomId);
    setIsActionPending(false);
  };

  const endTurn = async () => {
    if (isActionPending) return;
    setIsActionPending(true);
    const me = players.find((p) => p.user_id === myId);
    setTurnPhase("resource");
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
    setIsActionPending(false);
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

  const forceNextTurn = async () => {
    const next = currentTurnNumber + 1;
    if (next > 8) {
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

      // ⚡ MAGIE : Le Roi prévient instantanément l'écran des autres joueurs de changer de tour !
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

  const collectCharacterIncome = async () => {
    const me = players.find((p) => p.user_id === myId);
    if (turnStartIncome > 0) {
      setIncomeCollected(true);
      notify(`Revenus : +${turnStartIncome} Or`, "gold");
      await supabase
        .from("players")
        .update({ gold: me.gold + turnStartIncome })
        .eq("user_id", myId);
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
  };
};
