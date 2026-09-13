export const GameStatus = {
  AVAILABLE: "AVAILABLE",
  COMING_SOON: "COMING_SOON",
  IN_DEVELOPMENT: "IN_DEVELOPMENT",
} as const;
export type GameStatusType = (typeof GameStatus)[keyof typeof GameStatus];

// Единственный контракт: страница отдаёт игре контейнер, игра делает всё сама.
export interface GameModule {
  init(canvasParent: HTMLDivElement): Promise<void>;
  destroy(): void;
}