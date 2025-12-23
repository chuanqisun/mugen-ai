import { filter, fromEvent, ignoreElements, merge, tap } from "rxjs";

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
      const newItem = document.createElement("concept-card-element");
      newItem.setAttribute("data-prompt", inputElement.value.trim());
      inputElement.value = "";
      props.sandbox.appendChild(newItem);
    })
  );

  return {
    effect$: merge(submit$).pipe(ignoreElements()),
  };
}
