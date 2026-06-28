import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: {
      transport: ws
    }
  }
);

const TEAM_NAME_MAP = {
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

function normalizeTeamName(name) {
  if (!name) return "TBD";
  return TEAM_NAME_MAP[name] || name;
}

function toDeadline(matchDateIso) {
  const d = new Date(matchDateIso);
  d.setUTCHours(d.getUTCHours() - 2);
  return d.toISOString();
}

function sameMinute(isoA, isoB) {
  if (!isoA || !isoB) return false;
  const a = new Date(isoA);
  const b = new Date(isoB);
  return Math.abs(a.getTime() - b.getTime()) < 60 * 1000;
}

const STAGE_MAP = {
  "LAST_32": "r32",
  "LAST_16": "r16",
  "QUARTER_FINALS": "qf",
  "SEMI_FINALS": "sf",
  "FINAL": "final",
  "THIRD_PLACE": "final"
};

async function run() {
  console.log("Fetching API matches...");

  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    {
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const ladderMatches = data.matches.filter(m => m.stage && m.stage !== "GROUP_STAGE");
  
  console.log(`Found ${ladderMatches.length} ladder matches from API.`);

  const { data: dbMatches, error: dbError } = await supabase.from('matches').select('*');
  if (dbError) throw dbError;

  let maxSortOrder = dbMatches.reduce((max, m) => Math.max(max, m.sort_order || 0), 0);

  let inserted = 0;
  let updated = 0;

  for (const apiMatch of ladderMatches) {
    const dbMatch = dbMatches.find(m => m.football_data_id === apiMatch.id);
    const homeTeam = normalizeTeamName(apiMatch.homeTeam?.name);
    const awayTeam = normalizeTeamName(apiMatch.awayTeam?.name);
    const matchDate = apiMatch.utcDate;
    const deadline = toDeadline(matchDate);
    const stage = STAGE_MAP[apiMatch.stage] || 'group';

    if (dbMatch) {
      // update if needed
      if (
        dbMatch.home_team !== homeTeam || 
        dbMatch.away_team !== awayTeam || 
        !sameMinute(dbMatch.match_date, matchDate)
      ) {
        const { error } = await supabase.from('matches').update({
          home_team: homeTeam,
          away_team: awayTeam,
          match_date: matchDate,
          deadline: deadline,
        }).eq('id', dbMatch.id);
        
        if (error) {
          console.error(`Error updating match ${dbMatch.id}:`, error.message);
        } else {
          console.log(`Updated match ${dbMatch.id}: ${homeTeam} vs ${awayTeam}`);
          updated++;
        }
      }
    } else {
      // insert
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
      
      if (error) {
        console.error(`Error inserting match ${apiMatch.id}:`, error.message);
      } else {
        console.log(`Inserted new match: ${homeTeam} vs ${awayTeam} (stage: ${stage})`);
        inserted++;
      }
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Updated: ${updated}`);
}

run().catch(console.error);
