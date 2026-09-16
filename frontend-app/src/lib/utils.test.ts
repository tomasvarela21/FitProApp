import { describe, expect, it } from "vitest";
import { businessDateString, businessDayIndex } from "./utils";

describe("fecha de negocio web", () => {
  it("cambia de día a medianoche de Buenos Aires", () => {
    expect(businessDateString(new Date("2026-03-01T02:59:59.999Z"))).toBe("2026-02-28");
    expect(businessDateString(new Date("2026-03-01T03:00:00.000Z"))).toBe("2026-03-01");
  });

  it("obtiene el día semanal de negocio en límites de año y bisiesto", () => {
    expect(businessDayIndex(new Date("2026-01-01T02:30:00.000Z"))).toBe(3);
    expect(businessDayIndex(new Date("2024-02-29T12:00:00.000Z"))).toBe(4);
  });
});
