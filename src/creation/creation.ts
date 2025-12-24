import { filter, fromEvent, ignoreElements, merge, tap } from "rxjs";
import { ConceptCardElement } from "../cards/concept-card-element";

export interface CreationProps {
  creationForm: HTMLFormElement;
  sandbox: HTMLElement;
}
export function useCreation(props: CreationProps) {
  const inputElement = props.creationForm.querySelector<HTMLInputElement>('input[name="newItemInput"]')!;
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
    effect$: merge(submit$).pipe(ignoreElements()),
  };
}
