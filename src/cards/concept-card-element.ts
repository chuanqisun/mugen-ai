import { Observable, buffer, debounceTime, filter, finalize, fromEvent, tap } from "rxjs";
import { ZenMusicBox } from "../audio/zen-music-box";
import { config$ } from "../connections/connections";
import { createConcept, mixConcepts, splitConcept, type BasicConcept } from "../generations/gemini";
import "./concept-card-element.css";

export class ConceptCardElement extends HTMLElement {
  private static musicBox = new ZenMusicBox({ volume: 1 });
  private static nextIndex = 0;
  public task$: Observable<any> | null = null;
  private generationIndex: number | null = null;
  private currentAnimation: Animation | null = null;

  get index(): number | null {
    return this.generationIndex;
  }

  constructor() {
    super();
  }

  static define() {
    if (customElements.get("concept-card-element")) return;
    customElements.define("concept-card-element", ConceptCardElement);
  }

  static createFromPrompt(prompt: string): ConceptCardElement {
    const newItem = document.createElement("concept-card-element") as ConceptCardElement;
    newItem.setAttribute("data-prompt", prompt);
    newItem.setAttribute("draggable", "true");
    return newItem;
  }

  static createFromMix(...parts: ConceptCardElement[]): ConceptCardElement {
    const newItem = document.createElement("concept-card-element") as ConceptCardElement;
    newItem.setAttribute("data-sources", parts.map((p) => p.id).join(","));
    newItem.setAttribute("draggable", "true");
    return newItem;
  }

  static createFromConcept(concept: { name: string; description: string; emoji: string }): ConceptCardElement {
    const newItem = document.createElement("concept-card-element") as ConceptCardElement;
    newItem.setAttribute("data-name", concept.name);
    newItem.setAttribute("data-emoji", concept.emoji);
    newItem.title = concept.description;
    newItem.textContent = `${concept.emoji} ${concept.name}`;
    newItem.setAttribute("draggable", "true");
    return newItem;
  }

  static createPlaceholder(text: string = "Splitting..."): ConceptCardElement {
    const newItem = document.createElement("concept-card-element") as ConceptCardElement;
    newItem.textContent = text;
    newItem.classList.add("placeholder");
    return newItem;
  }

  connectedCallback() {
    if (this.generationIndex === null && !this.classList.contains("placeholder")) {
      this.generationIndex = ConceptCardElement.nextIndex++;
      this.setAttribute("data-index", this.generationIndex.toString());
    }
    this.id = this.getRandomBase62Id(8);
    this.draggable = true;
    this.handleDragAndDrop();

    const promptTask = this.handleInitialPrompt();
    if (promptTask) this.task$ = promptTask;

    const mixTask = this.handleMix();
    if (mixTask) this.task$ = mixTask;

    if (this.task$) {
      this.task$.subscribe();
    }

    const mousedown$ = fromEvent(this, "mousedown");
    mousedown$
      .pipe(
        buffer(mousedown$.pipe(debounceTime(250))),
        filter((events) => events.length >= 2)
      )
      .subscribe(() => {
        this.handleSplit().subscribe();
      });
  }

  handleIncomingDrop(others: ConceptCardElement[]) {
    const offspring = ConceptCardElement.createFromMix(this, ...others);
    this.after(offspring);
  }

