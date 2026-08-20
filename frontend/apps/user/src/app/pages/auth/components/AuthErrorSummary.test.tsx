import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthErrorSummary } from "./AuthErrorSummary";

describe("AuthErrorSummary", () => {
  it("exposes the title and message once as alert content", () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <AuthErrorSummary
        ref={ref}
        title="Unable to sign in"
        message="Check your email and password."
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Unable to sign in");
    expect(alert).toHaveTextContent("Check your email and password.");
    expect(alert).not.toHaveAttribute("aria-labelledby");
    expect(alert).not.toHaveAttribute("aria-describedby");
    expect(alert).toHaveAttribute("tabindex", "-1");
    expect(ref.current).toBe(alert);
  });

  it("uses a stable default title and supports structured messages", () => {
    render(
      <AuthErrorSummary
        message={
          <ul>
            <li>Password is required</li>
            <li>Passwords must match</li>
          </ul>
        }
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Error");
    expect(alert).toHaveTextContent(/Password is required.*Passwords must match/);
  });
});
