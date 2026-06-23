const ALL_PLAYERS = [
  "Aaron Judge","Gunnar Henderson","Mookie Betts","Marcell Ozuna","Tyler Soderstrom","Jackson Chourio","CJ Abrams","Daulton Varsho",
  "Juan Soto","José Ramírez","Vinnie Pasquantino","Manny Machado","Pete Crow-Armstrong","Alex Bregman","Seiya Suzuki","Wyatt Langford",
  "Shohei Ohtani","Julio Rodríguez","Bobby Witt Jr","Jazz Chisholm Jr.","Bryce Harper","Taylor Ward","Colson Montgomery","Matt Chapman",
  "Matt Olson","Adolis García","Teoscar Hernández","Christian Walker","Nolan Gorman","Oneil Cruz","Christopher Morel","Isaac Paredes",
  "Kyle Schwarber","Ronald Acuña Jr.","Fernando Tatis Jr.","Ben Rice","Mike Trout","Brandon Lowe","Kyle Stowers","Mickey Moniak",
  "Cal Raleigh","Elly De La Cruz","Michael Busch","Francisco Lindor","Corey Seager","Christian Yelich","Ian Happ","Trevor Story",
  "Pete Alonso","Brent Rooker","Munetaka Murakami","Byron Buxton","Hunter Goodman","Zach Neto","Willy Adames","Jackson Merrill",
  "Nick Kurtz","Giancarlo Stanton","Kazuma Okamoto","George Springer","Salvador Perez","Chase DeLauter","Brandon Nimmo","Rafael Devers",
  "Eugenio Suárez","Shea Langeliers","Ketel Marte","Corbin Carroll","Roman Anthony","Jake Burger","Freddie Freeman","Drake Baldwin",
  "Junior Caminero","Yordan Alvarez","Kyle Tucker","James Wood","Riley Greene","Jac Caglianone","Spencer Torkelson","Wilyer Abreu",
  "Vladimir Guerrero Jr.","Austin Riley","Jo Adell","Cody Bellinger","Max Muncy","Triston Casas","Kerry Carpenter","Andy Pages",
];

function monthName(monthNum) {
  if (monthNum === 2 || monthNum === 3) return "March/April";
  if (monthNum === 4) return "May";
  if (monthNum === 5) return "June";
  if (monthNum === 6) return "July";
  if (monthNum === 7) return "August";
  if (monthNum === 8) return "September";
  return null;
}

