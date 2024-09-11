import Welcome from "../components/welcome.tsx"
import SetUp from "../islands/setup.tsx"
export default function Home({ data }: { data: any }) {
  return (
    <>
      <>
        <head>
          <title>tako's | takos.jp</title>
          <meta
            name="description"
            content="日本産オープンソース分散型チャットアプリ「tako's」"
          />
          <link rel="stylesheet" href="/stylesheet.css"></link>
        </head>
        <Welcome></Welcome>
      </>
    </>
  )
}
