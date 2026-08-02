import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthBackLink } from "./AuthBackLink";

describe("AuthBackLink", () => {
  it("renders consistent back navigation with a decorative icon", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthBackLink to="/login" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Back to Login" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
