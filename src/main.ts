import { ConceptCardElement } from "./cards/concept-card-element";
import { useConnections } from "./connections/connections";
import { useCreation } from "./creation/creation";
import { useDetails } from "./details/details";
import { useSelection } from "./selection/selection";
import "./style.css";

ConceptCardElement.define();

async function main() {
  const sandbox = document.querySelector<HTMLElement>("#sandbox")!;

  const connections = useConnections({
    connectionForm: document.querySelector<HTMLFormElement>("#connection-form")!,
  });

  const creation = useCreation({
    creationForm: document.querySelector<HTMLFormElement>("#creation-form")!,
    sandbox,
  });

  const selection = useSelection({
    sandbox,
    removeSelectedBtn: document.querySelector<HTMLButtonElement>("#remove-selected-btn")!,
    removeOthersBtn: document.querySelector<HTMLButtonElement>("#remove-others-btn")!,
  });

  const details = useDetails({
    detailsContent: document.querySelector<HTMLElement>("#details-content")!,
    selection$: selection.selection$,
  });

  connections.effect$.subscribe();
  creation.effect$.subscribe();
  selection.effect$.subscribe();
  details.effect$.subscribe();
}

main();
