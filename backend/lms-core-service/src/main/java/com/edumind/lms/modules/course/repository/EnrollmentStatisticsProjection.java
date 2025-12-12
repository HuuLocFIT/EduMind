package com.edumind.lms.modules.course.repository;

/**
 * Interface projection for enrollment statistics query results.
 * Maps query results by field names instead of array indices for type safety.
 */
public interface EnrollmentStatisticsProjection {
    /**
     * Total number of enrollments
     */
    Long getTotal();

    /**
     * Number of active enrollments
     */
    Long getActive();

    /**
     * Number of completed enrollments
     */
    Long getCompleted();

    /**
     * Number of enrollments with progress > 0
     */
    Long getStarted();
}

