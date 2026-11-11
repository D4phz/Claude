import { Composition } from "remotion";
import { ShaderIntro } from "./ShaderIntro";
import { PandaWalk } from "./panda/PandaWalk";

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
