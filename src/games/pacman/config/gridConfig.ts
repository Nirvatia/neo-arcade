const GRID_01 = [
    ["ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES"],
    ["ES","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","ES"],
    ["ES","WL","EU","DT","DT","DT","DT","DT","DT","DT","DT","DT","WL","DT","DT","DT","DT","DT","DT","DT","DT","DT","EU","WL","ES"],
    ["ES","WL","DT","WL","WL","WL","DT","WL","WL","WL","WL","DT","WL","DT","WL","WL","WL","WL","DT","WL","WL","WL","DT","WL","ES"],
    ["ES","WL","DT","WL","WL","WL","DT","WL","WL","WL","WL","DT","WL","DT","WL","WL","WL","WL","DT","WL","WL","WL","DT","WL","ES"],
    ["ES","WL","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","WL","ES"],
    ["ES","WL","DT","WL","WL","WL","DT","WL","DT","WL","WL","WL","WL","WL","WL","WL","DT","WL","DT","WL","WL","WL","DT","WL","ES"],
    ["ES","WL","DT","DT","DT","DT","DT","WL","DT","DT","DT","DT","WL","DT","DT","DT","DT","WL","DT","DT","DT","DT","DT","WL","ES"],
    ["ES","WL","WL","WL","WL","WL","DT","WL","WL","WL","WL","DT","WL","DT","WL","WL","WL","WL","DT","WL","WL","WL","WL","WL","ES"],
    ["ES","ES","ES","ES","ES","WL","DT","WL","DT","DT","DT","DT","DT","DT","DT","DT","DT","WL","DT","WL","ES","ES","ES","ES","ES"],
    ["ES","ES","ES","ES","ES","WL","DT","WL","DT","WL","WL","LE","LE","LE","WL","WL","DT","WL","DT","WL","ES","ES","ES","ES","ES"],
    ["ES","WL","WL","WL","WL","WL","DT","WL","DT","WL","LT","LT","LT","LT","LT","WL","DT","WL","DT","WL","WL","WL","WL","WL","ES"],
    ["ES","0A","DT","DT","DT","DT","DT","DT","DT","WL","BY","IY","LT","PY","CE","WL","DT","DT","DT","DT","DT","DT","DT","0A","ES"],
    ["ES","WL","WL","WL","WL","WL","DT","WL","DT","WL","LT","LT","LT","LT","LT","WL","DT","WL","DT","WL","WL","WL","WL","WL","ES"],
    ["ES","ES","ES","ES","ES","WL","DT","WL","DT","WL","WL","WL","WL","WL","WL","WL","DT","WL","DT","WL","ES","ES","ES","ES","ES"],
    ["ES","ES","ES","ES","ES","WL","DT","WL","DT","DT","DT","DT","DT","DT","DT","DT","DT","WL","DT","WL","ES","ES","ES","ES","ES"],
    ["ES","WL","WL","WL","WL","WL","DT","WL","DT","WL","WL","WL","WL","WL","WL","WL","DT","WL","DT","WL","WL","WL","WL","WL","ES"],
    ["ES","WL","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","WL","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","WL","ES"],
    ["ES","WL","DT","WL","WL","WL","DT","WL","WL","WL","WL","DT","WL","DT","WL","WL","WL","WL","DT","WL","WL","WL","DT","WL","ES"],
    ["ES","WL","DT","DT","DT","WL","DT","DT","DT","DT","DT","DT","PM","DT","DT","DT","DT","DT","DT","WL","DT","DT","DT","WL","ES"],
    ["ES","WL","WL","WL","DT","WL","DT","WL","DT","WL","WL","WL","WL","WL","WL","WL","DT","WL","DT","WL","DT","WL","WL","WL","ES"],
    ["ES","WL","DT","DT","DT","DT","DT","WL","DT","DT","DT","DT","WL","DT","DT","DT","DT","WL","DT","DT","DT","DT","DT","WL","ES"],
    ["ES","WL","DT","WL","WL","WL","WL","WL","WL","WL","WL","DT","WL","DT","WL","WL","WL","WL","WL","WL","WL","WL","DT","WL","ES"],
    ["ES","WL","EU","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","DT","EU","WL","ES"],
    ["ES","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","WL","ES"],
    ["ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES","ES"],
];

export type TeleportType = `0${string}`;

export type TileType =
  | "WL" // Wall (Static kinematic collider)
  | "DT" // Dot (Static collectible data node)
  | "CF" // Cherry Fruit
  | "SF" // Strawberry Fruit
  | "OF" // Orange Fruit
  | "AF" // Apple Fruit
  | "MF" // Melon Fruit
  | "GF" // Galaxian Fruit
  | "BF" // Bell Fruit
  | "KF" // Key Fruit
  | "EU" // Energizer Power Up
  | "SU" // Speed Lightning Bolt Power Up
  | "GU" // Golden Egg Power Up
  | "LU" // Extra Life Power Up
  | "ES" // Empty Space (walkable, should be?)
  | "LE" // Lair Entrance (One-way directional ghost gate)
  | "LT" // Lair Tile (Internal ghost spawning enclosure)
  | "PM" // Player Spawn Point (Initial vector origin)
  | "BY" // Blinky Spawn Point (Blinky initial coordinate)
  | "PY" // Pinky Spawn Point (Pinky initial coordinate)
  | "IY" // Inky Spawn Point (Inky initial coordinate)
  | "CE" // Clyde Spawn Point (Clyde initial coordinate)
  | "RT" // Lair Switch Tile (Active trap mechanics for Ultra Ghost)
  | "SW" // Ultra Ghost trigger
  | TeleportType; // Dynamic Token Pair (e.g., "0A", "0B" for grouped wormholes)
  // more tile types to come