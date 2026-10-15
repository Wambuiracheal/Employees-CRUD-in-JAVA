package com.pesira.employees.auth;

import java.time.Instant;

import com.pesira.employees.user.UserResponse;

public record AuthResponse(String token, String tokenType, Instant expiresAt, UserResponse user) {

    public AuthResponse(String token, Instant expiresAt, UserResponse user) {
        this(token, "Bearer", expiresAt, user);
    }
}
