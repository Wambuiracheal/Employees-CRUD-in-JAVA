package com.pesira.employees.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Base class for full-stack API tests: real security filter chain, real JWTs, Flyway-migrated H2.
 * Each test runs in a transaction that is rolled back afterwards.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
public abstract class ApiTestSupport {

    protected static final String ADMIN_EMAIL = "admin@test.local";
    protected static final String ADMIN_PASSWORD = "test-admin-pass-1";
    protected static final String USER_EMAIL = "user@test.local";
    protected static final String USER_PASSWORD = "test-user-pass-1";

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected String adminToken() throws Exception {
        return login(ADMIN_EMAIL, ADMIN_PASSWORD);
    }

    protected String userToken() throws Exception {
        return login(USER_EMAIL, USER_PASSWORD);
    }

    protected String login(String email, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new Object[]{"email", email, "password", password})))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + objectMapper.readTree(body).get("token").asText();
    }

    protected JsonNode readJson(String body) throws Exception {
        return objectMapper.readTree(body);
    }

    /** Builds a JSON object from alternating key/value pairs. */
    protected String json(Object[] keyValues) throws Exception {
        var node = objectMapper.createObjectNode();
        for (int i = 0; i < keyValues.length; i += 2) {
            node.set((String) keyValues[i], objectMapper.valueToTree(keyValues[i + 1]));
        }
        return objectMapper.writeValueAsString(node);
    }
}
