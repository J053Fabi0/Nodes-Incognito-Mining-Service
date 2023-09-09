import axiod from "axiod";
import repeatUntilNoError from "https://deno.land/x/duplicated_files_cleaner_incognito@3.1.6/utils/repeatUntilNoError.ts";

interface Tag {
  name: string;
}

export default async function getLatestTag() {
  const { data } = await repeatUntilNoError(
    async () =>
      await axiod.get<{ results: Tag[] }>(
        "https://hub.docker.com/v2/namespaces/incognitochain/repositories/incognito-mainnet/tags?page_size=1"
      ),
    5,
    1
  );

  return data.results[0].name;
}
