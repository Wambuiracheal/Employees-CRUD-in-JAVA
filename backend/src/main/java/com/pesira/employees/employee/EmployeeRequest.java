package com.pesira.employees.employee;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Payload for creating and updating an employee.
 *
 * @param version required on update when the client wants lost-update protection; ignored on create
 */
public record EmployeeRequest(
        @NotBlank(message = "First name is required")
        @Size(max = 50, message = "First name must be at most 50 characters")
        @Pattern(regexp = "^[\\p{L} .'-]+$", message = "First name contains invalid characters")
        String firstName,

        @NotBlank(message = "Last name is required")
        @Size(max = 50, message = "Last name must be at most 50 characters")
        @Pattern(regexp = "^[\\p{L} .'-]+$", message = "Last name contains invalid characters")
        String lastName,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        @Size(max = 150, message = "Email must be at most 150 characters")
        String email,

        @Pattern(regexp = "^$|^\\+?[0-9 ()-]{7,20}$", message = "Phone must be 7-20 digits and may start with +")
        String phone,

        @NotBlank(message = "Department is required")
        @Size(max = 50, message = "Department must be at most 50 characters")
        String department,

        @NotBlank(message = "Job title is required")
        @Size(max = 100, message = "Job title must be at most 100 characters")
        String jobTitle,

        @NotNull(message = "Salary is required")
        @DecimalMin(value = "0.00", message = "Salary cannot be negative")
        @DecimalMax(value = "9999999999.99", message = "Salary is too large")
        @Digits(integer = 10, fraction = 2, message = "Salary can have at most 2 decimal places")
        BigDecimal salary,

        @NotNull(message = "Hire date is required")
        @PastOrPresent(message = "Hire date cannot be in the future")
        LocalDate hireDate,

        EmployeeStatus status,

        Long version
) {
    public EmployeeRequest {
        // Trim before validation so surrounding whitespace never fails @Email / @Pattern.
        email = email == null ? null : email.trim();
        phone = phone == null ? null : phone.trim();
    }
}
