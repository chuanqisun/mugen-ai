export interface ConceptBlueprint {
  id: number;
  emoji: string;
  name: string;
  description: string;
  recipe: number[];
}

export interface ConceptInstance extends ConceptBlueprint {
  createdAt: number;
}
