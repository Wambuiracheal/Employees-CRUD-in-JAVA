package com.pesira.employees.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.pesira.employees.support.ApiTestSupport;

class AuthApiTest extends ApiTestSupport {

    @Test
    void loginReturnsTokenAndRole() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new Object[]{"email", " ADMIN@test.local ", "password", ADMIN_PASSWORD})))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.role").value("ADMIN"));
    }

    @Test
    void loginWithWrongPasswordIsUnauthorized() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new Object[]{"email", ADMIN_EMAIL, "password", "wrong"})))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void registerCreatesUserRoleAccount() throws Exception {
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new Object[]{
                                "fullName", "Jane Doe", "email", "jane@example.com", "password", "secret123"})))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andExpect(jsonPath("$.user.email").value("jane@example.com"));
    }

    @Test
    void registerWithExistingEmailConflicts() throws Exception {
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new Object[]{
                                "fullName", "Dup", "email", USER_EMAIL, "password", "secret123"})))
                .andExpect(status().isConflict());
    }

    @Test
    void registerValidatesPasswordStrength() throws Exception {
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new Object[]{
                                "fullName", "Weak", "email", "weak@example.com", "password", "short"})))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void meRequiresValidToken() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, userToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(USER_EMAIL));
    }
}
