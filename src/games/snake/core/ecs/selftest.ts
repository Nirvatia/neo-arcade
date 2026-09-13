import { World } from "./World.js";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[ECS self-test] FAILED: ${message}`);
  }
}

export function runEcsSelfTest(): void {
  const world = new World();

  const a = world.createEntity();
  const b = world.createEntity();
  assert(a !== b, "entities have unique ids");

  world.addComponent(a, "gridPosition", { col: 1, row: 2 });
  world.addComponent(a, "render", { color: 0x00ff00, char: "1", scale: 1, alpha: 1 });
  world.addComponent(b, "gridPosition", { col: 3, row: 4 });

  const withPos = world.query(["gridPosition"]);
  assert(withPos.entities.length === 2, "query finds both positioned entities");

  const withPosAndRender = world.query(["gridPosition", "render"]);
  assert(withPosAndRender.entities.length === 1, "query narrows to entities with both");
  assert(withPosAndRender.entities[0] === a, "the matching entity is a");

  const pos = world.getComponent(a, "gridPosition");
  assert(pos !== undefined && pos.col === 1 && pos.row === 2, "component read returns stored data");

  world.removeComponent(a, "render");
  assert(withPosAndRender.entities.length === 0, "query invalidates after component removal");

  world.destroyEntity(b);
  assert(withPos.entities.length === 1, "query reflects destroyed entity");
  assert(!world.entities.isAlive(b), "destroyed entity is not alive");

  const c = world.createEntity();
  assert(c === b, "destroyed id is recycled");

  let received = 0;
  world.events.on("score:changed", (payload) => {
    received = payload.score;
  });
  world.events.emit("score:changed", { score: 42 });
  assert(received === 42, "event delivered synchronously with payload");

  console.log("[ECS self-test] all assertions passed");
}