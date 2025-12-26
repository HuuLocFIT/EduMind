import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, StatCard, Card, CardBody, Loading } from '@edumind/user-ui';
import { CourseGrid } from '../../components/course-module';
import { courseService } from '../../services/course.service';
import type { CourseResponse } from '@edumind/shared-types';
import { queryKeys } from '../../lib/query-keys';
import { STALE_TIME_COURSES_PUBLIC } from '../../lib/query-config';
import {
  BookOpen,
  Users,
  Award,
  TrendingUp,
  Sparkles,
  Video,
  Clock,
  CheckCircle2,
  ArrowRight,
  Star,
} from 'lucide-react';
import { buildRouteWithParams, USER_ROUTES } from '@edumind/shared-utils';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Use React Query for caching and better performance
  const { data: featuredCourses = [], isLoading: loadingFeatured } = useQuery<CourseResponse[]>({
    queryKey: queryKeys.courses.topRated(0, 6),
    queryFn: async () => {
      const response = await courseService.getTopRatedCourses({
        page: 0,
        size: 6,
      });
      return response.data || [];
    },
    staleTime: STALE_TIME_COURSES_PUBLIC,
  });

  const { data: popularCourses = [], isLoading: loadingPopular } = useQuery<CourseResponse[]>({
    queryKey: queryKeys.courses.popular(0, 6),
    queryFn: async () => {
      const response = await courseService.getMostPopularCourses({
        page: 0,
        size: 6,
      });
      return response.data || [];
    },
    staleTime: STALE_TIME_COURSES_PUBLIC,
  });

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Learning',
      description: 'Personalized learning paths adapted to your pace and goals',
    },
    {
      icon: Video,
      title: 'Live Classes',
      description: 'Interactive sessions with expert instructors in real-time',
    },
    {
      icon: Clock,
      title: 'Learn at Your Pace',
      description: 'Access courses anytime, anywhere with lifetime access',
    },
    {
      icon: Award,
      title: 'Certificates',
      description: 'Earn recognized certificates upon course completion',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              <span className="text-sm font-medium">Trusted by 50,000+ students</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Learn with{' '}
              <span className="bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
                AI-Powered
              </span>{' '}
              Education
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              Master new skills with personalized learning paths, live classes, and expert instructors. 
              Start your journey today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate(USER_ROUTES.COURSES)}
                className="!bg-white !text-blue-600 !border-2 !border-white hover:!bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 min-w-[180px]"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Browse Courses
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate(USER_ROUTES.SIGNUP)}
                className="!border-2 !border-white !text-white hover:!bg-white/20 backdrop-blur-sm min-w-[180px]"
              >
                Get Started Free
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-blue-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm">No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm">7-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm">Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Courses"
              value="1000+"
              icon={<BookOpen className="w-6 h-6" />}
              change={{ value: 15, trend: 'up' }}
            />
            <StatCard
              title="Students"
              value="50K+"
              icon={<Users className="w-6 h-6" />}
              change={{ value: 12, trend: 'up' }}
            />
            <StatCard
              title="Certificates"
              value="30K+"
              icon={<Award className="w-6 h-6" />}
              change={{ value: 8, trend: 'up' }}
            />
            <StatCard
              title="Success Rate"
              value="95%"
              icon={<TrendingUp className="w-6 h-6" />}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose EduMind?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to succeed in your learning journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  variant="elevated"
                  className="text-center hover:scale-105 transition-transform duration-300"
                >
                  <CardBody>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Featured Courses
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Hand-picked courses to help you reach your goals and advance your career
            </p>
          </div>

          {loadingFeatured ? (
            <div className="flex items-center justify-center py-12">
              <Loading />
            </div>
          ) : (
            <>
              <CourseGrid
                courses={featuredCourses}
                onCourseClick={(course: CourseResponse) =>
                  navigate(buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, { courseId: course.id || '' }))
                }
                columns={3}
              />
              {featuredCourses.length > 0 && (
                <div className="text-center mt-12">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate(USER_ROUTES.COURSES)}
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                    className="shadow-md hover:shadow-lg"
                  >
                    View All Courses
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Popular Courses */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Most Popular Courses
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of students learning these trending courses
            </p>
          </div>

          {loadingPopular ? (
            <div className="flex items-center justify-center py-12">
              <Loading />
            </div>
          ) : (
            <CourseGrid
              courses={popularCourses}
              onCourseClick={(course: CourseResponse) =>
                navigate(buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, { courseId: course.id || '' }))
              }
              columns={3}
            />
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Start Learning?
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join EduMind today and unlock your potential. Start your free trial now, 
            no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(USER_ROUTES.SIGNUP)}
              className="!bg-white !text-blue-600 !border-2 !border-white hover:!bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 min-w-[200px]"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Sign Up Now
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate(USER_ROUTES.COURSES)}
              className="!border-2 !border-white !text-white hover:!bg-white/20 backdrop-blur-sm min-w-[200px]"
            >
              Browse Courses
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};