  handleDragAndDrop() {
    this.addEventListener("dragstart", (e: DragEvent) => {
      try {
        const isSelected = this.hasAttribute("data-selected");
        const elements = isSelected
          ? (Array.from(this.parentElement?.querySelectorAll('concept-card-element[data-selected="true"]') ?? []) as ConceptCardElement[])
          : [this];
        const ids = elements.map((el) => el.id);

        e.dataTransfer?.setData("application/concept-card-ids", ids.join(","));
        ids.forEach((id) => {
          e.dataTransfer?.setData(`application/concept-card-id-${id.toLowerCase()}`, "");
        });

        if (elements.length > 1) {
          const dragImage = this.createDragImage(elements);
          e.dataTransfer?.setDragImage(dragImage, 0, 0);
          setTimeout(() => dragImage.remove(), 0);
        }
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
      const idsStr = e.dataTransfer?.getData("application/concept-card-ids");
      if (idsStr) {
        const ids = idsStr.split(",");
        const others = ids.map((id) => document.getElementById(id)).filter((el): el is ConceptCardElement => el instanceof ConceptCardElement && el !== this);

        if (others.length > 0) {
          this.handleIncomingDrop(others);
        }
      }
    });
  }

  createDragImage(elements: HTMLElement[]) {
    const container = document.createElement("div");
    container.className = "drag-image-container";
    container.style.setProperty("--total", elements.length.toString());

    elements.forEach((el, index) => {
      const card = document.createElement("div");
      card.textContent = el.textContent;
      card.className = "drag-image-card";
      card.style.setProperty("--index", index.toString());

      container.appendChild(card);
    });

    document.body.appendChild(container);
    return container;
  }

  handleInitialPrompt() {
    const prompt = this.getAttribute("data-prompt");
    if (!prompt) return null;

    if (!config$.value.geminiApiKey) throw new Error("Gemini API key is not configured.");

    this.textContent = "Generating...";
    this.setAttribute("data-loading", "true");

    return createConcept({ apiKey: config$.value.geminiApiKey, prompt }).pipe(
      tap((res) => {
        this.removeAttribute("data-loading");
        this.setAttribute("data-emoji", res.emoji);
        this.setAttribute("data-name", res.name);
        this.textContent = `${res.emoji} ${res.name}`;
        this.title = res.description;
        ConceptCardElement.musicBox.playAscend();
        this.flash("--warm-accent-color", 3000);
      }),
      finalize(() => {
        if (this.textContent === "Generating...") {
          this.remove();
        }
      })
    );
  }

  handleMix() {
    const sources = this.getAttribute("data-sources")?.split(",") ?? [];
    if (!sources.length) return null;

    if (!config$.value.geminiApiKey) throw new Error("Gemini API key is not configured.");

    this.textContent = "Mixing...";
    this.setAttribute("data-loading", "true");

    const validSources = sources
      .map((id) => {
        const element = document.getElementById(id);
        if (element && element instanceof ConceptCardElement) {
          element.flash("--accent-color", 1000);
          return {
            name: element.getAttribute("data-name"),
            description: element.title,
          };
        }
        return null;
      })
      .filter((c): c is BasicConcept => c?.name !== undefined && c?.description !== undefined);

    return mixConcepts({
      apiKey: config$.value.geminiApiKey,
      concepts: validSources,
    }).pipe(
      tap((res) => {
        this.removeAttribute("data-loading");
        this.setAttribute("data-emoji", res.emoji);
        this.setAttribute("data-name", res.name);
        this.textContent = `${res.emoji} ${res.name}`;
        this.title = res.description;
        ConceptCardElement.musicBox.playAscend();
        this.flash("--warm-accent-color", 3000);
      }),
      finalize(() => {
        if (this.textContent === "Mixing...") {
          this.remove();
        }
      })
    );
  }

  handleSplit() {
    if (!config$.value.geminiApiKey) throw new Error("Gemini API key is not configured.");

    const name = this.getAttribute("data-name");
    const description = this.title;

    if (!name || !description) return new Observable((subscriber) => subscriber.complete());

    this.flash("--accent-color", 1000);

    let placeholder = ConceptCardElement.createPlaceholder("Splitting...");
    this.after(placeholder);

    return splitConcept({
      apiKey: config$.value.geminiApiKey,
      concept: { name, description },
    }).pipe(
      tap((concept) => {
        const newCard = ConceptCardElement.createFromConcept(concept);
        placeholder.replaceWith(newCard);
        ConceptCardElement.musicBox.playDescend();
        newCard.flash("--warm-accent-color", 3000);

        placeholder = ConceptCardElement.createPlaceholder("Splitting...");
        newCard.after(placeholder);
      }),
      finalize(() => {
        placeholder.remove();
      })
    );
  }

  getRandomBase62Id(length: number): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const result = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = chars[Math.floor(Math.random() * 62)];
    }
    return result.join("");
  }

  public flash(colorVar: string, duration: number) {
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
    }

    this.currentAnimation = this.animate(
      [{ backgroundColor: `color-mix(in srgb, var(${colorVar}), transparent 50%)` }, { backgroundColor: "var(--card-background)" }],
      {
        duration,
        easing: "ease-out",
      }
    );

    this.currentAnimation.onfinish = () => {
      this.currentAnimation = null;
    };
  }
}
