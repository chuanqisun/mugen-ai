import { Observable, tap } from "rxjs";

export interface DetailsProps {
  detailsContent: HTMLElement;
  selection$: Observable<string[]>;
}

export function useDetails(props: DetailsProps) {
  const effect$ = props.selection$.pipe(
    tap((ids) => {
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
    })
  );

  return {
    effect$,
  };
}
