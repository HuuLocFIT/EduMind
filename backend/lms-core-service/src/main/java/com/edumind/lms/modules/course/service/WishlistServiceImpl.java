package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.Wishlist;
import com.edumind.lms.modules.course.event.WishlistAddedEvent;
import com.edumind.lms.modules.course.event.WishlistRemovedEvent;
import com.edumind.lms.modules.course.exception.CourseAlreadyInWishlistException;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.WishlistRepository;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WishlistServiceImpl implements WishlistService {

    private final WishlistRepository wishlistRepository;
    private final CourseRepository courseRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public Wishlist addToWishlist(Long studentId, Long courseId) {
        log.info("Adding course {} to wishlist for student {}", courseId, studentId);

        // Check if course exists - USING CORRECT METHOD
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with ID: " + courseId));

        // Check if already in wishlist - USING CORRECT METHOD
        if (wishlistRepository.existsByStudentIdAndCourseId(studentId, courseId)) {
            throw new CourseAlreadyInWishlistException("Course is already in your wishlist");
        }

        // Create wishlist item
        Wishlist wishlist = new Wishlist();
        wishlist.setStudentId(studentId);
        wishlist.setCourse(course);

        Wishlist savedWishlist = wishlistRepository.save(wishlist);
        log.info("Course added to wishlist successfully");

        // Publish event
        eventPublisher.publishEvent(new WishlistAddedEvent(this, savedWishlist));

        return savedWishlist;
    }

    @Override
    @Transactional
    public void removeFromWishlist(Long studentId, Long courseId) {
        log.info("Removing course {} from wishlist for student {}", courseId, studentId);

        // Check if exists in wishlist first - USING CORRECT METHOD
        if (!wishlistRepository.existsByStudentIdAndCourseId(studentId, courseId)) {
            throw new ResourceNotFoundException("Course not found in wishlist");
        }

        // Get wishlist item for event before deletion - USING CORRECT METHOD
        Wishlist wishlist = wishlistRepository.findByStudentIdAndCourseId(studentId, courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found in wishlist"));

        // FIXED: Use repository's deleteByStudentIdAndCourseId method instead of delete(entity)
        wishlistRepository.deleteByStudentIdAndCourseId(studentId, courseId);
        log.info("Course removed from wishlist successfully");

        // Publish event
        eventPublisher.publishEvent(new WishlistRemovedEvent(this, wishlist));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Wishlist> getWishlist(Long studentId, Pageable pageable) {
        log.info("Fetching wishlist for student {}", studentId);
        // USING CORRECT METHOD - with course details
        return wishlistRepository.findByStudentIdWithCourse(studentId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isInWishlist(Long studentId, Long courseId) {
        // USING CORRECT METHOD
        return wishlistRepository.existsByStudentIdAndCourseId(studentId, courseId);
    }

    @Override
    @Transactional(readOnly = true)
    public long getWishlistCount(Long studentId) {
        // USING CORRECT METHOD
        return wishlistRepository.countByStudentId(studentId);
    }

    @Override
    @Transactional
    public void clearWishlist(Long studentId) {
        log.info("Clearing wishlist for student {}", studentId);

        // USING CORRECT METHOD
        Page<Wishlist> wishlistItems = wishlistRepository.findByStudentId(studentId, Pageable.unpaged());
        wishlistRepository.deleteAll(wishlistItems);

        log.info("Wishlist cleared successfully - {} items deleted", wishlistItems.getTotalElements());
    }
}
