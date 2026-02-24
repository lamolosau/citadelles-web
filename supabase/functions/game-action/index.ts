import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const DISTRICT_COSTS: Record<number, number> = { 1:1, 2:2, 3:3, 4:5, 5:1, 6:2, 7:3, 8:5, 9:3, 10:4, 11:5, 12:1, 13:2, 14:2, 15:3, 16:4, 17:5, 18:2, 19:3, 20:5, 21:5, 22:5, 23:5, 24:6, 25:6, 26:6, 27:6, 28:6 };
const DISTRICT_TOTALS: Record<number, number> = { 1:3, 2:3, 3:3, 4:2, 5:3, 6:3, 7:3, 8:2, 9:5, 10:4, 11:3, 12:5, 13:3, 14:4, 15:3, 16:3, 17:2, 18:1, 19:1, 20:1, 21:1, 22:1, 23:1, 24:1, 25:1, 26:1, 27:1, 28:1 };
const CHARACTERS = [ { id: 1, name: "Assassin" }, { id: 2, name: "Voleur" }, { id: 3, name: "Magicien" }, { id: 4, name: "Roi" }, { id: 5, name: "Évêque" }, { id: 6, name: "Marchand" }, { id: 7, name: "Architecte" }, { id: 8, name: "Condottiere" } ];

const shuffle = (array: any[]) => {
  const n = [...array];
  for (let i = n.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [n[i], n[j]] = [n[j], n[i]];
  }
  return n;
};

const rebuildDeck = async (supabase: any, roomId: string, currentStack: number[], neededCount: number) => {
  if (currentStack.length >= neededCount) return currentStack;
  const { data: allPlayers } = await supabase.from("players").select("hand, city").eq("room_id", roomId);
  const countsInPlay: Record<number, number> = {};
  currentStack.forEach((id: number) => (countsInPlay[id] = (countsInPlay[id] || 0) + 1));
  allPlayers.forEach((p: any) => {
    (p.hand || []).forEach((id: number) => (countsInPlay[id] = (countsInPlay[id] || 0) + 1));
    (p.city || []).forEach((id: number) => (countsInPlay[id] = (countsInPlay[id] || 0) + 1));
  });
  const discarded = [];
  for (const [idStr, total] of Object.entries(DISTRICT_TOTALS)) {
      const id = Number(idStr);
      const used = countsInPlay[id] || 0;
      for (let i = 0; i < total - used; i++) discarded.push(id);
  }
  return [...currentStack, ...shuffle(discarded)];
};

