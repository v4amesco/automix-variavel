import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = resolve(root, "index.html");

if (!existsSync(indexPath)) {
  throw new Error(`index.html nao encontrado em ${indexPath}`);
}

async function launchInstalledBrowser() {
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (_) {
      // Try the next installed browser.
    }
  }
  throw new Error("Instale Google Chrome ou Microsoft Edge para rodar os testes visuais locais.");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openDashboard(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await page.goto(pathToFileURL(indexPath).href, { waitUntil: "domcontentloaded" });
  await page.fill("#loginPassword", "Automix-KytnSxQd");
  await page.click('#roleLoginForm button[type="submit"]');
  await page.waitForSelector(".overview-grid", { state: "visible", timeout: 10000 });
  return { context, page };
}

async function checkDashboard(page, label) {
  const dashboard = await page.evaluate(() => {
    const centerOffset = (value, parent) => {
      const valueBox = value.getBoundingClientRect();
      const parentBox = parent.getBoundingClientRect();
      return Math.round((valueBox.left + valueBox.width / 2) - (parentBox.left + parentBox.width / 2));
    };

    const cards = [...document.querySelectorAll(".overview-grid > *")].map((card) => {
      const value = card.querySelector(":scope > strong, .amount strong");
      return value ? centerOffset(value, card) : 0;
    });

    const header = document.querySelector(".monthly-flow-header");
    const headerBox = header.getBoundingClientRect();
    const headerCenters = [...header.children].filter((cell) => getComputedStyle(cell).display !== "none").map((cell) => {
      const box = cell.getBoundingClientRect();
      return Math.round((box.top + box.height / 2) - (headerBox.top + headerBox.height / 2));
    });

    return {
      horizontalOverflow: document.body.scrollWidth > window.innerWidth,
      cardOffsets: cards,
      headerCenters,
      firstHeaderLabel: header.children[0].textContent.trim(),
      validateAllVisible: !document.getElementById("validateAllClientChargesButton").hidden
    };
  });

  assert(!dashboard.horizontalOverflow, `${label}: a pagina tem rolagem horizontal indevida.`);
  assert(dashboard.cardOffsets.every((offset) => Math.abs(offset) <= 2), `${label}: valores dos cards nao estao centralizados.`);
  assert(dashboard.headerCenters.every((offset) => Math.abs(offset) <= 2), `${label}: cabecalho do fluxo nao esta centralizado verticalmente.`);
  assert(dashboard.firstHeaderLabel === "Cobrança", `${label}: primeiro cabecalho do fluxo deveria ser Cobranca.`);

  if (dashboard.validateAllVisible) {
    await page.click("#validateAllClientChargesButton");
    await page.waitForTimeout(100);
    const confirmation = await page.evaluate(() => ({
      status: document.getElementById("clientConfirmationStatus").textContent.trim(),
      buttonHidden: document.getElementById("validateAllClientChargesButton").hidden
    }));
    assert(confirmation.buttonHidden, `${label}: botao Validar todas deveria sumir apos validacao.`);
    assert(confirmation.status === "Tudo validado", `${label}: status esperado apos validar todas era Tudo validado.`);
  }
}

async function checkManagement(page, label) {
  await page.click('[data-tab="managementTab"]');
  await page.waitForSelector(".management-contract", { state: "visible", timeout: 10000 });
  await page.locator("[data-toggle-contract]").first().click();
  await page.waitForSelector(".management-table .compact-row", { state: "visible", timeout: 10000 });

  const table = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".management-table .compact-row")].slice(0, 6);
    return {
      horizontalOverflow: document.body.scrollWidth > window.innerWidth,
      overlaps: rows.some((row) => {
        const cells = [...row.children].map((cell) => cell.getBoundingClientRect());
        return cells.slice(0, -1).some((cell, index) => cell.right > cells[index + 1].left + 1);
      })
    };
  });

  assert(!table.horizontalOverflow, `${label}: gestao tem rolagem horizontal fora do container.`);
  assert(!table.overlaps, `${label}: tabela de gestao tem celulas sobrepostas.`);
}

const browser = await launchInstalledBrowser();

try {
  for (const viewport of [
    { width: 1180, height: 760 },
    { width: 390, height: 844 }
  ]) {
    const label = `${viewport.width}x${viewport.height}`;
    const { context, page } = await openDashboard(browser, viewport);
    await checkDashboard(page, label);
    await checkManagement(page, label);
    await context.close();
  }
  console.log("Testes visuais passaram.");
} finally {
  await browser.close();
}
