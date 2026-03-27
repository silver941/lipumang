import { useState, useCallback, useEffect, useMemo } from "react";
import countriesRaw from "./countryData.json";

/* ───────── helpers ───────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n, exclude = []) {
  const pool = arr.filter((c) => !exclude.includes(c.iso2));
  return shuffle(pool).slice(0, n);
}

function flagUrl(iso2) {
  return `https://flagcdn.com/w320/${iso2}.png`;
}

const EMOJIS_CORRECT = ["🎉", "⭐", "🥳", "🏆", "💪", "🌟", "👏", "🎊"];
const EMOJIS_WRONG = ["🤔", "💭", "🧐"];
const MESSAGES_CORRECT = [
  "Tubli!",
  "Väga hea!",
  "Suurepärane!",
  "Õige!",
  "Super!",
  "Hästi tehtud!",
];
const MESSAGES_WRONG = [
  "Proovi uuesti!",
  "Peaaegu!",
  "Järgmine kord!",
  "Ära muretse!",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ───────── main app ───────── */
export default function App() {
  const [screen, setScreen] = useState("menu");
  const [gameMode, setGameMode] = useState(null);
  const [difficulty, setDifficulty] = useState("easy");
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [question, setQuestion] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [selected, setSelected] = useState(null);

  const countries = useMemo(() => {
    if (difficulty === "easy")
      return countriesRaw.filter((c) => c.difficulty === "easy");
    if (difficulty === "medium")
      return countriesRaw.filter(
        (c) => c.difficulty === "easy" || c.difficulty === "medium"
      );
    return countriesRaw;
  }, [difficulty]);

  const generateQuestion = useCallback(() => {
    const correct = countries[Math.floor(Math.random() * countries.length)];
    let wrongPool = [];

    if (
      difficulty === "hard" &&
      correct.similarTo &&
      correct.similarTo.length > 0
    ) {
      const similars = countriesRaw.filter((c) =>
        correct.similarTo.includes(c.iso2)
      );
      wrongPool.push(...similars);
    }

    while (wrongPool.length < 2) {
      const pick = pickRandom(countries, 1, [
        correct.iso2,
        ...wrongPool.map((w) => w.iso2),
      ]);
      if (pick.length > 0) wrongPool.push(pick[0]);
    }

    wrongPool = wrongPool.slice(0, 2);
    const options = shuffle([correct, ...wrongPool]);

    return { correct, options };
  }, [countries, difficulty]);

  const startGame = (mode, diff) => {
    setGameMode(mode);
    setDifficulty(diff);
    setScore({ correct: 0, total: 0 });
    setFeedback(null);
    setSelected(null);
    setScreen("game");
  };

  useEffect(() => {
    if (screen === "game" && !question) {
      setQuestion(generateQuestion());
    }
  }, [screen, question, generateQuestion]);

  useEffect(() => {
    if (screen === "game" && question === null) {
      setQuestion(generateQuestion());
    }
  }, [difficulty, screen, question, generateQuestion]);

  const handleAnswer = (choice) => {
    if (feedback) return;
    setSelected(choice.iso2);
    const isCorrect = choice.iso2 === question.correct.iso2;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
    setFeedback({
      isCorrect,
      emoji: isCorrect ? randomFrom(EMOJIS_CORRECT) : randomFrom(EMOJIS_WRONG),
      message: isCorrect
        ? randomFrom(MESSAGES_CORRECT)
        : randomFrom(MESSAGES_WRONG),
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
  };

  /* ───────── MENU SCREEN ───────── */
  if (screen === "menu") {
    return (
      <div style={styles.page}>
        <div style={styles.menuContainer}>
          <div style={styles.titleBlock}>
            <span style={styles.titleEmoji}>🏳️</span>
            <h1 style={styles.title}>Lipumäng</h1>
            <p style={styles.subtitle}>Õpi riikide lippe eesti keeles!</p>
          </div>

          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Mängurežiim</h2>
            <button
              style={{
                ...styles.menuBtn,
                ...styles.menuBtnBlue,
                ...(gameMode === "flag-to-name" ? styles.menuBtnActive : {}),
              }}
              onClick={() => setGameMode("flag-to-name")}
            >
              <span style={styles.menuBtnEmoji}>🏴</span>
              <span style={styles.menuBtnText}>
                <strong>Lipp → Nimi</strong>
                <br />
                <span style={styles.menuBtnSub}>Näen lippu, valin nime</span>
              </span>
            </button>
            <button
              style={{
                ...styles.menuBtn,
                ...styles.menuBtnGreen,
                ...(gameMode === "name-to-flag" ? styles.menuBtnActive : {}),
              }}
              onClick={() => setGameMode("name-to-flag")}
            >
              <span style={styles.menuBtnEmoji}>🔤</span>
              <span style={styles.menuBtnText}>
                <strong>Nimi → Lipp</strong>
                <br />
                <span style={styles.menuBtnSub}>Näen nime, valin lipu</span>
              </span>
            </button>
          </div>

          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Raskusaste</h2>
            <div style={styles.diffRow}>
              {[
                { key: "easy", label: "Kerge", emoji: "🌱", color: "#43a047" },
                {
                  key: "medium",
                  label: "Keskmine",
                  emoji: "🌿",
                  color: "#f9a825",
                },
                { key: "hard", label: "Raske", emoji: "🌶️", color: "#e53935" },
              ].map((d) => (
                <button
                  key={d.key}
                  style={{
                    ...styles.diffBtn,
                    borderColor: d.color,
                    color: difficulty === d.key ? "#fff" : d.color,
                    background:
                      difficulty === d.key ? d.color : "rgba(255,255,255,0.9)",
                    transform:
                      difficulty === d.key ? "scale(1.08)" : "scale(1)",
                  }}
                  onClick={() => setDifficulty(d.key)}
                >
                  <span style={{ fontSize: "1.5rem" }}>{d.emoji}</span>
                  <span style={{ fontWeight: 700 }}>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            style={{
              ...styles.startBtn,
              opacity: gameMode ? 1 : 0.4,
              pointerEvents: gameMode ? "auto" : "none",
            }}
            onClick={() => gameMode && startGame(gameMode, difficulty)}
          >
            Alusta mängu! 🚀
          </button>
        </div>
      </div>
    );
  }

  /* ───────── GAME SCREEN ───────── */
  if (!question) return null;

  const isFlagToName = gameMode === "flag-to-name";

  return (
    <div style={styles.page}>
      <div style={styles.gameContainer}>
        {/* Top bar */}
        <div style={styles.topBar}>
          <button style={styles.backBtn} onClick={goMenu}>
            ← Menüü
          </button>
          <div style={styles.scoreBox}>
            <span style={styles.scoreNum}>{score.correct}</span>
            <span style={styles.scoreSep}>/</span>
            <span style={styles.scoreTotal}>{score.total}</span>
          </div>
        </div>

        {/* Prompt */}
        <div style={styles.promptArea}>
          {isFlagToName ? (
            <div style={styles.flagShowcase}>
              <img
                src={flagUrl(question.correct.iso2)}
                alt="flag"
                style={styles.flagBig}
              />
              <p style={styles.promptLabel}>Mis riigi lipp see on?</p>
            </div>
          ) : (
            <div style={styles.nameShowcase}>
              <p style={styles.namePrompt}>{question.correct.name_et}</p>
              <p style={styles.promptLabel}>Vali õige lipp!</p>
            </div>
          )}
        </div>

        {/* Options */}
        <div
          style={
            isFlagToName ? styles.optionsTextRow : styles.optionsFlagRow
          }
        >
          {question.options.map((opt) => {
            const isSelected = selected === opt.iso2;
            const isCorrectOpt = opt.iso2 === question.correct.iso2;
            let optStyle = {};

            if (feedback) {
              if (isCorrectOpt) {
                optStyle = styles.optCorrect;
              } else if (isSelected && !feedback.isCorrect) {
                optStyle = styles.optWrong;
              } else {
                optStyle = styles.optDimmed;
              }
            }

            if (isFlagToName) {
              return (
                <button
                  key={opt.iso2}
                  style={{
                    ...styles.optionTextBtn,
                    ...optStyle,
                  }}
                  onClick={() => handleAnswer(opt)}
                >
                  {opt.name_et}
                </button>
              );
            } else {
              return (
                <button
                  key={opt.iso2}
                  style={{
                    ...styles.optionFlagBtn,
                    ...optStyle,
                  }}
                  onClick={() => handleAnswer(opt)}
                >
                  <img
                    src={flagUrl(opt.iso2)}
                    alt="flag option"
                    style={styles.flagOption}
                  />
                </button>
              );
            }
          })}
        </div>

        {/* Feedback overlay */}
        {feedback && (
          <div
            style={{
              ...styles.feedbackOverlay,
              background: feedback.isCorrect
                ? "rgba(67, 160, 71, 0.95)"
                : "rgba(229, 57, 53, 0.88)",
            }}
          >
            <span style={styles.feedbackEmoji}>{feedback.emoji}</span>
            <p style={styles.feedbackMsg}>{feedback.message}</p>
            {!feedback.isCorrect && (
              <p style={styles.feedbackCorrect}>
                Õige vastus: {feedback.correctAnswer.name_et}
              </p>
            )}
            <button style={styles.nextBtn} onClick={nextQuestion}>
              Järgmine →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── STYLES ───────── */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(150deg, #e3f2fd 0%, #fff9c4 50%, #f3e5f5 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "1rem",
    fontFamily:
      "'Nunito', 'Baloo 2', 'Comic Neue', -apple-system, BlinkMacSystemFont, sans-serif",
    boxSizing: "border-box",
  },
  menuContainer: {
    maxWidth: 480,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    paddingTop: "1.5rem",
    paddingBottom: "2rem",
  },
  titleBlock: {
    textAlign: "center",
    marginBottom: "0.25rem",
  },
  titleEmoji: {
    fontSize: "3rem",
    display: "block",
    marginBottom: "0.25rem",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: 900,
    color: "#1a237e",
    margin: 0,
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#5c6bc0",
    margin: "0.5rem 0 0",
    fontWeight: 600,
  },
  sectionCard: {
    background: "rgba(255,255,255,0.85)",
    borderRadius: 20,
    padding: "1.25rem",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#37474f",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  menuBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem 1.1rem",
    border: "3px solid transparent",
    borderRadius: 16,
    cursor: "pointer",
    textAlign: "left",
    fontSize: "1rem",
    transition: "all 0.15s",
    background: "rgba(255,255,255,0.7)",
  },
  menuBtnBlue: {
    borderColor: "#42a5f5",
  },
  menuBtnGreen: {
    borderColor: "#66bb6a",
  },
  menuBtnActive: {
    transform: "scale(1.02)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,1)",
  },
  menuBtnEmoji: {
    fontSize: "1.8rem",
  },
  menuBtnText: {
    lineHeight: 1.35,
  },
  menuBtnSub: {
    fontSize: "0.85rem",
    color: "#78909c",
  },
  diffRow: {
    display: "flex",
    gap: "0.5rem",
  },
  diffBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.75rem 0.5rem",
    borderRadius: 14,
    border: "3px solid",
    cursor: "pointer",
    fontSize: "0.9rem",
    transition: "all 0.15s",
  },
  startBtn: {
    padding: "1.1rem",
    fontSize: "1.4rem",
    fontWeight: 800,
    color: "#fff",
    background: "linear-gradient(135deg, #5c6bc0, #7c4dff)",
    border: "none",
    borderRadius: 18,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(124, 77, 255, 0.35)",
    transition: "all 0.2s",
    letterSpacing: "0.01em",
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
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    background: "rgba(255,255,255,0.85)",
    border: "2px solid #b0bec5",
    borderRadius: 12,
    padding: "0.5rem 1rem",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#546e7a",
    cursor: "pointer",
  },
  scoreBox: {
    background: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    padding: "0.5rem 1.2rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    display: "flex",
    alignItems: "baseline",
    gap: "0.15rem",
  },
  scoreNum: {
    fontSize: "1.6rem",
    fontWeight: 900,
    color: "#43a047",
  },
  scoreSep: {
    fontSize: "1.2rem",
    color: "#90a4ae",
    fontWeight: 700,
  },
  scoreTotal: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#78909c",
  },
  promptArea: {
    display: "flex",
    justifyContent: "center",
    minHeight: 200,
  },
  flagShowcase: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
  },
  flagBig: {
    width: "min(85vw, 300px)",
    height: "auto",
    borderRadius: 14,
    boxShadow: "0 6px 28px rgba(0,0,0,0.15)",
    border: "4px solid #fff",
    objectFit: "contain",
  },
  promptLabel: {
    fontSize: "1.3rem",
    fontWeight: 800,
    color: "#37474f",
    margin: 0,
    textAlign: "center",
  },
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
  optionsTextRow: {
    display: "flex",
    flexDirection: "column",
    gap: "0.65rem",
  },
  optionsFlagRow: {
    display: "flex",
    gap: "0.65rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  optionTextBtn: {
    padding: "1.1rem 1.4rem",
    fontSize: "1.35rem",
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
    padding: "0.6rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  flagOption: {
    width: "100%",
    height: "auto",
    borderRadius: 8,
    objectFit: "contain",
  },
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
  optDimmed: {
    opacity: 0.45,
  },

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
    gap: "0.5rem",
    borderRadius: "24px 24px 0 0",
    zIndex: 100,
    boxShadow: "0 -4px 32px rgba(0,0,0,0.2)",
  },
  feedbackEmoji: {
    fontSize: "3rem",
  },
  feedbackMsg: {
    fontSize: "1.5rem",
    fontWeight: 900,
    color: "#fff",
    margin: 0,
    textAlign: "center",
  },
  feedbackCorrect: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "rgba(255,255,255,0.9)",
    margin: 0,
  },
  nextBtn: {
    marginTop: "0.5rem",
    padding: "0.85rem 2.5rem",
    fontSize: "1.2rem",
    fontWeight: 800,
    color: "#333",
    background: "rgba(255,255,255,0.95)",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
  },
};
