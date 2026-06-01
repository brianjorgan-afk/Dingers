'use client';
import { useState, useEffect } from 'react';

const TEAMS = [
  { name: "Desmond",       players: ["Aaron Judge","Gunnar Henderson","Mookie Betts","Marcell Ozuna","Tyler Soderstrom","Jackson Chourio","CJ Abrams","Daulton Varsho"] },
  { name: "T-Bone",        players: ["Juan Soto","Jose Ramirez","Vinnie Pasquantino","Manny Machado","Pete Crow-Armstrong","Alex Bregman","Seiya Suzuki","Wyatt Langford"] },
  { name: "Volek",         players: ["Shohei Ohtani","Julio Rodriguez","Bobby Witt Jr","Jazz Chisholm","Bryce Harper","Taylor Ward","Colson Montgomery","Matt Chapman"] },
  { name: "Kramer",        players: ["Matt Olson","Adolis Garcia","Teoscar Hernandez","Christian Walker","Nolan Gorman","Oneil Cruz","Christopher Morel","Isaac Paredes"] },
  { name: "NesselJank",    players: ["Kyle Schwarber","Ronald Acuna Jr","Fernando Tatis Jr","Ben Rice","Mike Trout","Brandon Lowe","Kyle Stowers","Mickey Moniak"] },
  { name: "Aaron",         players: ["Cal Raleigh","Elly De La Cruz","Michael Busch","Francisco Lindor","Corey Seager","Christian Yelich","Ian Happ","Trevor Story"] },
  { name: "Doyle's Organ", players: ["Pete Alonso","Brent Rooker","Munetaka Murakami","Byron Buxton","Hunter Goodman","Zach Neto","Willy Adames","Jackson Merrill"] },
  { name: "Kwi",           players: ["Nick Kurtz","Giancarlo Stanton","Kazuma Okamoto","George Springer","Salvador Perez","Chase DeLauter","Brandon Nimmo","Rafael Devers"] },
  { name: "Raybeck",       players: ["Eugenio Suarez","Shea Langeliers","Ketel Marte","Corbin Carroll","Roman Anthony","Jake Burger","Freddie Freeman","Drake Baldwin"] },
  { name: "Morello",       players: ["Junior Caminero","Yordan Alvarez","Kyle Tucker","James Wood","Riley Greene","Jac Caglianone","Spencer Torkelson","Wilyer Abreu"] },
  { name: "Gillman",       players: ["Vlad Guerrero Jr","Austin Riley","Jo Adell","Cody Bellinger","Max Muncy","Triston Casas","Kerry Carpenter","Andy Pages"] },
];

const MONTHS = ["March/April","May","June","July","August","September"];
const MONTH_ABBR = ["M/A","May","Jun","Jul","Aug","Sep"];
const MEDAL = ["#c9a84c","#8a8a8a","#a0674a"];

function playerTotal(p) {
  return MONTHS.reduce((s, m) => s + (Number(p?.byMonth?.[m]) || 0), 0);
}
function teamSeasonScore(team, data) {
  const tots = team.players.map(p => playerTotal(data[p]));
  return [...tots].sort((a,b)=>b-a).slice(0,5).reduce((s,v)=>s+v,0);
}
function teamMonthScore(team, data, month) {
  return team.players.reduce((s,p) => s + (Number(data[p]?.byMonth?.[month])||0), 0);
}
function teamLast5(team, data, selectedMonth) {
  if (selectedMonth === 'Total') {
    // Only count last5 for players in the top 5 by season total
    const ranked = team.players
      .map(p => ({ name: p, total: playerTotal(data[p]), last5: Number(data[p]?.last5)||0 }))
      .sort((a,b) => b.total - a.total)
      .slice(0, 5);
    return ranked.reduce((s,p) => s + p.last5, 0);
  }
  // For monthly tabs, all players count
  return team.players.reduce((s,p) => s + (Number(data[p]?.last5)||0), 0);
}
function coldColor(rank, total) {
  const t = rank / Math.max(total - 1, 1);
  const r = Math.round(10  + t * (200 - 10));
  const g = Math.round(40  + t * (215 - 40));
  const b = Math.round(100 + t * (228 - 100));
  return `rgb(${r},${g},${b})`;
}
function coldTextColor(rank, total) {
  return rank / Math.max(total - 1, 1) < 0.5 ? "#ffffff" : "#0a1e3c";
}

