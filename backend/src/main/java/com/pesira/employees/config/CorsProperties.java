package com.pesira.employees.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param allowedOrigins browser origins allowed to call the API (comma-separated in env vars)
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
