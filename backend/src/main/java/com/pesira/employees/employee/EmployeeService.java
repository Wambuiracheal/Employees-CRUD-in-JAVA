package com.pesira.employees.employee;

import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pesira.employees.common.BadRequestException;
import com.pesira.employees.common.ConflictException;
import com.pesira.employees.common.PageResponse;
import com.pesira.employees.common.ResourceNotFoundException;

@Service
public class EmployeeService {

    public static final int MAX_PAGE_SIZE = 100;

    /**
     * Sortable columns exposed to clients, mapped to entity attributes.
     * A whitelist keeps arbitrary property names out of generated queries.
     */
    private static final Map<String, String> SORTABLE_FIELDS = Map.of(
            "id", "id",
            "firstName", "firstName",
            "lastName", "lastName",
            "email", "email",
            "department", "department",
            "jobTitle", "jobTitle",
            "salary", "salary",
            "hireDate", "hireDate",
            "status", "status",
            "createdAt", "createdAt");

    private final EmployeeRepository repository;

    public EmployeeService(EmployeeRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public PageResponse<EmployeeResponse> search(EmployeeFilter filter, int page, int size,
                                                 String sortBy, String sortDir) {
        if (page < 0) {
            throw new BadRequestException("page must be zero or greater");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
        Pageable pageable = PageRequest.of(page, size, toSort(sortBy, sortDir));
        return PageResponse.from(
                repository.findAll(EmployeeSpecifications.matching(filter), pageable),
                EmployeeResponse::from);
    }

    /** All matching rows (no paging), used by export. */
    @Transactional(readOnly = true)
    public List<EmployeeResponse> findAll(EmployeeFilter filter, String sortBy, String sortDir) {
        return repository.findAll(EmployeeSpecifications.matching(filter), toSort(sortBy, sortDir))
                .stream()
                .map(EmployeeResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public EmployeeResponse get(Long id) {
        return EmployeeResponse.from(find(id));
    }

    @Transactional(readOnly = true)
    public List<String> departments() {
        return repository.findDistinctDepartments();
    }

    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        String email = normalizeEmail(request.email());
        if (repository.existsByEmail(email)) {
            throw new ConflictException("An employee with email " + email + " already exists");
        }
        Employee employee = new Employee();
        apply(employee, request, email);
        return EmployeeResponse.from(repository.saveAndFlush(employee));
    }

    @Transactional
    public EmployeeResponse update(Long id, EmployeeRequest request) {
        Employee employee = find(id);
        if (request.version() != null && !request.version().equals(employee.getVersion())) {
            throw new ObjectOptimisticLockingFailureException(Employee.class, id);
        }
        String email = normalizeEmail(request.email());
        if (repository.existsByEmailAndIdNot(email, id)) {
            throw new ConflictException("An employee with email " + email + " already exists");
        }
        apply(employee, request, email);
        // Flush so the incremented version is returned to the client.
        return EmployeeResponse.from(repository.saveAndFlush(employee));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    private Employee find(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Employee", id));
    }

    private static void apply(Employee employee, EmployeeRequest request, String normalizedEmail) {
        employee.setFirstName(request.firstName().trim());
        employee.setLastName(request.lastName().trim());
        employee.setEmail(normalizedEmail);
        employee.setPhone(request.phone() == null || request.phone().isBlank() ? null : request.phone().trim());
        employee.setDepartment(request.department().trim());
        employee.setJobTitle(request.jobTitle().trim());
        // Scale is safe: @Digits already limits input to two decimal places.
        employee.setSalary(request.salary().setScale(2, RoundingMode.UNNECESSARY));
        employee.setHireDate(request.hireDate());
        employee.setStatus(request.status() == null ? EmployeeStatus.ACTIVE : request.status());
    }

    private static Sort toSort(String sortBy, String sortDir) {
        String key = (sortBy == null || sortBy.isBlank()) ? "lastName" : sortBy;
        String property = SORTABLE_FIELDS.get(key);
        if (property == null) {
            throw new BadRequestException("Cannot sort by '" + key + "'. Allowed: "
                    + String.join(", ", SORTABLE_FIELDS.keySet().stream().sorted().toList()));
        }
        Sort.Direction direction;
        try {
            direction = sortDir == null || sortDir.isBlank()
                    ? Sort.Direction.ASC
                    : Sort.Direction.fromString(sortDir);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("sortDir must be 'asc' or 'desc'");
        }
        // Secondary sort on id gives stable ordering across pages when values tie.
        Sort sort = Sort.by(direction, property);
        return property.equals("id") ? sort : sort.and(Sort.by(Sort.Direction.ASC, "id"));
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
