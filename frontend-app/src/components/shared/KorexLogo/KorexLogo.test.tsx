import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tenant } from "@/lib/tenant";
import { KorexIsotipo, KorexWordmark } from "./KorexLogo";

describe("KorexLogo", () => {
  it("renderiza el isotipo con nombre, ruta y tamaño del tenant", () => {
    render(<KorexIsotipo size={64} />);

    const logo = screen.getByRole("img", { name: tenant.name });
    expect(logo).toHaveAttribute("src", tenant.logoPath);
    expect(logo).toHaveAttribute("width", "64");
    expect(logo).toHaveAttribute("height", "64");
  });

  it("renderiza el nombre del tenant en el wordmark", () => {
    render(<KorexWordmark />);
    expect(screen.getByText(tenant.name)).toBeInTheDocument();
  });
});
