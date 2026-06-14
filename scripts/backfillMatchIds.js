import "dotenv/config";

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

  const apiMatches = data.matches;

  console.log("Done.\n");

  console.log("==== MANUAL MAPPING LIST ====\n");

  for (const m of apiMatches) {
    console.log(
      `${m.id} | ${m.homeTeam.name} vs ${m.awayTeam.name}`
    );
  }

  console.log("\n==== COPY FOR DB MATCHING ====\n");

  console.log(
    "Use this format in Supabase:\n" +
    "football_data_id = <id> WHERE home_team = 'X' AND away_team = 'Y'\n"
  );
}

run().catch(console.error);