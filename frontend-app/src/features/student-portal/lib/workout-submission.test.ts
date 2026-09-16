import { describe, expect, it, vi } from "vitest";
import { createWorkoutSubmitter } from "./workout-submission";

describe("createWorkoutSubmitter", () => {
  it("reutiliza la misma clave cuando se reintenta el envío del formulario", async () => {
    const send = vi
      .fn<(payload: { reps: number }, key: string) => Promise<string>>()
      .mockRejectedValueOnce(new Error("fallo de red"))
      .mockResolvedValueOnce("guardado");
    const submit = createWorkoutSubmitter(send, () => "clave-estable");

    await expect(submit({ reps: 10 })).rejects.toThrow("fallo de red");
    await expect(submit({ reps: 10 })).resolves.toBe("guardado");

    expect(send).toHaveBeenNthCalledWith(1, { reps: 10 }, "clave-estable");
    expect(send).toHaveBeenNthCalledWith(2, { reps: 10 }, "clave-estable");
  });

  it("genera una clave distinta para cada formulario", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const keys = ["primera", "segunda"];
    const createKey = () => keys.shift()!;

    const first = createWorkoutSubmitter(send, createKey);
    const second = createWorkoutSubmitter(send, createKey);
    await first({});
    await second({});

    expect(send.mock.calls.map((call) => call[1])).toEqual(["primera", "segunda"]);
  });

  it("rota la clave si el contenido del formulario cambia después de un fallo", async () => {
    const send = vi.fn().mockRejectedValue(new Error("fallo de red"));
    const keys = ["original", "editada"];
    const submit = createWorkoutSubmitter(send, () => keys.shift()!);

    await expect(submit({ reps: 10 })).rejects.toThrow();
    await expect(submit({ reps: 12 })).rejects.toThrow();

    expect(send.mock.calls.map((call) => call[1])).toEqual(["original", "editada"]);
  });
});
