import { describe, expect, it } from "vitest";
import { DocumentTypeSchema, DocumentInfoSchema } from "./admin.schemas";

describe("DocumentTypeSchema", () => {
  it("parses CERTIFICATE successfully", () => {
    const result = DocumentTypeSchema.parse("CERTIFICATE");
    expect(result).toBe("CERTIFICATE");
  });

  it("parses DEGREE successfully", () => {
    const result = DocumentTypeSchema.parse("DEGREE");
    expect(result).toBe("DEGREE");
  });

  it("parses ID_CARD successfully", () => {
    const result = DocumentTypeSchema.parse("ID_CARD");
    expect(result).toBe("ID_CARD");
  });

  it("parses CV successfully", () => {
    const result = DocumentTypeSchema.parse("CV");
    expect(result).toBe("CV");
  });

  it("throws on invalid document type", () => {
    expect(() => DocumentTypeSchema.parse("INVALID_TYPE")).toThrow();
  });
});

describe("DocumentInfoSchema", () => {
  it("validates document with CV type", () => {
    const result = DocumentInfoSchema.parse({
      name: "Resume.pdf",
      url: "https://example.com/resume.pdf",
      type: "CV",
    });
    expect(result.type).toBe("CV");
    expect(result.name).toBe("Resume.pdf");
  });

  it("validates document with CERTIFICATE type", () => {
    const result = DocumentInfoSchema.parse({
      name: "Cert.pdf",
      url: "https://example.com/cert.pdf",
      type: "CERTIFICATE",
    });
    expect(result.type).toBe("CERTIFICATE");
  });
});
