import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import {
  CHARACTERS,
  DISTRICTS,
  getCardDesc,
  getCharColors,
  GLOBAL_STYLES,
} from "../data/constants";
import DistrictCard from "../components/DistrictCard";

const GameScreen = ({
  myId,
  roomId,
  roomHostId,
  players,
  gameStatus,
  currentTurnNumber,
  turnPhase,
  setTurnPhase,
  draftPile,
  draftSubStep,
  currentPlayerIndex,
  drawOptions,
  setDrawOptions,
  killedId,
  robbedId,
  kingPlayerId,
  firstBuilderId,
  onlineIds,
  notify,
}) => {
  const [buildsCount, setBuildsCount] = useState(0);
  const [magicMode, setMagicMode] = useState(null);
  const [magicSelectedCards, setMagicSelectedCards] = useState([]);
  const [warMode, setWarMode] = useState(false);
  const [abilityUsed, setAbilityUsed] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [labUsed, setLabUsed] = useState(false);
  const [smithyUsed, setSmithyUsed] = useState(false);
  const [incomeCollected, setIncomeCollected] = useState(false);
  const [turnStartIncome, setTurnStartIncome] = useState(0);
  const [isActionPending, setIsActionPending] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  // --- REFS POUR ÉVITER LES BUGS DE DONNÉES FANTÔMES ---
  const myIdRef = useRef(myId);
  const playersRef = useRef(players);
  const kingPlayerIdRef = useRef(kingPlayerId);
  const meRef = useRef(null);
  const turnPhaseRef = useRef(turnPhase);

  const opponents = players.filter((p) => p.user_id !== myId);
  const me = players.find((p) => p.user_id === myId);

  useEffect(() => {
    myIdRef.current = myId;
    playersRef.current = players;
    kingPlayerIdRef.current = kingPlayerId;
    meRef.current = me;
    turnPhaseRef.current = turnPhase;
  }, [myId, players, kingPlayerId, me, turnPhase]);

  // --- Helpers Locaux ---
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

  const removeOne = (arr, val) => {
    const idx = arr.indexOf(val);
    if (idx === -1) return arr;
    const newArr = [...arr];
    newArr.splice(idx, 1);
    return newArr;
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

  // --- AUTOMATISMES D'INTERFACE ---
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
    setIsActionPending(false);

    let kingInterval = null;
    if (myId === roomHostId && Number(currentTurnNumber) === 4) {
      kingInterval = setInterval(async () => {
        const kingOwner = playersRef.current.find((p) =>
          (p.characters || []).includes(4),
        );
        if (kingOwner && kingOwner.user_id !== kingPlayerIdRef.current) {
          await supabase
            .from("rooms")
            .update({ king_player_id: kingOwner.user_id })
            .eq("id", roomId);
        }
      }, 2000);
    }

    // Le ROI et l'HÔTE peuvent faire passer le tour du mort (sécurité)
    if (
      (myId === roomHostId || myId === kingPlayerIdRef.current) &&
      Number(killedId) === Number(currentTurnNumber)
    ) {
      const t = setTimeout(() => forceNextTurn(), 4000);
      return () => {
        clearTimeout(t);
        if (kingInterval) clearInterval(kingInterval);
      };
    }

    const currentMe = meRef.current;
    if (
      currentMe &&
      (currentMe.characters || []).includes(Number(currentTurnNumber)) &&
      turnPhaseRef.current === "resource"
    ) {
      let targetColor =
        Number(currentTurnNumber) === 4
          ? "yellow"
          : Number(currentTurnNumber) === 5
            ? "blue"
            : Number(currentTurnNumber) === 6
              ? "green"
              : "red";
      let amount = (currentMe.city || []).filter((id) => {
        const d = DISTRICTS.find((x) => x.id == id);
        return d && (d.color === targetColor || d.name === "École de Magie");
      }).length;
      setTurnStartIncome(amount);

      if (
        Number(robbedId) === Number(currentTurnNumber) &&
        Number(killedId) !== Number(currentTurnNumber)
      ) {
        const thief = playersRef.current.find((p) =>
          (p.characters || []).includes(2),
        );
        if (thief && currentMe.gold > 0) {
          const goldAmount = currentMe.gold;
          supabase
            .from("players")
            .update({ gold: 0 })
            .eq("user_id", myId)
            .eq("room_id", roomId)
            .then();
          supabase
            .from("players")
            .update({ gold: thief.gold + goldAmount })
            .eq("user_id", thief.user_id)
            .eq("room_id", roomId)
            .then();
          notify(`VOUS AVEZ ÉTÉ VOLÉ ! (-${goldAmount} Or)`, "error");
        }
      }
    }

    return () => {
      if (kingInterval) clearInterval(kingInterval);
    };
  }, [currentTurnNumber, gameStatus, killedId]);

  // =========================================================================
  // MOTEUR DU JEU
  // =========================================================================

  const applyRobberyIfNeeded = async () => {
    let myCurrentGold = meRef.current?.gold || 0;
    if (
      Number(robbedId) === Number(currentTurnNumber) &&
      Number(killedId) !== Number(currentTurnNumber)
    ) {
      const thief = playersRef.current.find((p) =>
        (p.characters || []).includes(2),
      );
      if (thief && myCurrentGold > 0) {
        const stolen = myCurrentGold;
        await supabase
          .from("players")
          .update({ gold: thief.gold + stolen })
          .eq("user_id", thief.user_id)
          .eq("room_id", roomId);
        myCurrentGold = 0;
      }
    }
    return myCurrentGold;
  };

  const takeGold = async () => {
    if (isActionPending) return;
    setIsActionPending(true);
    setTurnPhase("build"); // UI Optimiste
    try {
      let baseGold = await applyRobberyIfNeeded();
      let goldToAdd = 2;
      let cardsToAdd = [];
      let message = "+2 Or";

      if (Number(currentTurnNumber) === 6 && Number(killedId) !== 6) {
        goldToAdd += 1;
        message = "+3 Or (Bonus Marchand)";
      }

      if (Number(currentTurnNumber) === 7 && Number(killedId) !== 7) {
        const { data: r } = await supabase
          .from("rooms")
          .select("district_stack")
          .eq("id", roomId)
          .single();
        let stack = r.district_stack || [];
        stack = await rebuildDeckIfNeeded(stack, 2);
        cardsToAdd = stack.splice(0, 2);

        await Promise.all([
          supabase
            .from("rooms")
            .update({ district_stack: stack, current_turn_phase: "build" })
            .eq("id", roomId),
          supabase
            .from("players")
            .update({
              gold: baseGold + goldToAdd,
              hand: [...(me.hand || []), ...cardsToAdd],
            })
            .eq("user_id", myId)
            .eq("room_id", roomId),
        ]);
        message += " et +2 Cartes (Architecte)";
      } else {
        await Promise.all([
          supabase
            .from("players")
            .update({ gold: baseGold + goldToAdd })
            .eq("user_id", myId)
            .eq("room_id", roomId),
          supabase
            .from("rooms")
            .update({ current_turn_phase: "build" })
            .eq("id", roomId),
        ]);
      }
      notify(message, "gold");
    } catch (e) {
      console.error(e);
      setTurnPhase("resource"); // Rollback UI
    } finally {
      setIsActionPending(false);
    }
  };

  const startDraw = async () => {
    if (isActionPending) return;
    setIsActionPending(true);
    setTurnPhase("drawing"); // UI Optimiste
    try {
      let baseGold = await applyRobberyIfNeeded();
      let goldToAdd = 0;

      if (Number(currentTurnNumber) === 6 && Number(killedId) !== 6) {
        goldToAdd = 1;
        notify("Bonus Marchand : +1 Or", "gold");
      }

      if (baseGold !== me.gold || goldToAdd > 0) {
        await supabase
          .from("players")
          .update({ gold: baseGold + goldToAdd })
          .eq("user_id", myId)
          .eq("room_id", roomId);
      }

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
        setTurnPhase("resource");
        setIsActionPending(false);
        return;
      }

      const opts = s.splice(0, count);
      setDrawOptions(opts);
      await supabase
        .from("rooms")
        .update({ district_stack: s, current_turn_phase: "drawing" })
        .eq("id", roomId);
    } catch (e) {
      console.error(e);
      setTurnPhase("resource"); // Rollback UI
    } finally {
      setIsActionPending(false);
    }
  };

  const pickDrawnCard = async (cid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    setTurnPhase("build"); // UI Optimiste
    setDrawOptions([]);
    try {
      const hasLibrary = (me.city || []).some(
        (id) => DISTRICTS.find((d) => d.id == id)?.name === "Bibliothèque",
      );
      let kept = hasLibrary ? drawOptions : [cid];
      const rejected = hasLibrary ? [] : removeOne(drawOptions, cid);

      const { data: r } = await supabase
        .from("rooms")
        .select("district_stack")
        .eq("id", roomId)
        .single();
      let stack = r.district_stack || [];

      if (Number(currentTurnNumber) === 7 && Number(killedId) !== 7) {
        stack = await rebuildDeckIfNeeded(stack, 2);
        const extraCards = stack.splice(0, 2);
        kept = [...kept, ...extraCards];
        notify("Pioche validée (+2 Cartes Architecte)", "success");
      } else {
        if (hasLibrary) notify("Bibliothèque : Vous gardez tout !", "success");
      }

      await Promise.all([
        supabase
          .from("rooms")
          .update({
            district_stack: [...stack, ...rejected],
            current_turn_phase: "build",
          })
          .eq("id", roomId),
        supabase
          .from("players")
          .update({ hand: [...(me.hand || []), ...kept] })
          .eq("user_id", myId)
          .eq("room_id", roomId),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionPending(false);
    }
  };

  const assassinKill = async (tid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
      if ((me.characters || []).includes(tid))
        return notify("Suicide interdit !", "error");
      await supabase
        .from("rooms")
        .update({ killed_char_id: Number(tid) })
        .eq("id", roomId);
      notify("Cible éliminée.", "error");
    } finally {
      setIsActionPending(false);
    }
  };

  const thiefRob = async (tid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
      if ((me.characters || []).includes(tid))
        return notify("Auto-vol interdit !", "error");
      if (Number(tid) === Number(killedId))
        return notify("On ne vole pas un mort !", "error");
      if (Number(tid) === 1)
        return notify("Impossible de voler l'Assassin.", "error");
      await supabase
        .from("rooms")
        .update({ robbed_char_id: Number(tid) })
        .eq("id", roomId);
      notify("Cible marquée pour le vol.", "info");
    } finally {
      setIsActionPending(false);
    }
  };

  const pickCharacter = async (cid) => {
    const currentMe = playersRef.current.find((p) => p.user_id === myId);
    if ((currentMe?.characters || []).includes(cid)) return;

    const count = players.length;
    let updateRoom = {};

    if (count === 2) {
      const remaining = draftPile.filter((c) => c.id !== cid);
      if (draftSubStep === "pick") {
        const newC = [...(currentMe.characters || []), cid];
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
        .update({ characters: [...(currentMe.characters || []), cid] })
        .eq("user_id", myId)
        .eq("room_id", roomId);
      const remaining = draftPile.filter((c) => c.id !== cid);
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
      }
    }
    await supabase.from("rooms").update(updateRoom).eq("id", roomId);
  };

  const buildDistrict = async (cid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
      const meCheck = playersRef.current.find(
        (p) => p.user_id === myIdRef.current,
      );
      if (!meCheck) return notify("Erreur sync", "error");
      const c = DISTRICTS.find((d) => d.id == cid);
      if (meCheck.gold < c.cost) return notify("Pas assez d'or !", "error");
      const limit = Number(currentTurnNumber) === 7 ? 3 : 1;
      if (buildsCount >= limit)
        return notify("Limite de construction atteinte !", "error");

      const newCity = [...(meCheck.city || []), cid];
      const { error } = await supabase
        .from("players")
        .update({
          city: newCity,
          hand: removeOne(meCheck.hand || [], cid),
          gold: meCheck.gold - c.cost,
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
    } finally {
      setIsActionPending(false);
    }
  };

  const destroyDistrict = async (targetPlayerId, districtId, cost) => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
      const target = players.find((p) => p.user_id === targetPlayerId);
      const isBishop = (target.characters || []).includes(5);
      if (isBishop && Number(killedId) !== 5)
        return notify("L'Évêque est protégé par l'Église.", "error");

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
      setWarMode(false);
      setAbilityUsed(true);
      notify("Quartier détruit !", "success");
    } finally {
      setIsActionPending(false);
    }
  };

  const useLab = async (cid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
      await supabase
        .from("players")
        .update({ hand: removeOne(me.hand || [], cid), gold: me.gold + 1 })
        .eq("user_id", myId);
      setLabUsed(true);
      setShowLabModal(false);
      notify("Laboratoire : Carte transformée en 1 Or.", "gold");
    } finally {
      setIsActionPending(false);
    }
  };

  const useSmithy = async () => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
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
      await Promise.all([
        supabase.from("rooms").update({ district_stack: s }).eq("id", roomId),
        supabase
          .from("players")
          .update({ hand: [...(me.hand || []), ...drawn], gold: me.gold - 2 })
          .eq("user_id", myId),
      ]);
      setSmithyUsed(true);
      notify("Forge : 3 Cartes forgées !", "success");
    } finally {
      setIsActionPending(false);
    }
  };

  const magicianSwapPlayer = async (tid) => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
      const target = players.find((p) => p.user_id === tid);
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
      setMagicMode(null);
      setAbilityUsed(true);
      notify("Mains échangées !", "success");
    } finally {
      setIsActionPending(false);
    }
  };

  const magicianSwapDeck = async () => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
      if (magicSelectedCards.length === 0) return;
      const { data: r } = await supabase
        .from("rooms")
        .select("district_stack")
        .eq("id", roomId)
        .single();
      let stack = r.district_stack || [];
      stack = await rebuildDeckIfNeeded(stack, magicSelectedCards.length);
      if (stack.length < magicSelectedCards.length)
        return notify("Pas assez de cartes dans la pioche.", "error");

      const drawn = stack.splice(0, magicSelectedCards.length);
      let newHand = [...(me.hand || [])];
      magicSelectedCards.forEach((c) => {
        newHand = removeOne(newHand, c);
      });

      await Promise.all([
        supabase
          .from("rooms")
          .update({ district_stack: [...stack, ...magicSelectedCards] })
          .eq("id", roomId),
        supabase
          .from("players")
          .update({ hand: [...newHand, ...drawn] })
          .eq("user_id", myId)
          .eq("room_id", roomId),
      ]);

      setMagicMode(null);
      setMagicSelectedCards([]);
      setAbilityUsed(true);
      notify(`${drawn.length} cartes échangées`, "success");
    } finally {
      setIsActionPending(false);
    }
  };

  // --- PASSAGE DE TOUR BLINDÉ ---
  const forceNextTurn = async () => {
    try {
      setTurnPhase("resource"); // UI Optimiste immédiate
      const nextTurn = Number(currentTurnNumber) + 1;

      if (nextTurn > 8) {
        const { data: ps } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomId);
        if (ps && ps.some((p) => (p.city || []).length >= 8)) {
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
          await prepareDraft(r?.district_stack || []);
          notify("Nouveau tour : Recrutement", "gold");
        }
      } else {
        const { error } = await supabase
          .from("rooms")
          .update({
            current_character_turn: nextTurn,
            current_turn_phase: "resource",
          })
          .eq("id", roomId);

        if (error) notify("Erreur lors du passage au tour suivant", "error");
      }
    } catch (e) {
      console.error("Erreur forceNextTurn:", e);
    }
  };

  const endTurn = async () => {
    if (isActionPending) return;
    setIsActionPending(true);
    setTurnPhase("resource"); // UI Optimiste immédiate
    try {
      await Promise.all([
        supabase
          .from("players")
          .update({
            played_characters: [
              ...(me.played_characters || []),
              Number(currentTurnNumber),
            ],
          })
          .eq("user_id", myId)
          .eq("room_id", roomId),
        forceNextTurn(),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionPending(false);
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
        district_stack: stack || [],
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

  const collectCharacterIncome = async () => {
    if (turnStartIncome > 0) {
      await supabase
        .from("players")
        .update({ gold: me.gold + turnStartIncome })
        .eq("user_id", myId);
      notify(`Revenus : +${turnStartIncome} Or`, "gold");
      setIncomeCollected(true);
    }
  };

  // --- VARIABLES DE RENDU ---
  const isMyDraftTurn =
    gameStatus === "drafting" && players[currentPlayerIndex]?.user_id === myId;
  const activeChar = CHARACTERS.find((c) => c.id === Number(currentTurnNumber));
  const isDead = Number(currentTurnNumber) === Number(killedId);
  const isMyCharTurn =
    gameStatus === "playing" &&
    (me?.characters || []).includes(Number(currentTurnNumber)) &&
    !(me?.played_characters || []).includes(Number(currentTurnNumber)) &&
    !isDead;

  const isKing = myId === kingPlayerId;
  const someoneHasActiveChar = players.some(
    (p) =>
      (p.characters || []).includes(Number(currentTurnNumber)) &&
      !(p.played_characters || []).includes(Number(currentTurnNumber)),
  );

  // Sécurité anti-blocage : le roi ou l'hôte peut toujours skipper si c'est coincé !
  const canForceSkip =
    (isKing || myId === roomHostId) &&
    gameStatus === "playing" &&
    (!isMyCharTurn || isDead);

  const hasLab = (me?.city || []).some(
    (id) => DISTRICTS.find((d) => d.id == id)?.name === "Laboratoire",
  );
  const hasSmithy = (me?.city || []).some(
    (id) => DISTRICTS.find((d) => d.id == id)?.name === "Forge",
  );
  const canCollectIncome =
    [4, 5, 6, 8].includes(Number(currentTurnNumber)) &&
    !incomeCollected &&
    turnStartIncome > 0;

  if (!me)
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-amber-500 font-bold text-2xl animate-pulse">
        Chargement...
      </div>
    );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0c0a09] text-amber-50 select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 via-black to-black">
      <style>{GLOBAL_STYLES}</style>

      {tooltip && (
        <div
          className="fixed bg-black/95 border-2 border-amber-600 p-4 rounded text-amber-50 max-w-xs tooltip shadow-2xl pointer-events-none"
          style={{ top: tooltip.y + 10, left: tooltip.x + 10, zIndex: 99999 }}
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
            {(me.hand || []).map((hid, idx) => (
              <div
                key={idx}
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

      {/* --- TOP BAR (ADVERSAIRES) --- */}
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
                  Number(currentTurnNumber) === 8 &&
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
                    onMouseEnter={(e) => {
                      const rect = e.target.getBoundingClientRect();
                      setTooltip({
                        visible: true,
                        x: rect.left,
                        y: rect.bottom + 5,
                        name: c.name,
                        cost: c.cost,
                        desc: getCardDesc(c),
                        color: c.color,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
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

      {/* --- MIDDLE (ZONE D'ACTION) --- */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-2 overflow-hidden z-40">
        {/* DRAFT */}
        {isMyDraftTurn && (
          <div className="absolute inset-0 bg-stone-900/95 flex flex-col items-center justify-center z-[200] animate-in fade-in zoom-in duration-300">
            <h3 className="text-4xl text-amber-500 mb-6 uppercase tracking-[0.2em]">
              {draftSubStep === "discard"
                ? "Défausser un Rôle"
                : "Recruter un Rôle"}
            </h3>
            <div className="flex flex-wrap gap-6 justify-center max-w-4xl">
              {draftPile.map((c) => {
                const style = getCharColors(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => pickCharacter(c.id)}
                    className={`w-32 h-48 rounded-lg border-4 ${style.border} ${style.bg} flex flex-col items-center justify-center gap-2 hover:scale-110 hover:-translate-y-4 transition-all shadow-2xl relative overflow-hidden group`}
                  >
                    <span
                      className={`text-7xl font-black ${style.text} drop-shadow-lg`}
                    >
                      {c.id}
                    </span>
                    <span
                      className={`text-xs uppercase font-bold tracking-widest ${style.text}`}
                    >
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* JEU */}
        {gameStatus === "playing" && !isMyDraftTurn && (
          <div className="flex flex-col items-center w-full h-full justify-center">
            {/* INDICATEUR PERSONNAGE ACTUEL */}
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
                <div className="absolute top-0 text-red-600 text-8xl font-black opacity-80 animate-pulse">
                  X
                </div>
              )}
            </div>

            {/* BOUTON MAITRE DU JEU */}
            {canForceSkip && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[9999] pointer-events-auto">
                <button
                  onClick={() => forceNextTurn()}
                  className="bg-stone-900 hover:bg-stone-800 text-stone-300 border-2 border-stone-600 rounded-lg p-4 font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                >
                  <span className="text-xl">👑</span>
                  <span
                    className={
                      someoneHasActiveChar && !isDead
                        ? "text-red-500"
                        : "text-amber-500"
                    }
                  >
                    {someoneHasActiveChar && !isDead
                      ? "Forcer l'Avance ⏩"
                      : "Personne ? Suivant ⏩"}
                  </span>
                </button>
              </div>
            )}

            {/* PANNEAU D'ACTION DU JOUEUR */}
            {isMyCharTurn && (
              <div className="bg-[#1a1614] border-4 border-amber-700/50 p-6 rounded-lg max-w-2xl w-full shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom-5 fade-in duration-500 inner-shadow max-h-[calc(100vh-420px)] overflow-y-auto custom-scrollbar z-[60]">
                <h3 className="text-xl text-center text-amber-100 mb-4 uppercase tracking-[0.3em] border-b-2 border-stone-800 pb-2">
                  Votre Tour, Messire
                </h3>

                {/* POUVOIRS */}
                {Number(currentTurnNumber) === 1 && !killedId && (
                  <div className="mb-4 bg-red-950/40 p-3 rounded border-red-900/50 text-center">
                    <p className="text-[10px] font-bold text-red-500 uppercase mb-2">
                      Cible à éliminer
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {CHARACTERS.filter(
                        (c) =>
                          c.id > 1 && !(me.characters || []).includes(c.id),
                      ).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => assassinKill(c.id)}
                          className="bg-red-900 hover:bg-red-800 text-red-100 text-[10px] px-3 py-1 rounded border border-red-700 uppercase font-bold tracking-wider transition-transform active:scale-95"
                        >
                          Tuer {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {Number(currentTurnNumber) === 2 && !robbedId && (
                  <div className="mb-4 bg-blue-950/40 p-3 rounded border-blue-900/50 text-center">
                    <p className="text-[10px] font-bold text-blue-500 uppercase mb-2">
                      Poches à vider
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {CHARACTERS.filter(
                        (c) =>
                          c.id > 2 &&
                          Number(c.id) !== Number(killedId) &&
                          !(me.characters || []).includes(c.id),
                      ).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => thiefRob(c.id)}
                          className="bg-blue-900 hover:bg-blue-800 text-blue-100 text-[10px] px-3 py-1 rounded border border-blue-700 uppercase font-bold tracking-wider transition-transform active:scale-95"
                        >
                          Voler {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {Number(currentTurnNumber) === 3 &&
                  magicMode &&
                  !abilityUsed && (
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
                              className="bg-purple-800 px-3 py-1 rounded text-xs transition-transform active:scale-95"
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
                            onClick={() => magicianSwapDeck()}
                            className="bg-purple-600 px-4 py-2 rounded font-bold transition-transform active:scale-95"
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
                {Number(currentTurnNumber) === 8 &&
                  !warMode &&
                  !abilityUsed && (
                    <button
                      onClick={() => setWarMode(true)}
                      className="w-full py-2 mb-4 bg-red-900 hover:bg-red-800 text-red-100 font-bold border border-red-600 rounded transition-transform active:scale-95"
                    >
                      ⚔️ DÉTRUIRE UN QUARTIER ⚔️
                    </button>
                  )}
                {warMode && (
                  <div className="text-center text-red-500 font-bold animate-pulse mb-4">
                    CLIQUEZ SUR UN QUARTIER ADVERSE (HAUT DE L'ÉCRAN)
                  </div>
                )}

                {/* PHASE 1 : RESSOURCE */}
                {(turnPhase === "resource" || !turnPhase) && (
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => takeGold()}
                      className="flex-1 bg-amber-900 hover:bg-amber-800 p-4 rounded-lg border-b-4 border-amber-950 flex flex-col items-center gap-2 transition-transform active:scale-95 group shadow-xl"
                    >
                      <span className="text-4xl">💰</span>
                      <span className="font-bold text-amber-200">2 OR</span>
                    </button>
                    <button
                      onClick={() => startDraw()}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 p-4 rounded-lg border-b-4 border-stone-950 flex flex-col items-center gap-2 transition-transform active:scale-95 group shadow-xl"
                    >
                      <span className="text-4xl">🎴</span>
                      <span className="font-bold text-stone-200">PIOCHER</span>
                    </button>
                  </div>
                )}

                {/* PHASE 2 : PIOCHE */}
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

                {/* PHASE 3 : CONSTRUCTION */}
                {turnPhase === "build" && (
                  <div className="space-y-4">
                    <div className="flex gap-2 justify-center">
                      {Number(currentTurnNumber) === 3 &&
                        !magicMode &&
                        !abilityUsed && (
                          <>
                            <button
                              onClick={() => setMagicMode("player")}
                              className="bg-purple-900 px-3 py-1 rounded text-purple-200 border border-purple-500 transition-transform active:scale-95"
                            >
                              Échanger Joueur
                            </button>
                            <button
                              onClick={() => setMagicMode("deck")}
                              className="bg-purple-900 px-3 py-1 rounded text-purple-200 border border-purple-500 transition-transform active:scale-95"
                            >
                              Échanger Pioche
                            </button>
                          </>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center border-t border-stone-800 pt-3">
                      {canCollectIncome && (
                        <button
                          onClick={() => collectCharacterIncome()}
                          className={`px-2 py-1 rounded text-[10px] border font-bold animate-pulse transition-transform active:scale-95 ${Number(currentTurnNumber) === 4 ? "bg-amber-700 border-amber-500 text-amber-100" : Number(currentTurnNumber) === 5 ? "bg-blue-800 border-blue-500 text-blue-100" : Number(currentTurnNumber) === 6 ? "bg-green-800 border-green-500 text-green-100" : "bg-red-800 border-red-500 text-red-100"}`}
                        >
                          💰 Percevoir Revenus ({turnStartIncome})
                        </button>
                      )}
                      {hasLab && !labUsed && (
                        <button
                          onClick={() => {
                            if ((me.hand || []).length > 0)
                              setShowLabModal(true);
                            else notify("Main vide !", "error");
                          }}
                          className="bg-purple-900 px-2 py-1 rounded text-[10px] border border-purple-500 text-purple-200 hover:bg-purple-800 transition-transform active:scale-95"
                        >
                          ⚗️ Laboratoire
                        </button>
                      )}
                      {hasSmithy && !smithyUsed && (
                        <button
                          onClick={() => useSmithy()}
                          className="bg-purple-900 px-2 py-1 rounded text-[10px] border border-purple-500 text-purple-200 hover:bg-purple-800 transition-transform active:scale-95"
                        >
                          🔨 Forge
                        </button>
                      )}
                    </div>

                    <div className="text-center text-stone-400 italic tracking-wider text-xs pt-4">
                      Construisez un quartier ou terminez votre tour.
                    </div>
                    <button
                      onClick={() => endTurn()}
                      className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-amber-500 font-bold uppercase tracking-[0.3em] rounded border-b-4 border-black transition-colors shadow-lg text-lg active:scale-95"
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

      {/* --- BOTTOM BAR (MAIN & CITE) --- */}
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
              const isKilled = Number(killedId) === Number(cid);
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
                    className={`text-xs font-bold uppercase tracking-wide ${isKilled ? "line-through text-red-500 decoration-red-500 decoration-2" : "text-stone-100"}`}
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
                    onClick={() => canBuild && !magicMode && buildDistrict(hid)}
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

        <div className="w-80 h-full bg-stone-900/80 rounded-lg border-2 border-stone-700 p-3 shadow-2xl flex flex-col relative overflow-hidden z-10 pointer-events-auto">
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
};

export default GameScreen;
