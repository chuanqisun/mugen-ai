import { fromEvent, ignoreElements, merge, Observable, tap } from "rxjs";

export interface DetailsProps {
  detailsHeader: HTMLElement;
  detailsContent: HTMLElement;
  selection$: Observable<string[]>;
  removeSelected: () => void;
  removeOthers: () => void;
}

export function useDetails(props: DetailsProps) {
  const removeBtn = document.createElement("button");
  removeBtn.textContent = "Remove";

  const removeOthersBtn = document.createElement("button");
  removeOthersBtn.textContent = "Remove others";

  const removeClick$ = fromEvent(removeBtn, "click").pipe(
    tap(() => props.removeSelected()),
    ignoreElements()
  );

  const removeOthersClick$ = fromEvent(removeOthersBtn, "click").pipe(
    tap(() => props.removeOthers()),
    ignoreElements()
  );

  const selectionEffect$ = props.selection$.pipe(
    tap((ids) => {
      if (ids.length > 0) {
        if (!removeBtn.parentElement) props.detailsHeader.appendChild(removeBtn);
        if (!removeOthersBtn.parentElement) props.detailsHeader.appendChild(removeOthersBtn);
      } else {
        removeBtn.remove();
        removeOthersBtn.remove();
      }

      if (ids.length === 0) {
        props.detailsContent.innerHTML = `
          <div class="details-hint">
            <h2>Tips</h2>
            <ol class="tip-list">
              <li>Click to view details</li>
              <li>Drag and drop to mix</li>
              <li>Double click to split</li>
              <li>Ctrl/Cmd click to multi-select</li>
            </ol>
          </div>
        `;
      } else if (ids.length === 1) {
        const element = document.getElementById(ids[0]);
        if (element) {
          const name = element.getAttribute("data-name") || "Generating...";
          const description = element.title || "Please wait while the concept is being generated.";
          const emoji = element.getAttribute("data-emoji") || "⏳";

          props.detailsContent.innerHTML = `
            <div class="details-item">
              <h2>${emoji} ${name}</h2>
              <p>${description}</p>
            </div>
          `;
        }
      } else {
        props.detailsContent.innerHTML = `
          <div class="details-hint">
            <p>${ids.length} items selected</p>
          </div>
        `;
      }
    }),
    ignoreElements()
  );

  return {
    effect$: merge(selectionEffect$, removeClick$, removeOthersClick$),
  };
}
