import Typography, { TypographyProps, getTypographyClass } from "../Typography.tsx";

export default function AfterYouPay(props: Omit<TypographyProps, "variant">) {
  return (
    <>
      <Typography variant="h3" {...props}>
        After you pay
      </Typography>

      <ol class={`list-decimal list-inside mt-2 ${getTypographyClass("lead")}`}>
        <li>
          In a few minutes we'll give you a URL which you'll add to your Incognito app under More {">"} Power {">"}{" "}
          Add Node Virtual.
        </li>

        <li>
          You'll need to stake it with <code>1750</code> PRV. You can do this from the Incognito app. The stake is
          yours and you can withdraw it at any time. We don't have access to it.
        </li>
        <li>
          And that's it! The node will begin to work. You'll be able to monitor it from{" "}
          <a class="underline" href="/nodes">
            here
          </a>
          .
        </li>
      </ol>
    </>
  );
}
