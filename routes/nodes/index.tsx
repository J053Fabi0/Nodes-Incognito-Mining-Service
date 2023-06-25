import Typography, { getTypographyClass } from "../../components/Typography.tsx";

const styles = {
  li: `${getTypographyClass("lead")} underline`,
};

export default function Nodes() {
  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Your nodes
      </Typography>

      <ul class="list-disc list-inside mb-5">
        <li class={styles.li}>
          <a href="nodes/earnings?relative">Earnings</a>
        </li>
      </ul>
    </>
  );
}
