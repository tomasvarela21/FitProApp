import { describe, it, expect } from "vitest";
import { loginSchema, activateAccountSchema, changePasswordSchema } from "../modules/auth/auth.schema";

describe("loginSchema", () => {
  it("acepta credenciales válidas", () => {
    const result = loginSchema.safeParse({ email: "test@test.com", password: "password123" });
    expect(result.success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rechaza contraseña corta (< 8 chars)", () => {
    const result = loginSchema.safeParse({ email: "test@test.com", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rechaza email vacío", () => {
    const result = loginSchema.safeParse({ email: "", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rechaza payload vacío", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("activateAccountSchema", () => {
  it("acepta token y contraseña válidos", () => {
    const result = activateAccountSchema.safeParse({ token: "abc123", password: "miPass123" });
    expect(result.success).toBe(true);
  });

  it("rechaza token vacío", () => {
    const result = activateAccountSchema.safeParse({ token: "", password: "miPass123" });
    expect(result.success).toBe(false);
  });

  it("rechaza contraseña corta", () => {
    const result = activateAccountSchema.safeParse({ token: "abc123", password: "123" });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("acepta datos válidos", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldPass123",
      newPassword: "newPass456",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza contraseña actual corta", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "short",
      newPassword: "newPass456",
    });
    expect(result.success).toBe(false);
  });
});
