package com.pesira.employees.user;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pesira.employees.common.ConflictException;
import com.pesira.employees.common.ResourceNotFoundException;

@Service
public class UserService {

    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return repository.findAll(Sort.by("fullName", "id")).stream().map(UserResponse::from).toList();
    }

    @Transactional
    public UserResponse changeRole(Long id, Role role) {
        User user = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id));
        if (user.getRole() == Role.ADMIN && role != Role.ADMIN && repository.countByRole(Role.ADMIN) <= 1) {
            throw new ConflictException("Cannot demote the last remaining admin");
        }
        user.setRole(role);
        return UserResponse.from(user);
    }
}
