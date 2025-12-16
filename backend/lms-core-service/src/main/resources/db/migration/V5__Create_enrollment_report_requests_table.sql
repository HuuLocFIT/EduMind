SET search_path TO course;

-- ============================================
-- ENROLLMENT REPORT REQUESTS TABLE
-- ============================================
CREATE TABLE enrollment_report_requests (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL,
    
    reason VARCHAR(500) NOT NULL,
    
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
    
    admin_notes VARCHAR(1000),
    reviewed_at TIMESTAMP,
    reviewed_by_admin_id BIGINT,
    
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE enrollment_report_requests IS 'Teacher requests to admin for unenrolling students from paid courses';
COMMENT ON COLUMN enrollment_report_requests.teacher_id IS 'Reference to auth_service.users (cross-service)';
COMMENT ON COLUMN enrollment_report_requests.reviewed_by_admin_id IS 'Reference to auth_service.users (cross-service)';

CREATE INDEX idx_report_requests_enrollment ON enrollment_report_requests(enrollment_id);
CREATE INDEX idx_report_requests_teacher ON enrollment_report_requests(teacher_id);
CREATE INDEX idx_report_requests_status ON enrollment_report_requests(status);

CREATE TRIGGER update_enrollment_report_requests_updated_at BEFORE UPDATE ON enrollment_report_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

