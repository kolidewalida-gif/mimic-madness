// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useQuizGame } from "../useQuizGame";
const m = vi.hoisted(() => ({
  from: vi.fn(),
  invoke: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: m.from,
    functions: { invoke: m.invoke },
    channel: m.channel,
    removeChannel: m.removeChannel,
  },
}));
vi.mock("@/hooks/useSoundEffects", () => ({ playSoundEffect: vi.fn() }));
vi.mock("@/hooks/usePlayerLevel", () => ({
  usePlayerLevel: () => ({ addXp: vi.fn() }),
  XP_REWARDS: { quizCorrectAnswer: 10 },
}));
vi.mock("@/components/XpGainPopup", () => ({ emitXpGain: vi.fn() }));
vi.mock("@/components/RewardNotification", () => ({
  emitLevelUpNotification: vi.fn(),
}));
const players = [
  { id: "host", name: "Alex", isHost: true },
  { id: "guest", name: "Luna", isHost: false },
];
let rows: Record<string, unknown>[];
let failInsert: boolean;
let failDelete: boolean;
function query(table: string) {
  let op = "select";
  let patch: Record<string, unknown> = {};
  let single = false;
  const filters: Record<string, unknown> = {};
  const q = {
    select() {
      return q;
    },
    eq(k: string, v: unknown) {
      filters[k] = v;
      return q;
    },
    is(k: string, v: unknown) {
      filters[k] = v;
      return q;
    },
    order() {
      return q;
    },
    limit() {
      return q;
    },
    maybeSingle() {
      single = true;
      return q;
    },
    single() {
      single = true;
      return q;
    },
    delete() {
      op = "delete";
      return q;
    },
    update(v: Record<string, unknown>) {
      op = "update";
      patch = v;
      return q;
    },
    insert(v: Record<string, unknown>) {
      op = "insert";
      patch = v;
      return q;
    },
    then(resolve: (v: unknown) => unknown) {
      let data: unknown = [];
      let error: unknown = null;
      if (op === "delete" && failDelete) error = { message: "Offline" };
      if (table === "quiz_rounds") {
        const matches = () =>
          rows.filter((row) =>
            Object.entries(filters).every(([k, v]) => row[k] === v),
          );
        if (op === "delete" && !error) rows = [];
        if (op === "insert") {
          if (failInsert) error = { message: "Insert failed" };
          else {
            const row = {
              ...patch,
              id: "round-" + patch.round_number,
              created_at: new Date().toISOString(),
            };
            rows.push(row);
            data = row;
          }
        } else if (op === "update") {
          data = matches().map((row) => Object.assign(row, patch));
          if (single) data = (data as unknown[])[0] ?? null;
        } else if (op === "select") {
          const selected = matches().sort(
            (a, b) => Number(b.round_number) - Number(a.round_number),
          );
          data = single ? (selected[0] ?? null) : selected;
        }
      }
      return Promise.resolve({ data: structuredClone(data), error }).then(
        resolve,
      );
    },
  };
  return q;
}
const flush = async () => {
  for (let i = 0; i < 15; i++) await Promise.resolve();
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
  rows = [];
  failInsert = false;
  failDelete = false;
  m.from.mockImplementation(query);
  m.invoke.mockResolvedValue({
    data: {
      question: "Quelle planète est surnommée la planète rouge ?",
      answer: "Mars",
      options: ["Mars", "Vénus", "Jupiter", "Neptune"],
      category: "science",
      difficulty: "facile",
    },
    error: null,
  });
  m.channel.mockImplementation(() => {
    const c = {
      on: () => c,
      subscribe: (cb: (s: string) => void) => {
        cb("SUBSCRIBED");
        return c;
      },
    };
    return c;
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe("real quiz hook — launch and lost realtime", () => {
  it("enters the question after countdown without receiving any realtime event", async () => {
    const { result } = renderHook(() =>
      useQuizGame("local", players[0], players),
    );
    await act(flush);
    await act(async () => {
      await result.current.startQuiz("science");
      await flush();
    });
    expect(result.current.phase).toBe("countdown");
    expect(result.current.isLoading).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
      await flush();
    });
    expect(result.current.phase).toBe("answering");
    expect(result.current.currentQuestion?.answer).toBe("Mars");
    expect(result.current.timeRemaining).toBeGreaterThan(0);
  });
  it("does not stay loading after a failed round insert and lets the host retry", async () => {
    const { result } = renderHook(() =>
      useQuizGame("local", players[0], players),
    );
    await act(flush);
    failInsert = true;
    await act(async () => {
      await result.current.startQuiz();
      await flush();
    });
    expect(result.current.phase).toBe("waiting");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.startError).toBeTruthy();
    failInsert = false;
    await act(async () => {
      await result.current.startQuiz();
      await flush();
    });
    expect(result.current.phase).toBe("countdown");
    expect(result.current.startError).toBeNull();
  });
  it("reports a cleanup failure and releases the start lock", async () => {
    const { result } = renderHook(() =>
      useQuizGame("local", players[0], players),
    );
    await act(flush);
    failDelete = true;
    await act(async () => {
      await result.current.startQuiz();
      await flush();
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.startError).toBeTruthy();
    failDelete = false;
    await act(async () => {
      await result.current.startQuiz();
      await flush();
    });
    expect(result.current.phase).toBe("countdown");
  });
  it("recovers a missed start on the guest by reading server state", async () => {
    const host = renderHook(() => useQuizGame("local", players[0], players));
    const guest = renderHook(() => useQuizGame("local", players[1], players));
    await act(flush);
    await act(async () => {
      await host.result.current.startQuiz();
      await flush();
    });
    expect(guest.result.current.phase).toBe("waiting");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
      await flush();
    });
    expect(guest.result.current.phase).toBe("answering");
  });
  it("advances reveal and scores using confirmed writes, not its own broadcast", async () => {
    const { result } = renderHook(() =>
      useQuizGame("local", players[0], players),
    );
    await act(flush);
    await act(async () => {
      await result.current.startQuiz();
      await flush();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
      await flush();
    });
    await act(async () => {
      await result.current.advanceToReveal();
      await flush();
    });
    expect(result.current.phase).toBe("reveal");
    await act(async () => {
      await result.current.advanceToScores();
      await flush();
    });
    expect(result.current.phase).toBe("scores");
    await act(async () => {
      await result.current.nextRound();
      await flush();
    });
    expect(result.current.currentRound).toBe(2);
    expect(result.current.phase).toBe("countdown");
  });
  it("a double click creates only one first round", async () => {
    const { result } = renderHook(() =>
      useQuizGame("local", players[0], players),
    );
    await act(flush);
    await act(async () => {
      await Promise.all([
        result.current.startQuiz(),
        result.current.startQuiz(),
      ]);
      await flush();
    });
    expect(rows.filter((r) => r.round_number === 1)).toHaveLength(1);
    expect(m.invoke).toHaveBeenCalledWith(
      "generate-quiz-question",
      expect.objectContaining({ timeout: 12000 }),
    );
  });
  it("still launches with the fallback question if generation fails", async () => {
    m.invoke.mockRejectedValue(new Error("Generation timed out"));
    const { result } = renderHook(() =>
      useQuizGame("local", players[0], players),
    );
    await act(flush);
    await act(async () => {
      await result.current.startQuiz();
      await flush();
    });
    expect(result.current.phase).toBe("countdown");
    expect(result.current.currentQuestion?.answer).toBe("Paris");
    expect(result.current.isLoading).toBe(false);
  });
  it("reaches the final podium without its own realtime events", async () => {
    const settings = {
      totalRounds: 5,
      answerDurationMs: 30000,
      difficulty: "mixed" as const,
      questionMode: "qcm" as const,
      enableJokers: true,
      enableStreak: true,
    };
    const { result } = renderHook(() =>
      useQuizGame("local", players[0], players, "science", settings),
    );
    await act(flush);
    await act(async () => {
      await result.current.startQuiz();
      await flush();
    });
    for (let round = 1; round <= 5; round++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500);
        await flush();
      });
      expect(result.current.currentRound).toBe(round);
      expect(result.current.phase).toBe("answering");
      await act(async () => {
        await result.current.advanceToReveal();
        await flush();
      });
      await act(async () => {
        await result.current.advanceToScores();
        await flush();
      });
      await act(async () => {
        await result.current.nextRound();
        await flush();
      });
    }
    expect(result.current.phase).toBe("final");
  });
});
