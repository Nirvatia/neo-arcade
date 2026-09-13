export type EntityId = number;

export interface System {
  readonly name: string;
  update(deltaMS: number): void;
}