import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResendVerificationPage } from "./ResendVerificationPage";

const { mockResendVerification } = vi.hoisted(() => ({
  mockResendVerification: vi.fn(),
}));

vi.mock("../../services/auth.service", () => ({
  authService: {
    resendVerification: mockResendVerification,
  },
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResendVerificationPage />
    </MemoryRouter>,
  );

describe("ResendVerificationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an accessible email form", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Resend Verification Email", level: 1 }),
    ).toBeInTheDocument();
    const email = screen.getByRole("textbox", { name: /email/i });
    expect(email).toBeRequired();
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(screen.getByRole("link", { name: "Back to Login" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("submits the email and shows the confirmation state", async () => {
    const user = userEvent.setup();
    mockResendVerification.mockResolvedValue({ success: true });
    renderPage();

    await user.type(screen.getByRole("textbox", { name: /email/i }), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Resend Verification Email" }));

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalledWith({ email: "user@example.com" });
    });
    const heading = screen.getByRole("heading", { name: "Check Your Email", level: 1 });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAccessibleDescription(
      /If an unverified account exists for user@example\.com, a new verification link has been sent\./,
    );
  });

  it("announces an API error", async () => {
    const user = userEvent.setup();
    mockResendVerification.mockRejectedValue(new Error("Too many verification requests"));
    renderPage();

    await user.type(screen.getByRole("textbox", { name: /email/i }), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Resend Verification Email" }));

    const alert = await screen.findByRole("alert", { name: "Unable to resend email" });
    expect(alert).toHaveAccessibleDescription("Too many verification requests");
    expect(alert).toHaveFocus();
  });

  it("announces the message from the API error response", async () => {
    const user = userEvent.setup();
    mockResendVerification.mockRejectedValue({
      message: "Email is already verified",
      status: 400,
      error: "ERR_1002",
    });
    renderPage();

    await user.type(screen.getByRole("textbox", { name: /email/i }), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Resend Verification Email" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email is already verified",
    );
  });
});
