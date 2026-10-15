package com.pesira.employees.employee;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.fasterxml.jackson.databind.JsonNode;
import com.pesira.employees.support.ApiTestSupport;

class EmployeeApiTest extends ApiTestSupport {

    private String admin;
    private String user;

    @BeforeEach
    void tokens() throws Exception {
        admin = adminToken();
        user = userToken();
    }

    @Test
    void listRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/employees")).andExpect(status().isUnauthorized());
    }

    @Test
    void listIsPagedAndSorted() throws Exception {
        mvc.perform(get("/api/employees").header(HttpHeaders.AUTHORIZATION, user)
                        .param("size", "5").param("sortBy", "salary").param("sortDir", "desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(5)))
                .andExpect(jsonPath("$.totalElements").value(25))
                .andExpect(jsonPath("$.totalPages").value(5))
                .andExpect(jsonPath("$.content[0].lastName").value("Nyambura"));
    }

    @Test
    void searchMatchesNameDepartmentAndTitle() throws Exception {
        mvc.perform(get("/api/employees").header(HttpHeaders.AUTHORIZATION, user).param("search", "amina wan"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].email").value("amina.wanjiru@pesira.com"));

        mvc.perform(get("/api/employees").header(HttpHeaders.AUTHORIZATION, user)
                        .param("department", "hr").param("status", "ACTIVE"))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void rejectsUnknownSortFieldAndOversizedPage() throws Exception {
        mvc.perform(get("/api/employees").header(HttpHeaders.AUTHORIZATION, user).param("sortBy", "password"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/employees").header(HttpHeaders.AUTHORIZATION, user).param("size", "1000"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createValidatesPayload() throws Exception {
        mvc.perform(post("/api/employees").header(HttpHeaders.AUTHORIZATION, user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new Object[]{"firstName", "", "email", "nope", "salary", -5})))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.firstName").exists())
                .andExpect(jsonPath("$.fieldErrors.email").value("Email must be valid"))
                .andExpect(jsonPath("$.fieldErrors.salary").value("Salary cannot be negative"))
                .andExpect(jsonPath("$.fieldErrors.hireDate").exists());
    }

    @Test
    void userCanCreateReadAndUpdate() throws Exception {
        String body = mvc.perform(post("/api/employees").header(HttpHeaders.AUTHORIZATION, user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validEmployee("New.Hire@Pesira.com", null)))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, containsString("/api/employees/")))
                .andExpect(jsonPath("$.email").value("new.hire@pesira.com"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andReturn().getResponse().getContentAsString();
        JsonNode created = readJson(body);
        long id = created.get("id").asLong();

        mvc.perform(put("/api/employees/" + id).header(HttpHeaders.AUTHORIZATION, user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(employee("new.hire@pesira.com", "Staff Engineer", created.get("version").asLong())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(created.get("version").asLong() + 1));

        mvc.perform(get("/api/employees/" + id).header(HttpHeaders.AUTHORIZATION, user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobTitle").value("Staff Engineer"));
    }

    @Test
    void duplicateEmailConflicts() throws Exception {
        mvc.perform(post("/api/employees").header(HttpHeaders.AUTHORIZATION, user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validEmployee("AMINA.WANJIRU@pesira.com", null)))
                .andExpect(status().isConflict());
    }

    @Test
    void staleVersionOnUpdateConflicts() throws Exception {
        mvc.perform(put("/api/employees/1").header(HttpHeaders.AUTHORIZATION, user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validEmployee("amina.wanjiru@pesira.com", 99L)))
                .andExpect(status().isConflict());
    }

    @Test
    void missingEmployeeIsNotFound() throws Exception {
        mvc.perform(get("/api/employees/9999").header(HttpHeaders.AUTHORIZATION, user))
                .andExpect(status().isNotFound());
    }

    @Test
    void onlyAdminCanDelete() throws Exception {
        mvc.perform(delete("/api/employees/2").header(HttpHeaders.AUTHORIZATION, user))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/employees/2").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/employees/2").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isNotFound());
    }

    @Test
    void exportsCsvWithFilters() throws Exception {
        mvc.perform(get("/api/employees/export").header(HttpHeaders.AUTHORIZATION, user)
                        .param("format", "csv").param("department", "Finance"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString(".csv")))
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(content().string(containsString("id,firstName,lastName,email")))
                .andExpect(content().string(containsString("rose.nyambura@pesira.com")));
    }

    @Test
    void exportsJson() throws Exception {
        mvc.perform(get("/api/employees/export").header(HttpHeaders.AUTHORIZATION, user)
                        .param("format", "json").param("status", "ON_LEAVE"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString(".json")))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].status").value("ON_LEAVE"));
    }

    @Test
    void rejectsUnknownExportFormat() throws Exception {
        mvc.perform(get("/api/employees/export").header(HttpHeaders.AUTHORIZATION, user).param("format", "xml"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", startsWith("format must be")));
    }

    private String validEmployee(String email, Long version) throws Exception {
        return employee(email, "Platform Engineer", version);
    }

    private String employee(String email, String jobTitle, Long version) throws Exception {
        return json(new Object[]{
                "firstName", "New", "lastName", "Hire", "email", email, "phone", "+254700000000",
                "department", "Engineering", "jobTitle", jobTitle, "salary", 120000.50,
                "hireDate", "2024-02-01", "version", version});
    }
}
