import React from "react";
import { Star } from "lucide-react";

interface RatingDistributionChartProps {
  distribution: Record<string, number>;
  totalReviews: number;
  averageRating: number;
}

export const RatingDistributionChart: React.FC<RatingDistributionChartProps> = ({
  distribution,
  totalReviews,
  averageRating,
}) => {
  const ratings = [5, 4, 3, 2, 1];

  const getPercentage = (rating: number): number => {
    if (totalReviews === 0) return 0;
    const count = distribution[rating.toString()] || 0;
    return (count / totalReviews) * 100;
  };

  const getCount = (rating: number): number => {
    return distribution[rating.toString()] || 0;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Rating Distribution
      </h3>

      <div className="flex gap-8">
        {/* Bar Chart */}
        <div className="flex-1 space-y-3">
          {ratings.map((rating) => {
            const percentage = getPercentage(rating);
            const count = getCount(rating);

            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm font-medium text-gray-700">
                    {rating}
                  </span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </div>

                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="w-16 text-right">
                  <span className="text-sm text-gray-600">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall Rating Circle */}
        <div className="flex flex-col items-center justify-center px-6 border-l border-gray-200">
          <div className="text-4xl font-bold text-gray-900">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex items-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(averageRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingDistributionChart;