import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, UserPlus, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const { register, registerPending } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Read invite token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setInviteToken(token);
      // Also pre-fill email if it's in the invite
      fetch(`/api/user-invitations/${token}`)
        .then(r => r.ok ? r.json() : null)
        .then(inv => {
          if (inv?.email) setFormData(prev => ({ ...prev, email: inv.email }));
        })
        .catch(() => {});
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await register({
        username: formData.username.trim(),
        password: formData.password,
        displayName: formData.displayName.trim(),
        email: formData.email.trim().toLowerCase(),
        inviteToken: inviteToken || undefined,
      });
      toast({ title: "Account created!", description: "Welcome to NodeOS." });
      setLocation("/dashboard");
    } catch (err: any) {
      const msg = err?.message || "Registration failed";
      setError(msg);
      toast({ title: "Registration failed", description: msg, variant: "destructive" });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const passwordRequirements = [
    { text: "At least 8 characters", met: formData.password.length >= 8 },
    { text: "Contains uppercase letter", met: /[A-Z]/.test(formData.password) },
    { text: "Contains lowercase letter", met: /[a-z]/.test(formData.password) },
    { text: "Contains number", met: /\d/.test(formData.password) }
  ];

  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 bg-[size:20px_20px] opacity-60" />
      
      {/* Main Register Container */}
      <div className="relative w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-slate-600 rounded-xl mb-4 shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Join NodeOS</h1>
          <p className="text-slate-600">Create your collaborative workspace account</p>
        </div>

        {/* Register Card */}
        <Card className="backdrop-blur-sm bg-white/80 shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-semibold">Create Account</CardTitle>
            <CardDescription>
              Get started with your new workspace in seconds
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {inviteToken && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
                  You have been invited to join NodeOS. Fill in the details below.
                </div>
              )}

              {/* Username & Display Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    className="h-11 bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                    autoComplete="username"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm font-medium text-slate-700">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange("displayName", e.target.value)}
                    className="h-11 bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

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
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 h-11 bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pl-10 pr-10 h-11 bg-white/50 border-slate-200 focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Password Requirements */}
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-2 text-xs">
                        <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                          req.met ? 'bg-orange-500' : 'bg-slate-300'
                        }`}>
                          {req.met && <Check className="w-2 h-2 text-white" />}
                        </div>
                        <span className={req.met ? 'text-orange-600' : 'text-slate-500'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="pl-10 pr-10 h-11 bg-white/50 border-slate-200 focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Password Match Indicator */}
                {formData.confirmPassword && (
                  <div className="flex items-center space-x-2 text-xs">
                    <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                      passwordsMatch ? 'bg-orange-500' : 'bg-red-500'
                    }`}>
                      {passwordsMatch && <Check className="w-2 h-2 text-white" />}
                    </div>
                    <span className={passwordsMatch ? 'text-orange-600' : 'text-red-600'}>
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start space-x-2 text-sm">
                <input
                  type="checkbox"
                  id="terms"
                  className="mt-1 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  required
                />
                <Label htmlFor="terms" className="text-slate-600 cursor-pointer leading-relaxed">
                  I agree to the{" "}
                  <Link href="/terms">
                    <span className="text-orange-600 hover:text-orange-700 font-medium">
                      Terms of Service
                    </span>
                  </Link>
                  {" "}and{" "}
                  <Link href="/privacy">
                    <span className="text-orange-600 hover:text-orange-700 font-medium">
                      Privacy Policy
                    </span>
                  </Link>
                </Label>
              </div>

              {/* Create Account Button */}
              <Button
                type="submit"
                disabled={registerPending}
                className="w-full h-11 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {registerPending ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Creating account...
                  </div>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

          </CardContent>
        </Card>

        {/* Sign In Link */}
        <div className="text-center mt-6">
          <p className="text-slate-600">
            Already have an account?{" "}
            <Link href="/auth/login">
              <span className="text-orange-600 hover:text-orange-700 font-medium cursor-pointer">
                Sign in here
              </span>
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Join thousands of teams already using NodeOS</p>
        </div>
      </div>
    </div>
  );
}