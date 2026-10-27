import { expect, test, type Page } from "@playwright/test";

async function entrar(page: Page, codigo: string) {
  await expect(page.getByRole("heading", { name: "Entrar en ALFRED" })).toBeVisible();
  await page.getByPlaceholder("Tu código de empleado").fill(codigo);
  await page.locator("form").getByRole("button", { name: "Entrar" }).click();
}

test("de abrir una mesa a cobrarla, con el permiso correcto", async ({ page }) => {
  await page.goto("/");

  // 1. Un camarero entra con su código.
  await entrar(page, "5");
  await expect(page.getByText("Ana Ruiz")).toBeVisible();
  await expect(page.getByText("CAMARERO")).toBeVisible();

  // 2. Elige una mesa libre y añade un producto.
  const mesaLibre = page.getByRole("button", { name: /Libre/ }).first();
  const mesaLabel = (await mesaLibre.innerText()).split("\n")[0].trim();
  await mesaLibre.click();

  await page.getByRole("button", { name: /Pan de cristal/ }).click();
  const enviar = page.getByRole("button", { name: "Enviar pase" });
  await expect(enviar).toBeEnabled();
  await enviar.click();

  // El inspector es un modal a pantalla completa: hay que cerrarlo para navegar.
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();

  // 3. El pase aparece en Cocina y se marca como listo.
  await page.getByRole("button", { name: "Cocina" }).click();
  await expect(page.getByRole("heading", { name: "Comandas en curso" })).toBeVisible();
  await expect(page.getByText("Pan de cristal")).toBeVisible();
  await page.getByRole("button", { name: "Marcar listo" }).first().click();
  await expect(page.getByText(/Listas \(1\)/)).toBeVisible();

  // 4. En Caja, un camarero solo puede mirar.
  await page.getByRole("button", { name: "Caja" }).click();
  await expect(page.getByText("Solo lectura. El cobro requiere Encargado o Gerente.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sin permiso" }).first()).toBeDisabled();

  // 5. Cambia a gerente y cobra.
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await entrar(page, "0");
  await expect(page.getByRole("complementary").getByText("Gerente", { exact: true })).toBeVisible();
  await expect(page.getByText("Puede registrar cobros.")).toBeVisible();

  const cuenta = page.getByRole("listitem").filter({ has: page.getByText(mesaLabel, { exact: true }) });
  await cuenta.getByRole("button", { name: "Cobrar" }).click();

  await expect(page.getByRole("heading", { name: "Cobrar cuenta" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar cobro" }).click();

  // 6. La mesa vuelve a estar libre.
  await expect(cuenta).toHaveCount(0);
  await page.getByRole("button", { name: "Sala" }).click();
  await expect(page.getByRole("button", { name: new RegExp(`^${escapedLabel(mesaLabel)} Libre`) })).toBeVisible();
});

function escapedLabel(label: string): string {
  return label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
