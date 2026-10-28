import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function entrar(page: Page, codigo = "5") {
  const dialog = page.getByRole("dialog", { name: "Entrar en ALFRED" });
  await expect(dialog).toBeVisible();
  await page.getByLabel("Código de empleado").fill(codigo);
  await dialog.getByRole("button", { name: "Entrar", exact: true }).click();
}

async function auditar(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const violations = result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target.join(" "),
      html: node.html,
      summary: node.failureSummary,
    })),
  }));
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

async function sinScrollHorizontal(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

function loginDialog(page: Page) {
  return page.getByRole("dialog", { name: "Entrar en ALFRED" });
}

function escaparRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("el login es un diálogo accesible con foco atrapado", async ({ page }) => {
  await page.goto("/");

  const dialog = loginDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  const codigo = page.getByLabel("Código de empleado");
  const submit = dialog.getByRole("button", { name: "Entrar", exact: true });
  await expect(codigo).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(submit).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(codigo).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(submit).toBeFocused();

  await auditar(page);
});

test("el error de acceso se anuncia como alerta", async ({ page }) => {
  await page.goto("/");

  await entrar(page, "999");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(loginDialog(page)).toBeVisible();

  await auditar(page);
});

test("la sala tiene navegación, salto de contenido y vista activa", async ({ page }) => {
  await page.goto("/");
  await entrar(page);

  await expect(page.getByRole("heading", { name: "Sala", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeAttached();
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sala", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await auditar(page);
});

test("el inspector atrapa el foco, deja acuse y se cierra con Escape", async ({ page }) => {
  await page.goto("/");
  await entrar(page);

  const mesa = page.getByRole("button", { name: /Libre/ }).first();
  const mesaLabel = (await mesa.innerText()).split("\n")[0].trim();
  const mesaFila = page
    .getByRole("button", { name: new RegExp(`^${escaparRegex(mesaLabel)}\\b`) })
    .first();
  await mesa.click();

  const inspector = page.getByRole("dialog", { name: mesaLabel });
  await expect(inspector).toBeVisible();
  await expect
    .poll(() => inspector.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true);
  await auditar(page);

  await inspector.getByRole("button", { name: /Pan de cristal/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cambios guardados" })).toBeVisible();

  const cuenta = inspector.getByRole("button", { name: /Cuenta/ });
  await cuenta.click();
  const panelCuenta = page.getByRole("dialog", { name: "Cuenta" });
  await expect(panelCuenta).toBeVisible();
  await auditar(page);

  await page.keyboard.press("Escape");
  await expect(panelCuenta).toBeHidden();
  await expect(inspector).toBeVisible();
  await expect(cuenta).toBeFocused();

  await cuenta.click();
  await panelCuenta.getByRole("button", { name: "Cancelar / liberar mesa" }).click();
  const confirmacion = page.getByRole("dialog", { name: "Liberar mesa" });
  await expect(confirmacion).toBeVisible();
  await auditar(page);
  await page.keyboard.press("Escape");
  await expect(confirmacion).toBeHidden();
  await expect(panelCuenta).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panelCuenta).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(inspector).toBeHidden();
  await expect(mesaFila).toBeFocused();
});

test("walk-in asocia etiquetas y se cierra con Escape", async ({ page }) => {
  await page.goto("/");
  await entrar(page);

  const disparador = page.getByRole("button", { name: "Walk-in" });
  await disparador.click();

  const dialog = page.getByRole("dialog", { name: "Walk-in" });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Mesa")).toBeVisible();
  await expect(page.getByLabel("Comensales")).toBeVisible();
  await auditar(page);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(disparador).toBeFocused();
});

test("Cocina y Caja mantienen la semántica y pasan axe", async ({ page }) => {
  await page.goto("/");
  await entrar(page, "0");

  await page.getByRole("button", { name: "Cocina", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Comandas en curso" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cocina", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await auditar(page);

  await page.getByRole("button", { name: "Caja", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cuentas abiertas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Caja", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await auditar(page);
});

test.describe("móvil", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("no hay desbordamiento y el inspector se apila", async ({ page }) => {
    await page.goto("/");
    await entrar(page);

    await sinScrollHorizontal(page);
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();

    await page.getByRole("button", { name: /Libre/ }).first().click();
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible();

    const caja = await dialog.boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.width).toBeLessThanOrEqual(390);

    const columnas = await page
      .getByTestId("inspector-columns")
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length);
    expect(columnas).toBe(1);

    await sinScrollHorizontal(page);

    const objetivosPequenos = await page.evaluate(() => {
      const selector =
        'nav button, [role="dialog"] button:not([data-compact-target]), [role="dialog"] input:not([data-compact-target]), [role="dialog"] select, [role="dialog"] summary';
      return [...document.querySelectorAll<HTMLElement>(selector)]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter((target) => target.width < 43 || target.height < 43);
    });
    expect(objetivosPequenos, JSON.stringify(objetivosPequenos, null, 2)).toEqual([]);

    const compactosPequenos = await page.evaluate(() => {
      return [...document.querySelectorAll<HTMLElement>("[data-compact-target]")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter((target) => target.width < 23 || target.height < 23);
    });
    expect(compactosPequenos, JSON.stringify(compactosPequenos, null, 2)).toEqual([]);

    await auditar(page);
  });
});

test.describe("tablet", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("no hay desbordamiento y el inspector sigue siendo usable", async ({ page }) => {
    await page.goto("/");
    await entrar(page);

    await sinScrollHorizontal(page);
    await page.getByRole("button", { name: /Libre/ }).first().click();

    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible();
    const caja = await dialog.boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.width).toBeLessThanOrEqual(768);

    await sinScrollHorizontal(page);
    await auditar(page);
  });
});
