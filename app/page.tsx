import LoginForm from "@/components/auth/login-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-zenith-bg relative overflow-hidden">
      {/* Floating background elements */}
      <div className="floating-elements"></div>

      {/* Additional floating shapes */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-zenith-gradient-light rounded-full opacity-20 animate-float"></div>
      <div
        className="absolute bottom-20 right-20 w-24 h-24 bg-zenith-gradient-purple rounded-full opacity-20 animate-float"
        style={{ animationDelay: "2s" }}
      ></div>
      <div
        className="absolute top-1/2 left-10 w-16 h-16 bg-zenith-gradient-soft rounded-full opacity-30 animate-float"
        style={{ animationDelay: "4s" }}
      ></div>

      <div className="flex min-h-screen flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md animate-fade-in">
          <LoginForm />
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2024 TrustDigital.ID - Professional Account Management
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
