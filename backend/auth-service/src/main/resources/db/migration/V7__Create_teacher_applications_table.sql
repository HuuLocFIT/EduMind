CREATE TABLE teacher_applications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,

    -- Application info
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),

    -- Teaching info
    subject VARCHAR(200) NOT NULL,        -- Môn dạy
    experience_years INT,                 -- Số năm kinh nghiệm
    qualifications TEXT,                  -- Bằng cấp, chứng chỉ

    -- Documents (JSON array of URLs)
    documents JSONB,                      -- [{url: "...", type: "certificate", name: "..."}, ...]

    -- Additional info
    bio TEXT,                             -- Giới thiệu bản thân
    motivation TEXT,                      -- Động lực muốn dạy

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED

    -- Review info
    reviewed_by BIGINT,                   -- Admin ID who reviewed
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,                -- Lý do từ chối (nếu REJECTED)
    admin_notes TEXT,                     -- Ghi chú của Admin

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT chk_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- Indexes
CREATE INDEX idx_teacher_app_user_id ON teacher_applications(user_id);
CREATE INDEX idx_teacher_app_status ON teacher_applications(status);
CREATE INDEX idx_teacher_app_created_at ON teacher_applications(created_at DESC);

-- Comments
COMMENT ON TABLE teacher_applications IS 'Stores teacher application submissions';
COMMENT ON COLUMN teacher_applications.documents IS 'JSON array of document URLs uploaded by applicant';
COMMENT ON COLUMN teacher_applications.status IS 'Application status: PENDING (waiting review), APPROVED (accepted), REJECTED (denied)';