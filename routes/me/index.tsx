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
          <a href="me/balance" class="underline">
            My balance
          </a>
        </li>
      </ul>
    </>
  );
}
