import { ConceptCardElement } from "./cards/concept-card-element";
import { useConnections } from "./connections/connections";
import { useCreation } from "./creation/creation";
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
  });

  connections.effect$.subscribe();
  creation.effect$.subscribe();
  selection.effect$.subscribe();
}

main();
