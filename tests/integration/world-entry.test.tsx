import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: (
    _loader: () => Promise<unknown>,
    options: { loading: () => React.ReactNode },
  ) => options.loading,
}));

import WorldPage from "@/app/play/world/page";

describe("3D world entry", () => {
  it("renders an accessible loading shell before the WebGL client bundle resolves", () => {
    render(<WorldPage />);

    expect(screen.getByTestId("world-canvas-shell")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /preparing the varennes reconstruction/i,
    );
    expect(
      screen.getByRole("link", { name: /use non-spatial investigation/i }),
    ).toHaveAttribute("href", "/play/investigate");
  });
});
