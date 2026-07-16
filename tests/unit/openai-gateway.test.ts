import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import { OpenAIModelGateway } from "@/lib/openai/openai-model-gateway";

const outputSchema = z.object({ answer: z.string() }).strict();

describe("OpenAIModelGateway", () => {
  it("uses the Responses API with storage disabled and a bounded timeout", async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: { answer: "bounded" } });
    const gateway = new OpenAIModelGateway({
      client: { responses: { parse } },
      model: "gpt-5.6",
      timeoutMs: 8_000,
    });
    const controller = new AbortController();

    await expect(
      gateway.generateStructured({
        schema: outputSchema,
        schemaName: "bounded_answer",
        instructions: "Use only authorized facts.",
        input: "Student question",
        maxOutputTokens: 300,
        signal: controller.signal,
      }),
    ).resolves.toEqual({ answer: "bounded" });

    expect(parse).toHaveBeenCalledOnce();
    expect(parse.mock.calls[0]?.[0]).toMatchObject({
      model: "gpt-5.6",
      instructions: "Use only authorized facts.",
      input: "Student question",
      max_output_tokens: 300,
      store: false,
    });
    expect(parse.mock.calls[0]?.[1]).toEqual({
      timeout: 8_000,
      signal: controller.signal,
    });
  });

  it("rejects missing or malformed parsed output", async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: { answer: 42 } });
    const gateway = new OpenAIModelGateway({
      client: { responses: { parse } },
      model: "gpt-5.6",
    });

    await expect(
      gateway.generateStructured({
        schema: outputSchema,
        schemaName: "bounded_answer",
        instructions: "Use only authorized facts.",
        input: "Student question",
        maxOutputTokens: 300,
      }),
    ).rejects.toThrow(/structured output/i);
  });
});
