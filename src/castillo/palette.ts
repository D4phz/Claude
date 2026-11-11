import { hex } from "./engine";

// Reference palette: negro azulado, violeta oscuro, morado mágico, dorado envejecido, gris niebla
export const P = {
  ink: hex("#0a0b16"), // negro azulado (outlines)
  night: hex("#0d1022"),
  night2: hex("#151a33"),
  violet: hex("#2a1840"), // violeta oscuro
  violet2: hex("#3c2358"),
  magic: hex("#9b4dff"), // morado mágico
  magicHi: hex("#d3a8ff"),
  magicDk: hex("#5b2a9a"),
  gold: hex("#c9a24a"), // dorado envejecido
  goldHi: hex("#ecd08a"),
  goldDk: hex("#7d6228"),
  fog: hex("#8a8fa3"), // gris niebla
  fogDk: hex("#5a5f75"),
  fogHi: hex("#b9bdcc"),
  // supporting
  tree: hex("#121a24"),
  tree2: hex("#1b2633"),
  leaf: hex("#1d2e33"),
  leaf2: hex("#27403f"),
  stone: hex("#4a4a63"),
  stoneHi: hex("#6b6b88"),
  stoneDk: hex("#2e2d42"),
  wood: hex("#5a3e2b"),
  woodDk: hex("#3a281d"),
  woodHi: hex("#7a5638"),
  fire: hex("#e0a43a"),
  fireHi: hex("#ffe08a"),
  ember: hex("#b4562a"),
  steel: hex("#a3a8ba"),
  steelDk: hex("#5f6478"),
  blood: hex("#5b1a33"), // used only as dark violet-red for the wound glow, no gore
  white: hex("#e9e6f2"),
  blueMagic: hex("#5aa0ff"),
};
