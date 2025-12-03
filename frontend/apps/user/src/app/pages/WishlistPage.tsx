import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Loading,
  PriceTag,
  useToast,
  ToastContainer,
} from '@edumind/user-ui';
import { wishlistService, enrollmentService } from '@user/services/index';
import type { WishlistItemResponse } from '@edumind/shared-types';
import { WishlistCard } from '../components/course-module/WishlistCard';
import { Heart, Trash2 } from 'lucide-react';
import { buildRouteWithParams, USER_ROUTES } from '@edumind/shared-utils';

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [wishlistItems, setWishlistItems] = useState<WishlistItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [enrollingIds, setEnrollingIds] = useState<Set<number>>(new Set());
  const { toasts, success: showSuccess, error: showError, closeToast } = useToast();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await wishlistService.getWishlist();
      setWishlistItems(response.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch wishlist');
      console.error('Error fetching wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (courseId: number) => {
    setRemovingIds(prev => new Set(prev).add(courseId));

    try {
      await wishlistService.remove(courseId);
      setWishlistItems(prev => prev.filter(item => item.courseId !== courseId));
    } catch (err: any) {
      showError(err?.message || 'Failed to remove from wishlist');
    } finally {
      setRemovingIds(prev => {
        const updated = new Set(prev);
        updated.delete(courseId);
        return updated;
      });
    }
  };

  const handleEnroll = async (courseId: number) => {
    setEnrollingIds(prev => new Set(prev).add(courseId));

    try {
      await enrollmentService.enrollInCourse(courseId);
      showSuccess('Successfully enrolled!');
      
      // Remove from wishlist after enrollment
      await wishlistService.remove(courseId);
      setWishlistItems(prev => prev.filter(item => item.courseId !== courseId));
      
      // Navigate to course or my learning
      navigate(buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, { courseId: courseId || '' }));
    } catch (err: any) {
      showError(err?.message || 'Failed to enroll in course');
    } finally {
      setEnrollingIds(prev => {
        const updated = new Set(prev);
        updated.delete(courseId);
        return updated;
      });
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear your entire wishlist?')) {
      return;
    }

    try {
      await wishlistService.clear();
      setWishlistItems([]);
    } catch (err: any) {
      showError(err?.message || 'Failed to clear wishlist');
    }
  };

  const calculateTotalPrice = (): number => {
    return wishlistItems.reduce((total, item) => {
      return total + (item.price || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={closeToast} />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-8 h-8 text-red-500" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
                  <p className="text-gray-600 mt-1">
                    {wishlistItems.length} {wishlistItems.length === 1 ? 'course' : 'courses'} saved
                  </p>
                </div>
              </div>

              {wishlistItems.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={handleClearAll}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
              <Button
                variant="secondary"
                onClick={fetchWishlist}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && wishlistItems.length === 0 && (
            <Card className="p-12 text-center">
              <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Your wishlist is empty
              </h3>
              <p className="text-gray-600 mb-6">
                Explore courses and add them to your wishlist to access them later
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(USER_ROUTES.COURSES)}
              >
                Browse Courses
              </Button>
            </Card>
          )}

          {/* Wishlist Grid */}
          {wishlistItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content - Course List */}
              <div className="lg:col-span-2 space-y-4">
                {wishlistItems.map((item) => (
                  <WishlistCard
                    key={item.id}
                    item={item}
                    onRemove={handleRemoveFromWishlist}
                    onEnroll={handleEnroll}
                    onViewCourse={() => navigate(buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, { courseId: item.courseId || '' }))}
                    isRemoving={removingIds.has(item.courseId)}
                    isEnrolling={enrollingIds.has(item.courseId)}
                  />
                ))}
              </div>

              {/* Sidebar - Summary */}
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-8">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Wishlist Summary
                  </h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Courses:</span>
                      <span className="font-medium text-gray-900">
                        {wishlistItems.length}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Free Courses:</span>
                      <span className="font-medium text-gray-900">
                        {wishlistItems.filter(item => item.price === 0).length}
                      </span>
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">Total Value:</span>
                        <PriceTag price={calculateTotalPrice()} size="md" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">
                      💡 Tip: Courses on your wishlist may go on sale. Check back regularly!
                    </p>
                    
                    <Button
                      variant="primary"
                      onClick={() => navigate(USER_ROUTES.COURSES)}
                      className="w-full"
                    >
                      Continue Browsing
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};