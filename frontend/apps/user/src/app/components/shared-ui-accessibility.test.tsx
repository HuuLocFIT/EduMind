import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Alert,
  Button,
  Checkbox,
  IconButton,
  Input,
  Loading,
  LoadingOverlay,
  Modal,
  PasswordInput,
  PriceTag,
  ProgressBar,
  Radio,
  Select,
  Skeleton,
  Switch,
  Toast,
  ToastContainer,
  FullPageLoading,
  ConfirmDialog,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@edumind/user-ui";

describe("shared UI accessibility contracts", () => {
  it("exposes discounted pricing as one contextual sentence", () => {
    const { container } = render(
      <PriceTag price={75} originalPrice={100} />,
    );

    expect(
      screen.getByText("Original price $100.00, now $75.00, you save 25%"),
    ).toHaveClass("sr-only");
    const visualPrices = container.querySelector('[aria-hidden="true"]');
    expect(visualPrices).toHaveTextContent("$75.00$100.00-25%");
    expect(visualPrices).not.toHaveTextContent("Original price");
  });

  it("associates labels, descriptions, errors, and invalid state with form controls", () => {
    render(
      <>
        <Input label="Email" helperText="Use your school email" error="Email is invalid" required />
        <Select label="Level" helperText="Choose one" error="Level is required"><option>Beginner</option></Select>
        <Textarea label="Biography" helperText="Maximum 500 characters" />
        <Checkbox label="Accept terms" helperText="Required to continue" error="Accept the terms" />
        <Radio label="Monthly billing" helperText="Renews monthly" error="Choose a billing cycle" />
      </>,
    );

    const email = screen.getByRole("textbox", { name: /email/i });
    expect(email).toBeRequired();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Use your school email Email is invalid");
    expect(screen.getByRole("combobox", { name: "Level" })).toHaveAccessibleDescription(
      "Choose one Level is required",
    );
    expect(screen.getByRole("textbox", { name: "Biography" })).toHaveAccessibleDescription(
      "Maximum 500 characters",
    );
    expect(screen.getByRole("checkbox", { name: "Accept terms" })).toHaveAccessibleDescription(
      "Required to continue Accept the terms",
    );
    const monthlyBilling = screen.getByRole("radio", { name: "Monthly billing" });
    expect(monthlyBilling).toHaveAttribute("aria-invalid", "true");
    expect(monthlyBilling).toHaveAccessibleDescription(
      "Renews monthly Choose a billing cycle",
    );
  });

  it("changes the password visibility action without losing its value or focus", async () => {
    const user = userEvent.setup();
    render(
      <>
        <PasswordInput label="Password" />
        <Switch label="Email notifications" checked readOnly />
      </>,
    );

    const password = screen.getByLabelText("Password");
    const visibility = screen.getByRole("button", { name: "Show password" });
    await user.type(password, "Password123");
    visibility.focus();
    await user.keyboard(" ");
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("Password123");
    expect(visibility).toHaveAccessibleName("Hide password");
    expect(visibility).not.toHaveAttribute("aria-pressed");
    expect(visibility).toHaveFocus();
    expect(screen.getByRole("switch", { name: "Email notifications" })).toBeChecked();
  });

  it("preserves button names and exposes loading and progress state", () => {
    render(
      <>
        <Button isLoading>Save changes</Button>
        <IconButton aria-label="Delete course" icon={<span>×</span>} isLoading />
        <ProgressBar progress={120} label="Course completion" />
      </>,
    );

    const loadingButton = screen.getByRole("button", { name: "Loading: Save changes" });
    expect(loadingButton).toHaveAttribute("aria-busy", "true");
    expect(loadingButton).toHaveTextContent("Loading: Save changes");
    expect(screen.getByRole("button", { name: "Delete course" })).toBeDisabled();
    expect(screen.getByRole("progressbar", { name: "Course completion" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("supports the WAI-ARIA tabs keyboard pattern", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview panel</TabsContent>
        <TabsContent value="lessons">Lessons panel</TabsContent>
      </Tabs>,
    );

    const overview = screen.getByRole("tab", { name: "Overview" });
    overview.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Lessons" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Lessons" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Lessons");
  });

  it("labels dialogs, closes with Escape, and restores trigger focus", async () => {
    const user = userEvent.setup();
    const DialogFixture = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open settings</button>
          <Modal isOpen={open} onClose={() => setOpen(false)} title="Course settings">
            <button type="button">Save</button>
          </Modal>
        </>
      );
    };
    render(<DialogFixture />);

    const trigger = screen.getByRole("button", { name: "Open settings" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Course settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" }).parentElement).toHaveClass("pt-4");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("uses urgency-appropriate feedback roles and hides visual placeholders", () => {
    const { container } = render(
      <>
        <Alert variant="info" message="Saved" />
        <Alert variant="error" message="Payment failed" />
        <Skeleton />
      </>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("alert")).toHaveTextContent("Payment failed");
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it("announces toast urgency and gives its close control an accessible name", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <Toast id="saved" variant="success" title="Saved" message="Course updated" duration={0} onClose={onClose} />,
    );

    expect(screen.getByText("Course updated")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const close = screen.getByRole("button", { name: "Close notification" });
    await user.click(close);
    expect(onClose).toHaveBeenCalledWith("saved");

    rerender(
      <Toast id="failed" variant="error" message="Update failed" duration={0} onClose={onClose} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Update failed");
  });

  it("provides a persistent polite live region for success toasts", () => {
    const { rerender } = render(
      <ToastContainer toasts={[]} onClose={vi.fn()} />,
    );
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    expect(liveRegion).toBeEmptyDOMElement();

    rerender(
      <ToastContainer
        toasts={[
          {
            id: "enrolled",
            variant: "success",
            message: "Successfully enrolled in course!",
            duration: 0,
            onClose: vi.fn(),
          },
        ]}
        onClose={vi.fn()}
      />,
    );

    expect(liveRegion).toHaveTextContent("Successfully enrolled in course!");
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("exposes loading names and busy state while hiding spinner graphics", () => {
    const { container, rerender } = render(<Loading text="Loading lessons" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading lessons");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    rerender(<FullPageLoading message="Preparing your course" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("EduMindPreparing your course");

    rerender(<LoadingOverlay show text="Submitting enrollment" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Submitting enrollment");

    rerender(<LoadingOverlay show={false} text="Submitting enrollment" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("labels confirmation dialogs and exposes enabled and loading action states", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete course"
        message="This cannot be undone."
        confirmText="Delete"
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Delete course" });
    expect(dialog).toHaveClass("fixed", "inset-0", "z-50");
    expect(dialog).toHaveTextContent(
      "This cannot be undone.",
    );
    const dangerAction = screen.getByRole("button", { name: "Delete" });
    const cancelAction = screen.getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(cancelAction).toHaveFocus());
    expect(dangerAction).toHaveClass("bg-red-700", "hover:bg-red-800", "text-white");
    expect(dangerAction).not.toHaveClass("opacity-50");
    expect(screen.getByText("This cannot be undone.")).toHaveClass("text-gray-600");
    await user.click(dangerAction);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete course"
        message="This cannot be undone."
        confirmText="Delete"
        isLoading
      />,
    );
    expect(screen.getByRole("button", { name: "Loading: Delete" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
