import { UnknownPageProps } from "$fresh/server.ts";
import Typography from "../components/Typography.tsx";

export default function NotFoundPage({ url }: UnknownPageProps) {
  return (
    <>
      <Typography variant="h1">404 not found</Typography>
      <Typography variant="h4" class="mt-4">
        {url.pathname}
      </Typography>
    </>
  );
}
