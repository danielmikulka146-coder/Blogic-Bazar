import NahravaniObrazkuClient from "./NahravaniObrazkuClient";

export default async function Page({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  return <NahravaniObrazkuClient sessionKey={key ?? ""} />;
}
