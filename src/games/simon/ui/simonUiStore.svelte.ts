import type { SimonUiSnapshot } from '../core/Events';
import {
  SimonDifficulty,
  SimonFailureReason,
  SimonState
} from '../core/SimonTypes';
import type {
  SimonDifficultyId,
  SimonFailureReasonId,
  SimonPadId,
  SimonStateId
} from '../core/SimonTypes';

export class SimonUiStore {
  ready = $state(false);
  state = $state<SimonStateId>(SimonState.Boot);
  difficulty = $state<SimonDifficultyId>(SimonDifficulty.Easy);
  round = $state(1);
  clicksTotal = $state(0);
  activePad = $state<SimonPadId | null>(null);
  inputLocked = $state(true);
  failureReason = $state<SimonFailureReasonId | null>(null);

  apply(snapshot: SimonUiSnapshot): void {
    this.ready = true;
    this.state = snapshot.state;
    this.difficulty = snapshot.difficulty;
    this.round = snapshot.round;
    this.clicksTotal = snapshot.clicksTotal;
    this.activePad = snapshot.activePad;
    this.inputLocked = snapshot.inputLocked;
    this.failureReason = snapshot.failureReason;
  }

  reset(): void {
    this.ready = false;
    this.state = SimonState.Boot;
    this.difficulty = SimonDifficulty.Easy;
    this.round = 1;
    this.clicksTotal = 0;
    this.activePad = null;
    this.inputLocked = true;
    this.failureReason = null;
  }

  get isMenu(): boolean {
    return this.state === SimonState.Menu;
  }

  get isGameOver(): boolean {
    return this.state === SimonState.GameOver;
  }

  get canInput(): boolean {
    return this.state === SimonState.AwaitingInput && !this.inputLocked;
  }

  get statusText(): string {
    switch (this.state) {
      case SimonState.Boot:
        return 'Инициализация внешней компоненты…';
      case SimonState.Menu:
        return 'Готов к обновлению. Выберите режим выполнения.';
      case SimonState.ShowingPattern:
        return 'Выполнение шагов обновления. Не вмешивайтесь.';
      case SimonState.AwaitingInput:
        return this.inputLocked
          ? 'Транзакция заблокирована. Ожидание сервера…'
          : 'Ожидание действия пользователя…';
      case SimonState.RoundTransition:
        return 'Фиксация изменений в базе данных…';
      case SimonState.Failure:
        return 'Аварийное завершение транзакции…';
      case SimonState.GameOver:
        return 'База данных недоступна.';
      default:
        return 'Неизвестное состояние сеанса.';
    }
  }

  get failureTitle(): string {
    switch (this.failureReason) {
      case SimonFailureReason.WrongPad:
        return 'Нарушена последовательность шагов обновления конфигурации.';
      case SimonFailureReason.LockedInput:
        return 'Попытка изменения конфигурации внутри заблокированной транзакции.';
      case SimonFailureReason.IncompleteSequence:
        return 'Транзакция обновления завершена не полностью. База повреждена.';
      default:
        return 'Неизвестная ошибка внешней компоненты обновления.';
    }
  }
}