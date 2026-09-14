import { describe, expect, it } from "vitest";
import {
  daysUntilExpiry,
  effectiveInstallmentStatus,
  effectiveSubscriptionStatus,
} from "../modules/subscriptions/billing-status";

const now = new Date("2026-09-14T12:00:00.000Z");

describe("estados efectivos de cobros", () => {
  it("deriva OVERDUE solo para cuotas pendientes anteriores al reloj", () => {
    expect(effectiveInstallmentStatus("PENDING", new Date(now.getTime() - 1), now)).toBe(
      "OVERDUE"
    );
    expect(effectiveInstallmentStatus("PENDING", now, now)).toBe("PENDING");
    expect(effectiveInstallmentStatus("PAID", new Date(now.getTime() - 1), now)).toBe(
      "PAID"
    );
    expect(effectiveInstallmentStatus("CANCELLED", new Date(now.getTime() - 1), now)).toBe(
      "CANCELLED"
    );
  });

  it("deriva EXPIRED sin alterar estados finales", () => {
    expect(effectiveSubscriptionStatus("ACTIVE", new Date(now.getTime() - 1), now)).toBe(
      "EXPIRED"
    );
    expect(effectiveSubscriptionStatus("CANCELLED", new Date(now.getTime() - 1), now)).toBe(
      "CANCELLED"
    );
  });

  it("calcula días restantes con el mismo redondeo comercial", () => {
    expect(daysUntilExpiry(new Date(now.getTime() + 25 * 60 * 60 * 1000), now)).toBe(2);
    expect(daysUntilExpiry(new Date(now.getTime() - 1), now)).toBe(0);
  });
});