function Mountains({ fill, opacity = 1 }) {
  return (
    <svg viewBox="0 0 400 55" preserveAspectRatio="none" style={{ width:'100%', height:'38px', display:'block' }}>
      <polygon points="0,55 50,14 95,30 155,2 215,26 268,8 328,24 400,6 400,55" fill={fill} opacity={opacity}/>
      <polygon points="0,55 30,28 70,42 120,18 175,38 230,20 290,36 350,16 400,30 400,55" fill={fill} opacity={opacity * 0.5}/>
    </svg>
  );
}

export default function Home() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('Total');
  const [expandedTeam, setExpandedTeam] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      setData(json.players || {});
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const teamScores = TEAMS.map(team => {
    const score = selectedMonth === 'Total'
      ? teamSeasonScore(team, data)
      : teamMonthScore(team, data, selectedMonth);
    const last5 = teamLast5(team, data, selectedMonth);
    const playerRows = team.players.map(p => ({
      name: p,
      total: playerTotal(data[p]),
      monthHR: Number(data[p]?.byMonth?.[selectedMonth]) || 0,
      last5: Number(data[p]?.last5) || 0,
      months: data[p]?.byMonth || {},
    })).sort((a,b) => selectedMonth==='Total' ? b.total-a.total : b.monthHR-a.monthHR);
    return { ...team, score, last5, playerRows };
  }).sort((a,b) => b.score - a.score);

  const total = teamScores.length;
  const maxScore = Math.max(...teamScores.map(t=>t.score), 1);

  return (
    <div style={{ minHeight:'100vh', background:'#dde3e8', fontFamily:"'Arial Narrow',Arial,sans-serif", color:'#0a1e3c' }}>

      {/* ══ HEADER ══ */}
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(180deg, #b8c4cc 0%, #dde6ec 18%, #f0f4f6 40%, #e4eaee 60%, #c8d4da 80%, #b0bec8 100%)' }}>
        <div style={{ height:'8px', background:'linear-gradient(180deg, #0a2a5e 0%, #1a5fa8 50%, #0d3070 100%)' }}/>
        <div style={{ height:'3px', background:'linear-gradient(90deg, #4a9acc, #8dcbec, #4a9acc)' }}/>
        <div style={{ padding:'14px 20px 0', textAlign:'center', position:'relative', zIndex:2 }}>
          <div style={{ fontSize:'8px', letterSpacing:'7px', color:'#1a4a80', marginBottom:'1px', fontWeight:'bold' }}>THE SILVER BULLET</div>
          <div style={{ width:'60%', margin:'0 auto 6px', height:'1px', background:'linear-gradient(90deg, transparent, #4a8ac0, transparent)' }}/>
          <div style={{ fontSize:'clamp(60px,14vw,100px)', fontWeight:'bold', color:'#bb0000', fontFamily:"'Brush Script MT','Segoe Script',cursive", lineHeight:1.0, textShadow:'1px 2px 3px rgba(0,0,0,0.25)' }}>Dingers</div>
          <div style={{ fontSize:'13px', letterSpacing:'6px', color:'#0a2a5e', fontWeight:'900', margin:'2px 0 4px', fontFamily:"'Arial Black','Arial',sans-serif" }}>HOME RUN POOL</div>
          <div style={{ width:'60%', margin:'0 auto 6px', height:'1px', background:'linear-gradient(90deg, transparent, #4a8ac0, transparent)' }}/>
          <div style={{ display:'inline-block', background:'linear-gradient(135deg,#1a5fa8,#4a9acc)', color:'#fff', fontSize:'8px', letterSpacing:'2px', padding:'3px 12px', borderRadius:'10px', marginBottom:'8px', fontWeight:'bold' }}>⚾ COLD STATS ACTIVATED · 2026 ⚾</div>
          <div style={{ fontSize:'10px', color:'#3a6090', marginBottom:'6px', letterSpacing:'1px' }}>
            {loading ? 'Fetching live stats…' : lastUpdated ? `Live stats · Updated ${lastUpdated.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}` : ''}
          </div>
        </div>
        <Mountains fill="#1a4a80" opacity={0.25}/>
        <div style={{ marginTop:'-6px' }}><Mountains fill="#4a8ac0" opacity={0.15}/></div>
        <div style={{ height:'3px', background:'linear-gradient(90deg, #4a9acc, #8dcbec, #4a9acc)', marginTop:'-2px' }}/>
        <div style={{ height:'8px', background:'linear-gradient(180deg, #0d3070 0%, #1a5fa8 50%, #0a2a5e 100%)' }}/>
        <button onClick={fetchStats} disabled={loading} style={{ position:'absolute', top:'18px', right:'16px', background:'linear-gradient(135deg,#1a5fa8,#4a9acc)', color:'#fff', border:'1px solid #4a9acc', borderRadius:'6px', padding:'8px 14px', fontSize:'11px', fontWeight:'bold', cursor:loading?'not-allowed':'pointer', zIndex:3 }}>
          {loading ? 'LOADING…' : '↻ REFRESH'}
        </button>
      </div>

      {/* ══ MONTH TABS ══ */}
      <div style={{ display:'flex', gap:'6px', padding:'10px 16px', overflowX:'auto', background:'#cdd8e0', borderBottom:'1px solid #b0bec8' }}>
        {['Total',...MONTHS].map((m,i) => (
          <button key={m} onClick={()=>setSelectedMonth(m)} style={{ padding:'6px 12px', background:selectedMonth===m?'#0a2a5e':'#eef2f5', color:selectedMonth===m?'#fff':'#0a2a5e', border:`1px solid ${selectedMonth===m?'#0a2a5e':'#b0bec8'}`, borderRadius:'4px', fontSize:'11px', fontWeight:'bold', cursor:'pointer', whiteSpace:'nowrap' }}>
            {m==='Total' ? '🏆 SEASON' : (i>0 ? MONTH_ABBR[i-1] : m)}
          </button>
        ))}
      </div>
      <div style={{ textAlign:'center', padding:'5px', fontSize:'10px', color:'#3a6090', background:'#cdd8e0', borderBottom:'1px solid #b0bec8' }}>
        Season score = top 5 players' total HRs · coldest blue = hottest team
      </div>

      {/* ══ LEADERBOARD ══ */}
      <div style={{ padding:'14px', maxWidth:'780px', margin:'0 auto' }}>
        {teamScores.map((team, rank) => {
          const isExpanded = expandedTeam === team.name;
          const pct = (team.score / maxScore) * 100;
          const bgColor = coldColor(rank, total);
          const textColor = coldTextColor(rank, total);

          return (
            <div key={team.name} style={{ marginBottom:'8px', background:bgColor, border:'1px solid rgba(255,255,255,0.25)', borderRadius:'8px', overflow:'hidden', boxShadow:rank===0?'0 3px 16px rgba(10,30,80,0.4)':'0 1px 4px rgba(0,0,0,0.12)' }}>
              <div style={{ display:'flex', alignItems:'center', padding:'12px 14px', gap:'12px' }}>

                {/* Rank */}
                <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'bold', background:rank<3?`${MEDAL[rank]}44`:'rgba(255,255,255,0.2)', border:`2px solid ${rank<3?MEDAL[rank]:'rgba(255,255,255,0.4)'}`, color:rank<3?MEDAL[rank]:textColor }}>
                  {rank+1}
                </div>

                {/* Name */}
                <div onClick={()=>setExpandedTeam(isExpanded?null:team.name)} style={{ flex:'0 0 120px', cursor:'pointer' }}>
                  <div style={{ fontWeight:'bold', fontSize:'16px', color:textColor }}>{team.name}</div>
                  <div style={{ fontSize:'10px', marginTop:'1px', color:rank<4?'rgba(255,255,255,0.55)':'rgba(10,30,60,0.45)' }}>
                    {team.players.length} players {isExpanded?'▲':'▼'}
                  </div>
                </div>

                {/* Bar */}
                <div onClick={()=>setExpandedTeam(isExpanded?null:team.name)} style={{ flex:1, cursor:'pointer' }}>
                  <div style={{ height:'7px', background:'rgba(255,255,255,0.2)', borderRadius:'4px', overflow:'hidden' }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:rank<3?`linear-gradient(90deg,${MEDAL[rank]}88,${MEDAL[rank]})`:'rgba(255,255,255,0.45)', borderRadius:'4px', transition:'width 0.8s ease' }}/>
                  </div>
                </div>

                {/* Score + last 5 */}
                <div onClick={()=>setExpandedTeam(isExpanded?null:team.name)} style={{ textAlign:'right', cursor:'pointer' }}>
                  <div style={{ fontSize:'28px', fontWeight:'900', color:textColor, fontFamily:'monospace', lineHeight:1 }}>
                    {loading ? '–' : team.score}
                  </div>
                  {!loading && team.last5 > 0 && (
                    <div style={{ fontSize:'11px', color: rank<4 ? 'rgba(255,255,255,0.75)' : 'rgba(10,30,60,0.55)', fontFamily:'monospace', lineHeight:1, marginTop:'2px' }}>
                      +{team.last5} last 5d
                    </div>
                  )}
                  {!loading && team.last5 === 0 && (
                    <div style={{ fontSize:'11px', color: rank<4 ? 'rgba(255,255,255,0.35)' : 'rgba(10,30,60,0.25)', fontFamily:'monospace', lineHeight:1, marginTop:'2px' }}>
                      — last 5d
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.15)', padding:'10px 14px', background:'rgba(0,0,0,0.15)' }}>
                  {team.playerRows.map((p, pi) => {
                    const isTop5 = selectedMonth==='Total' && pi<5;
                    const hr = selectedMonth==='Total' ? p.total : p.monthHR;
                    return (
                      <div key={p.name} style={{ display:'flex', alignItems:'center', padding:'6px 8px', marginBottom:'3px', background:isTop5?'rgba(255,255,255,0.12)':'transparent', borderRadius:'5px', borderLeft:isTop5?'2px solid rgba(255,255,255,0.5)':'2px solid transparent' }}>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.4)', width:'18px' }}>{pi+1}</div>
                        <div style={{ flex:1, fontSize:'13px', color:isTop5?'#fff':'rgba(255,255,255,0.65)' }}>
                          {p.name}{isTop5&&<span style={{ color:'#cce8f8', marginLeft:'5px', fontSize:'9px' }}>★ TOP 5</span>}
                        </div>
                        {selectedMonth==='Total' && (
                          <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.4)', marginRight:'10px', display:'flex', gap:'4px' }}>
                            {MONTHS.map((m,i)=><span key={m}>{MONTH_ABBR[i]}: {p.months[m]??0}</span>)}
                          </div>
                        )}
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'18px', fontWeight:'bold', color:'#cce8f8', fontFamily:'monospace' }}>{hr}</div>
                          {p.last5 > 0 && <div style={{ fontSize:'9px', color:'rgba(204,232,248,0.6)', fontFamily:'monospace' }}>+{p.last5} 5d</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ background:'linear-gradient(180deg,#0a2a5e,#0a1e3c)', marginTop:'8px' }}>
        <div style={{ height:'3px', background:'linear-gradient(90deg,#4a9acc,#8dcbec,#4a9acc)' }}/>
        <Mountains fill="#4a9acc" opacity={0.2}/>
        <div style={{ textAlign:'center', padding:'4px 16px 14px', fontSize:'9px', color:'#4a9acc', letterSpacing:'3px' }}>
          2026 MLB SEASON · LIVE STATS VIA MLB STATS API
        </div>
      </div>
    </div>
  );
}