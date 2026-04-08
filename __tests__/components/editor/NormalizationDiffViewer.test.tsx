import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock Monaco DiffEditor since it requires browser APIs
vi.mock("@monaco-editor/react", () => ({
  DiffEditor: (props: Record<string, unknown>) => (
    <div data-testid="diff-editor" data-original={props.original} data-modified={props.modified} />
  ),
}));

vi.mock("@/lib/editor/languages/turtle", () => ({
  registerTurtleLanguage: vi.fn(),
}));

import { NormalizationDiffViewer } from "@/components/editor/NormalizationDiffViewer";

describe("NormalizationDiffViewer", () => {
  const defaultProps = {
    originalContent: "@prefix owl: <http://www.w3.org/2002/07/owl#> .",
    normalizedContent: "@prefix owl:  <http://www.w3.org/2002/07/owl#> .\n",
    onClose: vi.fn(),
  };

  it("renders the header", () => {
    render(<NormalizationDiffViewer {...defaultProps} />);
    expect(screen.getByText("Normalization Preview")).toBeDefined();
  });

  it("renders Original and Normalized labels", () => {
    render(<NormalizationDiffViewer {...defaultProps} />);
    expect(screen.getByText("Original")).toBeDefined();
    expect(screen.getByText("Normalized")).toBeDefined();
  });

  it("renders the diff editor", () => {
    render(<NormalizationDiffViewer {...defaultProps} />);
    expect(screen.getByTestId("diff-editor")).toBeDefined();
  });

  it("renders footer with instructions", () => {
    render(<NormalizationDiffViewer {...defaultProps} />);
    expect(
      screen.getByText(/Click .Run Normalization. in settings to apply these changes/)
    ).toBeDefined();
  });

  it("calls onClose when Close button is clicked", async () => {
    const onClose = vi.fn();
    render(<NormalizationDiffViewer {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
