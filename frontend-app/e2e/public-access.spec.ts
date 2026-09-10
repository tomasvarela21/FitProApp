import { expect, test } from "@playwright/test";

test("redirige al acceso y valida credenciales incompletas", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);

  const form = page.locator("form:visible");
  const email = form.locator('input[name="email"]');
  const password = form.locator('input[name="password"]');
  const submit = form.getByRole("button", { name: "Ingresar" });

  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await email.fill("email-invalido");
  await password.fill("corta");
  await submit.click();

  await expect(form.getByText("Email inválido")).toBeVisible();
  await expect(form.getByText("Mínimo 8 caracteres")).toBeVisible();
});
