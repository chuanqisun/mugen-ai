import { get, set } from "idb-keyval";
import { BehaviorSubject, filter, from, fromEvent, ignoreElements, map, merge, switchMap, tap } from "rxjs";

export interface Connections {
  geminiApiKey: string;
}

const config$ = new BehaviorSubject<Connections>(getDefaultConfig());

export interface UseConnectionsProps {
  connectionForm: HTMLFormElement;
}

export function useConnections(props: UseConnectionsProps) {
  const init$ = from(get<Connections>("mugen-ai:connection")).pipe(
    filter((config) => config !== undefined),
    tap((storedConfig) => config$.next({ ...getDefaultConfig(), ...storedConfig })),
    tap((config) => renderConfig(config, props.connectionForm))
  );

  const formChange$ = fromEvent(props.connectionForm, "change").pipe(map(getConfigObject(config$)), switchMap(saveConfig));

  return {
    effect$: merge(init$, formChange$).pipe(ignoreElements()),
    config$: config$.asObservable(),
  };
}

function getDefaultConfig(): Connections {
  return {
    geminiApiKey: "",
  };
}

async function saveConfig(config: Connections) {
  return set("mugen-ai:connection", config);
}

function renderConfig(config: Connections, form: HTMLFormElement) {
  Object.entries(config).forEach(([key, value]) => {
    const input = form.querySelector<HTMLInputElement>(`[name="${key}"]`);
    if (input) {
      input.value = value;
    }
  });
}

function getConfigObject(config$: BehaviorSubject<Connections>) {
  return function (e: Event): Connections {
    const form = (e.target as HTMLElement).closest<HTMLFormElement>("form")!;
    const formData = new FormData(form);
    const mutableConfig: Connections = { ...config$.value };
    const formDataObject = Object.fromEntries([...formData.entries()].filter(([_, v]) => v !== null && typeof v === "string" && v.trim() !== ""));
    const mergedConfig = { ...mutableConfig, ...formDataObject };
    return mergedConfig;
  };
}
