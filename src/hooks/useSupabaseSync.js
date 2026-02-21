import { useEffect } from "react";
import { CHARACTERS, DISTRICTS } from "../data/gameData";

// ==========================================
// HOOK : Synchronisation Temps Réel (Supabase)
// ==========================================

export const useSupabaseSync = ({
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
  backToLobby,
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
  rebuildDeckIfNeeded,
  forceNextTurn,
  channelRef,
}) => {
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
        .maybeSingle();
      if (errRoom) return;
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
        .maybeSingle();
      if (errPlayer) return;
      if (!p) {
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
        localStorage.clear();
        setLoading(false);
      }
    };
    init();
  }, [
    hasSavedSession,
    supabase,
    setLoading,
    setMyId,
    setRoomId,
    setRoomCode,
    setPseudo,
    setView,
  ]);

  useEffect(() => {
    if (
      gameStatus !== "waiting" &&
      gameStatus !== "finished" &&
      players.length === 1 &&
      !loading
    ) {
      const timer = setTimeout(() => {
        notify("Plus d'adversaires ! Retour au lobby...", "error");
        backToLobby();
      }, 3000);
      return () => clearTimeout(timer);
    }
    const ghostInterval = setInterval(() => {
      if (myId === roomHostId && players.length > 0 && onlineIds.length > 0) {
        players.forEach((p) => {
          if (p.user_id !== myId && !onlineIds.includes(p.user_id)) {
            if (!ghostTimersRef.current[p.user_id]) {
              ghostTimersRef.current[p.user_id] = Date.now();
            } else if (Date.now() - ghostTimersRef.current[p.user_id] > 15000) {
              supabase
                .from("players")
                .delete()
                .eq("user_id", p.user_id)
                .eq("room_id", roomId)
                .then();
            }
          } else delete ghostTimersRef.current[p.user_id];
        });
      }
    }, 2000);
    return () => clearInterval(ghostInterval);
  }, [
    myId,
    roomId,
    roomHostId,
    players,
    onlineIds,
    gameStatus,
    loading,
    notify,
    backToLobby,
    supabase,
    ghostTimersRef,
  ]);

  useEffect(() => {
    if (!roomId) return;
    const fetchAll = async () => {
      const [psRes, rRes] = await Promise.all([
        supabase
          .from("players")
          .select("*")
          .eq("room_id", roomId)
          .order("joined_at", { ascending: true }),
        supabase.from("rooms").select("*").eq("id", roomId).single(),
      ]);
      const ps = psRes.data;
      const r = rRes.data;

      if (ps && ps.length > 0) {
        setPlayers(ps);
        const amIHere = ps.find((p) => p.user_id === myId);
        if (myId && !amIHere) {
          localStorage.clear();
          setRoomId(null);
          setMyId(null);
          setPlayers([]);
          setView("login");
          setLoading(false);
          notify("Vous avez été exclu par l'hôte.", "error");
          return;
        }
      }

      if (r) {
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

        // ⚡ NOUVEAUX TEXTES DE NOTIFICATIONS PLUS CLAIRS
        if (r.king_player_id && r.king_player_id !== kingPlayerIdRef.current) {
          if (kingPlayerIdRef.current !== null) {
            const newKing = ps.find((p) => p.user_id === r.king_player_id);
            notify(
              `👑 ${newKing?.pseudo || "Un joueur"} s'empare de la Couronne !`,
              "gold",
            );
          }
          kingPlayerIdRef.current = r.king_player_id;
        }
        if (r.killed_char_id && r.killed_char_id !== lastKilledRef.current) {
          const n = CHARACTERS.find((c) => c.id == r.killed_char_id)?.name;
          notify(`🗡️ L'Assassin a décidé d'éliminer le rôle : ${n} !`, "error");
          lastKilledRef.current = r.killed_char_id;
        }
        if (r.robbed_char_id && r.robbed_char_id !== lastRobbedRef.current) {
          const n = CHARACTERS.find((c) => c.id == r.robbed_char_id)?.name;
          notify(`🥷 Le Voleur va détrousser le rôle : ${n} !`, "info");
          lastRobbedRef.current = r.robbed_char_id;
        }

        setRoomHostId(r.host_id);
        setGameStatus(r.status);
        setCurrentPlayerIndex(r.current_player_index);

        setDraftPile((prev) => {
          const dbPile = r.draft_pile || [];
          if (
            prev.length > 0 &&
            prev.length < dbPile.length &&
            dbPile.length < 8
          )
            return prev;
          return dbPile;
        });
        setDraftSubStep(r.draft_sub_step);

        const dbTurn = r.current_character_turn || 1;
        const dbPhase = r.current_turn_phase || "resource";

        setCurrentTurnNumber((prevTurn) => {
          setTurnPhase((prevPhase) => {
            if (prevTurn > dbTurn && !(prevTurn >= 8 && dbTurn === 1))
              return prevPhase;
            if (prevTurn === dbTurn) {
              if (
                prevPhase === "build" &&
                (dbPhase === "resource" || dbPhase === "drawing")
              )
                return prevPhase;
              if (prevPhase === "drawing" && dbPhase === "resource")
                return prevPhase;
            }
            return dbPhase;
          });

          // ⚡ NOTIFICATION GLOBALE POUR LA PHASE DE RECRUTEMENT
          if (prevTurn >= 8 && dbTurn === 1) {
            notify("👑 Nouveau tour : Phase de Recrutement !", "gold");
          }

          if (prevTurn > dbTurn && !(prevTurn >= 8 && dbTurn === 1))
            return prevTurn;
          return dbTurn;
        });

        setKilledId(r.killed_char_id);
        setRobbedId(r.robbed_char_id);
        setKingPlayerId(r.king_player_id);
        setFirstBuilderId(r.first_builder_id);

        if (r.status === "finished") setView("finished");
        else if (r.status !== "waiting") setView("game");
        else setView("lobby");

        setLoading(false);
      }
    };

    fetchAll();

    let debounceTimer;
    const debouncedFetchAll = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchAll();
      }, 150);
    };

    const channel = supabase.channel(`room-${roomId}`, {
      config: { presence: { key: myId } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "global_notify" }, ({ payload }) => {
        notify(payload.message, payload.type);
      })
      // ⚡ NOUVEAU : On écoute les actions invisibles pour changer d'écran instantanément
      .on("broadcast", { event: "sync_action" }, ({ payload }) => {
        if (payload.action === "next_turn") {
          setCurrentTurnNumber(payload.turn);
          setTurnPhase("resource");
        }
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        debouncedFetchAll,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        debouncedFetchAll,
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

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [roomId, myId, supabase]);

  // 4. Logique de début de tour
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

    // ⚡ CORRECTION : Transmission de la Couronne INSTANTANÉE au Tour 4, mort ou vif !
    if (myId === roomHostId && currentTurnNumber === 4) {
      const kingOwner = playersRef.current.find((p) =>
        (p.characters || []).includes(4),
      );
      if (kingOwner && kingOwner.user_id !== kingPlayerIdRef.current) {
        supabase
          .from("rooms")
          .update({ king_player_id: kingOwner.user_id })
          .eq("id", roomId)
          .then();
      }
    }

    const me = players.find((p) => p.user_id === myId);
    if (
      me &&
      (me.characters || []).includes(currentTurnNumber) &&
      turnPhase === "resource"
    ) {
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

      if (currentTurnNumber === 6 && killedId !== 6) {
        supabase
          .from("players")
          .update({ gold: me.gold + 1 })
          .eq("user_id", myId)
          .then(() => notify("Bonus Marchand : +1 Or", "gold"));
      }

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
  }, [currentTurnNumber, gameStatus, killedId]);
};
