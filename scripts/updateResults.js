import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateResults() {
  console.log("Fetching World Cup matches...");

  const response = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    {
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Football Data API error: ${response.status} ${response.statusText}`
    );
  }

  const apiData = await response.json();

  console.log(`Received ${apiData.matches.length} matches`);

  let updated = 0;

  for (const match of apiData.matches) {
    if (match.status !== "FINISHED") continue;

    const { error } = await supabase
      .from("matches")
      .update({
        home_score: match.score.fullTime.home,
        away_score: match.score.fullTime.away,
        status: match.status,
      })
      .eq("football_data_id", match.id);

    if (error) {
      console.error(`Error updating ${match.id}:`, error.message);
      continue;
    }

    console.log(
      `${match.homeTeam.name} ${match.score.fullTime.home}:${match.score.fullTime.away} ${match.awayTeam.name}`
    );

    updated++;
  }

  console.log(`Done. Updated ${updated} matches.`);
}

updateResults();