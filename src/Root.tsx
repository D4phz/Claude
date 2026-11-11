import { Composition } from "remotion";
import { ShaderIntro } from "./ShaderIntro";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ShaderIntro"
      component={ShaderIntro}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ title: "Hello, Remotion" }}
    />
  );
};
