import { GoogleGenAI } from "@google/genai";
import { Observable } from "rxjs";
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

export function createConcept(apiKey: string): Observable<ConceptBlueprint> {
  return new Observable<ConceptBlueprint>((subscriber) => {
    const abortController = new AbortController();
    const ai = new GoogleGenAI({ apiKey });

    ai.models
      .generateContent({
        model: "gemini-flash-lite-latest",
        contents: `Generate a random concept blueprint for a game. Respond in JSON format with the following fields: id (number), emoji (string), name (string), description (string), recipe (array of numbers). Example response: {"id":1,"emoji":"🔥","name":"Fire Elemental","description":"A fiery creature that burns everything in its path.","recipe":[2,3]}.`,
        config: {
          abortSignal: abortController.signal,
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
