import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, Eye, EyeOff, Loader2 } from "lucide-react";
import { format, parse, isValid, isFuture } from "date-fns";
import { cn } from "@/lib/utils";
import { useShow } from "@/contexts/ShowContext";
import { B2CTeamSelection } from "./B2CTeamSelection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;
const B2C_OAUTH_OPEN_PROFILE_KEY = "b2c_oauth_open_profile";
interface B2CRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: "register" | "login";
}

export const B2CRegistrationDialog = ({ open, onOpenChange, initialStep = "register" }: B2CRegistrationDialogProps) => {
  const navigate = useNavigate();
  const { participants, show, episodes, events, settings, branding } = useShow();
  const [step, setStep] = useState<
    "register" | "team" | "login" | "forgot-password" | "email-verification" | "reset-password"
  >(initialStep);

  const prevDialogOpenRef = useRef(false);
  // Sync step with initialStep only when dialog opens (avoid resetting e.g. OAuth → register promotion)
  useEffect(() => {
    if (open && !prevDialogOpenRef.current) {
      setStep(initialStep);
    }
    prevDialogOpenRef.current = open;
  }, [open, initialStep]);

  useEffect(() => {
    if (!open) {
      setIsOAuthUser(false);
    }
  }, [open]);

  /** Google OAuth redirect: prefill profile, login path → app or switch to register */
  useEffect(() => {
    if (!open || !show?.id) return;
    if (sessionStorage.getItem(B2C_OAUTH_OPEN_PROFILE_KEY) !== "1") return;

    sessionStorage.removeItem(B2C_OAUTH_OPEN_PROFILE_KEY);

    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const hasGoogle =
        user.app_metadata?.provider === "google" ||
        (user.identities ?? []).some((i) => i.provider === "google");
      if (!hasGoogle) return;

      setIsOAuthUser(true);
      const meta = user.user_metadata as Record<string, string | undefined>;
      const fullName = meta?.full_name || meta?.name || [meta?.given_name, meta?.family_name].filter(Boolean).join(" ") || "";
      if (fullName) setName(fullName.trim());
      if (user.email) setEmail(user.email);

      if (initialStep === "login") {
        const { data: showUser } = await supabase
          .from("show_users")
          .select("id")
          .eq("show_id", show.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (showUser) {
          toast.success("Welcome back!");
          onOpenChange(false);
          navigate(`/app/${show.id}`);
        } else {
          toast.info("Complete your registration for this show.");
          setStep("register");
        }
      }
    };

    void run();
  }, [open, show?.id, initialStep, navigate, onOpenChange]);

  const [isLoading, setIsLoading] = useState(false);
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [dateOfBirthValue, setDateOfBirthValue] = useState("");
  const [dateOfBirthError, setDateOfBirthError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resetCountdown, setResetCountdown] = useState(45);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [otpPreferredLength, setOtpPreferredLength] = useState(8);


  // Team selection state
  const [selectedTeam, setSelectedTeam] = useState<Participant[]>([]);
  const [pendingRegistration, setPendingRegistration] = useState<{
    name: string;
    email: string;
    username: string;
    team: Participant[];
  } | null>(null);

  // Username availability check
  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    if (!show?.id || !usernameToCheck.trim()) {
      setUsernameError(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const { data } = await supabase
        .from("show_users")
        .select("id")
        .eq("show_id", show.id)
        .ilike("username", usernameToCheck.trim())
        .maybeSingle();

      if (data) {
        setUsernameError("Username is already taken in this show. Please choose another.");
      } else {
        setUsernameError(null);
      }
    } catch (err) {
      console.error("Username check error:", err);
    } finally {
      setIsCheckingUsername(false);
    }
  }, [show?.id]);

  // Email availability check (per show)
  const checkEmailAvailability = useCallback(async (emailToCheck: string) => {
    if (!show?.id || !emailToCheck.trim()) {
      setEmailError(null);
      return;
    }

    setIsCheckingEmail(true);
    try {
      const { data } = await supabase
        .from("show_users")
        .select("id")
        .eq("show_id", show.id)
        .ilike("email", emailToCheck.trim())
        .maybeSingle();

      if (data) {
        setEmailError("This email is already registered in this show. Please log in instead.");
      } else {
        setEmailError(null);
      }
    } catch (err) {
      console.error("Email check error:", err);
    } finally {
      setIsCheckingEmail(false);
    }
  }, [show?.id]);

  // Debounced username check
  useEffect(() => {
    if (username.trim().length < 3) {
      setUsernameError(null);
      return;
    }


    const timer = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    return () => clearTimeout(timer);
  }, [username, checkUsernameAvailability]);

  // Debounced email check
  useEffect(() => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(null);
      return;
    }

    const timer = setTimeout(() => {
      checkEmailAvailability(email);
    }, 500);

    return () => clearTimeout(timer);
  }, [email, checkEmailAvailability]);

  // Drive resend-code countdown while user is on email verification screen.
  useEffect(() => {
    if (step !== "email-verification" || resetCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setResetCountdown((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step, resetCountdown]);
  // Date validation and formatting
  const validateAndParseDateInput = useCallback((value: string): { date: Date | undefined; error: string | null } => {
    if (!value) {
      return { date: undefined, error: null };
    }

    // Check format (dd/mm/yyyy)
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = value.match(dateRegex);
    if (!match) {
      return { date: undefined, error: "Use format dd/mm/yyyy" };
    }

    const [, day, month, year] = match;
    const parsedDate = parse(value, "dd/MM/yyyy", new Date());

    if (!isValid(parsedDate)) {
      return { date: undefined, error: "Invalid date" };
    }

    if (isFuture(parsedDate)) {
      return { date: undefined, error: "Date cannot be in the future" };
    }

    const minDate = new Date("1900-01-01");
    if (parsedDate < minDate) {
      return { date: undefined, error: "Date must be after 1900" };
    }

    return { date: parsedDate, error: null };
  }, []);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;


    // Only allow numbers and slashes
    value = value.replace(/[^\d/]/g, "");

    // Auto-insert slashes as user types
    const digits = value.replace(/\//g, "");
    if (digits.length <= 2) {
      value = digits;
    } else if (digits.length <= 4) {
      value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }

    setDateOfBirthValue(value);

    // Only validate if we have a complete date
    if (value.length === 10) {
      const { date, error } = validateAndParseDateInput(value);
      setDateOfBirth(date);
      setDateOfBirthError(error);
    } else {
      setDateOfBirth(undefined);
      setDateOfBirthError(value.length > 0 ? "Use format dd/mm/yyyy" : null);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    setDateOfBirth(date);
    if (date) {
      setDateOfBirthValue(format(date, "dd/MM/yyyy"));
      setDateOfBirthError(null);
    } else {
      setDateOfBirthValue("");
      setDateOfBirthError(null);
    }
  };

  const finalizeShowRegistration = async (userId: string) => {
    if (!show?.id || !pendingRegistration) return;

    // Check if this user is already registered for this show
    const { data: alreadyRegistered } = await supabase
      .from("show_users")
      .select("id")
      .eq("show_id", show.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (alreadyRegistered) {
      toast.success("You're already registered! Welcome back!");
      setPendingRegistration(null);
      onOpenChange(false);
      navigate(`/app/${show.id}`);
      return;
    }

    // Create show_user entry
    const { error: showUserError } = await supabase
      .from("show_users")
      .insert({
        user_id: userId,
        show_id: show.id,
        email: pendingRegistration.email.toLowerCase().trim(),
        username: pendingRegistration.username.trim(),
        total_points: 0,
        gw_points: 0,
      });

    if (showUserError) {
      console.error("Error creating show user:", showUserError);
      // Check for unique constraint violation
      if (showUserError.code === '23505') {
        if (showUserError.message?.includes('show_users_show_username_unique')) {
          setUsernameError("Username is already taken in this show. Please choose another.");
          toast.error("Username is already taken. Please try a different username.");
          setPendingRegistration(null);
          setStep("register");
          return;
        }
        if (showUserError.message?.includes('show_users_show_email_unique')) {
          setEmailError("This email is already registered in this show. Please log in instead.");
          toast.error("This email is already registered. Please log in instead.");
          setPendingRegistration(null);
          setStep("login");
          return;
        }
      }
    }

    // Get current active episode for added_episode
    const { data: activeEpisode } = await supabase.rpc("get_current_active_episode", {
      p_show_id: show.id,
    });

    const currentEpisodeNumber = activeEpisode?.episode_number || 0;

    // Save team to user_teams table (start from next episode)
    const teamInserts = pendingRegistration.team.map((participant, index) => ({
      show_id: show.id,
      user_id: userId,
      participant_id: participant.id,
      slot_position: index + 1,
      added_episode: currentEpisodeNumber + 1,
    }));

    const { error: teamError } = await supabase.from("user_teams").insert(teamInserts);

    if (teamError) {
      console.error("Error saving team:", teamError);
    }

    toast.success("Registration successful! Welcome to the game!");
    setPendingRegistration(null);
    onOpenChange(false);
    navigate(`/app/${show.id}`);
  };

  // Login handler
  const handleLogin = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!isOAuthUser && !password) {
      toast.error("Please enter your password");
      return;
    }

    setIsLoading(true);
    try {
      if (isOAuthUser) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Your Google session expired. Please try Google login again.");
          setIsLoading(false);
          return;
        }

        const { data: showUser } = await supabase
          .from("show_users")
          .select("id")
          .eq("show_id", show?.id || "")
          .eq("user_id", user.id)
          .maybeSingle();

        if (showUser) {
          toast.success("Welcome back!");
          onOpenChange(false);
          navigate(`/app/${show?.id}`);
          return;
        }

        toast.info("Complete your registration for this show.");
        setStep("register");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        if (pendingRegistration) {
          await finalizeShowRegistration(data.user.id);
          return;
        }

        toast.success("Welcome back!");
        onOpenChange(false);
        navigate(`/app/${show?.id}`);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Validation
  const validateForm = () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!username.trim()) {
      toast.error("Please enter a username");
      return false;
    }
    if (username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return false;
    }
    if (usernameError) {
      toast.error(usernameError);
      return false;
    }
    if (emailError) {
      toast.error(emailError);
      return false;
    }
    if (!isOAuthUser) {
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return false;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return false;
      }
    }
    return true;
  };

  const handleGoogleAuth = async () => {
    if (!show?.id) {
      toast.error("Show not loaded. Please refresh.");
      return;
    }
    setIsLoading(true);
    try {
      sessionStorage.setItem(
        "b2c_oauth_resume",
        JSON.stringify({ showId: show.id, step })
      );
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/play/${show.id}`,
        },
      });
      if (error) {
        sessionStorage.removeItem("b2c_oauth_resume");
        toast.error(error.message);
      }
    } catch (e) {
      sessionStorage.removeItem("b2c_oauth_resume");
      console.error(e);
      toast.error("Could not start Google sign-in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = () => {
    if (!validateForm()) return;
    // Move to team selection
    setStep("team");
  };

  const handleSkipTeam = async () => {
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/app/${show?.id}`;

      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();

      let userId: string;

      if (sessionUser && isOAuthUser) {
        userId = sessionUser.id;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: name },
          },
        });

        if (authError) {
          if (authError.message.toLowerCase().includes("already registered")) {
            setPendingRegistration({ name, email, username, team: [] });
            toast.error("Kontoen finnes allerede. Logg inn – så fullfører vi registreringen i dette showet.");
            setStep("login");
            setIsLoading(false);
            return;
          }
          toast.error(authError.message);
          setIsLoading(false);
          return;
        }
        if (!authData.user) {
          toast.error("Registration failed. Please try again.");
          setIsLoading(false);
          return;
        }
        userId = authData.user.id;
      }

      const { data: alreadyRegistered } = await supabase
        .from("show_users")
        .select("id")
        .eq("show_id", show?.id || "")
        .eq("user_id", userId)
        .maybeSingle();

      if (alreadyRegistered) {
        toast.success("You're already registered! Welcome back!");
        onOpenChange(false);
        navigate(`/app/${show?.id}`);
        return;
      }


      const {
        data: { user: freshUserSkip },
      } = await supabase.auth.getUser();
      const gMetaSkip = freshUserSkip?.user_metadata as Record<string, unknown> | undefined;
      const oauthAvatarSkip =
        (typeof gMetaSkip?.avatar_url === "string" && gMetaSkip.avatar_url) ||
        (typeof gMetaSkip?.picture === "string" && gMetaSkip.picture) ||
        null;
      const { error: showUserError } = await supabase
        .from("show_users")
        .insert({
          user_id: userId,
          show_id: show?.id || "",
          email: email.toLowerCase().trim(),
          username: username.trim(),
          total_points: 0,
          gw_points: 0,

          ...(oauthAvatarSkip ? { avatar_url: oauthAvatarSkip } : {}),
        });

      if (showUserError) {
        console.error("Error creating show user:", showUserError);
        if (showUserError.code === '23505') {
          if (showUserError.message?.includes('show_users_show_username_unique')) {
            setUsernameError("Username is already taken in this show. Please choose another.");
            toast.error("Username is already taken. Please choose a different username.");
            setStep("register");
            setIsLoading(false);
            return;
          }
          if (showUserError.message?.includes('show_users_show_email_unique')) {
            setEmailError("This email is already registered in this show. Please log in instead.");
            toast.error("This email is already registered. Please log in instead.");
            setStep("login");
            setIsLoading(false);
            return;
          }
        }
      }

      // No team insert - user skipped team selection
      toast.success("Registration successful! You can pick your team later.");
      onOpenChange(false);
      navigate(`/app/${show?.id}`);
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An error occurred during registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamSubmit = async () => {
    if (selectedTeam.length === 0) {
      toast.error("Please select at least one participant for your team");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Validate team constraints via RPC
      const { data: validationResult, error: validationError } = await supabase.rpc(
        "validate_team_constraints",
        {
          p_show_id: show?.id || "",
          p_participant_ids: selectedTeam.map((p) => p.id),
        }
      );

      if (validationError) {
        console.error("Validation error:", validationError);
      } else if (validationResult) {
        const typedResult = validationResult as unknown as { valid: boolean; error: string | null };
        if (!typedResult.valid) {
          toast.error(typedResult.error || "Team does not meet requirements");
          setIsLoading(false);
          return;
        }
      }


      // 2. Create auth user (email/password) or use existing Google session
      const redirectUrl = `${window.location.origin}/app/${show?.id}`;

      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();

      let userId: string;

      if (sessionUser && isOAuthUser) {
        userId = sessionUser.id;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: name,
            },
          },
        });

        if (authError) {
          console.log("[B2CRegistrationDialog] signUp error:", authError.message);

          if (authError.message.toLowerCase().includes("already registered")) {
            console.log("[B2CRegistrationDialog] account exists => switching to login + pendingRegistration");
            setPendingRegistration({
              name,
              email,
              username,
              team: selectedTeam,
            });
            toast.error("Kontoen finnes allerede. Logg inn – så fullfører vi registreringen i dette showet.");
            setStep("login");
            setIsLoading(false);
            return;
          }

          toast.error(authError.message);
          setIsLoading(false);
          return;
        }
        if (!authData.user) {
          toast.error("Registration failed. Please try again.");
          setIsLoading(false);
          return;
        }
        userId = authData.user.id;
      }

      // 3. Check if THIS user is already registered for THIS show
      const { data: alreadyRegistered } = await supabase
        .from("show_users")
        .select("id")
        .eq("show_id", show?.id || "")
        .eq("user_id", userId)
        .maybeSingle();

      if (alreadyRegistered) {
        toast.success("You're already registered! Welcome back!");
        onOpenChange(false);
        navigate(`/app/${show?.id}`);
        return;
      }


      const {
        data: { user: freshUser },
      } = await supabase.auth.getUser();
      const gMeta = freshUser?.user_metadata as Record<string, unknown> | undefined;
      const oauthAvatar =
        (typeof gMeta?.avatar_url === "string" && gMeta.avatar_url) ||
        (typeof gMeta?.picture === "string" && gMeta.picture) ||
        null;

      // 4. Create show_user entry
      const { error: showUserError } = await supabase
        .from("show_users")
        .insert({
          user_id: userId,
          show_id: show?.id || "",
          email: email.toLowerCase().trim(),
          username: username.trim(),
          total_points: 0,
          gw_points: 0,

          ...(oauthAvatar ? { avatar_url: oauthAvatar } : {}),
        });

      if (showUserError) {
        console.error("Error creating show user:", showUserError);
        // Check for unique constraint violation
        if (showUserError.code === '23505') {
          if (showUserError.message?.includes('show_users_show_username_unique')) {
            setUsernameError("Username is already taken in this show. Please choose another.");
            toast.error("Username is already taken. Please choose a different username.");
            setStep("register");
            setIsLoading(false);
            return;
          }
          if (showUserError.message?.includes('show_users_show_email_unique')) {
            setEmailError("This email is already registered in this show. Please log in instead.");
            toast.error("This email is already registered. Please log in instead.");
            setStep("login");
            setIsLoading(false);
            return;
          }
        }
      }

      // 5. Get current active episode for added_episode
      const { data: activeEpisode } = await supabase.rpc("get_current_active_episode", {
        p_show_id: show?.id || "",
      });

      const currentEpisodeNumber = activeEpisode?.episode_number || 0;

      // 6. Save team to user_teams table
      // Use currentEpisode + 1 so new users start earning from NEXT episode only
      // This ensures no historical points are inherited
      const teamInserts = selectedTeam.map((participant, index) => ({
        show_id: show?.id || "",
        user_id: userId,
        participant_id: participant.id,
        slot_position: index + 1,
        added_episode: currentEpisodeNumber + 1,
      }));

      const { error: teamError } = await supabase
        .from("user_teams")
        .insert(teamInserts);

      if (teamError) {
        console.error("Error saving team:", teamError);
        // Don't fail the whole flow
      }

      // 7. Success - close dialog and navigate to dashboard
      toast.success("Registration successful! Welcome to the game!");
      onOpenChange(false);


      // Navigate to the B2C app dashboard
      navigate(`/app/${show?.id}`);

    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An error occurred during registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep("register");
  };
  const handleForgotPassword = async () => {
    const targetEmail = resetEmail.trim() || email.trim();

    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setResetEmail(targetEmail);
      setVerificationCode("");
      setResetCountdown(45);
      toast.success("Verification code sent to your email.");
      setStep("email-verification");
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error("Unable to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetCode = async () => {
    const targetEmail = resetEmail.trim() || email.trim();

    if (!targetEmail) {
      toast.error("Email is required for verification");
      return;
    }

    if (verificationCode.length < 4) {
      toast.error("Please enter the full verification code");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: verificationCode,
        type: "email",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Email verified. Set your new password.");
      setStep("reset-password");
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("Unable to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      await supabase.auth.signOut();
      toast.success("Password updated. Please log in with your new password.");
      setStep("login");
      setVerificationCode("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setIsOAuthUser(false);
      setEmail(resetEmail.trim() || email.trim());
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Unable to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("register");
    setResetEmail("");
    setVerificationCode("");
    setResetCountdown(45);
    onOpenChange(false);
  };

  // Ensure CSS theme vars exist even though Radix Dialog renders in a Portal.
  const primaryColor = branding?.primary_color || "#3b82f6";
  const secondaryColor = branding?.secondary_color || "#8b5cf6";

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return "59, 130, 246";
  };

  const dialogSurfaceStyle = {
    background: "transparent",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    "--show-primary": primaryColor,
    "--show-secondary": secondaryColor,
    "--show-primary-rgb": hexToRgb(primaryColor),
    "--show-secondary-rgb": hexToRgb(secondaryColor),
  } as const;

  const titleStyle = {
    color: "#ffffff",
  } as const;

  const primaryButtonStyle = {
    background: "linear-gradient(135deg, var(--show-primary), var(--show-secondary))",
    boxShadow: "0 10px 40px rgba(var(--show-primary-rgb), 0.3)",
  } as const;

  const inputClassName =
    "h-12 rounded-xl border border-white/40 bg-white/[0.03] px-4 text-base text-white placeholder:text-white/55 focus-visible:border-white/80 focus-visible:ring-0 focus-visible:ring-offset-0";

  const socialButtonClassName =
    "h-14 w-14 rounded-xl border border-white/80 bg-transparent text-white hover:bg-white/10";

  const modalBodyClassName = "relative px-5 pb-6 pt-8 sm:px-14 sm:pb-6 sm:pt-8";
  const modalTitleClassName = "text-[24px] sm:text-[30px] font-bold tracking-[-0.02em]";
  const backHeaderClassName = "mb-6 inline-flex items-center gap-3 text-white transition-opacity hover:opacity-80 sm:mb-8";

  const handleForgotPasswordBack = () => {
    setStep("login");
  };

  const handleVerificationBack = () => {
    setStep("forgot-password");
  };

  const handleResetPasswordBack = () => {
    setStep("email-verification");
  };

  const otpSlotCount = Math.min(Math.max(verificationCode.length || otpPreferredLength, 4), 10);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-h-[92vh] w-[calc(100vw-24px)] max-w-[560px] overflow-y-auto rounded-[24px] sm:rounded-[28px] border border-white/80 p-0 text-white backdrop-blur-[60px] shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
        style={dialogSurfaceStyle}
      >
        {step === "forgot-password" ? (
          <div className={modalBodyClassName}>
            <button
              type="button"
              onClick={handleForgotPasswordBack}
              className={backHeaderClassName}
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className={modalTitleClassName}>Forgot Password</span>
            </button>

            <div className="space-y-6">
              <div className="space-y-2.5">
                <Label htmlFor="forgot-password-email" className="text-[15px] font-medium text-white/90">Email</Label>
                <Input
                  id="forgot-password-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="username@gmail.com"
                  className={inputClassName}
                />
              </div>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isLoading}
                style={primaryButtonStyle}
                className="h-11 w-full rounded-xl text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </div>
        ) : step === "email-verification" ? (
          <div className={modalBodyClassName}>
            <button
              type="button"
              onClick={handleVerificationBack}
              className={backHeaderClassName}
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className={modalTitleClassName}>Email Verification</span>
            </button>

            <div className="space-y-6">
              <p className="text-[15px] leading-relaxed text-white/90 break-words">
                {resetEmail}{" "}
                <button
                  type="button"
                  onClick={handleVerificationBack}
                  className="font-semibold hover:underline"
                  style={{ color: "var(--show-primary)" }}
                >
                  Not Your?
                </button>
              </p>

              <InputOTP
                maxLength={10}
                value={verificationCode}
                onChange={(value) => {
                  const sanitized = value.replace(/\D/g, "").slice(0, 10);
                  setVerificationCode(sanitized);
                  if (sanitized.length >= 4) {
                    setOtpPreferredLength(sanitized.length);
                  }
                }}
                containerClassName="w-full justify-start"
              >
                <InputOTPGroup className="flex w-full flex-wrap gap-1.5 sm:gap-2">
                  {Array.from({ length: otpSlotCount }, (_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="h-10 w-9 sm:h-11 sm:w-10 rounded-lg border border-white/60 bg-white/[0.03] text-base sm:text-lg text-white first:border-l"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <p className="text-sm text-white/70">
                Paste the full code from your email (length can vary).
              </p>

              <p className="text-[15px] text-white/90">
                {`00:${String(resetCountdown).padStart(2, "0")}`}{" "}
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetCountdown > 0 || isLoading}
                  className="font-semibold disabled:opacity-50"
                  style={{ color: "var(--show-primary)" }}
                >
                  Resend Code
                </button>
              </p>

              <button
                type="button"
                onClick={handleVerifyResetCode}
                disabled={isLoading || verificationCode.length < 4}
                style={primaryButtonStyle}
                className="h-11 w-full rounded-xl text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify
              </button>
            </div>
          </div>
        ) : step === "reset-password" ? (
          <div className={modalBodyClassName}>
            <button
              type="button"
              onClick={handleResetPasswordBack}
              className={backHeaderClassName}
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className={modalTitleClassName}>Reset Password</span>
            </button>

            <div className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="reset-password" className="text-[15px] font-medium text-white/90">Password</Label>
                <div className="relative">
                  <Input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className={`${inputClassName} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="reset-confirm-password" className="text-[15px] font-medium text-white/90">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className={`${inputClassName} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isLoading}
                style={primaryButtonStyle}
                className="h-11 w-full rounded-xl text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset"
                )}
              </button>
            </div>
          </div>
        ) : step === "login" ? (
          <div className={modalBodyClassName}>
            <DialogHeader className="mb-8">
              <DialogTitle className={modalTitleClassName} style={titleStyle}>
                Login
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="login-email" className="text-[15px] font-medium text-white/90">Email or User ID</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={isOAuthUser}
                  autoComplete="email"
                  placeholder="username@gmail.com"
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--show-primary)]"
                />
              </div>

              {!isOAuthUser && (
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Password"
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--show-primary)] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep("forgot-password")}
                      className="text-sm font-medium hover:underline"
                      style={{ color: "var(--show-primary)" }}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              )}

              <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full py-6 text-lg font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, var(--show-primary), var(--show-secondary))",
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0f0f19] px-2 text-gray-500">or continue with</span>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 bg-white/5 border-white/20 hover:bg-white/10"
                  disabled={isLoading}
                  onClick={handleGoogleAuth}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 bg-white/5 border-white/20 hover:bg-white/10"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </Button>
              </div>
              <p className="text-center text-gray-400 text-sm">
                Don't have an account?{" "}
                <button
                  onClick={() => setStep("register")}
                  className="font-semibold hover:underline"
                  style={{ color: "var(--show-primary)" }}
                >
                  Register
                </button>
              </p>
            </div>
          </div>
        ) : step === "register" ? (
          <div className="p-6 pt-8">
            <DialogHeader className="mb-6">
              <DialogTitle
                className="text-3xl font-bold"
                style={{
                  background: "linear-gradient(135deg, var(--show-primary), var(--show-secondary))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Register
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Row 1: Name and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="John Smith"
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--show-primary)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      readOnly={isOAuthUser}
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={cn(
                        "bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--show-primary)]",
                        emailError && "border-red-500 focus:border-red-500"
                      )}
                    />
                    {isCheckingEmail && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  {emailError && (
                    <p className="text-sm text-red-400">
                      {emailError}{" "}
                      <button
                        onClick={() => setStep("login")}
                        className="underline font-semibold"
                        style={{ color: "var(--show-primary)" }}
                      >
                        Log in
                      </button>
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">Username (shown in leagues)</Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="nickname"
                    placeholder="Choose a display name"
                    className={cn(
                      "bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--show-primary)]",
                      usernameError && "border-red-500 focus:border-red-500"
                    )}
                  />
                  {isCheckingUsername && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
                {usernameError && (
                  <p className="text-sm text-red-400">{usernameError}</p>
                )}
              </div>
              {/* Row 2: Date of Birth and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="relative w-full cursor-pointer">
                        <Input
                          value={dateOfBirthValue}
                          onChange={handleDateInputChange}
                          autoComplete="bday"
                          placeholder="dd/mm/yyyy"
                          maxLength={10}
                          className={cn(
                            "w-full bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--show-primary)] pr-10",
                            dateOfBirthError && "border-red-500 focus:border-red-500"
                          )}
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      </div>
                    </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 border-white/20 backdrop-blur-xl bg-transparent"
                        align="start"
                        style={
                          {
                            background: `linear-gradient(135deg, rgba(${hexToRgb(primaryColor)}, 0.08), rgba(${hexToRgb(
                              secondaryColor
                            )}, 0.08))`,
                            "--show-primary": primaryColor,
                            "--show-secondary": secondaryColor,
                            "--show-primary-rgb": hexToRgb(primaryColor),
                            "--show-secondary-rgb": hexToRgb(secondaryColor),
                          } as React.CSSProperties
                        }
                      >
                        <Calendar
                          mode="single"
                          selected={dateOfBirth}
                          onSelect={handleCalendarSelect}
                          fromDate={new Date("1900-01-01")}
                          toDate={new Date()}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          defaultMonth={dateOfBirth || new Date(2000, 0)}
                          captionLayout="dropdown-buttons"
                          className="p-2 pointer-events-auto"
                          classNames={{
                            vhidden: "sr-only",
                            caption_label: "text-white/90 text-sm font-semibold",
                            head_row: "flex mt-2 mb-1",
                            head_cell: "text-white/70 font-normal text-xs w-8 h-6 p-0 flex items-center justify-center",
                            caption: "flex justify-center items-center relative h-8",
                            caption_dropdowns: "flex items-center justify-center gap-1 w-full text-sm",
                            dropdown_month:
                              "relative flex items-center justify-center px-1 py-1 rounded-md hover:bg-[rgba(var(--show-primary-rgb),0.10)] transition-colors",
                            dropdown_year:
                              "relative flex items-center justify-center px-1 py-1 rounded-md hover:bg-[rgba(var(--show-primary-rgb),0.10)] transition-colors",
                            dropdown:
                              "absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none",
                            dropdown_icon: "hidden",
                            nav_button:
                              "h-6 w-6 bg-transparent p-0 opacity-85 hover:opacity-100 hover:bg-[rgba(var(--show-primary-rgb),0.16)] hover:text-white focus:bg-[rgba(var(--show-primary-rgb),0.22)] focus:text-white",
                            nav_button_previous: "absolute left-0",
                            nav_button_next: "absolute right-0",
                            day:
                              "h-7 w-8 p-0 text-sm font-normal text-white/90 bg-transparent aria-selected:opacity-100 hover:bg-[rgba(var(--show-primary-rgb),0.4)] hover:text-white focus:bg-[rgba(var(--show-primary-rgb),0.5)] focus:text-white",
                            day_selected:
                              "bg-[rgba(var(--show-primary-rgb),1)] text-white hover:bg-[rgba(var(--show-primary-rgb),1)] hover:text-white focus:bg-[rgba(var(--show-primary-rgb),1)] focus:text-white",
                            day_today:
                              "bg-[rgba(var(--show-primary-rgb),0.18)] text-white",
                            day_range_middle:
                              "aria-selected:bg-[rgba(var(--show-primary-rgb),0.22)] aria-selected:text-white",
                            day_range_end:
                              "bg-[rgba(var(--show-primary-rgb),0.22)] text-white",
                            day_outside:
                              "text-white/85 opacity-55 hover:bg-[rgba(var(--show-primary-rgb),0.4)] hover:text-white aria-selected:bg-[rgba(var(--show-primary-rgb),0.25)] aria-selected:text-white aria-selected:opacity-50",
                            day_disabled: "text-white/60 opacity-40",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  {dateOfBirthError && (
                    <p className="text-red-400 text-sm">{dateOfBirthError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    autoComplete="tel"
                    placeholder="xxxxxxxxxx"
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--show-primary)]"
                  />
                </div>
              </div>
              {/* Row 3: Password fields */}
              {!isOAuthUser && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-300">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Password"
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--show-primary)] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Confirm Password"
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--show-primary)] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Register Button */}
              <Button
                onClick={handleRegisterSubmit}
                disabled={isLoading || isCheckingUsername || !!usernameError || !username.trim()}
                className="w-full py-6 text-lg font-semibold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--show-primary), var(--show-secondary))",
                }}
              >
                {isCheckingUsername ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Checking username...
                  </>
                ) : (
                  "Register"
                )}
              </Button>

              {/* Social login */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0f0f19] px-2 text-gray-500">or continue with</span>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 bg-white/5 border-white/20 hover:bg-white/10"
                  disabled={isLoading}
                  onClick={handleGoogleAuth}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 bg-white/5 border-white/20 hover:bg-white/10"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </Button>
              </div>
              {/* Login link */}
              <p className="text-center text-gray-400 text-sm">
                Have an account?{" "}
                <button
                  onClick={() => setStep("login")}
                  className="font-semibold hover:underline"
                  style={{ color: "var(--show-primary)" }}
                >
                  Login
                </button>
              </p>
            </div>
          </div>
        ) : (
          <B2CTeamSelection
            participants={participants}
            episodes={episodes}
            events={events}
            selectedTeam={selectedTeam}
            onTeamChange={setSelectedTeam}
            onBack={handleBack}
            onCancel={handleClose}
            onSubmit={handleTeamSubmit}
            onSkipTeam={handleSkipTeam}
            isLoading={isLoading}
            gameSettings={settings}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
