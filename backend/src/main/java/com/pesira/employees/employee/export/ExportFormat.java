package com.pesira.employees.employee.export;

import java.util.Locale;

import org.springframework.http.MediaType;

import com.pesira.employees.common.BadRequestException;

public enum ExportFormat {
    CSV("csv", new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8)),
    JSON("json", MediaType.APPLICATION_JSON);

    private final String extension;
    private final MediaType mediaType;

    ExportFormat(String extension, MediaType mediaType) {
        this.extension = extension;
        this.mediaType = mediaType;
    }

    public String extension() {
        return extension;
    }

    public MediaType mediaType() {
        return mediaType;
    }

    public static ExportFormat parse(String value) {
        try {
            return ExportFormat.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new BadRequestException("format must be 'csv' or 'json'");
        }
    }
}
