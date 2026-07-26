import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Card,
  Button,
  PriceTag,
  ConfirmDialog,
  useToast,
} from "@edumind/user-ui";
import { WishlistSkeleton } from "../../components/route-skeletons/WishlistSkeleton";
import { wishlistService } from '../../services/wishlist.service';
import { enrollmentService } from '../../services/enrollment.service';
import type { WishlistItemResponse } from "@edumind/shared-types";
import { WishlistCard } from "../../components/course-module/WishlistCard";
import { Heart, Trash2 } from "lucide-react";
import { buildRouteWithParams, USER_ROUTES } from "@edumind/shared-utils";
import { useAuthStore } from "../../stores/auth.store";
import { queryKeys } from "../../lib/query-keys";
import { STALE_TIME_WISHLIST } from "../../lib/query-config";

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [enrollingIds, setEnrollingIds] = useState<Set<number>>(new Set());
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  // Use React Query for caching and better performance
  const {
    data: wishlistItems = [],
    isLoading: loading,
    error,
  } = useQuery<WishlistItemResponse[]>({
    queryKey: queryKeys.wishlist.user(userId),
    queryFn: async () => {
      const response = await wishlistService.getWishlist();
      return response.data || [];
    },
    staleTime: STALE_TIME_WISHLIST,
    enabled: Boolean(userId),
  });

  const removeMutation = useMutation({
    mutationFn: async (courseId: number) => {
      await wishlistService.remove(courseId);
      return courseId;
    },
    onMutate: async (courseId) => {
      setRemovingIds((prev) => new Set(prev).add(courseId));
      await queryClient.cancelQueries({
        queryKey: queryKeys.wishlist.user(userId),
      });
      const previousWishlist =
        queryClient.getQueryData<WishlistItemResponse[]>(
          queryKeys.wishlist.user(userId)
        ) || [];
      queryClient.setQueryData<WishlistItemResponse[]>(
        queryKeys.wishlist.user(userId),
        (old = []) => old.filter((item) => item.courseId !== courseId)
      );
      return { previousWishlist, courseId };
    },
    onSuccess: async (courseId) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist.all,
        exact: false,
      });
      showSuccess("Removed from wishlist");
    },
    onError: (err: any, _courseId, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData(
          queryKeys.wishlist.user(userId),
          context.previousWishlist
        );
      }
      showError(err?.message || "Failed to remove from wishlist");
    },
    onSettled: (courseId, _err, _variables, context) => {
      if (context?.previousWishlist) {
        // ensure cache stays fresh after optimistic update
        queryClient.invalidateQueries({
          queryKey: queryKeys.wishlist.user(userId),
        });
      }
      if (courseId === undefined) return;
      setRemovingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(courseId);
        return updated;
      });
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: number) => {
      await enrollmentService.enrollInCourse(courseId);
      return courseId;
    },
    onMutate: (courseId) => {
      setEnrollingIds((prev) => new Set(prev).add(courseId));
    },
    onSuccess: async (courseId) => {
      showSuccess("Successfully enrolled!");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist.all,
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.enrollments.all,
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courses.all,
        exact: false,
      });
      navigate(USER_ROUTES.LEARNING);
    },
    onError: (err: any) => {
      showError(err?.message || "Failed to enroll in course");
    },
    onSettled: (_data, _err, courseId) => {
      if (courseId === undefined) return;
      setEnrollingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(courseId);
        return updated;
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await wishlistService.clear();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist.all,
        exact: false,
      });
      showSuccess("Wishlist cleared");
    },
    onError: (err: any) => {
      showError(err?.message || "Failed to clear wishlist");
    },
    onSettled: () => {
      setIsClearDialogOpen(false);
    },
  });

  const handleRemoveFromWishlist = (courseId: number) => {
    removeMutation.mutate(courseId);
  };

  const handleEnroll = (courseId: number) => {
    enrollMutation.mutate(courseId);
  };

  const handleClearAll = () => {
    clearAllMutation.mutate();
  };

  const calculateTotalPrice = (): number => {
    return wishlistItems.reduce((total, item) => {
      return total + (item.price || 0);
    }, 0);
  };

  if (loading) {
    return <WishlistSkeleton />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex-shrink-0">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">My Wishlist</h1>
                  <p className="text-blue-100 text-sm md:text-lg">
                    {wishlistItems.length} {wishlistItems.length === 1 ? "course" : "courses"} saved for later
                  </p>
                </div>
              </div>

              {wishlistItems.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setIsClearDialogOpen(true)}
                  className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 border w-full md:w-auto justify-center"
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
              <p className="text-red-800">
                {(error as any)?.message || "Failed to fetch wishlist"}
              </p>
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
                Explore courses and add them to your wishlist to access them
                later
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
                    onViewCourse={() =>
                      item.courseSlug &&
                      navigate(
                        buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
                          courseSlug: item.courseSlug,
                        })
                      )
                    }
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
                        {
                          wishlistItems.filter((item) => item.price === 0)
                            .length
                        }
                      </span>
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">
                          Total Value:
                        </span>
                        <PriceTag price={calculateTotalPrice()} size="md" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">
                      💡 Tip: Courses on your wishlist may go on sale. Check
                      back regularly!
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
        isLoading={clearAllMutation.isPending}
      />
    </>
  );
};

export default WishlistPage;
