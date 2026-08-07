SET search_path TO course;

ALTER TABLE categories ADD COLUMN deleted_at TIMESTAMP NULL;

CREATE INDEX idx_categories_deleted_at ON categories(deleted_at);

COMMENT ON COLUMN categories.deleted_at IS 'Soft-delete marker, independent of is_active which only controls visibility for new course creation';
