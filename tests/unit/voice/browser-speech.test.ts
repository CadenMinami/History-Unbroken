import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createBrowserSpeechAdapter,
  isBrowserSpeechSupported,
  type BrowserSpeechDriver,
  type BrowserSpeechHandlers,
} from "@/lib/voice/browser-speech";

type TestUtterance = Readonly<{
  text: string;
  handlers: BrowserSpeechHandlers;
}>;

function createTestDriver() {
  const utterances: TestUtterance[] = [];
  const createUtterance = vi.fn(
    (text: string, handlers: BrowserSpeechHandlers): TestUtterance => {
      const utterance = { text, handlers };
      utterances.push(utterance);
      return utterance;
    },
  );
  const speak = vi.fn();
  const cancel = vi.fn();
  const driver: BrowserSpeechDriver = {
    createUtterance,
    speak,
    cancel,
  };

  return { cancel, createUtterance, driver, speak, utterances };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser speech adapter", () => {
  it("detects whether browser speech synthesis is available", () => {
    const { driver } = createTestDriver();

    expect(isBrowserSpeechSupported(driver)).toBe(true);
    expect(isBrowserSpeechSupported(null)).toBe(false);
  });

  it("does not play anything until speak is explicitly called", () => {
    const { cancel, createUtterance, driver, speak } = createTestDriver();

    const adapter = createBrowserSpeechAdapter(driver);

    expect(adapter.getStatus()).toBe("idle");
    expect(createUtterance).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("speaks the exact response text and reports completion", async () => {
    const { driver, speak, utterances } = createTestDriver();
    const adapter = createBrowserSpeechAdapter(driver);
    const responseText = "  An authored NPC response.  ";

    const result = adapter.speak(responseText);

    expect(adapter.getStatus()).toBe("speaking");
    expect(utterances[0]?.text).toBe(responseText);
    expect(speak).toHaveBeenCalledWith(utterances[0]);

    utterances[0]?.handlers.onEnd();

    await expect(result).resolves.toEqual({ status: "completed" });
    expect(adapter.getStatus()).toBe("idle");
  });

  it("cancels active speech and settles its pending result", async () => {
    const { cancel, driver } = createTestDriver();
    const adapter = createBrowserSpeechAdapter(driver);
    const pending = adapter.speak("A generated NPC response.");

    expect(adapter.cancel()).toEqual({ status: "cancelled" });

    expect(cancel).toHaveBeenCalledOnce();
    await expect(pending).resolves.toEqual({ status: "cancelled" });
    expect(adapter.getStatus()).toBe("idle");
  });

  it("reports an idle cancellation without invoking the browser", () => {
    const { cancel, driver } = createTestDriver();
    const adapter = createBrowserSpeechAdapter(driver);

    expect(adapter.cancel()).toEqual({ status: "idle" });
    expect(cancel).not.toHaveBeenCalled();
  });

  it("fails quietly when speech synthesis is unsupported", async () => {
    const adapter = createBrowserSpeechAdapter(null);

    expect(adapter.getStatus()).toBe("unsupported");
    await expect(adapter.speak("Still visible as a caption.")).resolves.toEqual({
      status: "unsupported",
      error: "speech_synthesis_unavailable",
    });
    expect(adapter.cancel()).toEqual({
      status: "unsupported",
      error: "speech_synthesis_unavailable",
    });
  });

  it("rejects blank text as a quiet error", async () => {
    const { createUtterance, driver, speak } = createTestDriver();
    const adapter = createBrowserSpeechAdapter(driver);

    await expect(adapter.speak("   ")).resolves.toEqual({
      status: "error",
      error: "empty_text",
    });
    expect(adapter.getStatus()).toBe("idle");
    expect(createUtterance).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
  });

  it("converts browser playback exceptions into a quiet error", async () => {
    const { driver, speak } = createTestDriver();
    speak.mockImplementation(() => {
      throw new Error("browser refused playback");
    });
    const adapter = createBrowserSpeechAdapter(driver);

    await expect(adapter.speak("Visible response text.")).resolves.toEqual({
      status: "error",
      error: "speech_synthesis_failed",
    });
    expect(adapter.getStatus()).toBe("idle");
  });

  it("converts asynchronous synthesis failures into a quiet error", async () => {
    const { driver, utterances } = createTestDriver();
    const adapter = createBrowserSpeechAdapter(driver);
    const result = adapter.speak("Visible response text.");

    utterances[0]?.handlers.onError();

    await expect(result).resolves.toEqual({
      status: "error",
      error: "speech_synthesis_failed",
    });
    expect(adapter.getStatus()).toBe("idle");
  });

  it("does not consult reduced-motion preferences", async () => {
    const matchMedia = vi.fn(() => {
      throw new Error("reduced motion is unrelated to speech");
    });
    vi.stubGlobal("matchMedia", matchMedia);
    const { driver, utterances } = createTestDriver();
    const adapter = createBrowserSpeechAdapter(driver);
    const result = adapter.speak("An audible caption.");

    utterances[0]?.handlers.onEnd();

    await expect(result).resolves.toEqual({ status: "completed" });
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it("has no case-state input or mutation path", async () => {
    const caseState = Object.freeze({ revision: 7, inspectedItemIds: ["E3"] });
    const before = structuredClone(caseState);
    const { driver, utterances } = createTestDriver();
    const adapter = createBrowserSpeechAdapter(driver);
    const result = adapter.speak("A non-authoritative response.");

    utterances[0]?.handlers.onEnd();
    await result;

    expect(caseState).toEqual(before);
  });
});
