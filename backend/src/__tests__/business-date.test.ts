import { describe, expect, it } from "vitest";
import {
  businessDateString,
  businessDayOfWeek,
  workoutInstant,
} from "../shared/utils/business-date";

describe("fecha de negocio de entrenamientos", () => {
  it("usa America/Argentina/Buenos_Aires alrededor de medianoche UTC", () => {
    expect(businessDateString(new Date("2026-03-01T02:59:59.999Z"))).toBe("2026-02-28");
    expect(businessDateString(new Date("2026-03-01T03:00:00.000Z"))).toBe("2026-03-01");
  });

  it("resuelve correctamente día de semana, mes, año y año bisiesto", () => {
    expect(businessDayOfWeek(new Date("2024-02-29T12:00:00.000Z"))).toBe("THURSDAY");
    expect(businessDayOfWeek(new Date("2026-01-01T02:30:00.000Z"))).toBe("WEDNESDAY");
  });

  it("mantiene una fecha calendario heredada dentro del mismo día de negocio", () => {
    const instant = workoutInstant("2026-02-28");
    expect(instant.toISOString()).toBe("2026-02-28T12:00:00.000Z");
    expect(businessDateString(instant)).toBe("2026-02-28");
  });
});
