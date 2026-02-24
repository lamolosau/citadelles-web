import { CHARACTERS } from "../data/gameData";
import { shuffle, generateFullDeck } from "../utils/gameLogic";

export const useRoomConnection = (props) => {
  const {
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
  } = props;

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

  const startGame = async () => {
    const { data: latestPlayers } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    const d = generateFullDeck();

    const dealPromises = latestPlayers.map((p) =>
      supabase
        .from("players")
        .update({ hand: d.splice(0, 4) })
        .eq("user_id", p.user_id)
        .eq("room_id", roomId),
    );
    await Promise.all(dealPromises);

    const pc = latestPlayers.length;
    let c = shuffle([...CHARACTERS]);
    let fd = null;
    let fuCount = 0;

    // Règles d'écartement
    if (pc < 8) {
      fd = c.pop()?.id; // Face cachée (sauf pour 8 joueurs)
    }
    if (pc === 4) fuCount = 2; // 2 faces visibles à 4 joueurs
    if (pc === 5) fuCount = 1; // 1 face visible à 5 joueurs

    const fu = c.splice(0, fuCount).map((char) => char.id);

    await supabase
      .from("rooms")
      .update({
        status: "drafting",
        district_stack: d,
        draft_pile: c,
        face_down_char: fd,
        face_up_chars: fu,
        current_player_index: 0,
        current_character_turn: 1,
        current_turn_phase: "resource",
        killed_char_id: null,
        robbed_char_id: null,
        first_builder_id: null,
      })
      .eq("id", roomId);
  };

  const backToLobby = async () => {
    // ⚡ CORRECTION : Nettoyage propre au retour au lobby
    await Promise.all([
      supabase
        .from("rooms")
        .update({
          status: "waiting",
          first_builder_id: null,
          killed_char_id: null,
          robbed_char_id: null,
          current_character_turn: 1,
          current_turn_phase: "resource",
        })
        .eq("id", roomId),
      supabase
        .from("players")
        .update({
          city: [],
          hand: [],
          gold: 2,
          characters: [],
          played_characters: [],
        })
        .eq("room_id", roomId),
    ]);
  };

  const kickPlayer = async (userId) => {
    await supabase
      .from("players")
      .delete()
      .eq("user_id", userId)
      .eq("room_id", roomId);
    setPlayerToKickId(null);
  };

  const confirmKick = async () => {
    if (playerToKickId) await kickPlayer(playerToKickId);
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
    setShowLeaveModal(false);
  };

  return {
    createRoom,
    joinRoom,
    startGame,
    backToLobby,
    confirmKick,
    confirmLeaveGame,
  };
};
