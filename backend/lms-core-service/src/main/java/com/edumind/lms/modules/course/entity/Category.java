package com.edumind.lms.modules.course.entity;

import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "categories", schema = "course")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category extends BaseEntity {
    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    private String iconUrl;

    @Column(nullable = false)
    private Boolean isActive = true;

    private LocalDateTime deletedAt;

    @OneToMany(mappedBy = "category")
    @Builder.Default
    private List<Course> courses = new ArrayList<>();
}