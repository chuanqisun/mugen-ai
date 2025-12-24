import { tap } from "rxjs";
import { config$ } from "../connections/connections";
import { createConcept } from "../generations/gemini";
import "./concept-card-element.css";

export class ConceptCardElement extends HTMLElement {
  static define() {
    if (customElements.get("concept-card-element")) return;
    customElements.define("concept-card-element", ConceptCardElement);
  }

  static createFromPrompt(prompt: string) {
    const newItem = document.createElement("concept-card-element");
    newItem.setAttribute("data-prompt", prompt);
    newItem.setAttribute("draggable", "true");
    return newItem;
  }

  connectedCallback() {
    this.id = this.getRandomBase62Id(8);
    this.draggable = true;
    this.handleDragAndDrop();
    this.handleInitialPrompt();
  }

  handleIncomingDrop(other: ConceptCardElement) {
    console.log({
      name: other.getAttribute("data-name"),
      emoji: other.getAttribute("data-emoji"),
      description: other.title,
    });

    const offspring = ConceptCardElement.createFromPrompt(`Merge two concepts: "${this.getAttribute("data-name")}" and "${other.getAttribute("data-name")}"`);

    this.after(offspring);
  }

  handleDragAndDrop() {
    this.addEventListener("dragstart", (e: DragEvent) => {
      try {
        e.dataTransfer?.setData("application/concept-card-id", this.id);
        e.dataTransfer?.setData(`application/concept-card-id-${this.id.toLowerCase()}`, "");
      } catch {}
    });

    this.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
      const types = e.dataTransfer?.types || [];
      const isSelf = types.includes(`application/concept-card-id-${this.id.toLowerCase()}`);
      if (!isSelf) {
        this.setAttribute("data-dnd", "droppable");
      }
    });

    this.addEventListener("dragleave", (_: DragEvent) => {
      this.removeAttribute("data-dnd");
    });

    this.addEventListener("dragend", (_: DragEvent) => {
      this.removeAttribute("data-dnd");
    });

    this.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();
      this.removeAttribute("data-dnd");
      const id = e.dataTransfer?.getData("application/concept-card-id");
      if (id && id !== this.id) {
        const other = document.getElementById(id);
        if (other && other instanceof ConceptCardElement) {
          this.handleIncomingDrop(other);
        }
      }
    });
  }

  handleInitialPrompt() {
    const prompt = this.getAttribute("data-prompt");
    if (!prompt) return;

    this.textContent = "Generating...";

    if (!config$.value.geminiApiKey) throw new Error("Gemini API key is not configured.");

    createConcept({ apiKey: config$.value.geminiApiKey, prompt })
      .pipe(
        tap((res) => {
          this.setAttribute("data-emoji", res.emoji);
          this.setAttribute("data-name", res.name);
          this.textContent = `${res.emoji} ${res.name}`;
          this.title = res.description;
        })
      )
      .subscribe();
  }

  getRandomBase62Id(length: number): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const result = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = chars[Math.floor(Math.random() * 62)];
    }
    return result.join("");
  }
}
