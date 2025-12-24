import { get, set } from "idb-keyval";
import { BehaviorSubject, filter, from, fromEvent, ignoreElements, map, merge, switchMap, tap } from "rxjs";
import { testGemini$ } from "../generations/gemini";

export interface Connections {
  geminiApiKey: string;
}

export const config$ = new BehaviorSubject<Connections>(getDefaultConfig());

export interface UseConnectionsProps {
  connectionForm: HTMLFormElement;
}

export function useConnections(props: UseConnectionsProps) {
  const output = props.connectionForm.querySelector<HTMLElement>("#test-output")!;

  const init$ = from(get<Connections>("mugen-ai:connection")).pipe(
    filter((config) => config !== undefined),
    tap((storedConfig) => config$.next({ ...getDefaultConfig(), ...storedConfig })),
    tap((config) => renderConfig(config, props.connectionForm))
  );

  const formChange$ = fromEvent(props.connectionForm, "change").pipe(
    map(getConfigObject(config$)),
    tap((config) => config$.next(config)),
    switchMap(saveConfig)
  );

  const testOnSubmit$ = fromEvent(props.connectionForm, "submit").pipe(
    tap((e) => e.preventDefault()),
    map(getConfigObject(config$)),
    tap((config) => config$.next(config)),
    switchMap((config) => {
      return from(saveConfig(config)).pipe(
        switchMap(() => testGemini$(config.geminiApiKey)),
        tap((msg) => (output.textContent += `Gemini: ${msg}\n`))
      );
    })
  );

  return {
    effect$: merge(init$, formChange$, testOnSubmit$).pipe(ignoreElements()),
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
    const formDataObject = Object.fromEntries([...formData.entries()].filter(([_, v]) => v !== null && typeof v === "string"));
    const mergedConfig = { ...mutableConfig, ...formDataObject };
    return mergedConfig;
  };
}
