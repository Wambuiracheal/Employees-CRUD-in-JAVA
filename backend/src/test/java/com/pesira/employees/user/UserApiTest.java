package com.pesira.employees.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.pesira.employees.support.ApiTestSupport;

class UserApiTest extends ApiTestSupport {

    @Autowired
    private UserRepository userRepository;

    @Test
    void userManagementIsAdminOnly() throws Exception {
        mvc.perform(get("/api/users").header(HttpHeaders.AUTHORIZATION, userToken()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users").header(HttpHeaders.AUTHORIZATION, adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").exists())
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }

    @Test
    void adminCanPromoteUser() throws Exception {
        long userId = userRepository.findByEmail(USER_EMAIL).orElseThrow().getId();
        mvc.perform(patch("/api/users/" + userId + "/role").header(HttpHeaders.AUTHORIZATION, adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new Object[]{"role", "ADMIN"})))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void cannotDemoteLastAdmin() throws Exception {
        long adminId = userRepository.findByEmail(ADMIN_EMAIL).orElseThrow().getId();
        mvc.perform(patch("/api/users/" + adminId + "/role").header(HttpHeaders.AUTHORIZATION, adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new Object[]{"role", "USER"})))
                .andExpect(status().isConflict());
    }
}
