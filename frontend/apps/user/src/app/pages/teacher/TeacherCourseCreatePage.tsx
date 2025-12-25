import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { teacherCourseService } from '../../services/teacher-course.service';
import { categoryService } from '../../services/category.service';
import { TEACHER_ROUTES, TeacherRouteHelpers } from "@edumind/shared-utils";
import type { CreateCourseRequest, CategoryResponse } from "@edumind/shared-types";
import { Button, useToast } from "@edumind/user-ui";
import {
  Step1BasicInfo,
  Step2Media,
  Step3Pricing,
  Step4Settings,
  STEPS,
} from "../../components/teacher/courses/create";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

export const TeacherCourseCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateCourseRequest>>({
    currency: "USD",
    language: "en",
    hasCertificate: false,
    hasSubtitles: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch categories
  useEffect(() => {
    categoryService
      .getActiveCategories()
      .then(setCategories)
      .catch(console.error);
  }, []);

  const updateFormData = (updates: Partial<CreateCourseRequest>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const clearedErrors = { ...errors };
    Object.keys(updates).forEach((key) => delete clearedErrors[key]);
    setErrors(clearedErrors);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData['title']?.trim()) newErrors['title'] = "Title is required";
      if (!formData['slug']?.trim()) newErrors['slug'] = "Slug is required";
      if (!formData.description?.trim())
        newErrors['description'] = "Description is required";
      if (!formData['categoryId']) newErrors['categoryId'] = "Category is required";
      if (!formData['level']) newErrors['level'] = "Level is required";
    }

    if (step === 3) {
      if (formData.price === undefined || formData.price === null) {
        newErrors['price'] = "Price is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setSubmitting(true);
      const course = await teacherCourseService.createCourse(
        formData as CreateCourseRequest
      );
      showSuccess("Course created successfully!");
      navigate(TeacherRouteHelpers.courseEdit(course.id));
    } catch (err: any) {
      showError(err.message || "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(TEACHER_ROUTES.COURSES)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
        <p className="text-gray-600 mt-1">
          Fill in the details to create your course
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    currentStep > step.id
                      ? "bg-green-600 border-green-600 text-white"
                      : currentStep === step.id
                      ? "border-green-600 text-green-600"
                      : "border-gray-300 text-gray-400"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-sm mt-2 ${
                    currentStep >= step.id ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.id ? "bg-green-600" : "bg-gray-300"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        {currentStep === 1 && (
          <Step1BasicInfo
            data={formData}
            onChange={updateFormData}
            errors={errors}
            categories={categories}
          />
        )}
        {currentStep === 2 && (
          <Step2Media
            data={formData}
            onChange={updateFormData}
            errors={errors}
            categories={categories}
          />
        )}
        {currentStep === 3 && (
          <Step3Pricing
            data={formData}
            onChange={updateFormData}
            errors={errors}
            categories={categories}
          />
        )}
        {currentStep === 4 && (
          <Step4Settings
            data={formData}
            onChange={updateFormData}
            errors={errors}
            categories={categories}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={handlePrev}
          disabled={currentStep === 1}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Previous
        </Button>

        {currentStep < STEPS.length ? (
          <Button
            variant="primary"
            onClick={handleNext}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="bg-green-600 hover:bg-green-700"
          >
            Next
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={submitting}
            leftIcon={<Check className="w-4 h-4" />}
            className="bg-green-600 hover:bg-green-700"
          >
            Create Course
          </Button>
        )}
      </div>
    </div>
  );
};

export default TeacherCourseCreatePage;
