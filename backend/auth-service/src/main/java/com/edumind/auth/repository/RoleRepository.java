package com.edumind.auth.repository;

import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleName name);

    Boolean existsByName(RoleName name);
}
