const ALL_PLAYERS = [
  "Aaron Judge","Gunnar Henderson","Mookie Betts","Marcell Ozuna","Tyler Soderstrom","Jackson Chourio","CJ Abrams","Daulton Varsho",
  "Juan Soto","Jose Ramirez","Vinnie Pasquantino","Manny Machado","Pete Crow-Armstrong","Alex Bregman","Seiya Suzuki","Wyatt Langford",
  "Shohei Ohtani","Julio Rodriguez","Bobby Witt Jr","Jazz Chisholm","Bryce Harper","Taylor Ward","Colson Montgomery","Matt Chapman",
  "Matt Olson","Adolis Garcia","Teoscar Hernandez","Christian Walker","Nolan Gorman","Oneil Cruz","Christopher Morel","Isaac Paredes",
  "Kyle Schwarber","Ronald Acuna Jr","Fernando Tatis Jr","Ben Rice","Mike Trout","Brandon Lowe","Kyle Stowers","Mickey Moniak",
  "Cal Raleigh","Elly De La Cruz","Michael Busch","Francisco Lindor","Corey Seager","Christian Yelich","Ian Happ","Trevor Story",
  "Pete Alonso","Brent Rooker","Munetaka Murakami","Byron Buxton","Hunter Goodman","Zach Neto","Willy Adames","Jackson Merrill",
  "Nick Kurtz","Giancarlo Stanton","Kazuma Okamoto","George Springer","Salvador Perez","Chase DeLauter","Brandon Nimmo","Rafael Devers",
  "Eugenio Suarez","Shea Langeliers","Ketel Marte","Corbin Carroll","Roman Anthony","Jake Burger","Freddie Freeman","Drake Baldwin",
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
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const data = await res.json();
  if (!data.people?.length) return null;
  const normName = normalizeName(name);
  const exact = data.people.find(p => normalizeName(p.fullName) === normName);
  return (exact || data.people[0]).id;
}

async function getPlayerHRs(playerId) {
  const year = new Date().getFullYear();
  const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=gameLog&group=hitting&season=${year}&sportId=1`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const data = await res.json();
  const games = data.stats?.[0]?.splits ?? [];

  const byMonth = { "March/April":0, "May":0, "June":0, "July":0, "August":0, "September":0 };
  let last5 = 0;

  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  fiveDaysAgo.setHours(0, 0, 0, 0);

  for (const g of games) {
    const gameDate = new Date(g.date + "T12:00:00");
    const mo = gameDate.getMonth();
    const mn = monthName(mo);
    const hrs = g.stat?.homeRuns ?? 0;
    if (mn) byMonth[mn] += hrs;
    if (gameDate >= fiveDaysAgo) last5 += hrs;
  }

  return { byMonth, last5 };
}

export async function GET() {
  const results = {};
  const batchSize = 5;

  for (let i = 0; i < ALL_PLAYERS.length; i += batchSize) {
    const batch = ALL_PLAYERS.slice(i, i + batchSize);
    await Promise.all(batch.map(async (name) => {
      try {
        const id = await searchPlayer(name);
        if (id) {
          results[name] = await getPlayerHRs(id);
        } else {
          results[name] = { byMonth: { "March/April":0,"May":0,"June":0,"July":0,"August":0,"September":0 }, last5: 0 };
        }
      } catch {
        results[name] = { byMonth: { "March/April":0,"May":0,"June":0,"July":0,"August":0,"September":0 }, last5: 0 };
      }
    }));
  }

  return Response.json({ players: results, fetchedAt: new Date().toISOString() });
}