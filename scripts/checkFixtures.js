/**
 * check-fixtures.js
 *
 * DRY RUN - tylko sprawdza i wypisuje co jest zle w tabeli `matches`.
 * NIC nie zapisuje w bazie. Bezpieczne do odpalania w kazdej chwili.
 *
 * Porownuje:
 *   - match_date   (kickoff w UTC)
 *   - deadline     (powinien byc = match_date - 2h)
 *   - home_team / away_team
 *   - football_data_id
 *
 * Mecze ktore juz sie odbyly (status FINISHED/IN_PLAY/PAUSED/SUSPENDED/AWARDED
 * w bazie, lub kickoff z API > 30 min w przeszlosci) sa pomijane - nawet
 * w raporcie nie proponujemy ich zmiany.
 *
 * Uzycie:
 *   node scripts/check-fixtures.js
 */

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

// Statusy, ktorych NIGDY nie proponujemy zmieniac (mecz odbyty / w trakcie)
const LOCKED_STATUSES = new Set(["FINISHED", "IN_PLAY", "PAUSED", "SUSPENDED", "AWARDED"]);

// football-data.org czasem uzywa innych nazw niz Twoja baza.
// Mapowanie: nazwa z API -> nazwa w Twojej tabeli `matches`.
// Dopisz tu kolejne pary, jesli zauwazysz niezmapowany zespol w logach.
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

async function fetchApiMatches() {
  console.log("Pobieram terminarz z football-data.org...");

  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    {
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Football Data API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  console.log(`Otrzymano ${data.matches.length} meczow z API.\n`);
  return data.matches;
}

async function fetchDbMatches() {
  const { data, error } = await supabase.from("matches").select("*");
  if (error) throw error;
  return data;
}

function findDbMatch(dbMatches, apiMatch) {
  // 1) najpierw po football_data_id - najbardziej wiarygodne
  let row = dbMatches.find((r) => r.football_data_id === apiMatch.id);
  if (row) return row;

  // 2) fallback: po nazwach zespolow (po normalizacji)
  const apiHome = normalizeTeamName(apiMatch.homeTeam.name);
  const apiAway = normalizeTeamName(apiMatch.awayTeam.name);

  row = dbMatches.find(
    (r) => r.home_team === apiHome && r.away_team === apiAway
  );
  if (row) return row;

  // 3) fallback: gdyby gospodarz/gosc byli zamienieni w bazie
  row = dbMatches.find(
    (r) => r.home_team === apiAway && r.away_team === apiHome
  );
  if (row) return { ...row, __homeAwaySwapped: true };

  return null;
}

async function run() {
  const [apiMatches, dbMatches] = await Promise.all([
    fetchApiMatches(),
    fetchDbMatches(),
  ]);

  const now = new Date();
  let toUpdate = [];
  let skippedLocked = 0;
  let skippedPast = 0;
  let notFound = [];
  let alreadyOk = 0;

  for (const apiMatch of apiMatches) {
    const dbRow = findDbMatch(dbMatches, apiMatch);

    if (!dbRow) {
      notFound.push(apiMatch);
      continue;
    }

    if (LOCKED_STATUSES.has(dbRow.status)) {
      skippedLocked++;
      continue;
    }

    const apiKickoffIso = apiMatch.utcDate; // football-data.org juz daje UTC ISO
    const apiKickoffDate = new Date(apiKickoffIso);

    const minutesPast = (now.getTime() - apiKickoffDate.getTime()) / 60000;
    if (minutesPast > 30) {
      skippedPast++;
      continue;
    }

    const correctHome = normalizeTeamName(apiMatch.homeTeam.name);
    const correctAway = normalizeTeamName(apiMatch.awayTeam.name);
    const correctDeadline = toDeadline(apiKickoffIso);

    const needsHomeAwayFix =
      dbRow.home_team !== correctHome || dbRow.away_team !== correctAway;
    const needsDateFix = !sameMinute(dbRow.match_date, apiKickoffIso);
    const needsDeadlineFix = !sameMinute(dbRow.deadline, correctDeadline);
    const needsFdIdFix = dbRow.football_data_id !== apiMatch.id;

    if (!needsHomeAwayFix && !needsDateFix && !needsDeadlineFix && !needsFdIdFix) {
      alreadyOk++;
      continue;
    }

    toUpdate.push({
      id: dbRow.id,
      before: {
        home_team: dbRow.home_team,
        away_team: dbRow.away_team,
        match_date: dbRow.match_date,
        deadline: dbRow.deadline,
        football_data_id: dbRow.football_data_id,
      },
      after: {
        home_team: correctHome,
        away_team: correctAway,
        match_date: apiKickoffIso,
        deadline: correctDeadline,
        football_data_id: apiMatch.id,
      },
      flags: {
        needsHomeAwayFix,
        needsDateFix,
        needsDeadlineFix,
        needsFdIdFix,
      },
    });
  }

  console.log("==================== RAPORT (DRY RUN) ====================\n");
  console.log(`Mecze juz poprawne:                        ${alreadyOk}`);
  console.log(`Mecze pominiete (zakonczone/live w bazie): ${skippedLocked}`);
  console.log(`Mecze pominiete (kickoff w przeszlosci):   ${skippedPast}`);
  console.log(`Mecze z API bez odpowiednika w bazie:      ${notFound.length}`);
  console.log(`Mecze do poprawy:                          ${toUpdate.length}\n`);

  if (notFound.length) {
    console.log("--- Niedopasowane mecze z API (sprawdz TEAM_NAME_MAP) ---");
    for (const m of notFound) {
      console.log(`  id=${m.id}  ${m.homeTeam.name} vs ${m.awayTeam.name}  (${m.utcDate})`);
    }
    console.log("");
  }

  if (toUpdate.length) {
    console.log("--- Mecze ktore fix-fixtures.js by poprawil ---");
    for (const u of toUpdate) {
      console.log(`\nmatch id=${u.id}  (id NIE jest zmieniany - to tylko warunek WHERE)`);
      if (u.flags.needsHomeAwayFix) {
        console.log(`  gospodarz/gosc:  "${u.before.home_team}" vs "${u.before.away_team}"  ->  "${u.after.home_team}" vs "${u.after.away_team}"`);
      }
      if (u.flags.needsDateFix) {
        console.log(`  match_date:      ${u.before.match_date}  ->  ${u.after.match_date}`);
      }
      if (u.flags.needsDeadlineFix) {
        console.log(`  deadline:        ${u.before.deadline}  ->  ${u.after.deadline}`);
      }
      if (u.flags.needsFdIdFix) {
        console.log(`  football_data_id: ${u.before.football_data_id}  ->  ${u.after.football_data_id}`);
      }
    }
    console.log("");
  }

  console.log("To byl tylko DRY RUN - nic nie zostalo zapisane w bazie.");
  console.log("Jesli powyzsze wyglada OK, odpal: node scripts/fix-fixtures.js\n");
}

run().catch((err) => {
  console.error("Nieoczekiwany blad:", err);
  process.exit(1);
});