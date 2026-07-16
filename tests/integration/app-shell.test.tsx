import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("application shell", () => {
  it("introduces the Varennes case and offers a clear start action", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "The Road That Should Have Closed" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Begin investigation" })).toHaveAttribute(
      "href",
      "/play",
    );
  });
});
