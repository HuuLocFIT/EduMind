package com.edumind.lms.modules.course.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LessonResource {
    private String title;
    private String url;
    private String type; // PDF, DOC, ZIP, etc.
    private Long size; // bytes
}
