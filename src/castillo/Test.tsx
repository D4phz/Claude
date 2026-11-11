import { useCurrentFrame } from "remotion";
import { HEROES, ORDER, heroPortrait, heroSprite, queenPortrait, queenSprite, soldierSprite, witchPortrait, witchSprite } from "./chars";
import { PixelCanvas } from "./PixelCanvas";
import { P } from "./palette";

export const CastilloTest: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <PixelCanvas
      deps={[f]}
      draw={(px) => {
        px.clear(P.night2);
        ORDER.forEach((id, i) => {
          px.blit(heroSprite(HEROES[id], { phase: f / 20, stride: 1 }), 6 + i * 20, 6);
          px.blit(heroSprite(HEROES[id], { attack: 0.6 }), 96 + i * 20, 6);
          px.blit(heroPortrait(HEROES[id], i === 0 ? "fear" : "neutral"), (i % 2) * 46 + 2, 36 + Math.floor(i / 2) * 54);
        });
        px.blit(queenSprite(0), 100, 40);
        px.blit(queenSprite(1), 120, 40);
        px.blit(witchSprite(), 140, 48);
        px.blit(soldierSprite(), 160, 46);
        px.blit(queenPortrait(0), 96, 76);
        px.blit(queenPortrait(1, 0.8), 96, 140);
        px.blit(witchPortrait("glare"), 96, 200);
        px.blit(heroPortrait(HEROES.lior, "pain", P.magic, 0.6), 2, 200);
      }}
    />
  );
};
