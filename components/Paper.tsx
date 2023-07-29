import { JSX } from "preact";

interface PaperProps extends JSX.HTMLAttributes<HTMLDivElement> {
  shadow?: "base" | "sm" | "md" | "lg" | "xl" | "2xl" | "inner" | "outline" | "none";
}

export default function Paper({ class: classes, shadow = "lg", ...props }: PaperProps) {
  const style = `shadow-${shadow === "base" ? "" : shadow} rounded-lg ${classes ?? ""}`;

  return <div class={style} {...props} />;
}
