import { filter, fromEvent, mergeMap, tap } from "rxjs";

export interface CreationProps {
  creationForm: HTMLFormElement;
}
export function useCreation(props: CreationProps) {
  const inputElement = props.creationForm.querySelector<HTMLInputElement>('input[name="newItemInput"]')!;

  const submit$ = fromEvent(props.creationForm, "submit").pipe(
    tap((e) => e.preventDefault()),
    filter(() => inputElement.value.trim().length > 0),
    tap(() => {
      inputElement.value = "";
    }),
    mergeMap(async () => {})
  );
}
