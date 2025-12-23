import { tap } from "rxjs";
import { config$ } from "../connections/connections";
import { createConcept } from "../generations/gemini";
import "./concept-card-element.css";

export class ConceptCardElement extends HTMLElement {
  static define() {
    if (customElements.get("concept-card-element")) return;
    customElements.define("concept-card-element", ConceptCardElement);
  }

  connectedCallback() {
    const prompt = this.getAttribute("data-prompt");
    if (!prompt) return;

    this.textContent = "Generating...";

    if (!config$.value.geminiApiKey) throw new Error("Gemini API key is not configured.");

    createConcept({ apiKey: config$.value.geminiApiKey, prompt })
      .pipe(
        tap((res) => {
          console.log(res);
          this.textContent = `${res.emoji} ${res.name}`;
          this.title = res.description;
        })
      )
      .subscribe();
  }
}
