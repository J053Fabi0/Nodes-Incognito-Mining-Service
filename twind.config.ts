import { Options } from "$fresh/plugins/twindv1.ts";
import { defineConfig } from "https://esm.sh/@twind/core@1.1.3";
import presetTailwind from "https://esm.sh/@twind/preset-tailwind@1.1.4";
import presetAutoprefix from "https://esm.sh/@twind/preset-autoprefix@1.0.7";

export type ShadedColors =
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

const twindOptions = {
  ...defineConfig({
    presets: [presetTailwind(), presetAutoprefix()],
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
      },
    },
  }),
  selfURL: import.meta.url,
} as unknown as Options;

export default twindOptions;
