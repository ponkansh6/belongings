import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Header from "@/components/Header";

describe("Header", () => {
  it("renders the title and subtitle", () => {
    render(<Header onResetAll={vi.fn()} hasChecklists={true} />);
    expect(screen.getByText("Belongings Checker")).toBeInTheDocument();
    expect(screen.getByText("出かける前の忘れ物チェック")).toBeInTheDocument();
  });

  it("shows reset button when hasChecklists is true", () => {
    render(<Header onResetAll={vi.fn()} hasChecklists={true} />);
    expect(screen.getByRole("button", { name: "すべてリセット" })).toBeInTheDocument();
  });

  it("hides reset button when hasChecklists is false", () => {
    render(<Header onResetAll={vi.fn()} hasChecklists={false} />);
    expect(screen.queryByRole("button", { name: "すべてリセット" })).not.toBeInTheDocument();
  });

  it("calls onResetAll when reset button is clicked", async () => {
    const onResetAll = vi.fn();
    render(<Header onResetAll={onResetAll} hasChecklists={true} />);
    await screen.getByRole("button", { name: "すべてリセット" }).click();
    expect(onResetAll).toHaveBeenCalledTimes(1);
  });
});
