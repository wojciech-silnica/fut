import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TEAM_NAME_MAP: Record<string, string> = {
  "Korea Republic": "South Korea",
  "Czech Republic": "Czechia",
  "Curaçao": "Curacao",
  "Côte d'Ivoire": "Ivory Coast",
  "Cabo Verde": "Cape Verde",
  "Bosnia & Herzegovina": "Bosnia and Herzegovina",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Congo DR": "DR Congo",
  "United States": "USA",
};

function normalizeTeamName(name: string | null) {
  if (!name) return "TBD";
  return TEAM_NAME_MAP[name] || name;
}

function toDeadline(matchDateIso: string) {
  const d = new Date(matchDateIso);
  d.setUTCHours(d.getUTCHours() - 2);
  return d.toISOString();
}

function sameMinute(isoA: string, isoB: string) {
  if (!isoA || !isoB) return false;
  const a = new Date(isoA);
  const b = new Date(isoB);
  return Math.abs(a.getTime() - b.getTime()) < 60 * 1000;
}

const STAGE_MAP: Record<string, string> = {
  "LAST_32": "r32",
  "LAST_16": "r16",
  "QUARTER_FINALS": "qf",
  "SEMI_FINALS": "sf",
  "FINAL": "final",
  "THIRD_PLACE": "final"
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const footballToken = Deno.env.get('FOOTBALL_DATA_TOKEN');
    if (!footballToken) {
      throw new Error("Missing FOOTBALL_DATA_TOKEN");
    }

    const response = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": footballToken }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const apiMatches = data.matches || [];

    const { data: dbMatches, error: dbError } = await supabase.from('matches').select('*');
    if (dbError) throw dbError;

    let updatedResults = 0;
    let insertedLadder = 0;
    let updatedLadder = 0;
    let maxSortOrder = dbMatches.reduce((max: number, m: any) => Math.max(max, m.sort_order || 0), 0);

    for (const apiMatch of apiMatches) {
      const dbMatch = dbMatches.find((m: any) => m.football_data_id === apiMatch.id);

      // Update Results for FINISHED matches
      if (apiMatch.status === "FINISHED" && dbMatch) {
        if (dbMatch.home_score !== apiMatch.score.fullTime.home || dbMatch.away_score !== apiMatch.score.fullTime.away) {
          const { error } = await supabase.from("matches").update({
            home_score: apiMatch.score.fullTime.home,
            away_score: apiMatch.score.fullTime.away,
            status: apiMatch.status,
          }).eq("id", dbMatch.id);
          if (!error) updatedResults++;
        }
      }

      // Upsert Ladder Matches
      if (apiMatch.stage && apiMatch.stage !== "GROUP_STAGE") {
        const homeTeam = normalizeTeamName(apiMatch.homeTeam?.name);
        const awayTeam = normalizeTeamName(apiMatch.awayTeam?.name);
        const matchDate = apiMatch.utcDate;
        const deadline = toDeadline(matchDate);
        const stage = STAGE_MAP[apiMatch.stage] || 'group';

        if (dbMatch) {
          if (dbMatch.home_team !== homeTeam || dbMatch.away_team !== awayTeam || !sameMinute(dbMatch.match_date, matchDate)) {
            const { error } = await supabase.from('matches').update({
              home_team: homeTeam,
              away_team: awayTeam,
              match_date: matchDate,
              deadline: deadline,
            }).eq('id', dbMatch.id);
            if (!error) updatedLadder++;
          }
        } else {
          maxSortOrder += 1;
          const { error } = await supabase.from('matches').insert({
            football_data_id: apiMatch.id,
            home_team: homeTeam,
            away_team: awayTeam,
            match_date: matchDate,
            deadline: deadline,
            stage: stage,
            group_name: null,
            sort_order: maxSortOrder,
            status: apiMatch.status || 'SCHEDULED'
          });
          if (!error) insertedLadder++;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Odświeżono pomyślnie. Nowe wyniki: ${updatedResults}, Zaaktualizowane mecze fazy pucharowej: ${updatedLadder}` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
})