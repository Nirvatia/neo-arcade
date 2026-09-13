# Контракт событий

## Правила

- Логика не знает о рендере.
- Рендер не мутирует логику.
- Логика сообщает наружу только через EventBus.
- UI может отправлять команды в игру через явный командный интерфейс.
- Все события синхронные и детерминированные.

## Текущие события, которые оставляем

- collision:food
- collision:wall
- collision:self
- collision:exit
- score:add
- score:changed
- exit:opened
- exit:entered
- level:expanded
- director:stateChanged

## События, которые нужно добавить или уточнить на этапе 1

- sequence:changed
- sequence:completed
- sequence:failed
- register:changed
- exit:stateChanged

## События для этапа 2

- level:started
- level:completed
- canvas:resizeRequested

## События для этапа 3

- ui:command:start
- ui:command:pause
- ui:command:resume
- ui:command:restart
- ui:command:mute

## События для этапа 5

- vfx:spawn
- sfx:play

## Примечание

`sequence:completed` и `sequence:failed` уже существуют, но их payload
нужно будет расширить на этапе 1.