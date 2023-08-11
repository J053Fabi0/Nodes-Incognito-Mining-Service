import Typography, { TypographyProps, getTypographyClass } from "../Typography.tsx";

interface AfterYouPayProps extends Omit<TypographyProps, "variant"> {
  confirming?: boolean;
  /** If it is in the monitor */
  monitor?: boolean;
}

export default function AfterYouPay({ confirming, monitor, ...props }: AfterYouPayProps) {
  if (monitor)
    return (
      <>
        <Typography variant="h4" {...props}>
          How to add the node to the Incognito app and stake it
        </Typography>

        <ol class={`list-decimal list-inside mt-2 ${getTypographyClass("lead")} flex gap-2 flex-col`}>
          <li>Copy the URL of the node.</li>

          <li>
            Add it to your Incognito app under More {">"} Power {">"} Add Node Virtual.
          </li>

          <li>
            Wait until the dot turns green. It means the node is online and ready to be staked. It might take up to
            an hour.
          </li>

          <li>
            You'll need to stake it with <code>1750</code> PRV. You can do this from the Incognito app. The stake
            is yours and you can withdraw it at any time. We don't have access to it.
          </li>

          <li>And that's it! The node will begin to work.</li>
        </ol>
      </>
    );

  return (
    <>
      <Typography variant="h3" {...props}>
        After you pay
      </Typography>

      <ol class={`list-decimal list-inside mt-2 ${getTypographyClass("lead")} flex gap-2 flex-col`}>
        {!confirming && (
          <li>
            We'll ask you to create a new keychain in the Incognito app and give us only its validator key. The
            private key stays with you.
          </li>
        )}

        <li>
          {confirming ? "In a few minutes we'll" : "We'll"} give you a URL which you'll add to your Incognito app
          under More {">"} Power {">"} Add Node Virtual.
        </li>

        <li>
          You'll need to stake it with <code>1750</code> PRV. You can do this from the Incognito app. The stake is
          yours and you can withdraw it at any time. We don't have access to it.
        </li>
        <li>
          And that's it! The node will begin to work. You'll be able to monitor it from{" "}
          <a class="underline" href="/nodes/monitor" target="blank">
            here
          </a>
          .
        </li>
      </ol>

      <Typography variant="p" class="mt-3">
        All the earnings will be in your control, we don't have access to them.
      </Typography>
    </>
  );
}