function normalizeName(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function searchPlayer(name) {
  const url = `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(name)}&sportId=1`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  if (!data.people?.length) return null;
  const normName = normalizeName(name);
  const exact = data.people.find(p => normalizeName(p.fullName) === normName);
  const person = exact || data.people[0];
  const playerId = person.id;

  // currentTeam may not be in search results — do a second lookup
  const playerUrl = `https://statsapi.mlb.com/api/v1/people/${playerId}?hydrate=currentTeam`;
  const playerRes = await fetch(playerUrl, { cache: 'no-store' });
  const playerData = await playerRes.json();
  const teamId = playerData.people?.[0]?.currentTeam?.id;

  return { id: playerId, teamId };
}


async function getPlayerHRs(playerId) {
  const year = new Date().getFullYear();
  const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=gameLog&group=hitting&season=${year}&sportId=1`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const data = await res.json();
  const games = data.stats?.[0]?.splits ?? [];

  const byMonth = { "March/April":0,"May":0,"June":0,"July":0,"August":0,"September":0 };
  let last5 = 0;
  let last1 = 0;

  const now = new Date();

  // Get "today" and "10am cutoff day" as Eastern calendar date strings (YYYY-MM-DD)
  const easternDateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year:'numeric', month:'2-digit', day:'2-digit',
  });
  const easternHourFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour:'numeric', hour12:false,
  });

  const todayEastern = easternDateFmt.format(now); // e.g. "2026-06-22"
  const currentEasternHour = parseInt(easternHourFmt.format(now), 10);

  // If before 10am Eastern, "today" for last1 purposes is actually yesterday
  const oneDayCutoffDate = new Date(now);
  if (currentEasternHour < 10) {
    oneDayCutoffDate.setDate(oneDayCutoffDate.getDate() - 1);
  }
  const oneDayDateStr = easternDateFmt.format(oneDayCutoffDate); // the "game day" that still counts as "today"

  // 5-day cutoff stays simple — based on real elapsed days
  const fiveDaysAgo = new Date(now);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  fiveDaysAgo.setHours(0,0,0,0);

  for (const g of games) {
    const dateStr = g.date; // "YYYY-MM-DD" from MLB API, this is the game's official date
    const gameDate = new Date(dateStr + "T12:00:00");
    const mo = gameDate.getMonth();
    const mn = monthName(mo);
    const hrs = g.stat?.homeRuns ?? 0;

    if (mn) byMonth[mn] += hrs;
    if (gameDate >= fiveDaysAgo) last5 += hrs;
    if (dateStr === oneDayDateStr) last1 += hrs;
  }

  return { byMonth, last5, last1 };
}
async function getTeamGameStatus(teamId) {
  if (!teamId) return { status: 'unknown' };

  try {
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now); // returns YYYY-MM-DD in Eastern time

    const todayUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}&date=${today}&hydrate=linescore`;
    const todayRes = await fetch(todayUrl, { next: { revalidate: 60 } });
    const todayData = await todayRes.json();
    const todayGames = todayData.dates?.[0]?.games ?? [];

    for (const game of todayGames) {
      const abstractState = game.status?.abstractGameState;
      const codedState    = game.status?.codedGameState;
      const detailedState = game.status?.detailedState ?? '';

      if (
        abstractState === 'Live' ||
        codedState === 'I' || codedState === 'M' || codedState === 'N' ||
        detailedState.toLowerCase().includes('progress') ||
        detailedState.toLowerCase().includes('delay')
      ) {
        return { status: 'live' };
      }

      if (abstractState === 'Final' || codedState === 'F' || codedState === 'O') {
        continue;
      }

      return { status: 'today', gameTime: game.gameDate };
    }

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);

    const nextUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
    const nextRes = await fetch(nextUrl, { next: { revalidate: 3600 } });
    const nextData = await nextRes.json();
    const nextDates = nextData.dates ?? [];

    if (nextDates.length > 0 && nextDates[0].games?.length > 0) {
      return { status: 'upcoming', gameTime: nextDates[0].games[0].gameDate };
    }

    return { status: 'unknown' };
  } catch (err) {
    console.error(`getTeamGameStatus failed for teamId ${teamId}:`, err.message);
    return { status: 'unknown' };
  }
}
export async function GET() {
  const results = {};
  const teamGameCache = {};
  const batchSize = 5;

  for (let i = 0; i < ALL_PLAYERS.length; i += batchSize) {
    const batch = ALL_PLAYERS.slice(i, i + batchSize);
    await Promise.all(batch.map(async (name) => {
      try {
        const player = await searchPlayer(name);
        if (player) {
          const gameStatus = teamGameCache[player.teamId]
            ?? await getTeamGameStatus(player.teamId);
          if (player.teamId) teamGameCache[player.teamId] = gameStatus;
          const hrData = await getPlayerHRs(player.id);
          results[name] = { ...hrData, gameStatus };
        } else {
          results[name] = {
            byMonth: { "March/April":0,"May":0,"June":0,"July":0,"August":0,"September":0 },
            last5: 0, last1: 0,
            gameStatus: { status: 'unknown' },
          };
        }
      } catch {
        results[name] = {
          byMonth: { "March/April":0,"May":0,"June":0,"July":0,"August":0,"September":0 },
          last5: 0, last1: 0,
          gameStatus: { status: 'unknown' },
        };
      }
    }));
  }

  return Response.json({ players: results, fetchedAt: new Date().toISOString() });
}