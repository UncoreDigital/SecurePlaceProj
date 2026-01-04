"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import { ArrowRight, AtSign, KeyRound, Eye, EyeOff } from "lucide-react";

import { createBrowserSupabase } from "@/lib/supabase/browser";
import { validateSession, redirectToDashboard } from "@/lib/session-utils";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Image from "next/image";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
});

// Use the singleton browser client
function useSupabase() {
  return createBrowserSupabase();
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const supabase = useSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  // Check if user is already logged in
  useEffect(() => {
    console.log('🔐 Login: Checking existing session...');
    
    // Use non-strict validation for login page (more lenient)
    const { isValid, user, reason } = validateSession(false);
    
    if (isValid && user && user.role) {
      console.log('✅ Login: Valid session found, redirecting to dashboard');
      redirectToDashboard(user);
      return;
    }
    
    console.log('❌ Login: No valid session -', reason, '- showing login form');
    setIsCheckingSession(false);
  }, []);

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
          <div className="text-lg text-gray-600">Checking session...</div>
        </div>
      </div>
    );
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    try {
      // 1) Sign in with Supabase (browser)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (signInError) throw signInError;

      // 2) Get the logged-in user
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("No user session found after login.");

      // 3) Read role from profiles (RLS allows user to read their own profile)
      let { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      // If profile doesn't exist, create it
      if (profileErr || !profile) {
        console.log("Profile not found, creating default profile...");
        const { error: createErr } = await supabase
          .from("user_profiles")
          .insert({
            id: user.id,
            email: user.email || "",
            first_name: user.user_metadata?.first_name || "",
            last_name: user.user_metadata?.last_name || "",
            role: "super_admin",
            is_active: true,
            last_login_at: new Date().toISOString()
          });
        
        if (createErr) throw createErr;
        
        // Re-fetch the profile
        const { data: newProfile, error: newProfileErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (newProfileErr) throw newProfileErr;
        profile = newProfile;
      }

      if (!profile?.role) throw new Error("User profile/role not found.");

      // 4) Save user session to localStorage in the expected format
      const userSession = {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
          role: profile.role,
          firmId: null // You can add firm_id from profile if needed
        },
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      localStorage.setItem('secure_place_user_session', JSON.stringify(userSession));
      console.log('💾 Login: User session saved to localStorage:', userSession);

      // Debug: Verify session was saved correctly
      const savedSession = localStorage.getItem('secure_place_user_session');
      console.log('🔍 Login: Verification - saved session:', savedSession);

      // Update last login time
      await supabase
        .from("user_profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", user.id);

      // 5) Hard redirect to ensure fresh state (same as your original flow)
      console.log('🔄 Login: Redirecting to dashboard for role:', profile.role);
      if (profile.role === "super_admin") {
        window.location.assign("/super-admin-dashboard");
        return;
      }
      if (profile.role === "firm_admin") {
        window.location.assign("/firm-admin-dashboard");
        return;
      }

      setError("You do not have access to a dashboard.");
    } catch (e: any) {
      console.error("Supabase login failed:", e);
      setError(e?.message ?? "Login failed. Please check your credentials.");
    }
  }

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-slate-50">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://cdn.pixabay.com/photo/2017/03/28/12/11/chairs-2181960_1280.jpg)",
          }}
        />
        <div className="absolute inset-0 bg-white opacity-60" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Image src={"/images/logo.png"} height={165} width={165} alt="Logo" />
        </div>
      </div>

      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-brand-blue">
              Sign in to your Account
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter your credentials to access the employee safety portal.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          placeholder="name@company.com"
                          {...field}
                          className="pl-10 h-12"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          {...field}
                          className="pl-10 pr-10 h-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 hover:text-slate-600"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <p className="text-sm font-medium text-red-600">{error}</p>
              )}

              <div className="flex items-center justify-end">
                <a
                  href="#"
                  className="text-sm font-medium text-brand-blue hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-md bg-brand-orange hover:bg-orange-600 text-white font-semibold shadow-md transition-transform transform hover:scale-105"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Signing In..." : "Sign In"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
