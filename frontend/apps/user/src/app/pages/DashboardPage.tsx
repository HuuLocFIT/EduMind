import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, StatCard } from "@edumind/user-ui";
import { useAuthStore } from "@user/stores/auth.store";
import { getUserDisplayName } from "@edumind/shared-utils";
import { Users, BookOpen, Trophy } from "lucide-react";

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Navigate anyway even if logout fails
      navigate("/login");
    }
  };

  const displayName = user ? getUserDisplayName(user) : "User";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EduMind</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {displayName}!
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Enrolled Courses"
            value="12"
            icon={<BookOpen className="w-6 h-6" />}
            change={{ value: 2, trend: "up" }}
          />
          <StatCard
            title="Learning Hours"
            value="45"
            icon={<Users className="w-6 h-6" />}
            change={{ value: 5, trend: "up" }}
          />
          <StatCard
            title="Achievements"
            value="8"
            icon={<Trophy className="w-6 h-6" />}
          />
        </div>

        {/* Welcome Card */}
        <Card>
          <CardBody>
            <h2 className="text-xl font-semibold mb-2">
              🎉 Dashboard is Ready!
            </h2>
            <p className="text-gray-600 mb-4">
              Your authentication is working correctly. You are now logged in
              as:
            </p>

            {user && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p>
                  <strong>Username:</strong> {user.username}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Name:</strong> {user.firstName} {user.lastName}
                </p>
                <p>
                  <strong>Role:</strong> {user.roles[0] || "N/A"}
                </p>
                <p>
                  <strong>Email Verified:</strong>{" "}
                  {user.isEmailVerified ? "✅" : "❌"}
                </p>
                <p>
                  <strong>2FA Enabled:</strong>{" "}
                  {user.is2faEnabled ? "✅" : "❌"}
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </main>
    </div>
  );
};

export default DashboardPage;
