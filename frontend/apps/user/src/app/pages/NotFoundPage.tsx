import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@edumind/user-ui";
import { FileQuestion, HelpCircle, Home, Search } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { SeoMetaTags } from "../components/Seo/SeoMetaTags";

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <SeoMetaTags
        title="Page Not Found"
        description="Sorry, we couldn't find the page you're looking for."
        noIndex
        prerenderStatusCode={404}
      />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mb-8">
          <FileQuestion className="w-24 h-24 text-gray-400 mx-auto" />
        </div>

        {/* Error Code */}
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>

        {/* Message */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn't find the page you're looking for. Perhaps you've
          mistyped the URL or the page has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="primary" onClick={() => navigate(USER_ROUTES.ROOT)}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <Button variant="secondary" onClick={() => navigate(USER_ROUTES.COURSES)}>
            <Search className="w-4 h-4 mr-2" />
            Browse Courses
          </Button>
        </div>

        {/* Help Link */}
        <div className="mt-8 flex items-center justify-center gap-1 text-sm text-gray-500">
          <span>Need help?</span>
          <a
            href="mailto:support@edumind.com"
            className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-800 hover:no-underline"
          >
            <HelpCircle aria-hidden="true" className="w-4 h-4" />
            Contact Support
          </a>
        </div>
      </div>
      </div>
    </>
  );
};
