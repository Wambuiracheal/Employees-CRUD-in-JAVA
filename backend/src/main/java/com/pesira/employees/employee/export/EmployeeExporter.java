package com.pesira.employees.employee.export;

import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import org.springframework.stereotype.Component;

import com.pesira.employees.employee.EmployeeResponse;

/**
 * Serialises employees to CSV or JSON.
 * CSV is written by hand: the format is simple and this avoids an extra dependency.
 */
@Component
public class EmployeeExporter {

    private static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    private record Column(String header, Function<EmployeeResponse, Object> value) {
    }

    private static final List<Column> COLUMNS = List.of(
            new Column("id", EmployeeResponse::id),
            new Column("firstName", EmployeeResponse::firstName),
            new Column("lastName", EmployeeResponse::lastName),
            new Column("email", EmployeeResponse::email),
            new Column("phone", EmployeeResponse::phone),
            new Column("department", EmployeeResponse::department),
            new Column("jobTitle", EmployeeResponse::jobTitle),
            new Column("salary", e -> e.salary() == null ? null : e.salary().toPlainString()),
            new Column("hireDate", EmployeeResponse::hireDate),
            new Column("status", EmployeeResponse::status),
            new Column("createdAt", EmployeeResponse::createdAt),
            new Column("updatedAt", EmployeeResponse::updatedAt));

    private final ObjectMapper jsonWriter;

    public EmployeeExporter(ObjectMapper objectMapper) {
        this.jsonWriter = objectMapper.copy().enable(SerializationFeature.INDENT_OUTPUT);
    }

    public byte[] export(List<EmployeeResponse> employees, ExportFormat format) {
        return switch (format) {
            case CSV -> toCsv(employees);
            case JSON -> toJson(employees);
        };
    }

    private byte[] toJson(List<EmployeeResponse> employees) {
        try {
            return jsonWriter.writeValueAsBytes(employees);
        } catch (JsonProcessingException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private byte[] toCsv(List<EmployeeResponse> employees) {
        StringBuilder csv = new StringBuilder();
        csv.append(COLUMNS.stream().map(Column::header).collect(Collectors.joining(","))).append("\r\n");
        for (EmployeeResponse employee : employees) {
            csv.append(COLUMNS.stream()
                            .map(c -> escape(c.value().apply(employee)))
                            .collect(Collectors.joining(",")))
                    .append("\r\n");
        }
        byte[] body = csv.toString().getBytes(StandardCharsets.UTF_8);
        // BOM so Excel detects UTF-8 (names with accents etc.).
        byte[] out = new byte[UTF8_BOM.length + body.length];
        System.arraycopy(UTF8_BOM, 0, out, 0, UTF8_BOM.length);
        System.arraycopy(body, 0, out, UTF8_BOM.length, body.length);
        return out;
    }

    /** RFC 4180 quoting plus a guard against spreadsheet formula injection. */
    static String escape(Object raw) {
        if (raw == null) {
            return "";
        }
        String value = raw.toString();
        if (isFormulaLike(value)) {
            value = "'" + value;
        }
        boolean needsQuotes = Stream.of(",", "\"", "\n", "\r").anyMatch(value::contains);
        return needsQuotes ? "\"" + value.replace("\"", "\"\"") + "\"" : value;
    }

    private static boolean isFormulaLike(String value) {
        if (value.isEmpty()) {
            return false;
        }
        char first = value.charAt(0);
        if (first == '=' || first == '@' || first == '\t' || first == '\r') {
            return true;
        }
        // Allow genuine numbers / phone numbers such as "+254712000001" or "-5".
        return (first == '+' || first == '-') && !value.matches("^[+-][0-9 ().-]*$");
    }
}
