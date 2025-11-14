CREATE TABLE application_status_history (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by BIGINT NOT NULL,
    change_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_application FOREIGN KEY (application_id) REFERENCES teacher_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_status_history_app_id ON application_status_history(application_id);
CREATE INDEX idx_status_history_created_at ON application_status_history(created_at DESC);

COMMENT ON TABLE application_status_history IS 'Audit trail for application status changes';