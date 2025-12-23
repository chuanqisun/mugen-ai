import { useConnections } from "./connections/connections";
import "./style.css";

async function main() {
  const connections = useConnections({
    connectionForm: document.querySelector<HTMLFormElement>("#connection-form")!,
  });

  connections.effect$.subscribe();
}

main();
