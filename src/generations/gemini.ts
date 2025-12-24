import { GoogleGenAI } from "@google/genai";
import { Observable } from "rxjs";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import type { ConceptBlueprint } from "../store/types";

export function testGemini$(apiKey: string) {
  return new Observable<string>((subscriber) => {
    const abortController = new AbortController();
    const ai = new GoogleGenAI({ apiKey });

    ai.models
      .generateContent({
        model: "gemini-flash-lite-latest",
        contents: `Just respond with "OK".`,
        config: {
          abortSignal: abortController.signal,
        },
      })
      .then((res) => {
        subscriber.next(res.text ?? "<No response>");
      })
      .catch((err) => subscriber.next(`<Error: ${err.message}>`))
      .finally(() => {
        subscriber.complete();
      });

    return () => abortController.abort();
  });
}

const newBluePrintSchema = z.object({
  description: z.string().describe("One short sentence summarize the concept"),
  name: z.string().describe("A short name for the concept"),
  emoji: z.string().describe("A single emoji representing the concept"),
});

export function createConcept(props: { apiKey: string; prompt: string }): Observable<ConceptBlueprint> {
  return new Observable<ConceptBlueprint>((subscriber) => {
    const abortController = new AbortController();
    const ai = new GoogleGenAI({ apiKey: props.apiKey });

    ai.models
      .generateContent({
        model: "gemini-3-flash-preview",
        contents: props.prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
          systemInstruction: `Capture the user provided concept. Respond in JSON format with the following fields: emoji (string), name (string), description (string). Example response: {"emoji":"🔥","name":"Fire","description":"A fiery creature that burns everything in its path."}.`,
          abortSignal: abortController.signal,
          responseMimeType: "application/json",
          responseJsonSchema: zodToJsonSchema(newBluePrintSchema as any),
        },
      })
      .then((res) => {
        try {
          const concept: ConceptBlueprint = JSON.parse(res.text ?? "");
          subscriber.next(concept);
        } catch (e) {
          subscriber.error(new Error("Failed to parse concept blueprint from response."));
        }
      })
      .catch((err) => subscriber.error(err))
      .finally(() => {
        subscriber.complete();
      });

    return () => abortController.abort();
  });
}

export interface MixableConcept {
  name: string;
  description: string;
}

export function mixConcepts(props: { apiKey: string; concepts: MixableConcept[] }): Observable<ConceptBlueprint> {
  return new Observable<ConceptBlueprint>((subscriber) => {
    const abortController = new AbortController();
    const ai = new GoogleGenAI({ apiKey: props.apiKey });

    const conceptDescriptions = props.concepts.map((c, index) => `Concept ${index + 1}: ${c.name} - ${c.description}`).join("\n");

    ai.models
      .generateContent({
        model: "gemini-3-flash-preview",
        contents: conceptDescriptions,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
          systemInstruction: `Create a new concept by mixing the provided concepts. Focus on deep conceptual blending rather than shallow semantic mixing. The result concept name should not increase in length but instead, align with established concepts. Respond in JSON format with the following fields: emoji (string), name (string), description (string). Example response: {"emoji":"🌪️","name":"Storm","description":"A swirling entity that commands wind and rain."}.`,
          abortSignal: abortController.signal,
          responseMimeType: "application/json",
          responseJsonSchema: zodToJsonSchema(newBluePrintSchema as any),
        },
      })
      .then((res) => {
        try {
          const concept: ConceptBlueprint = JSON.parse(res.text ?? "");
          subscriber.next(concept);
        } catch (e) {
          subscriber.error(new Error("Failed to parse concept blueprint from response."));
        }
      })
      .catch((err) => subscriber.error(err))
      .finally(() => {
        subscriber.complete();
      });

    return () => abortController.abort();
  });
}
