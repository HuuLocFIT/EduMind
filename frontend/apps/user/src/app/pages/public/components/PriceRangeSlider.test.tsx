import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { PriceRangeSlider } from "./PriceRangeSlider";

const ControlledSlider = ({ onCommit }: { onCommit: (value: [number, number]) => void }) => {
  const [value, setValue] = useState<[number, number]>([0, 200]);
  return <PriceRangeSlider min={0} max={200} value={value} onChange={setValue} onCommit={onCommit} />;
};

describe("PriceRangeSlider", () => {
  it("shows the value live while dragging but commits only on release", () => {
    const onCommit = vi.fn();
    render(<ControlledSlider onCommit={onCommit} />);
    const minThumb = screen.getByRole("slider", { name: "Minimum price" });

    fireEvent.pointerDown(minThumb, { pointerId: 1 });
    fireEvent.change(minThumb, { target: { value: "30" } });
    fireEvent.change(minThumb, { target: { value: "50" } });

    expect(screen.getByText("$50")).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(minThumb, { pointerId: 1 });
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith([50, 200]);
  });

  it("commits when pointer capture is lost, e.g. released outside the slider", () => {
    const onCommit = vi.fn();
    render(<ControlledSlider onCommit={onCommit} />);
    const maxThumb = screen.getByRole("slider", { name: "Maximum price" });

    fireEvent.pointerDown(maxThumb, { pointerId: 1 });
    fireEvent.change(maxThumb, { target: { value: "120" } });
    fireEvent.lostPointerCapture(maxThumb, { pointerId: 1 });
    // A late pointerup must not commit a second time
    fireEvent.pointerUp(maxThumb, { pointerId: 1 });

    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith([0, 120]);
  });

  it("commits keyboard changes immediately", () => {
    const onCommit = vi.fn();
    render(<ControlledSlider onCommit={onCommit} />);

    fireEvent.change(screen.getByRole("slider", { name: "Minimum price" }), { target: { value: "10" } });

    expect(onCommit).toHaveBeenCalledWith([10, 200]);
  });
});
