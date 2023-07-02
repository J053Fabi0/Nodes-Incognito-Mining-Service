import Typography, { getTypographyClass } from "../../components/Typography.tsx";

const styles = {
  li: `${getTypographyClass("lead")}`,
};

export default function Nodes() {
  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Your account
      </Typography>

      <ul class="list-disc list-inside mb-5">
        <li class={styles.li}>
          <a href="/credentials" class="underline">
            Credentials
          </a>
        </li>

        <li class={styles.li}>
          <a href="/admin/accounts" class="underline">
            Accounts
          </a>
        </li>
      </ul>
    </>
  );
}
