import { MeshGradient } from "@paper-design/shaders-react";
import { usePaperShader } from "./lib/usePaperShader";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Paper Shaders animate on their own clock by default. usePaperShader() sets
// speed={0}, drives `frame` (ms) from the Remotion frame, and holds the render
// until the WebGL program is ready.
export const ShaderIntro: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const shader = usePaperShader(0.6);

  const enter = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const exit = interpolate(frame, [120, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <MeshGradient
        {...shader}
        width={width}
        height={height}
        colors={["#5100ff", "#00ff80", "#ffcc00", "#ea00ff"]}
        distortion={1}
        swirl={0.8}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * 60}px)`,
        }}
      >
        <h1
          style={{
            fontFamily: "Inter, Helvetica, Arial, sans-serif",
            fontSize: 140,
            fontWeight: 800,
            color: "white",
            textShadow: "0 8px 40px rgba(0,0,0,0.35)",
            margin: 0,
          }}
        >
          {title}
        </h1>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
