import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Paper Shaders need WebGL. "swangle" (SwiftShader via ANGLE) works on any
// machine, including headless servers without a GPU. On a machine with a GPU,
// pass --gl=angle for faster renders.
Config.setChromiumOpenGlRenderer("swangle");

// Use a locally installed Chromium when one is available (e.g. cloud sessions
// with Playwright's browser), instead of downloading Chrome Headless Shell.
const localChromium =
  process.env.REMOTION_BROWSER_EXECUTABLE ??
  (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : null);
if (localChromium) {
  Config.setBrowserExecutable(localChromium);
}
