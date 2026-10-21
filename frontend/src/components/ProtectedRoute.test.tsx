import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Secret dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("renders nothing while auth state is loading", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    renderProtected();
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });

  it("redirects to /login when the user is not authenticated", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    renderProtected();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders the protected content when the user is authenticated", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 1, email: "a@example.com", display_name: "A", date_joined: "" },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    renderProtected();
    expect(screen.getByText("Secret dashboard")).toBeInTheDocument();
  });
});
