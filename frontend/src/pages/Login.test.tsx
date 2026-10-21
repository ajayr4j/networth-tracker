import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/AuthContext";
import { Login } from "./Login";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function unauthorizedError() {
  return new AxiosError(
    "Unauthorized",
    "401",
    undefined,
    undefined,
    // @ts-expect-error minimal response stub for isAxiosError narrowing
    { status: 401, data: {}, statusText: "", headers: {}, config: {} },
  );
}

describe("Login", () => {
  it("shows an error message when login fails with invalid credentials", async () => {
    const login = vi.fn().mockRejectedValue(unauthorizedError());
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login,
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "a@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
  });

  it("requires both fields before submitting", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
  });
});
