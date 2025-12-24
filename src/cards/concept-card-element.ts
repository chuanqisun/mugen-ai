import { buffer, debounceTime, filter, fromEvent, tap } from "rxjs";
import { config$ } from "../connections/connections";
import { createConcept, mixConcepts, splitConcept, type BasicConcept } from "../generations/gemini";
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

  static createFromMix(partOne: ConceptCardElement, partTwo: ConceptCardElement) {
    const newItem = document.createElement("concept-card-element");
    newItem.setAttribute("data-sources", `${partOne.id},${partTwo.id}`);
    newItem.setAttribute("draggable", "true");
    return newItem;
  }

  static createFromConcept(concept: { name: string; description: string; emoji: string }) {
    const newItem = document.createElement("concept-card-element");
    newItem.setAttribute("data-name", concept.name);
    newItem.setAttribute("data-emoji", concept.emoji);
    newItem.title = concept.description;
    newItem.textContent = `${concept.emoji} ${concept.name}`;
    newItem.setAttribute("draggable", "true");
    return newItem;
  }

  static createPlaceholder(text: string = "Splitting...") {
    const newItem = document.createElement("concept-card-element");
    newItem.textContent = text;
    newItem.classList.add("placeholder");
    return newItem;
  }

  connectedCallback() {
    this.id = this.getRandomBase62Id(8);
    this.draggable = true;
    this.handleDragAndDrop();
    this.handleInitialPrompt();
    this.handleMix();

    const mousedown$ = fromEvent(this, "mousedown");
    mousedown$
      .pipe(
        buffer(mousedown$.pipe(debounceTime(250))),
        filter((events) => events.length >= 2)
      )
      .subscribe(() => {
        this.handleSplit();
      });
  }

  handleIncomingDrop(other: ConceptCardElement) {
    console.log({
      name: other.getAttribute("data-name"),
      emoji: other.getAttribute("data-emoji"),
      description: other.title,
    });

    const offspring = ConceptCardElement.createFromMix(this, other);
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

    if (!config$.value.geminiApiKey) throw new Error("Gemini API key is not configured.");

    this.textContent = "Generating...";

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

  handleMix() {
    const sources = this.getAttribute("data-sources")?.split(",") ?? [];
    if (!sources.length) return;

    if (!config$.value.geminiApiKey) throw new Error("Gemini API key is not configured.");

    this.textContent = "Mixing...";

    const validSources = sources
      .map((id) => {
        const element = document.getElementById(id);
        if (element && element instanceof ConceptCardElement) {
          return {
            name: element.getAttribute("data-name"),
            description: element.title,
          };
        }
        return null;
      })
      .filter((c): c is BasicConcept => c?.name !== undefined && c?.description !== undefined);

    mixConcepts({
      apiKey: config$.value.geminiApiKey,
      concepts: validSources,
    })
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

  handleSplit() {
    if (!config$.value.geminiApiKey) throw new Error("Gemini API key is not configured.");

    const name = this.getAttribute("data-name");
    const description = this.title;

    if (!name || !description) return;

    let placeholder = ConceptCardElement.createPlaceholder("Splitting...");
    this.after(placeholder);

    splitConcept({
      apiKey: config$.value.geminiApiKey,
      concept: { name, description },
    }).subscribe({
      next: (concept) => {
        const newCard = ConceptCardElement.createFromConcept(concept);
        placeholder.replaceWith(newCard);

        placeholder = ConceptCardElement.createPlaceholder("Splitting...");
        newCard.after(placeholder);
      },
      complete: () => {
        placeholder.remove();
      },
      error: (err) => {
        console.error(err);
        placeholder.textContent = "Error splitting";
        setTimeout(() => placeholder.remove(), 2000);
      },
    });
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
