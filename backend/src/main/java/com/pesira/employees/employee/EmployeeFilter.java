package com.pesira.employees.employee;

/** Optional criteria shared by the list and export endpoints. */
public record EmployeeFilter(String search, EmployeeStatus status, String department) {
}
