import { expect, test, type Page } from "@playwright/test";

async function entrar(page: Page, codigo: string) {
  await expect(page.getByRole("heading", { name: "Entrar en ALFRED" })).toBeVisible();
  await page.getByPlaceholder("Tu código de empleado").fill(codigo);
  await page.locator("form").getByRole("button", { name: "Entrar", exact: true }).click();
}

async function salir(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("heading", { name: "Entrar en ALFRED" })).toBeVisible();
}

test("Gerencia se muestra según el rol y el gerente puede crear empleados", async ({ page }) => {
  await page.goto("/");

  // Camarero: no existe la sección Gerencia.
  await entrar(page, "5");
  await expect(page.getByRole("button", { name: "Gerencia", exact: true })).toHaveCount(0);

  // Encargado: ve Gerencia, histórico y caja, pero no empleados.
  await salir(page);
  await entrar(page, "9");
  await expect(page.getByText("Raúl Domínguez")).toBeVisible();
  await page.getByRole("button", { name: "Gerencia", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Histórico" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Caja" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Empleados" })).toHaveCount(0);

  // Gerente: además, gestiona la plantilla.
  await salir(page);
  await entrar(page, "8");
  await page.getByRole("button", { name: "Gerencia", exact: true }).click();
  await page.getByRole("tab", { name: "Empleados" }).click();
  await expect(page.getByRole("heading", { name: "Nuevo empleado" })).toBeVisible();

  await page.getByLabel("Código", { exact: true }).fill("14");
  await page.getByLabel("Nombre", { exact: true }).fill("Prueba E2E");
  await page.getByLabel("Email", { exact: true }).fill("14@alfred.local");
  await page.getByLabel("Contraseña", { exact: true }).fill("contrasena-larga");
  await page.getByRole("button", { name: "Crear empleado" }).click();

  const empleado = page.getByRole("listitem").filter({ hasText: "Prueba E2E" });
  await expect(empleado).toBeVisible();
  await empleado.getByRole("button", { name: "Desactivar" }).click();
  await expect(empleado.getByRole("button", { name: "Activar" })).toBeVisible();
});

test("cobrar con tarjeta, consultar histórico y cerrar la caja", async ({ page }) => {
  await page.goto("/");
  await entrar(page, "1");

  // Abre la caja con 100 € de fondo.
  await page.getByRole("button", { name: "Gerencia", exact: true }).click();
  await page.getByRole("tab", { name: "Caja" }).click();
  await page.getByLabel("Fondo inicial (€)").fill("100");
  await page.getByRole("button", { name: "Abrir caja" }).click();
  await expect(page.getByText("Caja abierta", { exact: true })).toBeVisible();

  // Abre una mesa y pide un producto.
  await page.getByRole("button", { name: "Sala", exact: true }).click();
  const mesaLibre = page.getByRole("button", { name: /Libre/ }).first();
  const mesaLabel = (await mesaLibre.getAttribute("data-mesa-label")) ?? "";
  await mesaLibre.click();
  await page.getByRole("button", { name: /Pan de cristal/ }).click();
  await page.getByRole("button", { name: "Enviar pase" }).click();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();

  // Cobra en tarjeta.
  await page.getByRole("button", { name: "Caja", exact: true }).click();
  const cuenta = page.getByRole("listitem").filter({ has: page.getByText(mesaLabel, { exact: true }) });
  await cuenta.getByRole("button", { name: "Cobrar" }).click();

  const dialog = page.getByRole("dialog", { name: "Cobrar cuenta" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: "Tarjeta" }).check();
  await dialog.getByRole("button", { name: "Confirmar cobro" }).click();
  await expect(cuenta).toHaveCount(0);

  // La caja mide la venta con tarjeta y el efectivo esperado sigue siendo el fondo.
  await page.getByRole("button", { name: "Gerencia", exact: true }).click();
  await page.getByRole("tab", { name: "Caja" }).click();
  await expect(page.getByText("Ventas con tarjeta")).toBeVisible();
  await expect(page.getByText("Total cobrado")).toBeVisible();

  // Cierra la caja contando solo el fondo: el arqueo debe cuadrar.
  await page.getByLabel("Efectivo contado (€)").fill("100");
  await page.getByRole("button", { name: "Cerrar caja" }).click();
  await expect(page.getByText("Caja cerrada y arqueo guardado")).toBeVisible();
  await expect(page.getByText(/Cuadra/).first()).toBeVisible();

  // El cobro aparece en el histórico con su método de pago.
  await page.getByRole("tab", { name: "Histórico" }).click();
  const fila = page.getByRole("listitem").filter({ hasText: mesaLabel }).first();
  await expect(fila).toBeVisible();
  await expect(fila.getByText(/Tarjeta/)).toBeVisible();
});
