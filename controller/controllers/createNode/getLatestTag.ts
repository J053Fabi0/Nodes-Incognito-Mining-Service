import axiod from "axiod";

interface Tag {
  name: string;
}

export default async function getLatestTag() {
  const { data } = await axiod.get<{ results: Tag[] }>(
    "https://hub.docker.com/v2/namespaces/incognitochain/repositories/incognito-mainnet/tags?page_size=1"
  );

  return data.results[0].name;
}
