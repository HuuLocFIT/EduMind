DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM teacher_applications
        WHERE status = 'PENDING'
        GROUP BY user_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Duplicate PENDING teacher applications exist; remediate before V21';
    END IF;
END $$;

CREATE UNIQUE INDEX idx_teacher_app_one_pending_per_user
    ON teacher_applications(user_id)
    WHERE status = 'PENDING';
