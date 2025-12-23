import { ConceptCardElement } from "./cards/concept-card-element";
import { useConnections } from "./connections/connections";
import { useCreation } from "./creation/creation";
import "./style.css";

ConceptCardElement.define();

async function main() {
  const connections = useConnections({
    connectionForm: document.querySelector<HTMLFormElement>("#connection-form")!,
  });

  const creation = useCreation({
    creationForm: document.querySelector<HTMLFormElement>("#creation-form")!,
    sandbox: document.querySelector<HTMLElement>("#sandbox")!,
  });

  connections.effect$.subscribe();
  creation.effect$.subscribe();
}

main();
