import { useState, useCallback, useEffect, useMemo } from "react";
import countriesRaw from "./countryData.json";

/* ─────────────────── HELPERS ─────────────────── */
function shuffle(a) { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; }
function pickRandom(arr,n,ex=[]){ return shuffle(arr.filter(c=>!ex.includes(c.iso2))).slice(0,n); }
function flagUrl(iso2,c){ return c&&c.custom&&c.flagPath ? c.flagPath : `https://flagcdn.com/w320/${iso2}.png`; }
function getFlagUrl(c){ return flagUrl(c.iso2,c); }
function rand(a){ return a[Math.floor(Math.random()*a.length)]; }

const AVATARS=["🦊","🐸","🦁","🐼","🦄","🐙"];
const EC=["🎉","⭐","🥳","🏆","💪","🌟","👏","🎊"];
const EW=["🤔","💭","🧐"];
const MC=["Tubli!","Väga hea!","Suurepärane!","Õige!","Super!","Hästi tehtud!"];
const MW=["Proovi uuesti!","Peaaegu!","Järgmine kord!","Ära muretse!"];
const SM=["Võimas!","Unstoppable!","Tulekahju!","Fenomenaalne!","Vapustav!"];

/* ─────────────────── STORAGE ─────────────────── */
function loadJ(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f;}catch{return f;}}
function saveJ(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
function loadProfiles(){return loadJ("lipumang_profiles",[]);}
function saveProfiles(p){saveJ("lipumang_profiles",p);}
function loadActiveId(){return loadJ("lipumang_active",null);}
function saveActiveId(id){saveJ("lipumang_active",id);}
function loadCollection(pid){return loadJ(`lipumang_col_${pid}`,[]);}
function saveCollection(pid,c){saveJ(`lipumang_col_${pid}`,c);}
function loadAchievements(pid){return loadJ(`lipumang_ach_${pid}`,{unlocked:[],diffPlayed:[]});}
function saveAchievements(pid,a){saveJ(`lipumang_ach_${pid}`,a);}
function loadCaps(){try{const v=localStorage.getItem("lipumang_allcaps");return v===null?true:v==="true";}catch{return true;}}

const DL=["easy","medium","hard","expert"];
function countriesForDiff(d){ const i=DL.indexOf(d); return countriesRaw.filter(c=>DL.indexOf(c.difficulty)<=i); }

/* ─────────────────── ACHIEVEMENTS DEFS ─────────────────── */
const BALTIC=["ee","lv","lt"];
const NORDIC=["ee","lv","lt","fi","se","no","dk","is"];
const UK_NATIONS=["gb-eng","gb-sct","gb-wls","gb-nir"];
const ALL_CODES=countriesRaw.map(c=>c.iso2);

function codesForRegion(r){return countriesRaw.filter(c=>c.region===r).map(c=>c.iso2);}
function codesForSubregion(s){return countriesRaw.filter(c=>c.subregion===s).map(c=>c.iso2);}
function codesForDiff(d){return countriesRaw.filter(c=>c.difficulty===d).map(c=>c.iso2);}
function codesForTag(t){return countriesRaw.filter(c=>c.tags&&c.tags.includes(t)).map(c=>c.iso2);}

// count how many of `needed` are in `col`
function overlap(col,needed){return needed.filter(c=>col.includes(c)).length;}

const ACHIEVEMENTS = [
  // ── COLLECTION ──
  {id:"col_baltic",cat:"collection",icon:"🇪🇪",name:"Balti kolmik",desc:"Tunne kõiki Balti lippe",hint:"Kolm väikest riiki mere ääres...",need:BALTIC,type:"set"},
  {id:"col_nordic",cat:"collection",icon:"❄️",name:"Põhjamaade meister",desc:"Tunne kõiki Põhjamaade lippe",hint:"Külmad maad, kus öö kestab kaua...",need:NORDIC,type:"set"},
  {id:"col_europe",cat:"collection",icon:"🏰",name:"Euroopa ekspert",desc:"Tunne kõiki Euroopa lippe",hint:"Vana manner ootab avastamist...",need:codesForRegion("Europe"),type:"set"},
  {id:"col_africa",cat:"collection",icon:"🌍",name:"Aafrika avastaja",desc:"Tunne kõiki Aafrika lippe",hint:"Suur manner lõunas...",need:codesForRegion("Africa"),type:"set"},
  {id:"col_asia",cat:"collection",icon:"🏯",name:"Aasia asjatundja",desc:"Tunne kõiki Aasia lippe",hint:"Maailma suurim manner...",need:codesForRegion("Asia"),type:"set"},
  {id:"col_mideast",cat:"collection",icon:"🕌",name:"Lähis-Ida tundja",desc:"Tunne kõiki Lähis-Ida lippe",hint:"Kuum kõrb ja iidsed linnad...",need:codesForSubregion("Middle East"),type:"set"},
  {id:"col_seasian",cat:"collection",icon:"🌴",name:"Kagu-Aasia guru",desc:"Tunne kõiki Kagu-Aasia lippe",hint:"Troopilised saared ja templid...",need:codesForSubregion("Southeast Asia"),type:"set"},
  {id:"col_easian",cat:"collection",icon:"🐉",name:"Ida-Aasia tark",desc:"Tunne kõiki Ida-Aasia lippe",hint:"Draakoni maad...",need:codesForSubregion("East Asia"),type:"set"},
  {id:"col_oceania",cat:"collection",icon:"🏝️",name:"Okeaania kapten",desc:"Tunne kõiki Okeaania lippe",hint:"Kauged saared suures ookeanis...",need:codesForRegion("Oceania"),type:"set"},
  {id:"col_americas",cat:"collection",icon:"🗽",name:"Ameerika teadja",desc:"Tunne kõiki Ameerika lippe",hint:"Kaks suurt mandrit...",need:codesForRegion("Americas"),type:"set"},
  {id:"col_caribbean",cat:"collection",icon:"🏖️",name:"Kariibi kapten",desc:"Tunne kõiki Kariibi lippe",hint:"Päikeselised saared...",need:codesForSubregion("Caribbean"),type:"set"},
  {id:"col_uk",cat:"collection",icon:"👑",name:"Ühendkuningriik",desc:"Tunne kõiki UK rahvuste lippe",hint:"Neli lippu ühe krooni all...",need:UK_NATIONS,type:"set"},
  {id:"col_all",cat:"collection",icon:"🌐",name:"Maailmameister",desc:"Tunne kõiki 202 lippu!",hint:"Iga lipp maailmas...",need:ALL_CODES,type:"set"},

  // ── PERFORMANCE ──
  {id:"perf_first",cat:"performance",icon:"🎯",name:"Esimene samm",desc:"Esimene õige vastus!",hint:"Kõik algab ühest...",type:"threshold",threshold:1},
  {id:"perf_50",cat:"performance",icon:"🔥",name:"Poolsada lippu",desc:"50 erinevat lippu õigesti",hint:"Poolel teel viiekümneni...",type:"threshold",threshold:50},
  {id:"perf_100",cat:"performance",icon:"💎",name:"Sada lippu",desc:"100 erinevat lippu õigesti",hint:"Kolmekohaline number ootab...",type:"threshold",threshold:100},
  {id:"perf_all",cat:"performance",icon:"👑",name:"Kõik 202!",desc:"Kõik lipud õigesti!",hint:"Absoluutne täielikkus...",type:"threshold",threshold:202},
  {id:"perf_easy",cat:"performance",icon:"🌱",name:"Kerge läbi!",desc:"Kõik Kerge taseme lipud õigesti",hint:"Algus on tehtud...",need:codesForDiff("easy"),type:"set"},
  {id:"perf_medium80",cat:"performance",icon:"🌿",name:"Keskmine tubli!",desc:"80% Keskmine taseme lippudest",hint:"Enamik keskmistest...",type:"custom",check:(col)=>{
    const med=countriesRaw.filter(c=>c.difficulty==="medium").map(c=>c.iso2);
    return overlap(col,med)>=Math.ceil(med.length*0.8);
  },progress:(col)=>{
    const med=countriesRaw.filter(c=>c.difficulty==="medium").map(c=>c.iso2);
    return {current:overlap(col,med),total:Math.ceil(med.length*0.8)};
  }},
  {id:"perf_expert",cat:"performance",icon:"💀",name:"Eksperdi tase!",desc:"Kõik 202 lippu õigesti",hint:"Iga viimane lipp...",need:ALL_CODES,type:"set"},
  {id:"perf_alldiff",cat:"performance",icon:"🎮",name:"Kõik tasemed",desc:"Mänginud igal raskusastmel",hint:"Proovi kõiki nelja...",type:"alldiff"},

  // ── QUIRKY ──
  {id:"q_star",cat:"quirky",icon:"⭐",name:"Tähekütt",desc:"Tunne lippu tähega",hint:"Taevas särab...",tag:"star",type:"tag"},
  {id:"q_cross",cat:"quirky",icon:"✝️",name:"Ristisõda",desc:"Tunne lippu ristiga",hint:"Pluss või rist...",tag:"cross",type:"tag"},
  {id:"q_animal",cat:"quirky",icon:"🦅",name:"Loomaaed",desc:"Tunne lippu loomaga",hint:"Tiivad, sabad ja küünised...",tag:"animal",type:"tag"},
  {id:"q_weapon",cat:"quirky",icon:"⚔️",name:"Relvakamber",desc:"Tunne lippu relvaga",hint:"Mõõgad ja muu (ajalooline sümbol!)...",tag:"weapon",type:"tag"},
  {id:"q_sun",cat:"quirky",icon:"☀️",name:"Päikesejahi",desc:"Tunne lippu päikese või kuuga",hint:"Taevavalgusti...",tag:"sun",type:"tag"},
  {id:"q_twocolor",cat:"quirky",icon:"🎨",name:"Minimalist",desc:"Tunne kahevärvilist lippu",hint:"Ainult kaks tooni...",tag:"twocolor",type:"tag"},
  {id:"q_nonrect",cat:"quirky",icon:"📐",name:"Erinev kuju",desc:"Tunne ainsat mittenelinurkset lippu",hint:"See pole nelinurk...",tag:"nonrectangular",type:"tag"},
  {id:"q_dragon",cat:"quirky",icon:"🐲",name:"Draakonikütistaja",desc:"Tunne draakoniga lippu",hint:"Tuld purskav eluk...",tag:"dragon",type:"tag"},
];

function checkAchievements(col, achState) {
  const newUnlocks = [];
  ACHIEVEMENTS.forEach(a => {
    if (achState.unlocked.includes(a.id)) return;
    let earned = false;
    if (a.type === "set") earned = a.need.every(c => col.includes(c));
    else if (a.type === "threshold") earned = col.length >= a.threshold;
    else if (a.type === "tag") {
      const tagged = codesForTag(a.tag);
      earned = tagged.some(c => col.includes(c));
    }
    else if (a.type === "custom" && a.check) earned = a.check(col);
    else if (a.type === "alldiff") earned = DL.every(d => achState.diffPlayed.includes(d));
    if (earned) newUnlocks.push(a.id);
  });
  return newUnlocks;
}

function getProgress(a, col, achState) {
  if (achState.unlocked.includes(a.id)) return { current: 1, total: 1, pct: 100 };
  if (a.type === "set") { const c = overlap(col, a.need); return { current: c, total: a.need.length, pct: Math.round(c/a.need.length*100) }; }
  if (a.type === "threshold") return { current: Math.min(col.length,a.threshold), total: a.threshold, pct: Math.round(Math.min(col.length,a.threshold)/a.threshold*100) };
  if (a.type === "tag") { const t=codesForTag(a.tag); const c=overlap(col,t); return {current:Math.min(c,1),total:1,pct:c>0?100:0}; }
  if (a.type === "custom" && a.progress) return { ...a.progress(col), pct: a.check(col) ? 100 : Math.round(a.progress(col).current/a.progress(col).total*100) };
  if (a.type === "alldiff") { const c=achState.diffPlayed.length; return {current:c,total:4,pct:Math.round(c/4*100)}; }
  return { current:0, total:1, pct:0 };
}

/* ═══════════════════ MAIN APP ═══════════════════ */
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [allCaps, setAllCaps] = useState(loadCaps);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gameMode, setGameMode] = useState(null);
  const [difficulty, setDifficulty] = useState("easy");
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [streakCelebration, setStreakCelebration] = useState(null);
  const [question, setQuestion] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [selected, setSelected] = useState(null);
  const [collection, setCollection] = useState([]);
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState(AVATARS[0]);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [achState, setAchState] = useState({ unlocked: [], diffPlayed: [] });
  const [achToast, setAchToast] = useState(null);

  /* ── boot ── */
  useEffect(() => {
    const profs = loadProfiles();
    const aid = loadActiveId();
    setProfiles(profs);
    if (aid && profs.find(p => p.id === aid)) {
      const p = profs.find(p => p.id === aid);
      setActiveProfile(p);
      setCollection(loadCollection(aid));
      setAchState(loadAchievements(aid));
      setScreen("menu");
    } else {
      setScreen("profiles");
    }
  }, []);

  /* ── caps ── */
  const toggleCaps = () => {
    setAllCaps(prev => {
      const next = !prev;
      try { localStorage.setItem("lipumang_allcaps", String(next)); } catch {}
      return next;
    });
  };
  const t = useCallback(text => (allCaps ? text.toUpperCase() : text), [allCaps]);

  /* ── achievement unlock helper ── */
  const tryUnlockAchievements = useCallback((col, ach) => {
    const newIds = checkAchievements(col, ach);
    if (newIds.length > 0) {
      const updated = { ...ach, unlocked: [...ach.unlocked, ...newIds] };
      setAchState(updated);
      if (activeProfile) saveAchievements(activeProfile.id, updated);
      // Show toast for first new unlock
      const a = ACHIEVEMENTS.find(x => x.id === newIds[0]);
      if (a) {
        setAchToast(a);
        setTimeout(() => setAchToast(null), 3000);
      }
      return updated;
    }
    return ach;
  }, [activeProfile]);

  /* ── profiles ── */
  const createProfile = () => {
    if (!newName.trim()) return;
    const p = { id: Date.now().toString(), name: newName.trim(), avatar: newAvatar };
    const updated = [...profiles, p];
    setProfiles(updated);
    saveProfiles(updated);
    setActiveProfile(p);
    saveActiveId(p.id);
    setCollection([]);
    saveCollection(p.id, []);
    setAchState({ unlocked: [], diffPlayed: [] });
    saveAchievements(p.id, { unlocked: [], diffPlayed: [] });
    setNewName("");
    setNewAvatar(AVATARS[0]);
    setScreen("menu");
  };
  const switchProfile = (p) => {
    setActiveProfile(p);
    saveActiveId(p.id);
    setCollection(loadCollection(p.id));
    setAchState(loadAchievements(p.id));
    setShowProfileSwitcher(false);
    setScreen("menu");
  };
  const goToProfiles = () => { setShowProfileSwitcher(false); setScreen("profiles"); };

  const countries = useMemo(() => countriesForDiff(difficulty), [difficulty]);

  const generateQuestion = useCallback(() => {
    const correct = countries[Math.floor(Math.random() * countries.length)];
    let wp = [];
    if (difficulty === "expert" && correct.similarTo?.length > 0) {
      wp.push(...countriesRaw.filter(c => correct.similarTo.includes(c.iso2)));
    }
    while (wp.length < 2) {
      const pick = pickRandom(countries, 1, [correct.iso2, ...wp.map(w => w.iso2)]);
      if (pick.length > 0) wp.push(pick[0]);
    }
    wp = wp.slice(0, 2);
    return { correct, options: shuffle([correct, ...wp]) };
  }, [countries, difficulty]);

  const startGame = (mode, diff) => {
    setGameMode(mode);
    setDifficulty(diff);
    setScore({ correct: 0, total: 0 });
    setStreak(0);
    setStreakCelebration(null);
    setFeedback(null);
    setSelected(null);
    setScreen("game");
    setQuestion(null);
    // Track difficulty played
    if (activeProfile) {
      setAchState(prev => {
        const dp = prev.diffPlayed.includes(diff) ? prev.diffPlayed : [...prev.diffPlayed, diff];
        const updated = { ...prev, diffPlayed: dp };
        saveAchievements(activeProfile.id, updated);
        return updated;
      });
    }
  };

  useEffect(() => {
    if (screen === "game" && question === null) setQuestion(generateQuestion());
  }, [screen, question, generateQuestion]);

  const handleAnswer = (choice) => {
    if (feedback) return;
    setSelected(choice.iso2);
    const isCorrect = choice.iso2 === question.correct.iso2;
    const newStreak = isCorrect ? streak + 1 : 0;
    setScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));
    setStreak(newStreak);

    let currentCol = collection;
    let currentAch = achState;
    if (isCorrect && activeProfile && !collection.includes(question.correct.iso2)) {
      currentCol = [...collection, question.correct.iso2];
      setCollection(currentCol);
      saveCollection(activeProfile.id, currentCol);
      // Check achievements
      currentAch = tryUnlockAchievements(currentCol, currentAch);
    }

    if (isCorrect && newStreak > 0 && newStreak % 5 === 0) {
      setStreakCelebration({ count: newStreak, msg: rand(SM) });
      setTimeout(() => setStreakCelebration(null), 2200);
    }
    setFeedback({
      isCorrect,
      emoji: isCorrect ? rand(EC) : rand(EW),
      message: isCorrect ? rand(MC) : rand(MW),
      correctAnswer: question.correct,
    });
  };

  const nextQuestion = () => { setFeedback(null); setSelected(null); setQuestion(generateQuestion()); };
  const goMenu = () => { setScreen("menu"); setQuestion(null); setFeedback(null); setSelected(null); setStreakCelebration(null); setSelectedCountry(null); };

  /* ═══════════════════ ACHIEVEMENT TOAST (always rendered) ═══════════════════ */
  const toastEl = achToast ? (
    <div style={S.achToast}>
      <div style={S.achToastInner}>
        <span style={{ fontSize: "2rem" }}>{achToast.icon}</span>
        <div>
          <p style={S.achToastTitle}>{t("Saavutus avatud!")}</p>
          <p style={S.achToastName}>{t(achToast.name)}</p>
        </div>
      </div>
    </div>
  ) : null;

  /* ═══════════════════ LOADING ═══════════════════ */
  if (screen === "loading") return <div style={S.page}><div style={{textAlign:"center",paddingTop:"30vh"}}><span style={{fontSize:"4rem"}}>🏳️</span></div></div>;

  /* ═══════════════════ PROFILES ═══════════════════ */
  if (screen === "profiles") {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.titleBlock}>
            <span style={S.titleEmoji}>🏳️</span>
            <h1 style={S.title}>{t("Lipumäng")}</h1>
            <p style={S.subtitle}>{t("Kes mängib?")}</p>
          </div>
          {profiles.length > 0 && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>{t("Vali mängija")}</h2>
              <div style={S.profileList}>
                {profiles.map(p => (
                  <button key={p.id} style={S.profileBtn} onClick={() => switchProfile(p)}>
                    <span style={{fontSize:"2rem"}}>{p.avatar}</span>
                    <span style={S.profileName}>{t(p.name)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={S.card}>
            <h2 style={S.cardTitle}>{t("Uus mängija")}</h2>
            <div style={S.avatarRow}>
              {AVATARS.map(a => (
                <button key={a} style={{...S.avatarBtn, background: newAvatar===a?"#e3f2fd":"transparent", border: newAvatar===a?"3px solid #42a5f5":"3px solid transparent"}} onClick={() => setNewAvatar(a)}>{a}</button>
              ))}
            </div>
            <input style={S.nameInput} type="text" placeholder={allCaps?"SINU NIMI...":"Sinu nimi..."} value={newName} onChange={e=>setNewName(e.target.value)} maxLength={20} onKeyDown={e=>e.key==="Enter"&&createProfile()} />
            <button style={{...S.primaryBtn,opacity:newName.trim()?1:0.4}} onClick={createProfile}>{t("Alusta!")} 🚀</button>
          </div>
        </div>
        {toastEl}
      </div>
    );
  }

  /* ═══════════════════ COLLECTION ═══════════════════ */
  if (screen === "collection") {
    const total = countriesRaw.length;
    const pct = Math.round((collection.length / total) * 100);
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.topBar}>
            <button style={S.backBtn} onClick={goMenu}>← {t("Menüü")}</button>
            <span style={S.collCount}>{collection.length}/{total}</span>
          </div>
          <div style={{textAlign:"center",margin:"0.5rem 0 1rem"}}>
            <h2 style={{...S.title,fontSize:"1.8rem"}}>{t("Minu kollektsioon")}</h2>
            <div style={S.progressBarOuter}><div style={{...S.progressBarInner,width:`${pct}%`}}/></div>
            <p style={{...S.subtitle,marginTop:"0.4rem"}}>{pct}%</p>
          </div>
          <div style={S.flagGrid}>
            {countriesRaw.map(c => {
              const owned = collection.includes(c.iso2);
              return (
                <button key={c.iso2} style={{...S.flagCell,cursor:owned?"pointer":"default",background:"none",border:"none",padding:0}} onClick={()=>owned&&setSelectedCountry(c)} disabled={!owned}>
                  <img src={getFlagUrl(c)} alt={c.name_et} style={{...S.flagThumb,filter:owned?"none":"grayscale(1) brightness(0.4)",opacity:owned?1:0.35}} />
                  <span style={{...S.flagCellName,color:owned?"#1a237e":"#90a4ae"}}>{t(c.name_et)}</span>
                </button>
              );
            })}
          </div>
          {selectedCountry && (
            <div style={S.modalBackdrop} onClick={()=>setSelectedCountry(null)}>
              <div style={S.modalCard} onClick={e=>e.stopPropagation()}>
                <button style={S.modalClose} onClick={()=>setSelectedCountry(null)}>✕</button>
                <img src={getFlagUrl(selectedCountry)} alt={selectedCountry.name_et} style={S.modalFlag} />
                <h2 style={S.modalTitle}>{t(selectedCountry.name_et)}</h2>
                <div style={S.modalInfoRow}>
                  <span style={S.modalLabel}>🏛️ {t("Pealinn")}</span>
                  <span style={S.modalValue}>{t(selectedCountry.capital||"–")}</span>
                </div>
                <div style={S.modalInfoRow}>
                  <span style={S.modalLabel}>👥 {t("Rahvaarv")}</span>
                  <span style={S.modalValue}>{allCaps?(selectedCountry.population||"–").toUpperCase():(selectedCountry.population||"–")}</span>
                </div>
                {selectedCountry.facts?.length > 0 && (
                  <div style={S.modalFactsBox}>
                    <p style={S.modalFactsTitle}>💡 {t("Huvitavad faktid")}</p>
                    {selectedCountry.facts.map((f,i) => (
                      <div key={i} style={S.modalFact}>
                        <span style={S.modalFactNum}>{i+1}</span>
                        <p style={S.modalFactText}>{t(f)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {toastEl}
      </div>
    );
  }

  /* ═══════════════════ ACHIEVEMENTS SCREEN ═══════════════════ */
  if (screen === "achievements") {
    const cats = [
      { key: "collection", label: t("Kollektsioon"), emoji: "🏅" },
      { key: "performance", label: t("Sooritused"), emoji: "🎯" },
      { key: "quirky", label: t("Põnevad lipud"), emoji: "🎨" },
    ];
    const unlocked = achState.unlocked;
    const totalAch = ACHIEVEMENTS.length;
    const unlockedCount = unlocked.length;

    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.topBar}>
            <button style={S.backBtn} onClick={goMenu}>← {t("Menüü")}</button>
            <span style={S.collCount}>{unlockedCount}/{totalAch}</span>
          </div>
          <div style={{textAlign:"center",margin:"0.5rem 0 0.75rem"}}>
            <h2 style={{...S.title,fontSize:"1.8rem"}}>{t("Saavutused")}</h2>
            <div style={S.progressBarOuter}><div style={{...S.progressBarInner,width:`${Math.round(unlockedCount/totalAch*100)}%`,background:"linear-gradient(90deg, #ffa726, #ff7043)"}}/></div>
          </div>

          {cats.map(cat => {
            const items = ACHIEVEMENTS.filter(a => a.cat === cat.key);
            return (
              <div key={cat.key} style={S.card}>
                <h2 style={S.cardTitle}>{cat.emoji} {cat.label}</h2>
                <div style={S.achGrid}>
                  {items.map(a => {
                    const isUnlocked = unlocked.includes(a.id);
                    const prog = getProgress(a, collection, achState);
                    const showBar = !isUnlocked && (a.type === "set" || a.type === "threshold" || a.type === "custom" || a.type === "alldiff") && prog.total > 1;
                    return (
                      <div key={a.id} style={{...S.achTile, background: isUnlocked ? "linear-gradient(135deg, #e8f5e9, #c8e6c9)" : "rgba(255,255,255,0.6)", borderColor: isUnlocked ? "#66bb6a" : "#e0e0e0"}}>
                        <span style={{...S.achIcon, filter: isUnlocked ? "none" : "grayscale(1)", opacity: isUnlocked ? 1 : 0.4}}>{a.icon}</span>
                        <div style={S.achInfo}>
                          <p style={{...S.achName, color: isUnlocked ? "#2e7d32" : "#78909c"}}>{isUnlocked ? t(a.name) : t(a.hint)}</p>
                          {isUnlocked && <p style={S.achDesc}>{t(a.desc)}</p>}
                          {showBar && (
                            <div style={S.achBarOuter}>
                              <div style={{...S.achBarInner, width: `${prog.pct}%`}} />
                              <span style={S.achBarText}>{prog.current}/{prog.total}</span>
                            </div>
                          )}
                        </div>
                        {isUnlocked && <span style={S.achCheck}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {toastEl}
      </div>
    );
  }

  /* ═══════════════════ MENU ═══════════════════ */
  if (screen === "menu") {
    const unlockedCount = achState.unlocked.length;
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.titleBlock}>
            <button style={S.gearBtn} onClick={() => setSettingsOpen(p => !p)} aria-label="Settings">⚙️</button>
            <span style={S.titleEmoji}>🏳️</span>
            <h1 style={S.title}>{t("Lipumäng")}</h1>
            {activeProfile && (
              <button style={S.profileChip} onClick={() => setShowProfileSwitcher(p => !p)}>
                <span>{activeProfile.avatar}</span>
                <span style={{fontWeight:700}}>{t(activeProfile.name)}</span>
                <span style={{fontSize:"0.7rem",color:"#90a4ae"}}>▼</span>
              </button>
            )}
          </div>

          {showProfileSwitcher && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>{t("Vaheta mängijat")}</h2>
              <div style={S.profileList}>
                {profiles.map(p => (
                  <button key={p.id} style={{...S.profileBtn,background:p.id===activeProfile?.id?"#e8f5e9":"rgba(255,255,255,0.7)",borderColor:p.id===activeProfile?.id?"#43a047":"transparent"}} onClick={() => switchProfile(p)}>
                    <span style={{fontSize:"1.6rem"}}>{p.avatar}</span>
                    <span style={S.profileName}>{t(p.name)}</span>
                  </button>
                ))}
              </div>
              <button style={S.linkBtn} onClick={goToProfiles}>+ {t("Lisa uus mängija")}</button>
            </div>
          )}

          {settingsOpen && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>{t("Seaded")}</h2>
              <div style={S.toggleRow}>
                <span style={S.toggleLabel}><span style={{fontSize:"1.3rem"}}>🔠</span><span>{allCaps ? "SUURED TÄHED" : "Tavalised tähed"}</span></span>
                <button style={{...S.toggleTrack, background: allCaps ? "#5c6bc0" : "#b0bec5"}} onClick={toggleCaps}>
                  <span style={{...S.toggleThumb, transform: allCaps ? "translateX(28px)" : "translateX(2px)"}} />
                </button>
              </div>
            </div>
          )}

          {/* Game mode */}
          <div style={S.card}>
            <h2 style={S.cardTitle}>{t("Mängurežiim")}</h2>
            <button style={{...S.menuBtn,borderColor:"#42a5f5",...(gameMode==="flag-to-name"?S.menuBtnActive:{})}} onClick={()=>setGameMode("flag-to-name")}>
              <span style={S.menuBtnEmoji}>🏴</span>
              <span style={S.menuBtnText}><strong>{t("Lipp → Nimi")}</strong><br/><span style={S.menuBtnSub}>{t("Näen lippu, valin nime")}</span></span>
            </button>
            <button style={{...S.menuBtn,borderColor:"#66bb6a",...(gameMode==="name-to-flag"?S.menuBtnActive:{})}} onClick={()=>setGameMode("name-to-flag")}>
              <span style={S.menuBtnEmoji}>🔤</span>
              <span style={S.menuBtnText}><strong>{t("Nimi → Lipp")}</strong><br/><span style={S.menuBtnSub}>{t("Näen nime, valin lipu")}</span></span>
            </button>
          </div>

          {/* Difficulty */}
          <div style={S.card}>
            <h2 style={S.cardTitle}>{t("Raskusaste")}</h2>
            <div style={S.diffGrid}>
              {[
                {key:"easy",label:t("Kerge"),emoji:"🌱",sub:"50",color:"#43a047"},
                {key:"medium",label:t("Keskmine"),emoji:"🌿",sub:"80",color:"#f9a825"},
                {key:"hard",label:t("Raske"),emoji:"🌶️",sub:"130",color:"#e53935"},
                {key:"expert",label:t("Ekspert"),emoji:"💀",sub:"202",color:"#6a1b9a"},
              ].map(d=>(
                <button key={d.key} style={{...S.diffBtn,borderColor:d.color,color:difficulty===d.key?"#fff":d.color,background:difficulty===d.key?d.color:"rgba(255,255,255,0.9)",transform:difficulty===d.key?"scale(1.06)":"scale(1)"}} onClick={()=>setDifficulty(d.key)}>
                  <span style={{fontSize:"1.3rem"}}>{d.emoji}</span>
                  <span style={{fontWeight:800,fontSize:"0.85rem"}}>{d.label}</span>
                  <span style={{fontSize:"0.7rem",opacity:0.7}}>{d.sub} 🏳️</span>
                </button>
              ))}
            </div>
          </div>

          {/* Collection + Achievements */}
          <button style={S.collectionBtn} onClick={() => setScreen("collection")}>
            <span>🏅</span><span>{t("Minu kollektsioon")}</span>
            <span style={S.collBadge}>{collection.length}/{countriesRaw.length}</span>
          </button>
          <button style={{...S.collectionBtn,borderColor:"#ff7043",color:"#bf360c"}} onClick={() => setScreen("achievements")}>
            <span>🏆</span><span>{t("Saavutused")}</span>
            <span style={{...S.collBadge,background:"#fbe9e7"}}>{unlockedCount}/{ACHIEVEMENTS.length}</span>
          </button>

          <button style={{...S.primaryBtn,opacity:gameMode?1:0.4,pointerEvents:gameMode?"auto":"none"}} onClick={()=>gameMode&&startGame(gameMode,difficulty)}>
            {t("Alusta mängu!")} 🚀
          </button>
        </div>
        {toastEl}
      </div>
    );
  }

  /* ═══════════════════ GAME ═══════════════════ */
  if (!question) return null;
  const isFTN = gameMode === "flag-to-name";

  return (
    <div style={S.page}>
      <div style={S.gameContainer}>
        <div style={S.topBar}>
          <button style={S.backBtn} onClick={goMenu}>← {t("Menüü")}</button>
          <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
            {streak >= 2 && <span style={S.streakBadge}>🔥 {streak}</span>}
            <div style={S.scoreBox}>
              <span style={S.scoreNum}>{score.correct}</span>
              <span style={S.scoreSep}>/</span>
              <span style={S.scoreTotal}>{score.total}</span>
            </div>
          </div>
        </div>

        <div style={S.promptArea}>
          {isFTN ? (
            <div style={S.flagShowcase}>
              <img src={getFlagUrl(question.correct)} alt="flag" style={S.flagBig} />
              <p style={S.promptLabel}>{t("Mis riigi lipp see on?")}</p>
            </div>
          ) : (
            <div style={S.nameShowcase}>
              <p style={S.namePrompt}>{t(question.correct.name_et)}</p>
              <p style={S.promptLabel}>{t("Vali õige lipp!")}</p>
            </div>
          )}
        </div>

        <div style={isFTN ? S.optionsTextRow : S.optionsFlagRow}>
          {question.options.map(opt => {
            const isSel = selected === opt.iso2;
            const isCorr = opt.iso2 === question.correct.iso2;
            let os = {};
            if (feedback) { if (isCorr) os=S.optCorrect; else if (isSel&&!feedback.isCorrect) os=S.optWrong; else os=S.optDimmed; }
            if (isFTN) return <button key={opt.iso2} style={{...S.optionTextBtn,...os}} onClick={()=>handleAnswer(opt)}>{t(opt.name_et)}</button>;
            return <button key={opt.iso2} style={{...S.optionFlagBtn,...os}} onClick={()=>handleAnswer(opt)}><img src={getFlagUrl(opt)} alt="flag" style={S.flagOption}/></button>;
          })}
        </div>

        {feedback && (
          <div style={{...S.feedbackOverlay,background:feedback.isCorrect?"rgba(67,160,71,0.95)":"rgba(229,57,53,0.88)"}}>
            <span style={S.feedbackEmoji}>{feedback.emoji}</span>
            <p style={S.feedbackMsg}>{t(feedback.message)}</p>
            {!feedback.isCorrect && <p style={S.feedbackCorrectText}>{t("Õige vastus")}: {t(feedback.correctAnswer.name_et)}</p>}
            <button style={S.nextBtn} onClick={nextQuestion}>{t("Järgmine")} →</button>
          </div>
        )}

        {streakCelebration && (
          <div style={S.streakOverlay}>
            <div style={S.streakCard}>
              <span style={{fontSize:"3.5rem"}}>🔥</span>
              <p style={S.streakCount}>{streakCelebration.count}x {t("järjest õiged")}!</p>
              <p style={S.streakMsg}>{t(streakCelebration.msg)}</p>
            </div>
          </div>
        )}
      </div>
      {toastEl}
    </div>
  );
}

/* ═══════════════════ STYLES ═══════════════════ */
const S = {
  page: {minHeight:"100vh",background:"linear-gradient(150deg, #e3f2fd 0%, #fff9c4 50%, #f3e5f5 100%)",display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"1rem",fontFamily:"'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",boxSizing:"border-box"},
  container: {maxWidth:480,width:"100%",display:"flex",flexDirection:"column",gap:"1rem",paddingTop:"1rem",paddingBottom:"2rem"},
  titleBlock: {textAlign:"center",marginBottom:"0.25rem",position:"relative"},
  titleEmoji: {fontSize:"3rem",display:"block",marginBottom:"0.25rem"},
  title: {fontSize:"2.5rem",fontWeight:900,color:"#1a237e",margin:0,letterSpacing:"-0.02em",lineHeight:1.1},
  subtitle: {fontSize:"1.1rem",color:"#5c6bc0",margin:"0.5rem 0 0",fontWeight:600},
  gearBtn: {position:"absolute",top:0,right:0,background:"rgba(255,255,255,0.7)",border:"2px solid #b0bec5",borderRadius:12,width:44,height:44,fontSize:"1.4rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0},
  profileChip: {display:"inline-flex",alignItems:"center",gap:"0.4rem",marginTop:"0.6rem",padding:"0.4rem 0.9rem",background:"rgba(255,255,255,0.85)",border:"2px solid #b0bec5",borderRadius:20,cursor:"pointer",fontSize:"1rem"},
  card: {background:"rgba(255,255,255,0.85)",borderRadius:20,padding:"1.1rem",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",gap:"0.7rem"},
  cardTitle: {fontSize:"0.95rem",fontWeight:800,color:"#37474f",margin:0,textTransform:"uppercase",letterSpacing:"0.08em"},
  profileList: {display:"flex",flexDirection:"column",gap:"0.5rem"},
  profileBtn: {display:"flex",alignItems:"center",gap:"0.7rem",padding:"0.8rem 1rem",background:"rgba(255,255,255,0.7)",border:"3px solid transparent",borderRadius:14,cursor:"pointer",fontSize:"1rem"},
  profileName: {fontWeight:700,fontSize:"1.1rem",color:"#263238"},
  avatarRow: {display:"flex",gap:"0.4rem",justifyContent:"center",flexWrap:"wrap"},
  avatarBtn: {fontSize:"2rem",width:52,height:52,borderRadius:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0},
  nameInput: {padding:"0.9rem 1rem",fontSize:"1.2rem",fontWeight:700,border:"3px solid #b0bec5",borderRadius:14,outline:"none",textAlign:"center",fontFamily:"inherit"},
  primaryBtn: {padding:"1.1rem",fontSize:"1.35rem",fontWeight:800,color:"#fff",background:"linear-gradient(135deg, #5c6bc0, #7c4dff)",border:"none",borderRadius:18,cursor:"pointer",boxShadow:"0 4px 20px rgba(124,77,255,0.35)"},
  linkBtn: {background:"none",border:"none",color:"#5c6bc0",fontWeight:700,fontSize:"1rem",cursor:"pointer",padding:"0.4rem"},
  menuBtn: {display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.9rem 1rem",border:"3px solid transparent",borderRadius:16,cursor:"pointer",textAlign:"left",fontSize:"1rem",transition:"all 0.15s",background:"rgba(255,255,255,0.7)"},
  menuBtnActive: {transform:"scale(1.02)",boxShadow:"0 4px 16px rgba(0,0,0,0.12)",background:"rgba(255,255,255,1)"},
  menuBtnEmoji: {fontSize:"1.6rem"},
  menuBtnText: {lineHeight:1.35},
  menuBtnSub: {fontSize:"0.82rem",color:"#78909c"},
  diffGrid: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"},
  diffBtn: {display:"flex",flexDirection:"column",alignItems:"center",gap:"0.2rem",padding:"0.65rem 0.4rem",borderRadius:14,border:"3px solid",cursor:"pointer",transition:"all 0.15s"},
  toggleRow: {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.4rem 0.2rem"},
  toggleLabel: {display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"1rem",fontWeight:700,color:"#37474f"},
  toggleTrack: {position:"relative",width:56,height:30,borderRadius:15,border:"none",cursor:"pointer",padding:0,transition:"background 0.2s",flexShrink:0},
  toggleThumb: {display:"block",width:26,height:26,borderRadius:13,background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"transform 0.2s",position:"absolute",top:2},
  collectionBtn: {display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.9rem 1.1rem",background:"rgba(255,255,255,0.85)",border:"3px solid #ffb74d",borderRadius:16,cursor:"pointer",fontSize:"1.05rem",fontWeight:700,color:"#e65100"},
  collBadge: {marginLeft:"auto",background:"#fff3e0",padding:"0.2rem 0.6rem",borderRadius:10,fontSize:"0.85rem",fontWeight:800},
  collCount: {fontSize:"1.2rem",fontWeight:800,color:"#e65100",background:"rgba(255,255,255,0.9)",padding:"0.4rem 0.9rem",borderRadius:12},
  progressBarOuter: {width:"100%",height:12,background:"rgba(0,0,0,0.08)",borderRadius:6,overflow:"hidden",marginTop:"0.5rem"},
  progressBarInner: {height:"100%",background:"linear-gradient(90deg, #66bb6a, #43a047)",borderRadius:6,transition:"width 0.4s"},
  flagGrid: {display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(90px, 1fr))",gap:"0.5rem"},
  flagCell: {display:"flex",flexDirection:"column",alignItems:"center",gap:"0.2rem"},
  flagThumb: {width:"100%",aspectRatio:"3/2",objectFit:"cover",borderRadius:8,border:"2px solid #e0e0e0",transition:"filter 0.3s"},
  flagCellName: {fontSize:"0.6rem",fontWeight:700,textAlign:"center",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%"},
  gameContainer: {maxWidth:520,width:"100%",display:"flex",flexDirection:"column",gap:"1rem",paddingTop:"0.75rem",paddingBottom:"2rem",position:"relative"},
  topBar: {display:"flex",justifyContent:"space-between",alignItems:"center"},
  backBtn: {background:"rgba(255,255,255,0.85)",border:"2px solid #b0bec5",borderRadius:12,padding:"0.5rem 0.9rem",fontSize:"0.95rem",fontWeight:700,color:"#546e7a",cursor:"pointer"},
  scoreBox: {background:"rgba(255,255,255,0.9)",borderRadius:14,padding:"0.4rem 1rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:"flex",alignItems:"baseline",gap:"0.15rem"},
  scoreNum: {fontSize:"1.5rem",fontWeight:900,color:"#43a047"},
  scoreSep: {fontSize:"1.1rem",color:"#90a4ae",fontWeight:700},
  scoreTotal: {fontSize:"1.1rem",fontWeight:700,color:"#78909c"},
  streakBadge: {background:"linear-gradient(135deg, #ff6f00, #ff3d00)",color:"#fff",fontWeight:900,fontSize:"1rem",padding:"0.35rem 0.7rem",borderRadius:12,boxShadow:"0 2px 10px rgba(255,61,0,0.3)"},
  streakOverlay: {position:"fixed",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.4)",zIndex:200,animation:"fadeInOut 2.2s ease-in-out",pointerEvents:"none"},
  streakCard: {background:"linear-gradient(135deg, #ff6f00, #ff3d00)",borderRadius:28,padding:"2rem 2.5rem",textAlign:"center",boxShadow:"0 8px 40px rgba(255,61,0,0.4)",animation:"popIn 0.3s ease-out"},
  streakCount: {fontSize:"2rem",fontWeight:900,color:"#fff",margin:"0.3rem 0 0.1rem"},
  streakMsg: {fontSize:"1.2rem",fontWeight:700,color:"rgba(255,255,255,0.9)",margin:0},
  promptArea: {display:"flex",justifyContent:"center",minHeight:200},
  flagShowcase: {display:"flex",flexDirection:"column",alignItems:"center",gap:"0.75rem"},
  flagBig: {width:"min(85vw, 300px)",height:"auto",borderRadius:14,boxShadow:"0 6px 28px rgba(0,0,0,0.15)",border:"4px solid #fff",objectFit:"contain"},
  promptLabel: {fontSize:"1.25rem",fontWeight:800,color:"#37474f",margin:0,textAlign:"center"},
  nameShowcase: {display:"flex",flexDirection:"column",alignItems:"center",gap:"0.5rem",padding:"1.5rem"},
  namePrompt: {fontSize:"2.2rem",fontWeight:900,color:"#1a237e",margin:0,textAlign:"center",lineHeight:1.2},
  optionsTextRow: {display:"flex",flexDirection:"column",gap:"0.6rem"},
  optionsFlagRow: {display:"flex",gap:"0.6rem",justifyContent:"center",flexWrap:"wrap"},
  optionTextBtn: {padding:"1rem 1.2rem",fontSize:"1.3rem",fontWeight:800,background:"rgba(255,255,255,0.92)",border:"3px solid #b0bec5",borderRadius:16,cursor:"pointer",transition:"all 0.12s",color:"#263238",textAlign:"center"},
  optionFlagBtn: {flex:"1 1 140px",maxWidth:170,background:"rgba(255,255,255,0.92)",border:"4px solid #b0bec5",borderRadius:16,cursor:"pointer",transition:"all 0.12s",padding:"0.5rem",display:"flex",alignItems:"center",justifyContent:"center"},
  flagOption: {width:"100%",height:"auto",borderRadius:8,objectFit:"contain"},
  optCorrect: {borderColor:"#43a047",background:"rgba(67,160,71,0.15)",boxShadow:"0 0 0 3px rgba(67,160,71,0.3)"},
  optWrong: {borderColor:"#e53935",background:"rgba(229,57,53,0.12)",boxShadow:"0 0 0 3px rgba(229,57,53,0.25)"},
  optDimmed: {opacity:0.45},
  feedbackOverlay: {position:"fixed",bottom:0,left:0,right:0,padding:"1.5rem 1rem 2rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"0.4rem",borderRadius:"24px 24px 0 0",zIndex:100,boxShadow:"0 -4px 32px rgba(0,0,0,0.2)"},
  feedbackEmoji: {fontSize:"3rem"},
  feedbackMsg: {fontSize:"1.4rem",fontWeight:900,color:"#fff",margin:0,textAlign:"center"},
  feedbackCorrectText: {fontSize:"1.05rem",fontWeight:700,color:"rgba(255,255,255,0.9)",margin:0},
  nextBtn: {marginTop:"0.4rem",padding:"0.8rem 2.2rem",fontSize:"1.15rem",fontWeight:800,color:"#333",background:"rgba(255,255,255,0.95)",border:"none",borderRadius:14,cursor:"pointer",boxShadow:"0 2px 12px rgba(0,0,0,0.15)"},

  /* Modal */
  modalBackdrop: {position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:"1rem",overflowY:"auto"},
  modalCard: {background:"#fff",borderRadius:24,padding:"1.5rem 1.3rem 1.8rem",maxWidth:400,width:"100%",maxHeight:"90vh",overflowY:"auto",display:"flex",flexDirection:"column",alignItems:"center",gap:"0.8rem",position:"relative",boxShadow:"0 12px 48px rgba(0,0,0,0.25)",animation:"popIn 0.25s ease-out"},
  modalClose: {position:"absolute",top:12,right:12,width:36,height:36,borderRadius:18,border:"none",background:"rgba(0,0,0,0.06)",fontSize:"1.1rem",fontWeight:700,color:"#546e7a",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0},
  modalFlag: {width:"min(70vw, 240px)",height:"auto",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",border:"3px solid #e0e0e0",objectFit:"contain"},
  modalTitle: {fontSize:"1.6rem",fontWeight:900,color:"#1a237e",margin:0,textAlign:"center",lineHeight:1.2},
  modalInfoRow: {width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.55rem 0.8rem",background:"#f5f5f5",borderRadius:12,gap:"0.5rem"},
  modalLabel: {fontSize:"0.95rem",fontWeight:800,color:"#546e7a",whiteSpace:"nowrap"},
  modalValue: {fontSize:"1rem",fontWeight:700,color:"#263238",textAlign:"right"},
  modalFactsBox: {width:"100%",background:"linear-gradient(135deg, #e8f5e9, #f1f8e9)",borderRadius:16,padding:"0.9rem",display:"flex",flexDirection:"column",gap:"0.6rem"},
  modalFactsTitle: {fontSize:"1rem",fontWeight:800,color:"#2e7d32",margin:0},
  modalFact: {display:"flex",gap:"0.6rem",alignItems:"flex-start"},
  modalFactNum: {flexShrink:0,width:26,height:26,borderRadius:13,background:"#43a047",color:"#fff",fontWeight:800,fontSize:"0.85rem",display:"flex",alignItems:"center",justifyContent:"center"},
  modalFactText: {fontSize:"0.95rem",fontWeight:600,color:"#33691e",margin:0,lineHeight:1.4},

  /* Achievement tiles */
  achGrid: {display:"flex",flexDirection:"column",gap:"0.5rem"},
  achTile: {display:"flex",alignItems:"center",gap:"0.7rem",padding:"0.75rem 0.8rem",borderRadius:14,border:"2px solid",transition:"all 0.2s"},
  achIcon: {fontSize:"1.8rem",flexShrink:0,transition:"filter 0.3s"},
  achInfo: {flex:1,minWidth:0},
  achName: {fontSize:"0.95rem",fontWeight:800,margin:0,lineHeight:1.3},
  achDesc: {fontSize:"0.78rem",fontWeight:600,color:"#558b2f",margin:"0.1rem 0 0",lineHeight:1.3},
  achCheck: {fontSize:"1.2rem",fontWeight:900,color:"#43a047",flexShrink:0},
  achBarOuter: {position:"relative",width:"100%",height:10,background:"rgba(0,0,0,0.08)",borderRadius:5,overflow:"hidden",marginTop:"0.3rem"},
  achBarInner: {height:"100%",background:"linear-gradient(90deg, #66bb6a, #43a047)",borderRadius:5,transition:"width 0.4s"},
  achBarText: {position:"absolute",right:4,top:-1,fontSize:"0.55rem",fontWeight:800,color:"#546e7a"},

  /* Achievement toast */
  achToast: {position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:400,animation:"popIn 0.3s ease-out"},
  achToastInner: {display:"flex",alignItems:"center",gap:"0.6rem",background:"linear-gradient(135deg, #43a047, #2e7d32)",padding:"0.7rem 1.2rem",borderRadius:16,boxShadow:"0 4px 24px rgba(46,125,50,0.4)"},
  achToastTitle: {fontSize:"0.75rem",fontWeight:700,color:"rgba(255,255,255,0.8)",margin:0},
  achToastName: {fontSize:"1rem",fontWeight:900,color:"#fff",margin:0},
};
