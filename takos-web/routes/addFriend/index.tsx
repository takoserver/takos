import Chat from "../../components/chat.tsx";
export default function Home({ data }: { data: any }) {
  return (
    <>
      <Chat page={2} userName={data.userName} friendid={data.name} />
    </>
  );
}
