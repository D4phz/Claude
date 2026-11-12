import { Composition } from "remotion";
import { ShaderIntro } from "./ShaderIntro";
import { PandaWalk } from "./panda/PandaWalk";
import { CamaTest } from "./cama/Test";
import { CastilloTest } from "./castillo/Test";
import { SuenoTest } from "./sueno/Test";
import { SuenosHook } from "./tiktok/SuenosHook";
import { Sueno } from "./sueno/Sueno";
import { TOTAL as SUENO_FRAMES } from "./sueno/timeline";
import { Castillo, CASTILLO_FRAMES } from "./castillo/Castillo";
import { CamaAmarilla, TOTAL_FRAMES } from "./cama/CamaAmarilla";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="CamaAmarilla" component={CamaAmarilla} durationInFrames={TOTAL_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="CamaAmarilla16x9" component={CamaAmarilla} durationInFrames={TOTAL_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="Castillo" component={Castillo} durationInFrames={CASTILLO_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="CastilloNarrado" component={Castillo} durationInFrames={CASTILLO_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ audio: "castillo-mix.wav" }} />
      <Composition id="Sueno" component={Sueno} durationInFrames={SUENO_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="SuenosHook" component={SuenosHook} durationInFrames={300} fps={30} width={1080} height={1920} />
      <Composition id="SuenoTest" component={SuenoTest} durationInFrames={60} fps={30} width={1080} height={1920} />
      <Composition id="CastilloTest" component={CastilloTest} durationInFrames={60} fps={30} width={1080} height={1920} />
      <Composition id="CamaTest" component={CamaTest} durationInFrames={60} fps={30} width={1080} height={1920} defaultProps={{ shot: "wide" }} />
      <Composition
        id="PandaWalk"
        component={PandaWalk}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
      id="ShaderIntro"
      component={ShaderIntro}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ title: "Hello, Remotion" }}
    />
    </>
  );
};
