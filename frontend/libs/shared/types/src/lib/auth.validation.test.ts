import { describe, expect, it } from "vitest";
import { getPasswordRequirements } from "./auth.validation";

describe("getPasswordRequirements", () => {
  it("marks every requirement as not met for an empty password", () => {
    expect(getPasswordRequirements("")).toEqual([
      { id: "min-length", label: "At least 8 characters", met: false },
      { id: "uppercase", label: "Uppercase letter", met: false },
      { id: "lowercase", label: "Lowercase letter", met: false },
      { id: "number", label: "Number", met: false },
      { id: "special", label: "Special character", met: false },
    ]);
  });

  it("evaluates each requirement independently", () => {
    const requirements = getPasswordRequirements("Ab1!");

    expect(requirements.map(({ id, met }) => ({ id, met }))).toEqual([
      { id: "min-length", met: false },
      { id: "uppercase", met: true },
      { id: "lowercase", met: true },
      { id: "number", met: true },
      { id: "special", met: true },
    ]);
  });

  it("marks every requirement as met for a valid password", () => {
    expect(getPasswordRequirements("Password123!").every(({ met }) => met)).toBe(true);
  });
});
