"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function AppHeader() {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();

  const navLink = (href: string, label: string) => (
    <Link href={href} className={`nav-link${pathname.startsWith(href) ? " active" : ""}`}>
      {label}
    </Link>
  );

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/employees" className="brand">
          Employee Directory
        </Link>
        <nav className="nav">
          {navLink("/employees", "Employees")}
          {isAdmin && navLink("/users", "Users")}
        </nav>
        {user && (
          <div className="user-menu">
            <span className="user-name" title={user.email}>
              {user.fullName}
            </span>
            <span className={`badge ${user.role === "ADMIN" ? "badge-primary" : "badge-neutral"}`}>{user.role}</span>
            <button type="button" className="btn btn-sm" onClick={() => logout()}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
