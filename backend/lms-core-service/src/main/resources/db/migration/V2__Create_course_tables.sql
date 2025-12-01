SET search_path TO course;

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE categories IS 'Course categories for organization';

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),

    -- Instructor (from Auth Service)
    instructor_id BIGINT NOT NULL,
    instructor_name VARCHAR(255) NOT NULL,

    -- Category
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,

    -- Pricing
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    discount_price DECIMAL(10, 2),

    -- Media
    thumbnail_url VARCHAR(500),
    preview_video_url VARCHAR(500),

    -- Course details
    level VARCHAR(20) CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS')),
    language VARCHAR(50) DEFAULT 'en',
    duration_hours INTEGER,

    -- Status
    status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED')) DEFAULT 'DRAFT',

    -- Features
    has_certificate BOOLEAN DEFAULT false,
    has_subtitles BOOLEAN DEFAULT false,

    -- SEO
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    meta_keywords TEXT,

    -- Statistics (denormalized)
    total_lessons INTEGER DEFAULT 0,
    total_students INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,

    -- Timestamps
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE courses IS 'Main course catalog';
COMMENT ON COLUMN courses.instructor_id IS 'Reference to auth_service.users (cross-service, no FK)';

CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_published_at ON courses(published_at);
CREATE INDEX idx_courses_slug ON courses(slug);

-- ============================================
-- SECTIONS TABLE
-- ============================================
CREATE TABLE sections (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, order_index)
);

COMMENT ON TABLE sections IS 'Course sections - organize lessons';

CREATE INDEX idx_sections_course ON sections(course_id);
CREATE INDEX idx_sections_order ON sections(course_id, order_index);

-- ============================================
-- LESSONS TABLE
-- ============================================
CREATE TABLE lessons (
    id BIGSERIAL PRIMARY KEY,
    section_id BIGINT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Content
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('VIDEO', 'ARTICLE', 'QUIZ', 'RESOURCE')),
    video_url VARCHAR(500),
    video_duration INTEGER, -- seconds
    article_content TEXT,

    -- Resources
    resources JSONB,

    -- Order
    order_index INTEGER NOT NULL,

    -- Access control
    is_preview BOOLEAN DEFAULT false,
    is_mandatory BOOLEAN DEFAULT true,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(section_id, order_index)
);

COMMENT ON TABLE lessons IS 'Individual lessons within sections';
COMMENT ON COLUMN lessons.resources IS 'JSON array: [{title, url, type, size}]';

CREATE INDEX idx_lessons_section ON lessons(section_id);
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_lessons_content_type ON lessons(content_type);

-- ============================================
-- ENROLLMENTS TABLE
-- ============================================
CREATE TABLE enrollments (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL,

    -- Progress
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed_lessons INTEGER NOT NULL DEFAULT 0,
    total_lessons INTEGER NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED', 'SUSPENDED', 'EXPIRED')) DEFAULT 'ACTIVE',

    -- Completion
    completed_at TIMESTAMP,
    certificate_issued_at TIMESTAMP,
    certificate_url VARCHAR(500),

    -- Timestamps
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(course_id, student_id)
);

COMMENT ON TABLE enrollments IS 'Student course enrollments';
COMMENT ON COLUMN enrollments.student_id IS 'Reference to auth_service.users (cross-service)';

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- ============================================
-- LESSON_PROGRESS TABLE
-- ============================================
CREATE TABLE lesson_progress (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    lesson_id BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL,

    -- Progress
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP,

    -- Video progress
    watch_duration INTEGER DEFAULT 0,
    last_position INTEGER DEFAULT 0,

    -- Timestamps
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(enrollment_id, lesson_id)
);

COMMENT ON TABLE lesson_progress IS 'Detailed lesson progress tracking';

CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_student ON lesson_progress(student_id);

-- ============================================
-- COURSE_REVIEWS TABLE
-- ============================================
CREATE TABLE course_reviews (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL,
    enrollment_id BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,

    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,

    -- Moderation
    is_approved BOOLEAN NOT NULL DEFAULT false,
    is_flagged BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(course_id, student_id)
);

COMMENT ON TABLE course_reviews IS 'Student course reviews and ratings';

CREATE INDEX idx_reviews_course ON course_reviews(course_id);
CREATE INDEX idx_reviews_student ON course_reviews(student_id);
CREATE INDEX idx_reviews_rating ON course_reviews(rating);

-- ============================================
-- WISHLIST TABLE
-- ============================================
CREATE TABLE wishlist (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

COMMENT ON TABLE wishlist IS 'Student course wishlist';

CREATE INDEX idx_wishlist_student ON wishlist(student_id);
CREATE INDEX idx_wishlist_course ON wishlist(course_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_reviews_updated_at BEFORE UPDATE ON course_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();