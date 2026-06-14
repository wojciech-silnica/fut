import dotenv from "dotenv";

dotenv.config();

async function printMatches() {
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

  console.log(`Received ${apiData.matches.length} matches\n`);

  for (const match of apiData.matches) {
    const homeTeam = match.homeTeam?.name || "TBD";
    const awayTeam = match.awayTeam?.name || "TBD";
    const status = match.status;
    
    let scoreStr = "vs";
    if (status === "FINISHED" || status === "IN_PLAY" || status === "PAUSED") {
      const homeScore = match.score?.fullTime?.home ?? "?";
      const awayScore = match.score?.fullTime?.away ?? "?";
      scoreStr = `${homeScore}:${awayScore}`;
    }

    console.log(`[${status}] Home: ${homeTeam.padEnd(20)} ${scoreStr}   Away: ${awayTeam}`);
  }

  console.log("\nDone.");
}

printMatches();