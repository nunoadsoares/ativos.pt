import { chromium } from 'playwright';

console.log("Olá, Data Hub! O meu ambiente Windows está pronto.");

async function testPlaywright() {
  console.log("A testar o Playwright...");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://info.cern.ch'); // A primeira página web de sempre!
  const pageTitle = await page.title();
  console.log(`O título da página é: "${pageTitle}"`);
  await browser.close();
  console.log("Playwright funcionou com sucesso!");
}

testPlaywright();