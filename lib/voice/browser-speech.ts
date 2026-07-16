export type BrowserSpeechStatus = "unsupported" | "idle" | "speaking";

export type BrowserSpeechError =
  | "speech_synthesis_unavailable"
  | "empty_text"
  | "speech_synthesis_failed";

export type BrowserSpeechResult =
  | Readonly<{ status: "completed" }>
  | Readonly<{ status: "cancelled" }>
  | Readonly<{ status: "idle" }>
  | Readonly<{
      status: "unsupported";
      error: "speech_synthesis_unavailable";
    }>
  | Readonly<{
      status: "error";
      error: Exclude<BrowserSpeechError, "speech_synthesis_unavailable">;
    }>;

export type BrowserSpeechHandlers = Readonly<{
  onEnd: () => void;
  onError: () => void;
}>;

export type BrowserSpeechDriver = Readonly<{
  createUtterance: (text: string, handlers: BrowserSpeechHandlers) => unknown;
  speak: (utterance: unknown) => void;
  cancel: () => void;
}>;

export type BrowserSpeechAdapter = Readonly<{
  isSupported: () => boolean;
  getStatus: () => BrowserSpeechStatus;
  speak: (text: string) => Promise<BrowserSpeechResult>;
  cancel: () => BrowserSpeechResult;
}>;

const unsupportedResult: BrowserSpeechResult = {
  status: "unsupported",
  error: "speech_synthesis_unavailable",
};

const synthesisErrorResult: BrowserSpeechResult = {
  status: "error",
  error: "speech_synthesis_failed",
};

function detectBrowserSpeechDriver(): BrowserSpeechDriver | null {
  try {
    if (typeof window === "undefined") return null;

    const synthesis = window.speechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance;
    if (
      !synthesis ||
      typeof synthesis.speak !== "function" ||
      typeof synthesis.cancel !== "function" ||
      typeof Utterance !== "function"
    ) {
      return null;
    }

    return {
      createUtterance(text, handlers) {
        const utterance = new Utterance(text);
        utterance.addEventListener("end", handlers.onEnd, { once: true });
        utterance.addEventListener("error", handlers.onError, { once: true });
        return utterance;
      },
      speak(utterance) {
        synthesis.speak(utterance as SpeechSynthesisUtterance);
      },
      cancel() {
        synthesis.cancel();
      },
    };
  } catch {
    return null;
  }
}

export function isBrowserSpeechSupported(
  driver: BrowserSpeechDriver | null = detectBrowserSpeechDriver(),
): boolean {
  return driver !== null;
}

export function createBrowserSpeechAdapter(
  driver: BrowserSpeechDriver | null = detectBrowserSpeechDriver(),
): BrowserSpeechAdapter {
  let status: BrowserSpeechStatus = driver ? "idle" : "unsupported";
  let active:
    | Readonly<{
        resolve: (result: BrowserSpeechResult) => void;
      }>
    | null = null;

  function settle(
    speech: NonNullable<typeof active>,
    result: BrowserSpeechResult,
  ): void {
    if (active !== speech) return;

    active = null;
    status = "idle";
    speech.resolve(result);
  }

  function cancel(): BrowserSpeechResult {
    if (!driver) return unsupportedResult;
    if (!active) return { status: "idle" };

    const speech = active;
    active = null;
    status = "idle";

    try {
      driver.cancel();
    } catch {
      speech.resolve(synthesisErrorResult);
      return synthesisErrorResult;
    }

    const result: BrowserSpeechResult = { status: "cancelled" };
    speech.resolve(result);
    return result;
  }

  function speak(text: string): Promise<BrowserSpeechResult> {
    if (!driver) return Promise.resolve(unsupportedResult);
    if (text.trim().length === 0) {
      return Promise.resolve({ status: "error", error: "empty_text" });
    }

    if (active) {
      const cancellation = cancel();
      if (cancellation.status === "error") {
        return Promise.resolve(cancellation);
      }
    }

    return new Promise((resolve) => {
      const speech = { resolve };
      active = speech;
      status = "speaking";

      try {
        const utterance = driver.createUtterance(text, {
          onEnd: () => settle(speech, { status: "completed" }),
          onError: () => settle(speech, synthesisErrorResult),
        });
        driver.speak(utterance);
      } catch {
        settle(speech, synthesisErrorResult);
      }
    });
  }

  return {
    isSupported: () => driver !== null,
    getStatus: () => status,
    speak,
    cancel,
  };
}
