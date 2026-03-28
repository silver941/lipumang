import { useState, useCallback, useEffect, useMemo } from "react";
import countriesRaw from "./countryData.json";

/* ─────────────────── HELPERS ─────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n, exclude = []) {
  return shuffle(arr.filter((c) => !exclude.includes(c.iso2))).slice(0, n);
}

function flagUrl(iso2) {
  return `https://flagcdn.com/w320/${iso2}.png`;
}

const AVATARS = ["🦊", "🐸", "🦁", "🐼", "🦄", "🐙"];

const EMOJIS_CORRECT = ["🎉", "⭐", "🥳", "🏆", "💪", "🌟", "👏", "🎊"];
const EMOJIS_WRONG = ["🤔", "💭", "🧐"];
const MSGS_CORRECT = ["Tubli!", "Väga hea!", "Suurepärane!", "Õige!", "Super!", "Hästi tehtud!"];
const MSGS_WRONG = ["Proovi uuesti!", "Peaaegu!", "Järgmine kord!", "Ära muretse!"];
const STREAK_MSGS = ["Võimas!", "Unstoppable!", "Tulekahju!", "Vägev!", "Vapustav!"];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ─────────────────── STORAGE ─────────────────── */
function loadJson(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function saveJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function loadProfiles() {
  return loadJson("lipumang_profiles", []);
}
function saveProfiles(p) {
  saveJson("lipumang_profiles", p);
}
function loadActiveId() {
  return loadJson("lipumang_active", null);
}
function saveActiveId(id) {
  saveJson("lipumang_active", id);
}
function loadCollection(profileId) {
  return loadJson(`lipumang_col_${profileId}`, []);
}
function saveCollection(profileId, col) {
  saveJson(`lipumang_col_${profileId}`, col);
}
function loadCaps() {
  try {
    const v = localStorage.getItem("lipumang_allcaps");
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

const DIFF_LEVELS = ["easy", "medium", "hard", "expert"];
function countriesForDifficulty(diff) {
  const idx = DIFF_LEVELS.indexOf(diff);
  return countriesRaw.filter((c) => DIFF_LEVELS.indexOf(c.difficulty) <= idx);
}

/* ═══════════════════ MAIN APP ═══════════════════ */
export default function App() {
  /* ── state ── */
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

  /* ── boot ── */
  useEffect(() => {
    const profs = loadProfiles();
    const aid = loadActiveId();
    setProfiles(profs);
    if (aid && profs.find((p) => p.id === aid)) {
      setActiveProfile(profs.find((p) => p.id === aid));
      setCollection(loadCollection(aid));
      setScreen("menu");
    } else {
      setScreen("profiles");
    }
  }, []);

  /* ── caps ── */
  const toggleCaps = () => {
    setAllCaps((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("lipumang_allcaps", String(next));
      } catch {}
      return next;
    });
  };
  const t = useCallback((text) => (allCaps ? text.toUpperCase() : text), [allCaps]);

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
    setNewName("");
    setNewAvatar(AVATARS[0]);
    setScreen("menu");
  };

  const switchProfile = (p) => {
    setActiveProfile(p);
    saveActiveId(p.id);
    setCollection(loadCollection(p.id));
    setShowProfileSwitcher(false);
    setScreen("menu");
  };

  const goToProfiles = () => {
    setShowProfileSwitcher(false);
    setScreen("profiles");
  };

  /* ── countries for current difficulty ── */
  const countries = useMemo(() => countriesForDifficulty(difficulty), [difficulty]);

  /* ── question generator ── */
  const generateQuestion = useCallback(() => {
    const correct = countries[Math.floor(Math.random() * countries.length)];
    let wrongPool = [];

    // Expert mode: prefer similarTo flags as wrong answers
    if (difficulty === "expert" && correct.similarTo && correct.similarTo.length > 0) {
      const similars = countriesRaw.filter((c) => correct.similarTo.includes(c.iso2));
      wrongPool.push(...similars);
    }

    while (wrongPool.length < 2) {
      const pick = pickRandom(countries, 1, [correct.iso2, ...wrongPool.map((w) => w.iso2)]);
      if (pick.length > 0) wrongPool.push(pick[0]);
    }
    wrongPool = wrongPool.slice(0, 2);
    return { correct, options: shuffle([correct, ...wrongPool]) };
  }, [countries, difficulty]);

  /* ── game flow ── */
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
  };

  useEffect(() => {
    if (screen === "game" && question === null) {
      setQuestion(generateQuestion());
    }
  }, [screen, question, generateQuestion]);

  const handleAnswer = (choice) => {
    if (feedback) return;
    setSelected(choice.iso2);
    const isCorrect = choice.iso2 === question.correct.iso2;
    const newStreak = isCorrect ? streak + 1 : 0;

    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
    setStreak(newStreak);

    // Add to collection
    if (isCorrect && activeProfile && !collection.includes(question.correct.iso2)) {
      const updated = [...collection, question.correct.iso2];
      setCollection(updated);
      saveCollection(activeProfile.id, updated);
    }

    // Streak celebration
    if (isCorrect && newStreak > 0 && newStreak % 5 === 0) {
      setStreakCelebration({ count: newStreak, msg: rand(STREAK_MSGS) });
      setTimeout(() => setStreakCelebration(null), 2200);
    }

    setFeedback({
      isCorrect,
      emoji: isCorrect ? rand(EMOJIS_CORRECT) : rand(EMOJIS_WRONG),
      message: isCorrect ? rand(MSGS_CORRECT) : rand(MSGS_WRONG),
      correctAnswer: question.correct,
    });
  };

  const nextQuestion = () => {
    setFeedback(null);
    setSelected(null);
    setQuestion(generateQuestion());
  };

  const goMenu = () => {
    setScreen("menu");
    setQuestion(null);
    setFeedback(null);
    setSelected(null);
    setStreakCelebration(null);
  };

  /* ═══════════════════ LOADING ═══════════════════ */
  if (screen === "loading") {
    return (
      <div style={S.page}>
        <div style={{ textAlign: "center", paddingTop: "30vh" }}>
          <span style={{ fontSize: "4rem" }}>🏳️</span>
        </div>
      </div>
    );
  }

  /* ═══════════════════ PROFILES SCREEN ═══════════════════ */
  if (screen === "profiles") {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.titleBlock}>
            <span style={S.titleEmoji}>🏳️</span>
            <h1 style={S.title}>{t("Lipumäng")}</h1>
            <p style={S.subtitle}>{t("Kes mängib?")}</p>
          </div>

          {/* Existing profiles */}
          {profiles.length > 0 && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>{t("Vali mängija")}</h2>
              <div style={S.profileList}>
                {profiles.map((p) => (
                  <button key={p.id} style={S.profileBtn} onClick={() => switchProfile(p)}>
                    <span style={{ fontSize: "2rem" }}>{p.avatar}</span>
                    <span style={S.profileName}>{t(p.name)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* New profile */}
          <div style={S.card}>
            <h2 style={S.cardTitle}>{t("Uus mängija")}</h2>
            <div style={S.avatarRow}>
              {AVATARS.map((a) => (
                <button
                  key={a}
                  style={{
                    ...S.avatarBtn,
                    background: newAvatar === a ? "#e3f2fd" : "transparent",
                    border: newAvatar === a ? "3px solid #42a5f5" : "3px solid transparent",
                  }}
                  onClick={() => setNewAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            <input
              style={S.nameInput}
              type="text"
              placeholder={allCaps ? "SINU NIMI..." : "Sinu nimi..."}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={20}
              onKeyDown={(e) => e.key === "Enter" && createProfile()}
            />
            <button
              style={{ ...S.primaryBtn, opacity: newName.trim() ? 1 : 0.4 }}
              onClick={createProfile}
            >
              {t("Alusta!")} 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════ COLLECTION SCREEN ═══════════════════ */
  if (screen === "collection") {
    const total = countriesRaw.length;
    const pct = Math.round((collection.length / total) * 100);
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.topBar}>
            <button style={S.backBtn} onClick={goMenu}>
              ← {t("Menüü")}
            </button>
            <span style={S.collCount}>
              {collection.length}/{total}
            </span>
          </div>

          <div style={{ textAlign: "center", margin: "0.5rem 0 1rem" }}>
            <h2 style={{ ...S.title, fontSize: "1.8rem" }}>{t("Minu kollektsioon")}</h2>
            <div style={S.progressBarOuter}>
              <div style={{ ...S.progressBarInner, width: `${pct}%` }} />
            </div>
            <p style={{ ...S.subtitle, marginTop: "0.4rem" }}>{pct}%</p>
          </div>

          <div style={S.flagGrid}>
            {countriesRaw.map((c) => {
              const owned = collection.includes(c.iso2);
              return (
                <div key={c.iso2} style={S.flagCell}>
                  <img
                    src={flagUrl(c.iso2)}
                    alt={c.name_et}
                    style={{
                      ...S.flagThumb,
                      filter: owned ? "none" : "grayscale(1) brightness(0.4)",
                      opacity: owned ? 1 : 0.35,
                    }}
                  />
                  <span
                    style={{
                      ...S.flagCellName,
                      color: owned ? "#1a237e" : "#90a4ae",
                    }}
                  >
                    {t(c.name_et)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════ MENU SCREEN ═══════════════════ */
  if (screen === "menu") {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.titleBlock}>
            <button style={S.gearBtn} onClick={() => setSettingsOpen((p) => !p)} aria-label="Settings">
              ⚙️
            </button>
            <span style={S.titleEmoji}>🏳️</span>
            <h1 style={S.title}>{t("Lipumäng")}</h1>
            {activeProfile && (
              <button style={S.profileChip} onClick={() => setShowProfileSwitcher((p) => !p)}>
                <span>{activeProfile.avatar}</span>
                <span style={{ fontWeight: 700 }}>{t(activeProfile.name)}</span>
                <span style={{ fontSize: "0.7rem", color: "#90a4ae" }}>▼</span>
              </button>
            )}
          </div>

          {/* Profile switcher dropdown */}
          {showProfileSwitcher && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>{t("Vaheta mängijat")}</h2>
              <div style={S.profileList}>
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    style={{
                      ...S.profileBtn,
                      background: p.id === activeProfile?.id ? "#e8f5e9" : "rgba(255,255,255,0.7)",
                      borderColor: p.id === activeProfile?.id ? "#43a047" : "transparent",
                    }}
                    onClick={() => switchProfile(p)}
                  >
                    <span style={{ fontSize: "1.6rem" }}>{p.avatar}</span>
                    <span style={S.profileName}>{t(p.name)}</span>
                  </button>
                ))}
              </div>
              <button style={S.linkBtn} onClick={goToProfiles}>
                + {t("Lisa uus mängija")}
              </button>
            </div>
          )}

          {/* Settings */}
          {settingsOpen && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>{t("Seaded")}</h2>
              <div style={S.toggleRow}>
                <span style={S.toggleLabel}>
                  <span style={{ fontSize: "1.3rem" }}>🔠</span>
                  <span>{allCaps ? "SUURTÄHED" : "Tavalised tähed"}</span>
                </span>
                <button
                  style={{ ...S.toggleTrack, background: allCaps ? "#5c6bc0" : "#b0bec5" }}
                  onClick={toggleCaps}
                >
                  <span
                    style={{
                      ...S.toggleThumb,
                      transform: allCaps ? "translateX(28px)" : "translateX(2px)",
                    }}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Game mode */}
          <div style={S.card}>
            <h2 style={S.cardTitle}>{t("Mängurežiim")}</h2>
            <button
              style={{
                ...S.menuBtn,
                borderColor: "#42a5f5",
                ...(gameMode === "flag-to-name" ? S.menuBtnActive : {}),
              }}
              onClick={() => setGameMode("flag-to-name")}
            >
              <span style={S.menuBtnEmoji}>🏴</span>
              <span style={S.menuBtnText}>
                <strong>{t("Lipp → Nimi")}</strong>
                <br />
                <span style={S.menuBtnSub}>{t("Näen lippu, valin nime")}</span>
              </span>
            </button>
            <button
              style={{
                ...S.menuBtn,
                borderColor: "#66bb6a",
                ...(gameMode === "name-to-flag" ? S.menuBtnActive : {}),
              }}
              onClick={() => setGameMode("name-to-flag")}
            >
              <span style={S.menuBtnEmoji}>🔤</span>
              <span style={S.menuBtnText}>
                <strong>{t("Nimi → Lipp")}</strong>
                <br />
                <span style={S.menuBtnSub}>{t("Näen nime, valin lipu")}</span>
              </span>
            </button>
          </div>

          {/* Difficulty */}
          <div style={S.card}>
            <h2 style={S.cardTitle}>{t("Raskusaste")}</h2>
            <div style={S.diffGrid}>
              {[
                { key: "easy", label: t("Kerge"), emoji: "🌱", sub: "50", color: "#43a047" },
                { key: "medium", label: t("Keskmine"), emoji: "🌿", sub: "80", color: "#f9a825" },
                { key: "hard", label: t("Raske"), emoji: "🌶️", sub: "130", color: "#e53935" },
                { key: "expert", label: t("Ekspert"), emoji: "💀", sub: "195", color: "#6a1b9a" },
              ].map((d) => (
                <button
                  key={d.key}
                  style={{
                    ...S.diffBtn,
                    borderColor: d.color,
                    color: difficulty === d.key ? "#fff" : d.color,
                    background: difficulty === d.key ? d.color : "rgba(255,255,255,0.9)",
                    transform: difficulty === d.key ? "scale(1.06)" : "scale(1)",
                  }}
                  onClick={() => setDifficulty(d.key)}
                >
                  <span style={{ fontSize: "1.3rem" }}>{d.emoji}</span>
                  <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>{d.label}</span>
                  <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>{d.sub} 🏳️</span>
                </button>
              ))}
            </div>
          </div>

          {/* Collection button */}
          <button style={S.collectionBtn} onClick={() => setScreen("collection")}>
            <span>🏅</span>
            <span>{t("Minu kollektsioon")}</span>
            <span style={S.collBadge}>
              {collection.length}/{countriesRaw.length}
            </span>
          </button>

          {/* Start */}
          <button
            style={{ ...S.primaryBtn, opacity: gameMode ? 1 : 0.4, pointerEvents: gameMode ? "auto" : "none" }}
            onClick={() => gameMode && startGame(gameMode, difficulty)}
          >
            {t("Alusta mängu!")} 🚀
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════ GAME SCREEN ═══════════════════ */
  if (!question) return null;
  const isFTN = gameMode === "flag-to-name";

  return (
    <div style={S.page}>
      <div style={S.gameContainer}>
        {/* Top bar */}
        <div style={S.topBar}>
          <button style={S.backBtn} onClick={goMenu}>
            ← {t("Menüü")}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {streak >= 2 && (
              <span style={S.streakBadge}>
                🔥 {streak}
              </span>
            )}
            <div style={S.scoreBox}>
              <span style={S.scoreNum}>{score.correct}</span>
              <span style={S.scoreSep}>/</span>
              <span style={S.scoreTotal}>{score.total}</span>
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div style={S.promptArea}>
          {isFTN ? (
            <div style={S.flagShowcase}>
              <img src={flagUrl(question.correct.iso2)} alt="flag" style={S.flagBig} />
              <p style={S.promptLabel}>{t("Mis riigi lipp see on?")}</p>
            </div>
          ) : (
            <div style={S.nameShowcase}>
              <p style={S.namePrompt}>{t(question.correct.name_et)}</p>
              <p style={S.promptLabel}>{t("Vali õige lipp!")}</p>
            </div>
          )}
        </div>

        {/* Options */}
        <div style={isFTN ? S.optionsTextRow : S.optionsFlagRow}>
          {question.options.map((opt) => {
            const isSel = selected === opt.iso2;
            const isCorr = opt.iso2 === question.correct.iso2;
            let os = {};
            if (feedback) {
              if (isCorr) os = S.optCorrect;
              else if (isSel && !feedback.isCorrect) os = S.optWrong;
              else os = S.optDimmed;
            }

            if (isFTN) {
              return (
                <button key={opt.iso2} style={{ ...S.optionTextBtn, ...os }} onClick={() => handleAnswer(opt)}>
                  {t(opt.name_et)}
                </button>
              );
            }
            return (
              <button key={opt.iso2} style={{ ...S.optionFlagBtn, ...os }} onClick={() => handleAnswer(opt)}>
                <img src={flagUrl(opt.iso2)} alt="flag" style={S.flagOption} />
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            style={{
              ...S.feedbackOverlay,
              background: feedback.isCorrect ? "rgba(67,160,71,0.95)" : "rgba(229,57,53,0.88)",
            }}
          >
            <span style={S.feedbackEmoji}>{feedback.emoji}</span>
            <p style={S.feedbackMsg}>{t(feedback.message)}</p>
            {!feedback.isCorrect && (
              <p style={S.feedbackCorrectText}>
                {t("Õige vastus")}: {t(feedback.correctAnswer.name_et)}
              </p>
            )}
            <button style={S.nextBtn} onClick={nextQuestion}>
              {t("Järgmine")} →
            </button>
          </div>
        )}

        {/* Streak celebration overlay */}
        {streakCelebration && (
          <div style={S.streakOverlay}>
            <div style={S.streakCard}>
              <span style={{ fontSize: "3.5rem" }}>🔥</span>
              <p style={S.streakCount}>{streakCelebration.count}x {t("VÄGEV")}!</p>
              <p style={S.streakMsg}>{t(streakCelebration.msg)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ STYLES ═══════════════════ */
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(150deg, #e3f2fd 0%, #fff9c4 50%, #f3e5f5 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "1rem",
    fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
    boxSizing: "border-box",
  },
  container: {
    maxWidth: 480,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    paddingTop: "1rem",
    paddingBottom: "2rem",
  },
  titleBlock: { textAlign: "center", marginBottom: "0.25rem", position: "relative" },
  titleEmoji: { fontSize: "3rem", display: "block", marginBottom: "0.25rem" },
  title: {
    fontSize: "2.5rem",
    fontWeight: 900,
    color: "#1a237e",
    margin: 0,
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
  },
  subtitle: { fontSize: "1.1rem", color: "#5c6bc0", margin: "0.5rem 0 0", fontWeight: 600 },

  /* Gear */
  gearBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    background: "rgba(255,255,255,0.7)",
    border: "2px solid #b0bec5",
    borderRadius: 12,
    width: 44,
    height: 44,
    fontSize: "1.4rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },

  /* Profile chip */
  profileChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    marginTop: "0.6rem",
    padding: "0.4rem 0.9rem",
    background: "rgba(255,255,255,0.85)",
    border: "2px solid #b0bec5",
    borderRadius: 20,
    cursor: "pointer",
    fontSize: "1rem",
  },

  /* Card */
  card: {
    background: "rgba(255,255,255,0.85)",
    borderRadius: 20,
    padding: "1.1rem",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "0.7rem",
  },
  cardTitle: {
    fontSize: "0.95rem",
    fontWeight: 800,
    color: "#37474f",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  /* Profile list */
  profileList: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  profileBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    padding: "0.8rem 1rem",
    background: "rgba(255,255,255,0.7)",
    border: "3px solid transparent",
    borderRadius: 14,
    cursor: "pointer",
    fontSize: "1rem",
  },
  profileName: { fontWeight: 700, fontSize: "1.1rem", color: "#263238" },

  /* Avatar picker */
  avatarRow: { display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" },
  avatarBtn: {
    fontSize: "2rem",
    width: 52,
    height: 52,
    borderRadius: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },

  /* Name input */
  nameInput: {
    padding: "0.9rem 1rem",
    fontSize: "1.2rem",
    fontWeight: 700,
    border: "3px solid #b0bec5",
    borderRadius: 14,
    outline: "none",
    textAlign: "center",
    fontFamily: "inherit",
  },

  /* Buttons */
  primaryBtn: {
    padding: "1.1rem",
    fontSize: "1.35rem",
    fontWeight: 800,
    color: "#fff",
    background: "linear-gradient(135deg, #5c6bc0, #7c4dff)",
    border: "none",
    borderRadius: 18,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(124,77,255,0.35)",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#5c6bc0",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
    padding: "0.4rem",
  },

  /* Menu buttons */
  menuBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.9rem 1rem",
    border: "3px solid transparent",
    borderRadius: 16,
    cursor: "pointer",
    textAlign: "left",
    fontSize: "1rem",
    transition: "all 0.15s",
    background: "rgba(255,255,255,0.7)",
  },
  menuBtnActive: {
    transform: "scale(1.02)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,1)",
  },
  menuBtnEmoji: { fontSize: "1.6rem" },
  menuBtnText: { lineHeight: 1.35 },
  menuBtnSub: { fontSize: "0.82rem", color: "#78909c" },

  /* Difficulty */
  diffGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" },
  diffBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
    padding: "0.65rem 0.4rem",
    borderRadius: 14,
    border: "3px solid",
    cursor: "pointer",
    transition: "all 0.15s",
  },

  /* Toggle */
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.4rem 0.2rem",
  },
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#37474f",
  },
  toggleTrack: {
    position: "relative",
    width: 56,
    height: 30,
    borderRadius: 15,
    border: "none",
    cursor: "pointer",
    padding: 0,
    transition: "background 0.2s",
    flexShrink: 0,
  },
  toggleThumb: {
    display: "block",
    width: 26,
    height: 26,
    borderRadius: 13,
    background: "#fff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    transition: "transform 0.2s",
    position: "absolute",
    top: 2,
  },

  /* Collection button */
  collectionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.9rem 1.1rem",
    background: "rgba(255,255,255,0.85)",
    border: "3px solid #ffb74d",
    borderRadius: 16,
    cursor: "pointer",
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#e65100",
  },
  collBadge: {
    marginLeft: "auto",
    background: "#fff3e0",
    padding: "0.2rem 0.6rem",
    borderRadius: 10,
    fontSize: "0.85rem",
    fontWeight: 800,
  },

  /* Collection screen */
  collCount: {
    fontSize: "1.2rem",
    fontWeight: 800,
    color: "#e65100",
    background: "rgba(255,255,255,0.9)",
    padding: "0.4rem 0.9rem",
    borderRadius: 12,
  },
  progressBarOuter: {
    width: "100%",
    height: 12,
    background: "rgba(0,0,0,0.08)",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: "0.5rem",
  },
  progressBarInner: {
    height: "100%",
    background: "linear-gradient(90deg, #66bb6a, #43a047)",
    borderRadius: 6,
    transition: "width 0.4s",
  },
  flagGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
    gap: "0.5rem",
  },
  flagCell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
  },
  flagThumb: {
    width: "100%",
    aspectRatio: "3/2",
    objectFit: "cover",
    borderRadius: 8,
    border: "2px solid #e0e0e0",
    transition: "filter 0.3s",
  },
  flagCellName: {
    fontSize: "0.6rem",
    fontWeight: 700,
    textAlign: "center",
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
  },

  /* Game */
  gameContainer: {
    maxWidth: 520,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    paddingTop: "0.75rem",
    paddingBottom: "2rem",
    position: "relative",
  },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  backBtn: {
    background: "rgba(255,255,255,0.85)",
    border: "2px solid #b0bec5",
    borderRadius: 12,
    padding: "0.5rem 0.9rem",
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#546e7a",
    cursor: "pointer",
  },
  scoreBox: {
    background: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    padding: "0.4rem 1rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    display: "flex",
    alignItems: "baseline",
    gap: "0.15rem",
  },
  scoreNum: { fontSize: "1.5rem", fontWeight: 900, color: "#43a047" },
  scoreSep: { fontSize: "1.1rem", color: "#90a4ae", fontWeight: 700 },
  scoreTotal: { fontSize: "1.1rem", fontWeight: 700, color: "#78909c" },

  /* Streak */
  streakBadge: {
    background: "linear-gradient(135deg, #ff6f00, #ff3d00)",
    color: "#fff",
    fontWeight: 900,
    fontSize: "1rem",
    padding: "0.35rem 0.7rem",
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(255,61,0,0.3)",
  },
  streakOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.4)",
    zIndex: 200,
    animation: "fadeInOut 2.2s ease-in-out",
    pointerEvents: "none",
  },
  streakCard: {
    background: "linear-gradient(135deg, #ff6f00, #ff3d00)",
    borderRadius: 28,
    padding: "2rem 2.5rem",
    textAlign: "center",
    boxShadow: "0 8px 40px rgba(255,61,0,0.4)",
    animation: "popIn 0.3s ease-out",
  },
  streakCount: {
    fontSize: "2rem",
    fontWeight: 900,
    color: "#fff",
    margin: "0.3rem 0 0.1rem",
  },
  streakMsg: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "rgba(255,255,255,0.9)",
    margin: 0,
  },

  /* Prompt */
  promptArea: { display: "flex", justifyContent: "center", minHeight: 200 },
  flagShowcase: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" },
  flagBig: {
    width: "min(85vw, 300px)",
    height: "auto",
    borderRadius: 14,
    boxShadow: "0 6px 28px rgba(0,0,0,0.15)",
    border: "4px solid #fff",
    objectFit: "contain",
  },
  promptLabel: { fontSize: "1.25rem", fontWeight: 800, color: "#37474f", margin: 0, textAlign: "center" },
  nameShowcase: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    padding: "1.5rem",
  },
  namePrompt: {
    fontSize: "2.2rem",
    fontWeight: 900,
    color: "#1a237e",
    margin: 0,
    textAlign: "center",
    lineHeight: 1.2,
  },

  /* Options */
  optionsTextRow: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  optionsFlagRow: { display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" },
  optionTextBtn: {
    padding: "1rem 1.2rem",
    fontSize: "1.3rem",
    fontWeight: 800,
    background: "rgba(255,255,255,0.92)",
    border: "3px solid #b0bec5",
    borderRadius: 16,
    cursor: "pointer",
    transition: "all 0.12s",
    color: "#263238",
    textAlign: "center",
  },
  optionFlagBtn: {
    flex: "1 1 140px",
    maxWidth: 170,
    background: "rgba(255,255,255,0.92)",
    border: "4px solid #b0bec5",
    borderRadius: 16,
    cursor: "pointer",
    transition: "all 0.12s",
    padding: "0.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  flagOption: { width: "100%", height: "auto", borderRadius: 8, objectFit: "contain" },
  optCorrect: {
    borderColor: "#43a047",
    background: "rgba(67,160,71,0.15)",
    boxShadow: "0 0 0 3px rgba(67,160,71,0.3)",
  },
  optWrong: {
    borderColor: "#e53935",
    background: "rgba(229,57,53,0.12)",
    boxShadow: "0 0 0 3px rgba(229,57,53,0.25)",
  },
  optDimmed: { opacity: 0.45 },

  /* Feedback */
  feedbackOverlay: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "1.5rem 1rem 2rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.4rem",
    borderRadius: "24px 24px 0 0",
    zIndex: 100,
    boxShadow: "0 -4px 32px rgba(0,0,0,0.2)",
  },
  feedbackEmoji: { fontSize: "3rem" },
  feedbackMsg: { fontSize: "1.4rem", fontWeight: 900, color: "#fff", margin: 0, textAlign: "center" },
  feedbackCorrectText: { fontSize: "1.05rem", fontWeight: 700, color: "rgba(255,255,255,0.9)", margin: 0 },
  nextBtn: {
    marginTop: "0.4rem",
    padding: "0.8rem 2.2rem",
    fontSize: "1.15rem",
    fontWeight: 800,
    color: "#333",
    background: "rgba(255,255,255,0.95)",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
  },
};
