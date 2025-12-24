import { BehaviorSubject, fromEvent, ignoreElements, merge, Observable, shareReplay, tap } from "rxjs";

export interface SelectionProps {
  sandbox: HTMLElement;
  removeSelectedBtn: HTMLButtonElement;
  removeOthersBtn: HTMLButtonElement;
  dedupeBtn: HTMLButtonElement;
}

export function useSelection(props: SelectionProps) {
  const selection$ = new BehaviorSubject<string[]>([]);

  const dedupe = () => {
    const cards = Array.from(props.sandbox.querySelectorAll("concept-card-element")) as HTMLElement[];
    const groups = new Map<string, HTMLElement[]>();

    cards.forEach((card) => {
      const name = card.getAttribute("data-name");
      if (name) {
        if (!groups.has(name)) {
          groups.set(name, []);
        }
        groups.get(name)!.push(card);
      }
    });

    groups.forEach((group) => {
      if (group.length > 1) {
        group.sort((a, b) => {
          const idxA = parseInt(a.getAttribute("data-index") || "0", 10);
          const idxB = parseInt(b.getAttribute("data-index") || "0", 10);
          return idxB - idxA;
        });

        group.slice(1).forEach((card) => card.remove());
      }
    });
  };

  const removeSelected$ = fromEvent(props.removeSelectedBtn, "click").pipe(
    tap(() => {
      props.sandbox.querySelectorAll('concept-card-element[data-selected="true"]').forEach((el) => el.remove());
    })
  );

  const removeOthers$ = fromEvent(props.removeOthersBtn, "click").pipe(
    tap(() => {
      props.sandbox.querySelectorAll('concept-card-element:not([data-selected="true"])').forEach((el) => el.remove());
    })
  );

  const dedupe$ = fromEvent(props.dedupeBtn, "click").pipe(tap(() => dedupe()));

  const click$ = fromEvent<MouseEvent>(props.sandbox, "click").pipe(
    tap((event) => {
      const target = event.target as HTMLElement;
      const card = target.closest("concept-card-element");
      const isMulti = event.ctrlKey || event.metaKey || event.shiftKey;

      if (!card) {
        if (!isMulti) {
          clearSelection(props.sandbox);
        }
        return;
      }

      if (isMulti) {
        toggleSelection(card);
      } else {
        singleSelect(props.sandbox, card);
      }
    })
  );

  const observer$ = new Observable<string[]>((subscriber) => {
    const getSelectedIds = () => Array.from(props.sandbox.querySelectorAll('concept-card-element[data-selected="true"]')).map((el) => el.id);

    const observer = new MutationObserver(() => {
      const ids = getSelectedIds();
      props.removeSelectedBtn.disabled = ids.length === 0;
      props.removeOthersBtn.disabled = ids.length === 0;
      subscriber.next(ids);
    });

    observer.observe(props.sandbox, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-selected", "data-name", "title", "data-emoji"],
      childList: true,
    });

    const initialIds = getSelectedIds();
    props.removeSelectedBtn.disabled = initialIds.length === 0;
    props.removeOthersBtn.disabled = initialIds.length === 0;
    subscriber.next(initialIds);

    return () => observer.disconnect();
  }).pipe(
    tap((ids) => selection$.next(ids)),
    shareReplay(1)
  );

  return {
    selection$,
    dedupe,
    effect$: merge(click$, observer$, removeSelected$, removeOthers$, dedupe$).pipe(ignoreElements()),
  };
}

function clearSelection(container: HTMLElement) {
  container.querySelectorAll('concept-card-element[data-selected="true"]').forEach((el) => {
    el.removeAttribute("data-selected");
  });
}

function toggleSelection(card: Element) {
  if (card.hasAttribute("data-selected")) {
    card.removeAttribute("data-selected");
  } else {
    card.setAttribute("data-selected", "true");
  }
}

function singleSelect(container: HTMLElement, card: Element) {
  container.querySelectorAll('concept-card-element[data-selected="true"]').forEach((el) => {
    if (el !== card) el.removeAttribute("data-selected");
  });
  card.setAttribute("data-selected", "true");
}
