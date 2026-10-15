package com.pesira.employees.employee;

import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

/**
 * Composable query predicates for the employee list and export endpoints.
 * Each factory returns {@code null} when its input is empty, which Spring Data treats as "no filter".
 */
final class EmployeeSpecifications {

    private EmployeeSpecifications() {
    }

    static Specification<Employee> matching(EmployeeFilter filter) {
        return Specification.allOf(
                search(filter.search()),
                hasStatus(filter.status()),
                inDepartment(filter.department()));
    }

    /** Case-insensitive "contains" match on name, email, department and job title. */
    static Specification<Employee> search(String term) {
        if (term == null || term.isBlank()) {
            return null;
        }
        String pattern = "%" + escapeLike(term.trim().toLowerCase(Locale.ROOT)) + "%";
        return (root, query, cb) -> {
            var fullName = cb.concat(cb.concat(root.get("firstName"), " "), root.get("lastName"));
            return cb.or(
                    cb.like(cb.lower(fullName), pattern, '\\'),
                    cb.like(cb.lower(root.get("email")), pattern, '\\'),
                    cb.like(cb.lower(root.get("department")), pattern, '\\'),
                    cb.like(cb.lower(root.get("jobTitle")), pattern, '\\'));
        };
    }

    static Specification<Employee> hasStatus(EmployeeStatus status) {
        return status == null ? null : (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    static Specification<Employee> inDepartment(String department) {
        if (department == null || department.isBlank()) {
            return null;
        }
        return (root, query, cb) -> cb.equal(cb.lower(root.get("department")),
                department.trim().toLowerCase(Locale.ROOT));
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
