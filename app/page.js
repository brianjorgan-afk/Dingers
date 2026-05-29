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
const MEDAL = ["#FFD700","#C0C0C0","#CD7F32"];

function playerTotal(months) {
  return MONTHS.reduce((s, m) => s + (Number(months?.[m]) || 0), 0);
}
function teamSeasonScore(team, data) {
  const tots = team.players.map(p => playerTotal(data[p]));
  return [...tots].sort((a,b)=>b-a).slice(0,5).reduce((s,v)=>s+v,0);
}
function teamMonthScore(team, data, month) {
  return team.players.reduce((s,p) => s + (Number(data[p]?.[month])||0), 0);
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
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const teamScores = TEAMS.map(team => {
    const score = selectedMonth === 'Total'
      ? teamSeasonScore(team, data)
      : teamMonthScore(team, data, selectedMonth);
    const playerRows = team.players.map(p => ({
      name: p,
      total: playerTotal(data[p]),
      monthHR: Number(data[p]?.[selectedMonth]) || 0,
      months: data[p] || {},
    })).sort((a,b) => selectedMonth==='Total' ? b.total-a.total : b.monthHR-a.monthHR);
    return { ...team, score, playerRows };
  }).sort((a,b) => b.score - a.score);

  const maxScore = Math.max(...teamScores.map(t=>t.score), 1);

  return (
    <div style={{ minHeight:'100vh', background:'#08090f', fontFamily:"'Palatino Linotype',Palatino,serif", color:'#ddd0b8' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(180deg,#14200f,#0a1208)', borderBottom:'2px solid #4a7a2a', padding:'24px 20px 14px', textAlign:'center', position:'relative' }}>
        <div style={{ fontSize:'11px', letterSpacing:'5px', color:'#6ab030', marginBottom:'4px' }}>⚾ 2026 FANTASY HOME RUN POOL ⚾</div>
        <h1 style={{ fontSize:'clamp(40px,10vw,70px)', fontWeight:'900', margin:'0 0 2px', color:'#fff', letterSpacing:'-2px', textShadow:'0 0 50px rgba(106,176,48,0.5)' }}>DINGERS</h1>
        <div style={{ fontSize:'11px', color:'#3a6020' }}>
          {loading ? 'Fetching live stats…' : lastUpdated ? `Live stats · Updated ${lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : ''}
        </div>
        <button onClick={fetchStats} disabled={loading} style={{ position:'absolute', top:'18px', right:'16px', background:loading?'#1a2a10':'#4a7a2a', color:loading?'#3a5a20':'#e8ffd0', border:'1px solid #3a6a1a', borderRadius:'6px', padding:'8px 14px', fontSize:'11px', fontWeight:'bold', cursor:loading?'not-allowed':'pointer' }}>
          {loading ? 'LOADING…' : '↻ REFRESH'}
        </button>
      </div>

      {/* Month tabs */}
      <div style={{ display:'flex', gap:'6px', padding:'12px 16px', overflowX:'auto', background:'#060809', borderBottom:'1px solid #1a2a10' }}>
        {['Total',...MONTHS].map((m,i) => (
          <button key={m} onClick={()=>setSelectedMonth(m)} style={{ padding:'6px 12px', background:selectedMonth===m?'#4a7a2a':'#111810', color:selectedMonth===m?'#e8ffd0':'#4a6a30', border:`1px solid ${selectedMonth===m?'#6ab030':'#1e3010'}`, borderRadius:'4px', fontSize:'11px', fontWeight:'bold', cursor:'pointer', whiteSpace:'nowrap' }}>
            {m==='Total' ? '🏆 SEASON' : (i>0 ? MONTH_ABBR[i-1] : m)}
          </button>
        ))}
      </div>
      <div style={{ textAlign:'center', padding:'5px', fontSize:'10px', color:'#2a4a18', background:'#060809' }}>
        {selectedMonth==='Total' ? "Season score = top 5 players' total HRs per team" : `${selectedMonth} — all players count`}
      </div>

      {/* Leaderboard */}
      <div style={{ padding:'14px', maxWidth:'780px', margin:'0 auto' }}>
        {teamScores.map((team, rank) => {
          const isExpanded = expandedTeam === team.name;
          const pct = (team.score / maxScore) * 100;
          return (
            <div key={team.name} style={{ marginBottom:'8px', background:rank===0?'#111a08':'#0c100a', border:`1px solid ${rank===0?'#4a7a2a':'#1a2410'}`, borderRadius:'8px', overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', padding:'13px 14px', gap:'12px' }}>
                <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'bold', background:rank<3?`${MEDAL[rank]}22`:'#111a08', border:`2px solid ${rank<3?MEDAL[rank]:'#2a3a18'}`, color:rank<3?MEDAL[rank]:'#4a6030' }}>{rank+1}</div>
                <div onClick={()=>setExpandedTeam(isExpanded?null:team.name)} style={{ flex:'0 0 110px', cursor:'pointer' }}>
                  <div style={{ fontWeight:'bold', fontSize:'16px', color:rank===0?'#c8f090':'#a0b880' }}>{team.name}</div>
                  <div style={{ fontSize:'10px', color:'#2a4a18', marginTop:'1px' }}>{team.players.length} players {isExpanded?'▲':'▼'}</div>
                </div>
                <div onClick={()=>setExpandedTeam(isExpanded?null:team.name)} style={{ flex:1, cursor:'pointer' }}>
                  <div style={{ height:'7px', background:'#1a2410', borderRadius:'4px', overflow:'hidden' }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:rank===0?'linear-gradient(90deg,#4a8a20,#8ade30)':rank<3?`linear-gradient(90deg,${MEDAL[rank]}88,${MEDAL[rank]})`:'linear-gradient(90deg,#2a4a18,#3a6a20)', borderRadius:'4px', transition:'width 0.8s ease' }}/>
                  </div>
                </div>
                <div onClick={()=>setExpandedTeam(isExpanded?null:team.name)} style={{ fontSize:'26px', fontWeight:'900', color:rank===0?'#8ade30':'#4a7a2a', fontFamily:'monospace', minWidth:'40px', textAlign:'right', cursor:'pointer' }}>
                  {loading ? '–' : team.score}
                </div>
              </div>
              {isExpanded && (
                <div style={{ borderTop:'1px solid #1a2410', padding:'10px 14px', background:'rgba(0,0,0,0.25)' }}>
                  {team.playerRows.map((p, pi) => {
                    const isTop5 = selectedMonth==='Total' && pi<5;
                    const hr = selectedMonth==='Total' ? p.total : p.monthHR;
                    return (
                      <div key={p.name} style={{ display:'flex', alignItems:'center', padding:'6px 8px', marginBottom:'3px', background:isTop5?'rgba(74,122,42,0.12)':'transparent', borderRadius:'5px', borderLeft:isTop5?'2px solid #4a7a2a':'2px solid transparent' }}>
                        <div style={{ fontSize:'10px', color:'#2a4018', width:'18px' }}>{pi+1}</div>
                        <div style={{ flex:1, fontSize:'13px', color:isTop5?'#a0d060':'#607050' }}>
                          {p.name}{isTop5&&<span style={{ color:'#6ab030', marginLeft:'5px', fontSize:'9px' }}>★ TOP 5</span>}
                        </div>
                        {selectedMonth==='Total' && (
                          <div style={{ fontSize:'9px', color:'#2a4018', marginRight:'10px', display:'flex', gap:'4px' }}>
                            {MONTHS.map((m,i)=><span key={m}>{MONTH_ABBR[i]}: {p.months[m]??0}</span>)}
                          </div>
                        )}
                        <div style={{ fontSize:'18px', fontWeight:'bold', color:isTop5?'#8ade30':'#3a5a20', fontFamily:'monospace', minWidth:'28px', textAlign:'right' }}>{hr}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign:'center', padding:'20px 16px', fontSize:'10px', color:'#1e3010' }}>
        2026 MLB Season • Live stats via MLB Stats API
      </div>
    </div>
  );
}