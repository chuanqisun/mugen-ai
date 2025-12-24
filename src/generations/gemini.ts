import { GoogleGenAI } from "@google/genai";
import { JSONParser } from "@streamparser/json";
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

export interface BasicConcept {
  name: string;
  description: string;
}

export function mixConcepts(props: { apiKey: string; concepts: BasicConcept[] }): Observable<ConceptBlueprint> {
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

export function splitConcept(props: { apiKey: string; concept: BasicConcept }): Observable<ConceptBlueprint> {
  return new Observable<ConceptBlueprint>((subscriber) => {
    const abortController = new AbortController();
    const ai = new GoogleGenAI({ apiKey: props.apiKey });

    const parser = new JSONParser();
    parser.onValue = (entry) => {
      if (typeof entry.key === "number" && entry.value && typeof entry.value === "object") {
        const concept = entry.value as unknown as ConceptBlueprint;
        if (concept.name && concept.description && concept.emoji) {
          subscriber.next(concept);
        }
      }
    };

    ai.models
      .generateContentStream({
        model: "gemini-3-flash-preview",
        contents: `Concept: ${props.concept.name} - ${props.concept.description}`,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
          systemInstruction: `Decompose the provided concept into two component concepts that could logically combine to form it. Focus on fundamental components. Respond in JSON format as an array of exactly two objects, each with the following fields: emoji (string), name (string), description (string). Example response: [{"emoji":"🔥","name":"Fire","description":"A hot, glowing body of ignited gas."},{"emoji":"💧","name":"Water","description":"A clear, colorless, odorless liquid."}].`,
          abortSignal: abortController.signal,
          responseMimeType: "application/json",
          responseJsonSchema: zodToJsonSchema(z.array(newBluePrintSchema).length(2) as any),
        },
      })
      .then(async (res) => {
        try {
          for await (const chunk of res) {
            if (chunk.text) {
              parser.write(chunk.text);
            }
          }
          subscriber.complete();
        } catch (e) {
          subscriber.error(e);
        }
      })
      .catch((err) => subscriber.error(err));

    return () => abortController.abort();
  });
}
