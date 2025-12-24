import { BehaviorSubject, EMPTY, fromEvent, merge, of, timer } from "rxjs";
import { catchError, filter, finalize, map, mergeMap, switchMap, tap } from "rxjs/operators";
import { ConceptCardElement } from "../cards/concept-card-element";

interface Action {
  type: "split" | "mix" | "create";
  targets: ConceptCardElement[];
  description: string;
}

export function useAuto(options: { autoBtn: HTMLButtonElement; sandbox: HTMLElement; dedupe?: () => void }) {
  const isAuto$ = new BehaviorSubject<boolean>(false);
  const activeActions$ = new BehaviorSubject<string[]>([]);
  const activeSplits = new Set<string>();
  const activeMixes = new Set<string>();
  let activeCount = 0;

  const toggle$ = fromEvent(options.autoBtn, "click").pipe(
    tap(() => isAuto$.next(!isAuto$.value)),
    tap((_) => {
      const active = isAuto$.value;
      options.autoBtn.textContent = `Auto: ${active ? "on" : "off"}`;
      options.autoBtn.classList.toggle("active", active);
    })
  );

  const autoRun$ = isAuto$.pipe(
    switchMap((active) => {
      if (!active) return EMPTY;

      return timer(0, 500).pipe(
        filter(() => activeCount < 3),
        map(() => planAction(options.sandbox, activeSplits, activeMixes)),
        filter((action): action is Action => action !== null),
        mergeMap((action) => {
          activeCount++;
          const actionId = action.description;
          activeActions$.next([...activeActions$.value, actionId]);
          console.log("Active actions:", activeActions$.value);

          const targets = action.targets.map((t) => t.id);
          let mixKey: string | null = null;
          if (action.type === "split") {
            activeSplits.add(targets[0]);
          } else if (action.type === "mix") {
            mixKey = getMixKey(targets[0], targets[1]);
            activeMixes.add(mixKey);
          }

          return executeAction(action, options.sandbox).pipe(
            catchError((err) => {
              console.error("Action failed", err);
              return EMPTY;
            }),
            finalize(() => {
              activeCount--;
              activeActions$.next(activeActions$.value.filter((id) => id !== actionId));
              console.log("Active actions:", activeActions$.value);

              if (action.type === "split") {
                activeSplits.delete(targets[0]);
              } else if (action.type === "mix" && mixKey) {
                activeMixes.delete(mixKey);
              }

              options.dedupe?.();
            })
          );
        }, 3)
      );
    })
  );

  const effect$ = merge(toggle$, autoRun$);

  return { isAuto$, effect$ };
}

function getMixKey(id1: string, id2: string) {
  return [id1, id2].sort().join(":");
}

function planAction(sandbox: HTMLElement, activeSplits: Set<string>, activeMixes: Set<string>): Action | null {
  const cards = Array.from(sandbox.querySelectorAll("concept-card-element")) as ConceptCardElement[];
  const idleCards = cards.filter((c) => {
    const text = c.textContent || "";
    return !text.includes("Generating...") && !text.includes("Mixing...") && !text.includes("Splitting...") && !c.classList.contains("placeholder");
  });

  if (idleCards.length === 0) {
    // If no cards, create one to start
    if (cards.length === 0) {
      return {
        type: "create",
        targets: [],
        description: "Create initial concept",
      };
    }
    return null;
  }

  // Random strategy
  const strategy = Math.random();

  if (idleCards.length >= 2 && strategy > 0.5) {
    // Try to find a pair that isn't currently mixing
    const shuffled = biasedShuffle(idleCards);
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        const c1 = shuffled[i];
        const c2 = shuffled[j];
        const key = getMixKey(c1.id, c2.id);
        if (!activeMixes.has(key)) {
          return {
            type: "mix",
            targets: [c1, c2],
            description: `Mix ${c1.getAttribute("data-name")} + ${c2.getAttribute("data-name")}`,
          };
        }
      }
    }
  }

  // Fallback to split or if strategy was split
  const shuffledForSplit = biasedShuffle(idleCards);
  for (const card of shuffledForSplit) {
    if (!activeSplits.has(card.id)) {
      return {
        type: "split",
        targets: [card],
        description: `Split ${card.getAttribute("data-name")}`,
      };
    }
  }

  return null;
}

function executeAction(action: Action, sandbox: HTMLElement) {
  if (action.type === "create") {
    const prompts = ["Universe", "Life", "Time", "Space", "Energy"];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    const card = ConceptCardElement.createFromPrompt(prompt);
    sandbox.appendChild(card);
    return card.task$ || of(null);
  }

  if (action.type === "mix") {
    const card = ConceptCardElement.createFromMix(...action.targets);
    sandbox.appendChild(card);
    return card.task$ || of(null);
  }

  if (action.type === "split") {
    return action.targets[0].handleSplit();
  }

  return EMPTY;
}

function biasedShuffle<T>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, weight: Math.random() * (index + 1) }))
    .sort((a, b) => b.weight - a.weight)
    .map((x) => x.item);
}
