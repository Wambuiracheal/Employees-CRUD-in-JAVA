package com.pesira.employees.user;

import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(@NotNull(message = "Role is required") Role role) {
}
