import { useCurrentFrame } from "remotion";
import { P } from "../castillo/palette";
import { CHICA, CHICO, MAGE, MAYOR, QUEEN, RUBIA, SOLDIER, VILLAGER, WITCH, worn } from "./cast";
import { chained, drawFigure, drink, fallen, run, stand, thrust, walk } from "./figure";
import { PixelCanvas2 } from "./PixelCanvas2";
import { monsterQueen, portrait } from "./portrait";
import { blitScaled } from "../castillo/fx";

export const SuenoTest: React.FC = () => {
  const f = useCurrentFrame();
  const ph = f / 24;
  return (
    <PixelCanvas2
      deps={[f]}
      draw={(px) => {
        px.clear(P.night2);
        if (f > 30) {
          [MAYOR, CHICO, CHICA, RUBIA].forEach((l, i) => blitScaled(px, portrait(l, { expr: (["neutral", "smile", "fear", "angry"] as const)[i] }), (i % 2) * 135 + 2, Math.floor(i / 2) * 150, 2));
          blitScaled(px, portrait(QUEEN, { expr: "smile" }), 0, 300, 1);
          blitScaled(px, monsterQueen(QUEEN, 0.8), 66, 300, 1);
          blitScaled(px, portrait(WITCH, { eyes: "glow" }), 132, 300, 1);
          blitScaled(px, portrait(worn(MAYOR), { decay: 1, expr: "fear" }), 198, 300, 1);
          blitScaled(px, portrait(worn(MAYOR), { decay: 0.5, expr: "fear" }), 0, 380, 1);
          blitScaled(px, portrait(worn(CHICA), { eyes: "glow" }), 66, 380, 1);
          blitScaled(px, portrait(SOLDIER(1), {}), 132, 380, 1);
          return;
        }
        [MAYOR, CHICO, CHICA, RUBIA].forEach((l, i) => {
          drawFigure(px, l, walk(ph + i * 0.25), 30 + i * 60, 70);
          drawFigure(px, worn(l), run(ph + i * 0.25), 30 + i * 60, 140);
        });
        drawFigure(px, MAYOR, thrust((f % 30) / 30), 30, 210);
        drawFigure(px, CHICA, chained(), 90, 210);
        drawFigure(px, CHICO, drink(0.8), 150, 210);
        drawFigure(px, RUBIA, fallen(0.7), 220, 210);
        drawFigure(px, QUEEN, { ...stand(), reach: 1 + (f % 60) / 20, armN: [1.4, 0.2] }, 40, 300);
        drawFigure(px, WITCH, stand(), 110, 300);
        drawFigure(px, SOLDIER(1), { ...walk(ph), hold: "spear" }, 160, 300);
        drawFigure(px, MAGE(1), { ...stand(), hold: "staff", eyes: "glow" }, 210, 300);
        drawFigure(px, worn(MAYOR), { ...run(ph), creature: true }, 40, 400);
        drawFigure(px, worn(MAYOR), { ...run(ph), decay: 0.5 }, 110, 400);
        [0, 1, 2, 3].forEach((i) => drawFigure(px, VILLAGER(i), walk(ph + i * 0.3), 160 + i * 25, 400));
        drawFigure(px, MAYOR, walk(ph), 70, 470, false, 2);
        drawFigure(px, worn(MAYOR), { ...run(ph), creature: true }, 190, 470, false, 2);
      }}
    />
  );
};
