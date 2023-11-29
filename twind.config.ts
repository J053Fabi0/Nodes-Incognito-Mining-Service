import twindColors from "./utils/twindColors.ts";
import { Options } from "$fresh/plugins/twind.ts";
import { defineConfig, Preset } from "https://esm.sh/@twind/core@1.1.3";
import presetTailwind from "https://esm.sh/@twind/preset-tailwind@1.1.4";
import presetAutoprefix from "https://esm.sh/@twind/preset-autoprefix@1.0.7";

const definedConfigs = defineConfig({
  presets: [presetTailwind() as Preset, presetAutoprefix()],
  theme: {
    extend: {
      backgroundColor: {
        redPastel: "#ffb3ba",
        orangePastel: "#ffdfba",
        yellowPastel: "#fafa9e",
        greenPastel: "#baffc9",
        bluePastel: "#bae1ff",
        purplePastel: "#e6beff",
      },
      colors: twindColors,
    },
  },
});

const twindOptions = {
  ...definedConfigs,
  selfURL: import.meta.url,
} as unknown as Options;

export default twindOptions;
