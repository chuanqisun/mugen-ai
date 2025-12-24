import { BehaviorSubject, EMPTY, fromEvent, merge, of, timer } from "rxjs";
import { catchError, concatMap, finalize, mergeMap, switchMap, tap } from "rxjs/operators";
import { ConceptCardElement } from "../cards/concept-card-element";

interface Action {
  type: "split" | "mix" | "create";
  targets: ConceptCardElement[];
  description: string;
}

export function useAuto(options: { autoBtn: HTMLButtonElement; sandbox: HTMLElement; dedupe?: () => void }) {
  const isAuto$ = new BehaviorSubject<boolean>(false);
  const activeActions$ = new BehaviorSubject<string[]>([]);

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

      return timer(0, 2000).pipe(
        concatMap(() => of(planAction(options.sandbox))),
        mergeMap((action) => {
          if (!action) return EMPTY;

          const actionId = action.description;
          activeActions$.next([...activeActions$.value, actionId]);
          console.log("Active actions:", activeActions$.value);

          return executeAction(action, options.sandbox).pipe(
            catchError((err) => {
              console.error("Action failed", err);
              return EMPTY;
            }),
            finalize(() => {
              activeActions$.next(activeActions$.value.filter((id) => id !== actionId));
              console.log("Active actions:", activeActions$.value);
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

function planAction(sandbox: HTMLElement): Action | null {
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
    // Mix
    const idx1 = Math.floor(Math.random() * idleCards.length);
    let idx2 = Math.floor(Math.random() * idleCards.length);
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * idleCards.length);
    }
    const card1 = idleCards[idx1];
    const card2 = idleCards[idx2];
    return {
      type: "mix",
      targets: [card1, card2],
      description: `Mix ${card1.getAttribute("data-name")} + ${card2.getAttribute("data-name")}`,
    };
  } else {
    // Split
    const idx = Math.floor(Math.random() * idleCards.length);
    const card = idleCards[idx];
    return {
      type: "split",
      targets: [card],
      description: `Split ${card.getAttribute("data-name")}`,
    };
  }
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
