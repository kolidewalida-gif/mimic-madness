// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BubbleQuizWaiting,
  BubbleQuizStage,
  BubbleQuizJokers,
  BubbleQuizScores,
  BubbleQuizReveal,
} from "./BubbleQuiz";
import { QuizQuestion } from "../QuizQuestion";
import { DEFAULT_QUIZ_SETTINGS } from "../QuizSettingsPanel";
vi.mock("@/components/PlayerAvatar", () => ({
  PlayerAvatar: ({ playerName }: { playerName: string }) => (
    <span role="img" aria-label={playerName} />
  ),
}));
vi.mock("@/hooks/useSoundEffects", () => ({ playSoundEffect: vi.fn() }));
const players = [
  { id: "a", name: "Alex", isHost: true },
  { id: "l", name: "Luna", isHost: false },
];
const scores = players.map((p) => ({
  player_id: p.id,
  player_name: p.name,
  total_points: 20,
  correct_answers: 2,
  average_time_ms: 1500,
}));
afterEach(cleanup);
describe("Bubble quiz interface", () => {
  it("offers categories, consistent settings and a real start action", () => {
    const start = vi.fn(),
      category = vi.fn(),
      settings = vi.fn();
    render(
      <BubbleQuizWaiting
        isHost
        isLoading={false}
        players={players}
        currentPlayerId="a"
        selectedCategory="mixed"
        onCategoryChange={category}
        hostSettings={DEFAULT_QUIZ_SETTINGS}
        onSettingsChange={settings}
        onStart={start}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Science" }));
    expect(category).toHaveBeenCalledWith("science");
    fireEvent.click(screen.getByRole("button", { name: "20s" }));
    expect(settings).toHaveBeenCalledWith({
      ...DEFAULT_QUIZ_SETTINGS,
      answerDurationMs: 20000,
    });
    fireEvent.click(screen.getByRole("button", { name: "Lancer le quiz" }));
    expect(start).toHaveBeenCalledOnce();
  });
  it("shows launch errors with a retry and prevents double starts during loading", () => {
    const props = {
      isHost: true,
      isLoading: false,
      players,
      currentPlayerId: "a",
      selectedCategory: "mixed",
      onCategoryChange: vi.fn(),
      hostSettings: DEFAULT_QUIZ_SETTINGS,
      onSettingsChange: vi.fn(),
      onStart: vi.fn(),
      error: "Le quiz n’a pas démarré.",
    };
    const r = render(<BubbleQuizWaiting {...props} />);
    expect(screen.getByRole("alert").textContent).toContain("pas démarré");
    expect(
      screen.getByRole("button", { name: "Réessayer le lancement" }),
    ).toBeEnabled();
    r.rerender(<BubbleQuizWaiting {...props} isLoading />);
    expect(
      screen.getByRole("button", { name: "On prépare les questions…" }),
    ).toBeDisabled();
  });
  it("guests cannot change rules or launch", () => {
    render(
      <BubbleQuizWaiting
        isHost={false}
        isLoading={false}
        players={players}
        currentPlayerId="l"
        selectedCategory="mixed"
        onCategoryChange={vi.fn()}
        hostSettings={DEFAULT_QUIZ_SETTINGS}
        onSettingsChange={vi.fn()}
        onStart={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Lancer le quiz" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Science" })).toBeNull();
  });
  const question = {
    variant: "inkBeta" as const,
    question: "La planète rouge ?",
    options: ["Mars", "Vénus", "Jupiter", "Neptune"],
    questionType: "qcm" as const,
    category: "science",
    difficulty: "facile",
    roundNumber: 1,
    totalRounds: 10,
    timeRemaining: 20000,
    hasAnswered: false,
    answeredPlayers: [],
    playersRemaining: 2,
    players,
    scores,
    currentPlayerId: "a",
  };
  it("submits the actual option by mouse and keyboard", () => {
    const submit = vi.fn();
    const r = render(<QuizQuestion {...question} onSubmitAnswer={submit} />);
    fireEvent.click(screen.getByRole("button", { name: "A Mars" }));
    expect(submit).toHaveBeenCalledWith("Mars");
    r.unmount();
    render(<QuizQuestion {...question} onSubmitAnswer={submit} />);
    fireEvent.keyDown(window, { key: "b" });
    expect(submit).toHaveBeenLastCalledWith("Vénus");
  });
  it("locks answers and unavailable 50/50 options", () => {
    render(
      <QuizQuestion
        {...question}
        hasAnswered
        hiddenOptions={["Jupiter", "Neptune"]}
        onSubmitAnswer={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "A Mars" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "C Jupiter", hidden: true }),
    ).toBeDisabled();
  });
  it("does not accept keyboard or button answers after the timer expires", () => {
    const submit = vi.fn();
    render(
      <QuizQuestion {...question} timeRemaining={0} onSubmitAnswer={submit} />,
    );
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.click(screen.getByRole("button", { name: "A Mars" }));
    expect(submit).not.toHaveBeenCalled();
  });
  it("lets a player type and validate without intercepting typing shortcuts", () => {
    const submit = vi.fn();
    render(
      <QuizQuestion
        {...question}
        questionType="text"
        options={[]}
        onSubmitAnswer={submit}
      />,
    );
    const input = screen.getByLabelText("Ta réponse");
    fireEvent.change(input, { target: { value: "Mars" } });
    fireEvent.keyDown(input, { key: "a" });
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    expect(submit).toHaveBeenCalledWith("Mars");
  });
  it("makes joker meaning and availability explicit", () => {
    const freeze = vi.fn();
    render(
      <BubbleQuizJokers
        fifty
        freeze
        skip
        onFifty={vi.fn()}
        onFreeze={freeze}
        onSkip={vi.fn()}
        disabled={false}
        allowFifty={false}
      />,
    );
    expect(screen.getByRole("button", { name: /50\/50/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /\+5 secondes/ }));
    expect(freeze).toHaveBeenCalledOnce();
  });
  it("reveals correct answers without silently excluding skipped players", () => {
    render(
      <BubbleQuizReveal
        question="La planète rouge ?"
        correctAnswer="Mars"
        roundAnswers={[
          {
            player_id: "a",
            player_name: "Alex",
            answer: "__SKIP__",
            response_time_ms: 1000,
            is_correct: false,
            points_earned: 0,
          },
        ]}
        isHost={false}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Mars" })).toBeInTheDocument();
    expect(screen.getByText("Question passée")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Voir le classement" }),
    ).toBeNull();
  });
  it("displays tied leaders and actual points rather than a fictional solo winner", () => {
    render(
      <BubbleQuizScores
        scores={scores}
        currentPlayerId="a"
        final
        onContinue={vi.fn()}
      />,
    );
    expect(screen.getByText("En tête, ex æquo")).toBeInTheDocument();
    expect(screen.getAllByText("20")).toHaveLength(3);
  });
  it("uses quiz steps, not imitation labels", () => {
    render(
      <BubbleQuizStage
        phase="answering"
        round={1}
        total={10}
        chat={null}
        onLeave={vi.fn()}
      >
        <div>Question</div>
      </BubbleQuizStage>,
    );
    expect(
      screen.getByRole("list", { name: "Étapes du quiz" }).textContent,
    ).toContain("Les questions");
    expect(screen.queryByText("Ta prise")).toBeNull();
  });
});
