import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShowPicker } from "@/components/admin/ShowPicker";
import fantasyRealityIcon from "@/assets/fantasy-reality-icon.png";

type AuthMode = "login" | "signup" | "forgot" | "reset" | "pick-show";

interface ShowForPicker {
  id: string;
  name: string;
  season_number: number | null;
  status: string | null;
  role: string;
}

const Auth = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get("mode");
  
  const [mode, setMode] = useState<AuthMode>(() => {
    if (urlMode === "reset") return "reset";
    if (urlMode === "signup") return "signup";
    return "login";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showsToChoose, setShowsToChoose] = useState<ShowForPicker[]>([]);
  
  const { signIn, signUp, user, loading, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkShowsAndRedirect = async () => {
      if (!loading && user && mode !== "reset" && mode !== "pick-show") {
        const { data: memberships } = await supabase
          .from("admin_permissions")
          .select("show_id, role, shows(*)")
          .eq("user_id", user.id)
          .eq("status", "accepted");

        if (!memberships || memberships.length === 0) {
          navigate("/no-shows");
        } else if (memberships.length === 1) {
          localStorage.setItem("admin_selected_show_id", memberships[0].show_id);
          navigate("/dashboard");
        } else {
          const shows: ShowForPicker[] = memberships
            .filter(m => m.shows)
            .map(m => ({
              id: (m.shows as any).id,
              name: (m.shows as any).name,
              season_number: (m.shows as any).season_number,
              status: (m.shows as any).status,
              role: m.role || "member",
            }));
          setShowsToChoose(shows);
          setMode("pick-show");
        }
      }
    };
    
    checkShowsAndRedirect();
  }, [user, loading, navigate, mode]);

  useEffect(() => {
    if (urlMode === "reset") {
      setMode("reset");
    }
  }, [urlMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: t('auth.loginFailed'),
              description: t('auth.invalidCredentials'),
              variant: "destructive",
            });
          } else {
            toast({
              title: t('auth.loginFailed'),
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            const { data: memberships } = await supabase
              .from("admin_permissions")
              .select("show_id, role, shows(*)")
              .eq("user_id", currentUser.id)
              .eq("status", "accepted");

            if (!memberships || memberships.length === 0) {
              toast({
                title: t('toast.success'),
                description: t('auth.welcomeBack'),
              });
              navigate("/no-shows");
            } else if (memberships.length === 1) {
              localStorage.setItem("admin_selected_show_id", memberships[0].show_id);
              toast({
                title: t('toast.success'),
                description: t('auth.welcomeBack'),
              });
              navigate("/dashboard");
            } else {
              const shows: ShowForPicker[] = memberships
                .filter(m => m.shows)
                .map(m => ({
                  id: (m.shows as any).id,
                  name: (m.shows as any).name,
                  season_number: (m.shows as any).season_number,
                  status: (m.shows as any).status,
                  role: m.role || "member",
                }));
              setShowsToChoose(shows);
              setMode("pick-show");
              toast({
                title: t('toast.success'),
                description: t('auth.welcomeBack'),
              });
            }
          }
        }
      } else if (mode === "signup") {
        if (!fullName.trim()) {
          toast({
            title: t('validation.required'),
            description: t('validation.required'),
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        if (password.length < 6) {
          toast({
            title: t('auth.signupFailed'),
            description: t('validation.passwordTooShort', { min: 6 }),
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              title: t('auth.signupFailed'),
              description: t('auth.accountExists'),
              variant: "destructive",
            });
            setMode("login");
          } else {
            toast({
              title: t('auth.signupFailed'),
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: t('auth.signUpSuccess'),
            description: t('toast.onboardingComplete'),
          });
          navigate("/onboarding");
        }
      } else if (mode === "forgot") {
        if (!email.trim()) {
          toast({
            title: t('validation.emailRequired'),
            description: t('validation.emailRequired'),
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        const { error } = await resetPassword(email);
        if (error) {
          toast({
            title: t('toast.error'),
            description: error.message,
            variant: "destructive",
          });
        } else {
          setResetEmailSent(true);
          toast({
            title: t('auth.resetLinkSent'),
            description: t('auth.checkYourEmail'),
          });
        }
      } else if (mode === "reset") {
        if (password.length < 6) {
          toast({
            title: t('auth.resetFailed'),
            description: t('validation.passwordTooShort', { min: 6 }),
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          toast({
            title: t('auth.resetFailed'),
            description: t('validation.passwordMismatch'),
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        const { error } = await updatePassword(password);
        if (error) {
          toast({
            title: t('toast.error'),
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: t('toast.success'),
            description: t('toast.updated'),
          });
          navigate("/dashboard");
        }
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: t('auth.genericError'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setResetEmailSent(false);
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case "login": return t('auth.welcomeBack');
      case "signup": return t('auth.createAccount');
      case "forgot": return t('auth.resetPassword');
      case "reset": return t('auth.resetPassword');
      case "pick-show": return "";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "login": return t('auth.welcomeBackDesc');
      case "signup": return t('auth.createAccountDesc');
      case "forgot": return t('auth.resetPasswordDesc');
      case "reset": return t('auth.resetPasswordDesc');
      case "pick-show": return "";
    }
  };

  const handleShowSelect = (showId: string) => {
    localStorage.setItem("admin_selected_show_id", showId);
    navigate("/dashboard");
  };

  if (mode === "pick-show") {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img 
              src={fantasyRealityIcon} 
              alt="Fantasy Reality" 
              className="h-12 w-auto"
            />
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-base text-primary tracking-wide">FANTASY</span>
              <span className="font-display font-bold text-base text-white tracking-wide">REALITY</span>
            </div>
          </div>

          <ShowPicker shows={showsToChoose} onSelect={handleShowSelect} />

          <p className="text-center text-white/90 text-sm mt-6">
            <button
              onClick={() => navigate("/")}
              className="hover:text-white transition-colors"
            >
              ← {t('auth.backToLogin')}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src={fantasyRealityIcon} 
            alt="Fantasy Reality" 
            className="h-12 w-auto"
          />
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-base text-primary tracking-wide">FANTASY</span>
            <span className="font-display font-bold text-base text-white tracking-wide">REALITY</span>
          </div>
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display text-slate-900">
              {getTitle()}
            </CardTitle>
            <CardDescription className="text-slate-600">
              {getDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "forgot" && resetEmailSent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-slate-900">{t('auth.checkYourEmail')}</h3>
                <p className="text-slate-600 text-sm mb-6">
                  {t('auth.resetLinkSent')} <span className="font-medium text-slate-900">{email}</span>
                </p>
                <Button
                  variant="outline"
                  onClick={() => switchMode("login")}
                  className="w-full"
                >
                  {t('auth.backToLogin')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-slate-800">{t('auth.fullName')}</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={t('auth.enterFullName')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="text-slate-900 placeholder:text-slate-500"
                      required={mode === "signup"}
                    />
                  </div>
                )}

                {(mode === "login" || mode === "signup" || mode === "forgot") && (
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-800">{t('auth.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.enterEmail')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-slate-900 placeholder:text-slate-500"
                      required
                    />
                  </div>
                )}

                {(mode === "login" || mode === "signup") && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-800">{t('auth.password')}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t('auth.enterPassword')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="text-slate-900 placeholder:text-slate-500 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-sm text-primary hover:underline"
                      >
                        {t('auth.forgotPassword')}
                      </button>
                    )}
                  </div>
                )}

                {mode === "reset" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-800">{t('auth.password')}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t('auth.enterPassword')}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="text-slate-900 placeholder:text-slate-500 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-slate-800">{t('auth.confirmPassword')}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder={t('auth.confirmYourPassword')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="text-slate-900 placeholder:text-slate-500"
                        required
                      />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {mode === "login" ? t('auth.signingIn') : 
                       mode === "signup" ? t('auth.creatingAccount') : 
                       mode === "forgot" ? t('auth.sendingLink') : 
                       t('common.loading')}
                    </>
                  ) : (
                    mode === "login" ? t('auth.login') :
                    mode === "signup" ? t('auth.signup') :
                    mode === "forgot" ? t('auth.sendResetLink') :
                    t('auth.resetPassword')
                  )}
                </Button>

                {mode === "login" && (
                  <p className="text-center text-sm text-slate-600">
                    {t('auth.noAccount')}{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="text-primary hover:underline font-medium"
                    >
                      {t('auth.signup')}
                    </button>
                  </p>
                )}

                {mode === "signup" && (
                  <p className="text-center text-sm text-slate-600">
                    {t('auth.hasAccount')}{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="text-primary hover:underline font-medium"
                    >
                      {t('auth.login')}
                    </button>
                  </p>
                )}

                {mode === "forgot" && (
                  <p className="text-center text-sm text-slate-600">
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="text-primary hover:underline font-medium"
                    >
                      {t('auth.backToLogin')}
                    </button>
                  </p>
                )}
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-white/90 text-sm mt-6">
          <button
            onClick={() => navigate("/")}
            className="hover:text-white transition-colors"
          >
            ← {t('landing.home')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
