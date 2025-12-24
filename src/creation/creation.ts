import { Observable, filter, fromEvent, ignoreElements, merge, tap } from "rxjs";
import { ConceptCardElement } from "../cards/concept-card-element";
import type { Connections } from "../connections/connections";

export interface CreationProps {
  creationForm: HTMLFormElement;
  sandbox: HTMLElement;
  config$: Observable<Connections>;
}
export function useCreation(props: CreationProps) {
  const inputElement = props.creationForm.querySelector<HTMLInputElement>('input[name="newItemInput"]')!;
  const submitButton = props.creationForm.querySelector<HTMLButtonElement>('button[type="submit"]')!;

  const configEffect$ = props.config$.pipe(
    tap((config) => {
      const isDisabled = !config.geminiApiKey || config.geminiApiKey.trim() === "";
      inputElement.disabled = isDisabled;
      submitButton.disabled = isDisabled;
    })
  );

  const submit$ = fromEvent(props.creationForm, "submit").pipe(
    tap((e) => e.preventDefault()),
    filter(() => inputElement.value.trim().length > 0),
    tap(() => {
      const newItem = ConceptCardElement.createFromPrompt(inputElement.value.trim());
      inputElement.value = "";
      props.sandbox.appendChild(newItem);
    })
  );

  return {
    effect$: merge(submit$, configEffect$).pipe(ignoreElements()),
  };
}
