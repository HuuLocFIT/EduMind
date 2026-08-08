import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthErrorSummary } from "./AuthErrorSummary";

describe("AuthErrorSummary", () => {
  it("exposes the title and message as the alert name and description", () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <AuthErrorSummary
        ref={ref}
        title="Unable to sign in"
        message="Check your email and password."
      />,
    );

    const alert = screen.getByRole("alert", { name: "Unable to sign in" });
    expect(alert).toHaveAccessibleDescription("Check your email and password.");
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

    expect(screen.getByRole("alert", { name: "Error" })).toHaveAccessibleDescription(
      /Password is required.*Passwords must match/,
    );
  });
});
