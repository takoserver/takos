---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "takos api document"
  text: 次世代のLINE
  tagline: Trustworthy Alternative Knowledge-sharing Open-source System
  image:
    src: /logo.png
    alt: log
  actions:
    - theme: brand
      text: Get Start
      link: /welcome
    - theme: alt
      text: tako's jp
      link: https://takos.jp

features:
  - title: シンプルなUI
    details: 使いやすいUIで、誰でも簡単に使えます。
  - title: 非中央集権
    details: あなたのデータはあなたのサーバーに保存されるため、プライバシーとセキュリティが保護されます。 また、災害時のリスク分散にも役立ちます。
  - title: 耐量子暗号によるE2EE暗号
    details: 量子コンピューターによる暗号解読を防ぐために、耐量子暗号を採用しています。
---
const startTime = performance.now();

await fetch('https://www.hitachi-solutions-create.co.jp/column/img/image-generation-ai.jpg', { cache: 'reload' })
  .then(data => {
    const endTime = performance.now();
    console.log('Fetch time:', endTime - startTime, 'milliseconds');
  })
  .catch(error => {
    console.error('Fetch error:', error);
  });