import { BehaviorSubject, fromEvent, ignoreElements, merge, Observable, shareReplay, tap } from "rxjs";

export interface SelectionProps {
  sandbox: HTMLElement;
}

export function useSelection(props: SelectionProps) {
  const selection$ = new BehaviorSubject<string[]>([]);

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
      subscriber.next(getSelectedIds());
    });

    observer.observe(props.sandbox, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-selected", "data-name", "title", "data-emoji"],
      childList: true,
    });

    subscriber.next(getSelectedIds());

    return () => observer.disconnect();
  }).pipe(
    tap((ids) => selection$.next(ids)),
    shareReplay(1)
  );

  return {
    selection$,
    removeSelected: () => {
      props.sandbox.querySelectorAll('concept-card-element[data-selected="true"]').forEach((el) => el.remove());
    },
    removeOthers: () => {
      props.sandbox.querySelectorAll("concept-card-element:not([data-selected=\"true\"])").forEach((el) => el.remove());
    },
    effect$: merge(click$, observer$).pipe(ignoreElements()),
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
