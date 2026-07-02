import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Mail, ArrowLeft, Send, Check } from "lucide-react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate sending reset email
    setIsEmailSent(true);
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-grid-slate-100 bg-[size:20px_20px] opacity-60" />
        
        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl mb-4 shadow-lg">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Check Your Email</h1>
            <p className="text-slate-600">We've sent password reset instructions</p>
          </div>

          <Card className="backdrop-blur-sm bg-white/80 shadow-xl border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-semibold">Email Sent Successfully</CardTitle>
              <CardDescription>
                We've sent a password reset link to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm text-emerald-700">
                    Click the link in the email to reset your password. 
                    The link will expire in 24 hours.
                  </p>
                </div>
                
                <div className="text-sm text-slate-600">
                  <p>Didn't receive the email? Check your spam folder or</p>
                  <button 
                    onClick={() => setIsEmailSent(false)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    try again
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full h-11">
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 bg-[size:20px_20px] opacity-60" />
      
      {/* Main Container */}
      <div className="relative w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-slate-600 rounded-xl mb-4 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Reset Password</h1>
          <p className="text-slate-600">Enter your email to receive reset instructions</p>
        </div>

        {/* Forgot Password Card */}
        <Card className="backdrop-blur-sm bg-white/80 shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-semibold">Forgot Password?</CardTitle>
            <CardDescription>
              No worries! Enter your email and we'll send you reset instructions
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Send Reset Link Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-slate-600 hover:from-blue-700 hover:to-slate-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Send Reset Link
                <Send className="ml-2 w-4 h-4" />
              </Button>
            </form>

            {/* Help Text */}
            <div className="text-center text-sm text-slate-600">
              <p>
                Remember your password?{" "}
                <Link href="/auth/login">
                  <span className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                    Sign in instead
                  </span>
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Sign In
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Need help? Contact our support team</p>
        </div>
      </div>
    </div>
  );
}