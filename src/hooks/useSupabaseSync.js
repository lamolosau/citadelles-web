import { useEffect } from "react";
import { CHARACTERS } from "../data/gameData";
import { DISTRICT_MAP } from "../utils/gameLogic";

export const useSupabaseSync = (props) => {
  const {
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
    channelRef,
    setActiveAnimation,
    setFaceUpChars,
  } = props;

  useEffect(() => {
    if (!hasSavedSession) return setLoading(false);

    const init = async () => {
      const sR = localStorage.getItem("citadelles_room_id");
      const sP = localStorage.getItem("citadelles_player_id");

      if (!sR || !sP) {
        setLoading(false);
        return;
      }

      try {
        const { data: rm, error: errRm } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", sR)
          .maybeSingle();
        const { data: p, error: errP } = await supabase
          .from("players")
          .select("*")
          .eq("user_id", sP)
          .eq("room_id", sR)
          .maybeSingle();

        if (errRm || errP) {
          console.warn("Erreur réseau ignorée.");
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
        } else {
          localStorage.clear();
        }
      } catch (err) {
        console.warn(err);
      } finally {
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
      const ps = psRes.data || [];
      const r = rRes.data;

      if (ps.length > 0) {
        setPlayers((prev) => {
          if (r.status === "drafting") {
            const prevCount = prev.reduce(
              (acc, p) => acc + (p.characters || []).length,
              0,
            );
            const dbCount = ps.reduce(
              (acc, p) => acc + (p.characters || []).length,
              0,
            );
            if (dbCount < prevCount && dbCount !== 0) return prev;
          }
          return ps;
        });

        if (myId && !ps.find((p) => p.user_id === myId)) {
          localStorage.clear();
          setRoomId(null);
          setMyId(null);
          setPlayers([]);
          setView("login");
          setLoading(false);
          notify("Vous avez été exclu.", "error");
          return;
        }
      }

      if (r) {
        if (ps.length > 0 && !ps.find((p) => p.user_id === r.host_id)) {
          if (ps[0].user_id === myId) {
            await supabase
              .from("rooms")
              .update({ host_id: ps[0].user_id })
              .eq("id", roomId);
            notify("Vous êtes le nouvel hôte !", "gold");
          }
        }

        if (r.killed_char_id && r.killed_char_id !== lastKilledRef.current) {
          notify(
            `🗡️ L'Assassin a décidé d'éliminer : ${CHARACTERS.find((c) => c.id == r.killed_char_id)?.name} !`,
            "error",
          );
          lastKilledRef.current = r.killed_char_id;
        }

        if (r.robbed_char_id && r.robbed_char_id !== lastRobbedRef.current) {
          notify(
            `🥷 Le Voleur va détrousser : ${CHARACTERS.find((c) => c.id == r.robbed_char_id)?.name} !`,
            "info",
          );
          lastRobbedRef.current = r.robbed_char_id;
        }

        setRoomHostId(r.host_id);
        setGameStatus(r.status);
        if (setFaceUpChars) setFaceUpChars(r.face_up_chars || []);

        setDraftPile((prevPile) => {
          const serverPile = r.draft_pile || [];
          const isStale =
            prevPile.length > 0 &&
            serverPile.length > prevPile.length &&
            serverPile.length < 8;
          if (!isStale) {
            setTimeout(() => {
              setDraftSubStep(r.draft_sub_step);
              setCurrentPlayerIndex(r.current_player_index);
            }, 0);
            return serverPile;
          }
          return prevPile;
        });

        const dbTurn = r.current_character_turn || 1;
        const dbPhase = r.current_turn_phase || "resource";
        const dbKing = r.king_player_id;

        // ⚡ LE BOUCLIER ABSOLU (Empêche la BD d'annuler les optimisations)
        setCurrentTurnNumber((prevTurn) => {
          const isLagging =
            prevTurn > dbTurn && !(prevTurn >= 7 && dbTurn === 1);

          // 👑 1. Le Roi ne recule plus !
          if (!isLagging || r.status !== "playing") {
            if (dbKing && dbKing !== kingPlayerIdRef.current) {
              const newKing = ps.find((p) => p.user_id === dbKing);
              notify(
                `👑 ${newKing?.pseudo || "Un joueur"} s'empare de la Couronne !`,
                "gold",
              );
              kingPlayerIdRef.current = dbKing;
              setKingPlayerId(dbKing);
            }
          }

          // ⏳ 2. La Phase ne recule plus !
          setTurnPhase((prevPhase) => {
            if (r.status !== "playing") return dbPhase;
            if (isLagging) return prevPhase; // Si on est en avance, on ignore la BD !
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

          // 🔄 3. Le Tour ne recule plus !
          if (r.status !== "playing") return dbTurn;
          if (prevTurn >= 8 && dbTurn === 1)
            notify("👑 Nouveau tour : Phase de Recrutement !", "gold");
          if (isLagging) return prevTurn;

          return dbTurn;
        });

        setKilledId(r.killed_char_id);
        setRobbedId(r.robbed_char_id);
        setFirstBuilderId(r.first_builder_id);
        setView(
          r.status === "finished"
            ? "finished"
            : r.status !== "waiting"
              ? "game"
              : "lobby",
        );
        setLoading(false);
      }
    };

    fetchAll();
    let debounceTimer;
    const debouncedFetchAll = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchAll, 150);
    };

    const channel = supabase.channel(`room-${roomId}`, {
      config: { presence: { key: myId } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "global_notify" }, ({ payload }) =>
        notify(payload.message, payload.type),
      )
      .on("broadcast", { event: "sync_action" }, ({ payload }) => {
        if (payload.action === "sync_draft") {
          setDraftPile(payload.draftPile);
          if (payload.isDraftOver) {
            setGameStatus("playing");
            setCurrentTurnNumber(1);
            setTurnPhase("resource");
          } else {
            setCurrentPlayerIndex(payload.currentPlayerIndex);
            setDraftSubStep(payload.draftSubStep);
          }
        }

        if (payload.action === "next_turn") {
          setCurrentTurnNumber((prev) =>
            payload.turn > prev ? payload.turn : prev,
          );
          setTurnPhase("resource");
          if (payload.optimisticPlayers) setPlayers(payload.optimisticPlayers);
          if (payload.optimisticKing) {
            setKingPlayerId(payload.optimisticKing);
            kingPlayerIdRef.current = payload.optimisticKing; // Sécurise la couronne instantanément
          }
        }
        if (payload.action === "play_animation") {
          setActiveAnimation(payload.data);
          setTimeout(() => setActiveAnimation(null), 2500);
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
      .on("presence", { event: "sync" }, () =>
        setOnlineIds(Object.keys(channel.presenceState())),
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && myId) {
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: myId,
          });
        }
      });

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [roomId, myId, supabase]);

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
        const d = DISTRICT_MAP[id];
        return d && (d.color === targetColor || d.name === "École de Magie");
      }).length;

      setTurnStartIncome(amount);

      if (robbedId === currentTurnNumber && killedId !== currentTurnNumber)
        notify(`VOUS AVEZ ÉTÉ VOLÉ !`, "error");
      if (currentTurnNumber === 6 && killedId !== 6)
        notify("Bonus Marchand : +1 Or", "gold");
      if (currentTurnNumber === 7 && killedId !== 7)
        notify("Architecte : +2 Cartes", "info");
    }
  }, [currentTurnNumber, gameStatus, killedId]);
};
