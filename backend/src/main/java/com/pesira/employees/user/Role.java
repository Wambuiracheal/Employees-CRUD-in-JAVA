package com.pesira.employees.user;

public enum Role {
    ADMIN,
    USER;

    /** Spring Security authority name, e.g. {@code ROLE_ADMIN}. */
    public String authority() {
        return "ROLE_" + name();
    }
}
