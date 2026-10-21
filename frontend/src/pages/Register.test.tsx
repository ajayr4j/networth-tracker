import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/AuthContext";
import { Register } from "./Register";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function badRequestError(data: Record<string, string[]>) {
  return new AxiosError(
    "Bad Request",
    "400",
    undefined,
    undefined,
    // @ts-expect-error minimal response stub for isAxiosError narrowing
    { status: 400, data, statusText: "", headers: {}, config: {} },
  );
}

describe("Register", () => {
  it("shows field-level errors returned by the API", async () => {
    const register = vi
      .fn()
      .mockRejectedValue(
        badRequestError({ email: ["A user with this email already exists."] }),
      );
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "taken@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(
      await screen.findByText("A user with this email already exists."),
    ).toBeInTheDocument();
  });

  it("requires email and password before submitting", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
  });
});
