import { describe, expect, it } from "vitest";
import {
  formatDocumentTypeLabel,
  formatEnumLabel,
  formatRoleLabel,
  getStatusVariant,
  getActiveBadgeVariant,
  getFullName,
  getInitials,
} from "./display-helpers";

describe("formatDocumentTypeLabel", () => {
  it("returns 'Certificate' for CERTIFICATE", () => {
    expect(formatDocumentTypeLabel("CERTIFICATE")).toBe("Certificate");
  });

  it("returns 'Degree' for DEGREE", () => {
    expect(formatDocumentTypeLabel("DEGREE")).toBe("Degree");
  });

  it("returns 'ID Card' for ID_CARD", () => {
    expect(formatDocumentTypeLabel("ID_CARD")).toBe("ID Card");
  });

  it("returns 'CV' for CV", () => {
    expect(formatDocumentTypeLabel("CV")).toBe("CV");
  });

  it("falls back to formatEnumLabel for unknown types", () => {
    expect(formatDocumentTypeLabel("UNKNOWN_TYPE")).toBe("Unknown Type");
  });
});

describe("formatEnumLabel", () => {
  it("converts SNAKE_CASE to Title Case", () => {
    expect(formatEnumLabel("ALL_LEVELS")).toBe("All Levels");
  });

  it("handles single word enums", () => {
    expect(formatEnumLabel("APPROVED")).toBe("Approved");
  });
});

describe("formatRoleLabel", () => {
  it("removes ROLE_ prefix and formats", () => {
    expect(formatRoleLabel("ROLE_ADMIN")).toBe("Admin");
    expect(formatRoleLabel("ROLE_STUDENT")).toBe("Student");
  });
});

describe("getStatusVariant", () => {
  it("returns 'warning' for PENDING", () => {
    expect(getStatusVariant("PENDING")).toBe("warning");
  });

  it("returns 'success' for APPROVED", () => {
    expect(getStatusVariant("APPROVED")).toBe("success");
  });

  it("returns 'error' for REJECTED", () => {
    expect(getStatusVariant("REJECTED")).toBe("error");
  });

  it("returns 'default' for unknown status", () => {
    expect(getStatusVariant("UNKNOWN")).toBe("default");
  });
});

describe("getActiveBadgeVariant", () => {
  it("returns 'success' for true", () => {
    expect(getActiveBadgeVariant(true)).toBe("success");
  });

  it("returns 'error' for false", () => {
    expect(getActiveBadgeVariant(false)).toBe("error");
  });
});

describe("getFullName", () => {
  it("combines firstName and lastName", () => {
    expect(
      getFullName({ firstName: "John", lastName: "Doe", username: "john_doe" })
    ).toBe("John Doe");
  });

  it("falls back to username when name is missing", () => {
    expect(getFullName({ username: "john_doe", email: "john@example.com" })).toBe(
      "john_doe"
    );
  });

  it("falls back to email when no name or username", () => {
    expect(getFullName({ email: "john@example.com" })).toBe("john@example.com");
  });

  it("handles null values", () => {
    expect(
      getFullName({
        firstName: null,
        lastName: null,
        username: "john_doe",
        email: null,
      })
    ).toBe("john_doe");
  });
});

describe("getInitials", () => {
  it("returns first and last initial for two words", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns first and last initial for multiple words", () => {
    expect(getInitials("John Michael Doe")).toBe("JD");
  });

  it("returns first two characters for single word", () => {
    expect(getInitials("John")).toBe("JO");
  });

  it("handles uppercase conversion", () => {
    expect(getInitials("john doe")).toBe("JD");
  });
});