serve(async (req) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Non authentifié');
    
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Joueur non autorisé');

    const { action, roomId, payload } = await req.json();

    const { data: player } = await supabase.from('players').select('*').eq('user_id', user.id).eq('room_id', roomId).single();
    const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    if (!player || !room) throw new Error("Données introuvables");

    switch (action) {

      case 'PICK_CHARACTER': {
        if (room.status !== 'drafting') throw new Error("Phase incorrecte");
        
        const { data: allPlayers } = await supabase.from('players').select('*').eq('room_id', roomId).order('joined_at', { ascending: true });
        
        const { characterId, remaining, nextIdx, nextStep, isDraftOver, isPick } = payload;
        
        if (isPick) {
            const newChars = [...(player.characters || []), characterId];
            await supabase.from('players').update({ characters: newChars }).eq('id', player.id);
        }

        let nextState: any = { draft_pile: remaining };
        
        if (isDraftOver) {
            nextState.status = "playing";
            nextState.draft_pile = [];
            nextState.current_character_turn = 1;
            nextState.current_turn_phase = "resource";
        } else {
            nextState.current_player_index = nextIdx;
            nextState.draft_sub_step = nextStep;
            
            if (allPlayers.length === 7 && remaining.length === 1 && nextIdx === (allPlayers.findIndex((p:any) => p.user_id === room.king_player_id) + 6) % 7 && nextStep === "pick") {
                const faceDownChar = CHARACTERS.find(c => c.id === room.face_down_char);
                if (faceDownChar) nextState.draft_pile = [...remaining, faceDownChar];
            }
        }
        await supabase.from('rooms').update(nextState).eq('id', roomId);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'TAKE_GOLD': {
        await supabase.from('players').update({ gold: player.gold + 2 }).eq('id', player.id);
        await supabase.from('rooms').update({ current_turn_phase: "build" }).eq('id', roomId);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'START_DRAW': {
        const drawCount = (player.city || []).includes(22) ? 3 : 2;
        let deck = await rebuildDeck(supabase, roomId, room.district_stack || [], drawCount);
        const drawOptions = deck.splice(0, drawCount);
        await supabase.from('rooms').update({ current_turn_phase: "drawing", district_stack: deck }).eq('id', roomId);
        return new Response(JSON.stringify({ success: true, drawOptions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'PICK_DRAWN_CARD': {
        const { pickedId, rejectedIds } = payload;
        const hasLibrary = (player.city || []).includes(24);
        let newHand = [...(player.hand || []), pickedId];
        let newDeck = [...(room.district_stack || []), ...(rejectedIds || [])];
        if (hasLibrary) {
            newHand = [...(player.hand || []), pickedId, ...(rejectedIds || [])];
            newDeck = room.district_stack || [];
        }
        await supabase.from('players').update({ hand: newHand }).eq('id', player.id);
        await supabase.from('rooms').update({ current_turn_phase: "build", district_stack: newDeck }).eq('id', roomId);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'BUILD_DISTRICT': {
        const { districtId } = payload;
        const cost = DISTRICT_COSTS[districtId];
        
        // Règle Officielle de Citadelles : Interdit de construire un quartier que l'on possède déjà !
        if ((player.city || []).includes(districtId)) throw new Error("Vous possédez déjà ce quartier !");
        
        if (!cost || player.gold < cost || !(player.hand || []).includes(districtId)) throw new Error("Action illégale");
        
        // ⚡ CORRECTION MAGIQUE : On copie la main, on cherche la carte, et on ne la retire QU'UNE SEULE FOIS !
        const newHand = [...(player.hand || [])];
        const cardIndex = newHand.indexOf(districtId);
        if (cardIndex > -1) {
            newHand.splice(cardIndex, 1);
        }

        const newCity = [...(player.city || []), districtId];
        await supabase.from('players').update({ gold: player.gold - cost, hand: newHand, city: newCity }).eq('id', player.id);
        if (newCity.length >= 8 && !room.first_builder_id) await supabase.from('rooms').update({ first_builder_id: user.id }).eq('id', roomId);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'ASSASSIN_KILL': {
        const { targetId: killTarget } = payload;
        await supabase.from('rooms').update({ killed_char_id: killTarget }).eq('id', roomId);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'THIEF_ROB': {
        const { targetId: robTarget } = payload;
        await supabase.from('rooms').update({ robbed_char_id: robTarget }).eq('id', roomId);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'ADVANCE_TURN': {
        const { isEndTurn } = payload;
        const nextTurn = room.current_character_turn + 1;

        if (isEndTurn) {
            const playedChars = [...(player.played_characters || []), room.current_character_turn];
            await supabase.from('players').update({ played_characters: playedChars }).eq('id', player.id);
        }

        const { data: allPlayers } = await supabase.from('players').select('*').eq('room_id', roomId).order('joined_at', { ascending: true });

        if (nextTurn > 8) {
            const isGameOver = allPlayers.some((p:any) => (p.city || []).length >= 8);

            if (isGameOver) {
                await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
            } else {
                const kingOwner = allPlayers.find((p:any) => (p.characters || []).includes(4));
                const finalKingId = kingOwner ? kingOwner.user_id : room.king_player_id;
                const kingIdx = allPlayers.findIndex((p:any) => p.user_id === finalKingId);
                
                let c = shuffle([...CHARACTERS]);
                let fd = null;
                let fuCount = 0;
                const pc = allPlayers.length;

                if (pc < 8) {
                    const popped = c.pop();
                    if (popped) fd = popped.id;
                }
                if (pc === 4) fuCount = 2;
                if (pc === 5) fuCount = 1;
                const fu = c.splice(0, fuCount).map((char:any) => char.id);
                
                await supabase.from('players').update({ characters: [], played_characters: [] }).eq('room_id', roomId);
                await supabase.from('rooms').update({
                    status: "drafting", draft_pile: c, face_down_char: fd, face_up_chars: fu,
                    current_player_index: kingIdx === -1 ? 0 : kingIdx, current_character_turn: 1, draft_sub_step: "pick",
                    killed_char_id: null, robbed_char_id: null, current_turn_phase: "resource",
                    king_player_id: finalKingId
                }).eq('id', roomId);
            }
        } else {
            let nextState: any = { current_character_turn: nextTurn, current_turn_phase: "resource" };

            if (nextTurn === 4) {
                const kingOwner = allPlayers.find((p:any) => (p.characters || []).includes(4));
                if (kingOwner) nextState.king_player_id = kingOwner.user_id;
            }

            if (room.killed_char_id !== nextTurn) {
                if (room.robbed_char_id === nextTurn) {
                    const thief = allPlayers.find((p:any) => (p.characters || []).includes(2));
                    const victim = allPlayers.find((p:any) => (p.characters || []).includes(nextTurn));
                    if (thief && victim && victim.gold > 0) {
                        await supabase.from('players').update({ gold: thief.gold + victim.gold }).eq('id', thief.id);
                        await supabase.from('players').update({ gold: 0 }).eq('id', victim.id);
                        thief.gold += victim.gold;
                        victim.gold = 0; 
                    }
                }
                if (nextTurn === 6) {
                    const merchant = allPlayers.find((p:any) => (p.characters || []).includes(6));
                    if (merchant) await supabase.from('players').update({ gold: merchant.gold + 1 }).eq('id', merchant.id);
                }
                if (nextTurn === 7) {
                    const architect = allPlayers.find((p:any) => (p.characters || []).includes(7));
                    if (architect) {
                        let deck = await rebuildDeck(supabase, roomId, room.district_stack || [], 2);
                        const drawnCards = deck.splice(0, 2);
                        await supabase.from('players').update({ hand: [...(architect.hand || []), ...drawnCards] }).eq('id', architect.id);
                        nextState.district_stack = deck;
                    }
                }
            }
            await supabase.from('rooms').update(nextState).eq('id', roomId);
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default: throw new Error("Action inconnue");
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});