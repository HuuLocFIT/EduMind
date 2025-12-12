import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Loading,
  PriceTag,
  ConfirmDialog,
  useToast,
} from '@edumind/user-ui';
import { wishlistService, enrollmentService } from '@user/services/index';
import type { WishlistItemResponse } from '@edumind/shared-types';
import { WishlistCard } from '../../components/course-module/WishlistCard';
import { Heart, Trash2 } from 'lucide-react';
import { buildRouteWithParams, USER_ROUTES } from '@edumind/shared-utils';
import { useAuthStore } from '../../stores/auth.store';
import { queryKeys } from '../../lib/query-keys';
import { STALE_TIME_WISHLIST } from '../../lib/query-config';

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [enrollingIds, setEnrollingIds] = useState<Set<number>>(new Set());
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  // Use React Query for caching and better performance
  const { data: wishlistItems = [], isLoading: loading, error } = useQuery<WishlistItemResponse[]>({
    queryKey: queryKeys.wishlist.user(userId),
    queryFn: async () => {
      const response = await wishlistService.getWishlist();
      return response.data || [];
    },
    staleTime: STALE_TIME_WISHLIST,
    enabled: Boolean(userId),
  });

  const handleRemoveFromWishlist = async (courseId: number) => {
    setRemovingIds(prev => new Set(prev).add(courseId));

    try {
      await wishlistService.remove(courseId);
      // Invalidate and refetch wishlist (using prefix matching)
      await queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all, exact: false });
      showSuccess('Removed from wishlist');
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

      // Invalidate queries to refresh data (using prefix matching)
      await queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all, exact: false });
      await queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all, exact: false });
      await queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId), exact: false });
      
      navigate(USER_ROUTES.LEARNING);
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
    setIsClearingAll(true);
    try {
      await wishlistService.clear();
      // Invalidate and refetch wishlist (using prefix matching)
      await queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all, exact: false });
      showSuccess('Wishlist cleared');
    } catch (err: any) {
      showError(err?.message || 'Failed to clear wishlist');
    } finally {
      setIsClearingAll(false);
      setIsClearDialogOpen(false);
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
                  onClick={() => setIsClearDialogOpen(true)}
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
              <p className="text-red-800">{(error as any)?.message || 'Failed to fetch wishlist'}</p>
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
      
      <ConfirmDialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        onConfirm={handleClearAll}
        title="Clear wishlist"
        message="Are you sure you want to remove all courses from your wishlist?"
        confirmText="Clear all"
        cancelText="Cancel"
        variant="danger"
        isLoading={isClearingAll}
      />
    </>
  );
};