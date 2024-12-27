const requestNum = 1000;
const urls = Array.from(
  { length: requestNum },
  (_, i) => "https://dev1.takos.jp/takos/ping",
);

async function fetchAll(urls) {
  let param = {
    method: "POST",
    body: JSON.stringify({
      title: "a1 test",
      body: "this is test by a1",
      userId: 1,
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  };
  const promises = urls.map((url) => fetch(url, param));
  const jsons = await Promise.all(promises);
  return jsons;
}

const start = performance.now();

function testFetch() {
  fetchAll(urls).then(() => {
    //かかった時間 (seccond)
    console.log((performance.now() - start) / 1000);
  });
  return;
}

testFetch();
