import { type ReactNode, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  Clock,
  Crown,
  Flame,
  Loader2,
  Scissors,
  Snowflake,
  FastForward,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { InkBetaLogo } from "@/components/InkBetaBrand";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { QuizSettings } from "@/components/QuizSettingsPanel";
import { cn } from "@/lib/utils";
import s from "./BubbleQuiz.module.css";

export interface QuizPlayer {
  id: string;
  name: string;
  isHost: boolean;
}
export interface QuizScore {
  player_id: string;
  player_name: string;
  total_points: number;
  correct_answers: number;
  average_time_ms: number;
}
export interface QuizAnswer {
  player_id: string;
  player_name: string;
  answer: string;
  response_time_ms: number;
  is_correct: boolean;
  points_earned: number;
}
export const QUIZ_CATEGORIES = [
  ["mixed", "Le grand mélange", "🎲"],
  ["general", "Culture G", "🧠"],
  ["anime", "Anime", "🎌"],
  ["histoire", "Histoire", "📜"],
  ["sport", "Sport", "⚽"],
  ["musique", "Musique", "🎵"],
  ["cinema", "Cinéma", "🎬"],
  ["science", "Science", "🔬"],
  ["geographie", "Géographie", "🌍"],
  ["jeux_video", "Jeux vidéo", "🎮"],
  ["art", "Art", "🎨"],
] as const;
export const quizCategoryName = (id: string) =>
  QUIZ_CATEGORIES.find((c) => c[0] === id)?.[1] || id;
const P = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <section className={cn(s.panel, className)}>{children}</section>;
const Heading = ({
  tag,
  title,
  children,
}: {
  tag: string;
  title: string;
  children?: ReactNode;
}) => (
  <div className={s.heading}>
    <small>{tag}</small>
    <h1>{title}</h1>
    {children && <p>{children}</p>}
  </div>
);

export const BubbleQuizStage = ({
  phase,
  round,
  total,
  onLeave,
  chat,
  tools,
  children,
}: {
  phase: string;
  round: number;
  total: number;
  onLeave: () => void;
  chat?: ReactNode;
  tools?: ReactNode;
  children: ReactNode;
}) => {
  const step = phase === "waiting" ? 0 : phase === "final" ? 2 : 1;
  return (
    <div className={`ik-root ${s.root}`}>
      <div className="ik-party-bg" aria-hidden="true" />
      <div className="ik-party-dots" aria-hidden="true" />
      <div className={s.bubbles} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <header className={s.header}>
        <div className={s.brand}>
          <InkBetaLogo titleId="bubble-quiz-brand" />
          <span>
            <Brain />
            Quiz
          </span>
        </div>
        <ol aria-label="Étapes du quiz">
          {["Le mix", "Les questions", "Le podium"].map((label, i) => (
            <li
              key={label}
              aria-current={step === i ? "step" : undefined}
              className={cn(step === i && s.current, step > i && s.complete)}
            >
              <span>
                {step > i ? <Check /> : String(i + 1).padStart(2, "0")}
              </span>
              <strong>{label}</strong>
            </li>
          ))}
        </ol>
        <div className={s.tools}>
          {phase !== "waiting" && (
            <span>
              Question{" "}
              <b>
                {round}/{total}
              </b>
            </span>
          )}
          {tools}
          <button type="button" onClick={onLeave}>
            <ArrowLeft />
            <span>Lobby</span>
          </button>
        </div>
      </header>
      <div className={s.workspace}>
        <main className={s.main}>
          <div className={s.content}>{children}</div>
        </main>
        {chat && <aside className={s.chat}>{chat}</aside>}
      </div>
    </div>
  );
};

const Choices = <T extends string | number>({
  label,
  values,
  value,
  onChange,
  disabled,
}: {
  label: string;
  values: readonly { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) => (
  <fieldset className={s.choices} disabled={disabled}>
    <legend>{label}</legend>
    <div>
      {values.map((v) => (
        <button
          key={v.id}
          type="button"
          aria-pressed={value === v.id}
          onClick={() => onChange(v.id)}
        >
          {v.label}
        </button>
      ))}
    </div>
  </fieldset>
);
// Bind the generic outside JSX: Lovable's JSX instrumentation must not inject
// attributes into a type-argument expression.
const NumberChoices = Choices<number>;
const DifficultyChoices = Choices<QuizSettings["difficulty"]>;
const ModeChoices = Choices<QuizSettings["questionMode"]>;

export const BubbleQuizWaiting = ({
  isHost,
  isLoading,
  players,
  currentPlayerId,
  selectedCategory,
  onCategoryChange,
  hostSettings,
  onSettingsChange,
  onStart,
  error,
}: {
  isHost: boolean;
  isLoading: boolean;
  players: QuizPlayer[];
  currentPlayerId: string;
  selectedCategory: string;
  onCategoryChange: (v: string) => void;
  hostSettings: QuizSettings;
  onSettingsChange: (v: QuizSettings) => void;
  onStart: () => void;
  error?: string | null;
}) => {
  const update = <K extends keyof QuizSettings>(
    key: K,
    value: QuizSettings[K],
  ) => onSettingsChange({ ...hostSettings, [key]: value });
  return (
    <>
      <div className={s.setup}>
        <div>
          <div className={s.welcome}>
            <Heading
              tag="Quiz · On prépare le show"
              title="Qui a réponse à tout ?"
            >
              Un peu de culture, un soupçon de chance. La bonne réponse au bon
              moment.
            </Heading>
            <div className={s.mascot} aria-hidden="true">
              <img src="/game-avatars/mimo-pop.svg" alt="" />
              <span>À vos neurones !</span>
            </div>
          </div>
          <P>
            <header className={s.panelHead}>
              <span className={s.icon}>
                <Brain />
              </span>
              <div>
                <h2>Le terrain de jeu</h2>
                <p>
                  {isHost
                    ? "Choisis un thème pour toute la bande."
                    : "L’hôte choisit les thèmes et les règles."}
                </p>
              </div>
            </header>
            {isHost ? (
              <div className={s.categories}>
                {QUIZ_CATEGORIES.map(([id, label, emoji]) => (
                  <button
                    type="button"
                    key={id}
                    disabled={isLoading}
                    aria-pressed={selectedCategory === id}
                    onClick={() => onCategoryChange(id)}
                  >
                    <span aria-hidden="true">{emoji}</span>
                    <strong>{label}</strong>
                    {selectedCategory === id && <Check />}
                  </button>
                ))}
              </div>
            ) : (
              <p className={s.waiting}>
                <Users />
                Tout le monde est là ? Le quiz commence dès que l’hôte lance la
                partie.
              </p>
            )}
          </P>
          <BubbleQuizPlayers players={players} self={currentPlayerId} />
        </div>
        <P className={s.config}>
          <header className={s.panelHead}>
            <span className={s.icon}>
              <Clock />
            </span>
            <div>
              <h2>À votre rythme</h2>
              <p>
                {isHost
                  ? "Les mêmes règles pour tout le monde."
                  : "Les règles seront partagées au lancement."}
              </p>
            </div>
          </header>
          {isHost && (
            <div className={s.settings}>
              <NumberChoices
                label="Questions"
                values={[5, 10, 15, 20, 30].map((id) => ({
                  id,
                  label: String(id),
                }))}
                value={hostSettings.totalRounds}
                onChange={(v) => update("totalRounds", v)}
                disabled={isLoading}
              />
              <NumberChoices
                label="Temps par question"
                values={[10, 15, 20, 30, 45, 60].map((id) => ({
                  id: id * 1000,
                  label: `${id}s`,
                }))}
                value={hostSettings.answerDurationMs}
                onChange={(v) => update("answerDurationMs", v)}
                disabled={isLoading}
              />
              <DifficultyChoices
                label="Difficulté"
                values={[
                  { id: "mixed", label: "Mixte" },
                  { id: "facile", label: "Facile" },
                  { id: "moyen", label: "Moyen" },
                  { id: "difficile", label: "Difficile" },
                ]}
                value={hostSettings.difficulty}
                onChange={(v) => update("difficulty", v)}
                disabled={isLoading}
              />
              <ModeChoices
                label="Réponses"
                values={[
                  { id: "mixed", label: "Mixte" },
                  { id: "qcm", label: "4 choix" },
                  { id: "text", label: "À écrire" },
                ]}
                value={hostSettings.questionMode}
                onChange={(v) => update("questionMode", v)}
                disabled={isLoading}
              />
              {[
                {
                  key: "enableJokers" as const,
                  label: "Un coup de pouce",
                  text: "Trois jokers par joueur, pour toute la partie.",
                },
                {
                  key: "enableStreak" as const,
                  label: "Les séries gagnantes",
                  text: "Des points bonus après 3 bonnes réponses.",
                },
              ].map((v) => (
                <button
                  className={s.toggle}
                  type="button"
                  key={v.key}
                  role="switch"
                  aria-checked={hostSettings[v.key]}
                  disabled={isLoading}
                  onClick={() => update(v.key, !hostSettings[v.key])}
                >
                  <span>
                    <strong>{v.label}</strong>
                    <small>{v.text}</small>
                  </span>
                  <i>
                    <b />
                  </i>
                </button>
              ))}
            </div>
          )}
          {isHost && (
            <>
              <div className={s.summary}>
                <strong>
                  {hostSettings.totalRounds}
                  <small>questions</small>
                </strong>
                <strong>
                  {hostSettings.answerDurationMs / 1000}s
                  <small>pour répondre</small>
                </strong>
                <strong>
                  {players.length}
                  <small>joueur{players.length > 1 ? "s" : ""}</small>
                </strong>
              </div>
              {error && (
                <p className={s.error} role="alert">
                  {error}
                </p>
              )}
              <button
                className={s.primary}
                type="button"
                disabled={isLoading}
                onClick={onStart}
              >
                {isLoading ? <Loader2 className={s.spin} /> : <ArrowRight />}
                {isLoading
                  ? "On prépare les questions…"
                  : error
                    ? "Réessayer le lancement"
                    : "Lancer le quiz"}
              </button>
            </>
          )}
        </P>
      </div>
    </>
  );
};

export const BubbleQuizPlayers = ({
  players,
  self,
  answered = [],
}: {
  players: QuizPlayer[];
  self: string;
  answered?: string[];
}) => (
  <section className={s.players} aria-label="Les joueurs du quiz">
    <header>
      <Users />
      <strong>La bande</strong>
      <small>{players.length} en jeu</small>
    </header>
    <ul>
      {players.map((p) => (
        <li key={p.id}>
          <div className={s.avatar}>
            <PlayerAvatar
              playerId={p.id}
              playerName={p.name}
              size="md"
              showTitle={false}
            />
            {answered.includes(p.id) && (
              <span>
                <Check />
              </span>
            )}
          </div>
          <strong>{p.name}</strong>
          <small>{p.id === self ? "Toi" : p.isHost ? "Hôte" : ""}</small>
        </li>
      ))}
    </ul>
  </section>
);

interface QuestionViewProps {
  question: string;
  options: string[];
  questionType: "qcm" | "text";
  category: string;
  difficulty: string;
  roundNumber: number;
  totalRounds: number;
  timeRemaining: number;
  totalTime: number;
  hasAnswered: boolean;
  answeredPlayers: string[];
  players: QuizPlayer[];
  scores: QuizScore[];
  currentPlayerId: string;
  hiddenOptions: string[];
  currentStreak: number;
  selected: string | null;
  text: string;
  onText: (s: string) => void;
  onSelect: (s: string) => void;
  onSubmit: (e: FormEvent) => void;
  jokers: ReactNode;
  inputRef: React.RefObject<HTMLInputElement>;
}
export const BubbleQuizQuestion = (p: QuestionViewProps) => {
  const seconds = Math.max(0, Math.ceil(p.timeRemaining / 1000));
  const progress = Math.max(
    0,
    Math.min(100, (p.timeRemaining / p.totalTime) * 100),
  );
  return (
    <>
      <Heading
        tag={`Question ${p.roundNumber} sur ${p.totalRounds}`}
        title={p.hasAnswered ? "C’est dans la boîte !" : "À vous de jouer."}
      >
        {p.hasAnswered
          ? "Ta réponse est envoyée. Le verdict arrive à la fin du chrono."
          : "Une seule réponse. Prends le temps de lire, puis fais ton choix."}
      </Heading>
      <div className={s.playLayout}>
        <P className={s.questionPanel}>
          <header className={s.questionHead}>
            <div>
              <span>{quizCategoryName(p.category)}</span>
              <small>
                {(
                  {
                    facile: "Facile",
                    easy: "Facile",
                    moyen: "Moyen",
                    medium: "Moyen",
                    difficile: "Difficile",
                    hard: "Difficile",
                  } as Record<string, string>
                )[p.difficulty] || p.difficulty}
              </small>
            </div>
            <div
              className={cn(s.timer, seconds <= 5 && s.urgent)}
              role="timer"
              aria-label={`${seconds} secondes restantes`}
            >
              <Clock />
              <strong>{seconds}</strong>
              <small>s</small>
            </div>
          </header>
          <div className={s.track} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <h2 className={s.question}>{p.question}</h2>
          {p.questionType === "qcm" && p.options.length > 0 ? (
            <div className={s.answers}>
              {p.options.map((option, i) => (
                <button
                  type="button"
                  key={`${i}-${option}`}
                  className={cn(
                    s.answer,
                    p.selected === option && s.selected,
                    p.hiddenOptions.includes(option) && s.eliminated,
                  )}
                  disabled={
                    p.hasAnswered ||
                    seconds === 0 ||
                    p.hiddenOptions.includes(option)
                  }
                  aria-pressed={p.selected === option}
                  onClick={() => p.onSelect(option)}
                >
                  <span>{String.fromCharCode(65 + i)}</span>
                  <strong>{option}</strong>
                  {p.selected === option && <Check />}
                </button>
              ))}
            </div>
          ) : (
            <form className={s.textAnswer} onSubmit={p.onSubmit}>
              <label htmlFor="bubble-quiz-answer">Ta réponse</label>
              <div>
                <input
                  id="bubble-quiz-answer"
                  ref={p.inputRef}
                  value={p.text}
                  onChange={(e) => p.onText(e.target.value)}
                  disabled={p.hasAnswered || seconds === 0}
                  placeholder="Écris ta réponse…"
                  maxLength={500}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className={s.primary}
                  disabled={p.hasAnswered || seconds === 0 || !p.text.trim()}
                >
                  <ArrowRight />
                  Valider
                </button>
              </div>
            </form>
          )}
          <footer className={s.answerFooter}>
            <span role="status">
              {p.hasAnswered ? (
                <>
                  <Check />
                  Réponse envoyée
                </>
              ) : p.questionType === "qcm" ? (
                "A, B, C, D ou 1, 2, 3, 4 au clavier"
              ) : (
                "Entrée pour valider"
              )}
            </span>
            <span>
              {p.answeredPlayers.length}/{p.players.length} ont répondu
            </span>
          </footer>
        </P>
        <aside className={s.side}>
          <P>
            <header className={s.panelHead}>
              <span className={s.icon}>
                <Trophy />
              </span>
              <div>
                <h2>La course aux points</h2>
                <p>Le classement de la partie.</p>
              </div>
            </header>
            <ScoreRows scores={p.scores} self={p.currentPlayerId} />
          </P>
          {p.currentStreak >= 2 && (
            <p className={s.streak}>
              <Flame />
              Série de {p.currentStreak} bonnes réponses
            </p>
          )}
          {p.jokers}
        </aside>
      </div>
      <BubbleQuizPlayers
        players={p.players}
        self={p.currentPlayerId}
        answered={p.answeredPlayers}
      />
    </>
  );
};

export const BubbleQuizJokers = ({
  fifty,
  freeze,
  skip,
  onFifty,
  onFreeze,
  onSkip,
  disabled,
  allowFifty,
}: {
  fifty: boolean;
  freeze: boolean;
  skip: boolean;
  onFifty: () => void;
  onFreeze: () => void;
  onSkip: () => void;
  disabled: boolean;
  allowFifty: boolean;
}) => (
  <P className={s.jokers}>
    <h2>Un coup de pouce ?</h2>
    <p>Une utilisation par joker dans la partie.</p>
    <div>
      {[
        {
          label: "50/50",
          sub: "2 choix en moins",
          icon: Scissors,
          on: onFifty,
          available: fifty && allowFifty,
        },
        {
          label: "+5 secondes",
          sub: "Un peu de répit",
          icon: Snowflake,
          on: onFreeze,
          available: freeze,
        },
        {
          label: "Passer",
          sub: "Sans marquer de point",
          icon: FastForward,
          on: onSkip,
          available: skip,
        },
      ].map(({ label, sub, icon: Icon, on, available }) => (
        <button
          key={label}
          type="button"
          onClick={on}
          disabled={disabled || !available}
          title={
            !available
              ? "Indisponible pour cette question ou déjà utilisé"
              : sub
          }
        >
          <Icon />
          <strong>{label}</strong>
          <small>{sub}</small>
        </button>
      ))}
    </div>
  </P>
);

export const BubbleQuizReveal = ({
  question,
  correctAnswer,
  roundAnswers,
  isHost,
  onContinue,
}: {
  question: string;
  correctAnswer: string;
  roundAnswers: QuizAnswer[];
  isHost: boolean;
  onContinue: () => void;
}) => (
  <>
    <Heading tag="Le verdict" title="Alors, tu l’avais ?">
      {question}
    </Heading>
    <div className={s.revealLayout}>
      <P className={s.solution}>
        <div className={s.solutionIcon}>
          <Check />
        </div>
        <small>La bonne réponse</small>
        <h2>{correctAnswer}</h2>
        <p>La vitesse compte, mais il faut d’abord viser juste.</p>
      </P>
      <P>
        <header className={s.panelHead}>
          <h2>Les réponses de la bande</h2>
        </header>
        <ul className={s.answerList}>
          {[...roundAnswers]
            .sort(
              (a, b) =>
                b.points_earned - a.points_earned ||
                a.response_time_ms - b.response_time_ms,
            )
            .map((a) => (
              <li key={a.player_id} data-correct={a.is_correct}>
                <PlayerAvatar
                  playerId={a.player_id}
                  playerName={a.player_name}
                  size="sm"
                  showTitle={false}
                />
                <div>
                  <strong>{a.player_name}</strong>
                  <p>
                    {a.answer === "__SKIP__" ? "Question passée" : a.answer}
                  </p>
                </div>
                {a.is_correct ? <Check /> : <X />}
                <strong>
                  +{a.points_earned}
                  <small>pts</small>
                </strong>
              </li>
            ))}
        </ul>
        {roundAnswers.length === 0 && (
          <p className={s.waiting}>Personne n’a répondu à cette question.</p>
        )}
        {isHost ? (
          <button type="button" className={s.primary} onClick={onContinue}>
            Voir le classement
            <ArrowRight />
          </button>
        ) : (
          <p className={s.waiting}>Le classement arrive…</p>
        )}
      </P>
    </div>
  </>
);

const ScoreRows = ({ scores, self }: { scores: QuizScore[]; self: string }) => (
  <ol className={s.scoreRows}>
    {[...scores]
      .sort((a, b) => b.total_points - a.total_points)
      .map((score, i, all) => (
        <li key={score.player_id} data-self={score.player_id === self}>
          <span className={s.rank}>
            {all.findIndex(
              (other) => other.total_points === score.total_points,
            ) + 1}
          </span>
          <PlayerAvatar
            playerId={score.player_id}
            playerName={score.player_name}
            size="sm"
            showTitle={false}
          />
          <div>
            <strong>{score.player_name}</strong>
            <small>
              {score.player_id === self
                ? "Toi"
                : `${score.correct_answers} bonne${score.correct_answers > 1 ? "s" : ""} réponse${score.correct_answers > 1 ? "s" : ""}`}
            </small>
          </div>
          <b>
            {score.total_points}
            <small>pts</small>
          </b>
        </li>
      ))}
  </ol>
);
export const BubbleQuizScores = ({
  scores,
  currentPlayerId,
  final = false,
  roundNumber,
  totalRounds,
  onContinue,
  isHost = true,
}: {
  scores: QuizScore[];
  currentPlayerId: string;
  final?: boolean;
  roundNumber?: number;
  totalRounds?: number;
  onContinue: () => void;
  isHost?: boolean;
}) => {
  const sorted = [...scores].sort((a, b) => b.total_points - a.total_points);
  const self = sorted.find((v) => v.player_id === currentPlayerId);
  const leaders = sorted.filter(
    (v) => v.total_points === sorted[0]?.total_points,
  );
  return (
    <>
      <Heading
        tag={
          final
            ? "Fin du quiz"
            : `Après la question ${roundNumber}/${totalRounds}`
        }
        title={final ? "La bande a fait le show." : "La course continue."}
      >
        {final
          ? "Bien joué à tous ! Voilà le classement final."
          : "Chaque bonne réponse peut changer la donne."}
      </Heading>
      <div className={s.resultsLayout}>
        <P className={s.podium}>
          <span className={s.cup}>
            <Trophy />
          </span>
          <small>
            {leaders.length > 1 ? "En tête, ex æquo" : "En tête du quiz"}
          </small>
          <div className={s.leaderAvatars}>
            {leaders.map((p) => (
              <div key={p.player_id}>
                <PlayerAvatar
                  playerId={p.player_id}
                  playerName={p.player_name}
                  size="xl"
                  showTitle={false}
                />
                <strong>{p.player_name}</strong>
              </div>
            ))}
          </div>
          <h2>
            {sorted[0]?.total_points ?? 0}
            <small>points</small>
          </h2>
          <p>
            {final
              ? "Merci d’avoir joué !"
              : "Le prochain tour peut tout changer."}
          </p>
        </P>
        <P>
          <header className={s.panelHead}>
            <Crown />
            <h2>{final ? "Le classement final" : "Le classement"}</h2>
          </header>
          <ScoreRows scores={scores} self={currentPlayerId} />
          {self && (
            <div className={s.personal}>
              <strong>Ta partie</strong>
              <span>{self.correct_answers} bonnes réponses</span>
              <span>
                {(self.average_time_ms / 1000).toFixed(1)}s en moyenne
              </span>
            </div>
          )}
          {final || isHost ? (
            <button type="button" className={s.primary} onClick={onContinue}>
              {final
                ? "Retour au lobby"
                : roundNumber === totalRounds
                  ? "Voir le podium"
                  : "Question suivante"}
              <ArrowRight />
            </button>
          ) : (
            <p className={s.waiting}>La prochaine étape arrive…</p>
          )}
        </P>
      </div>
    </>
  );
};

export const BubbleQuizCountdown = ({
  count,
  roundNumber,
  totalRounds,
  category,
}: {
  count: number;
  roundNumber: number;
  totalRounds: number;
  category: string;
}) => (
  <div className={s.countdown}>
    <Heading
      tag={`Question ${roundNumber} sur ${totalRounds}`}
      title="Prêts à dégainer ?"
    >
      {quizCategoryName(category)}
    </Heading>
    <div key={count} className={s.countOrb}>
      <Brain />
      <strong>{count > 0 ? count : "Go !"}</strong>
    </div>
    <p>Lis bien la question. Une seule réponse.</p>
  </div>
);
