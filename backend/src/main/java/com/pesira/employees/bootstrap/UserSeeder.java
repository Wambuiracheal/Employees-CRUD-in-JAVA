package com.pesira.employees.bootstrap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.pesira.employees.user.Role;
import com.pesira.employees.user.User;
import com.pesira.employees.user.UserRepository;

/**
 * Creates the demo admin and user accounts on startup if they do not exist yet.
 * <p>
 * Done in code rather than in a Flyway migration so that passwords are configurable
 * via environment variables and hashed with the application's own encoder.
 */
@Component
public class UserSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(UserSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SeedProperties seed;

    public UserSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder, SeedProperties seed) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seed = seed;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        createIfMissing("System Administrator", seed.adminEmail(), seed.adminPassword(), Role.ADMIN);
        createIfMissing("Demo User", seed.userEmail(), seed.userPassword(), Role.USER);
    }

    private void createIfMissing(String name, String email, String password, Role role) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return;
        }
        String normalized = email.trim().toLowerCase();
        if (!userRepository.existsByEmail(normalized)) {
            userRepository.save(new User(name, normalized, passwordEncoder.encode(password), role));
            log.info("Seeded {} account {}", role, normalized);
        }
    }
}
