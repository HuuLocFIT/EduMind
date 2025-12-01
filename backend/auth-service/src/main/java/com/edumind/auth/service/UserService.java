package com.edumind.auth.service;

import com.edumind.auth.dto.response.UserResponse;
import com.edumind.auth.entity.User;
import com.edumind.auth.repository.UserRepository;
import com.edumind.auth.security.UserDetailsImpl;
import com.edumind.auth.util.UserMapper;
import com.edumind.common.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser() {
        logger.info("👤 Getting current user details");

        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return UserMapper.toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        logger.info("👤 Getting user by id: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        return UserMapper.toUserResponse(user);
    }
}