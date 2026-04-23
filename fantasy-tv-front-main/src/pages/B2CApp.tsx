import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ShowProvider } from "@/contexts/ShowContext";
import { B2CDashboard } from "@/components/b2c/B2CDashboard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const B2CApp = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showUser, setShowUser] = useState<{ id: string; username: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!slug) return;

    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Not logged in, redirect to landing page
        navigate(`/play/${slug}`, { replace: true });
        return;
      }

      // Check if user has show_user record for this show
      const { data: showUserData, error } = await supabase
        .from("show_users")
        .select("id, username, avatar_url")
        .eq("show_id", slug)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !showUserData) {
        // User not registered for this show, redirect to landing
        navigate(`/play/${slug}`, { replace: true });
        return;
      }

      setShowUser(showUserData);
      setIsAuthenticated(true);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setShowUser(null);
        navigate(`/play/${slug}`, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [slug, navigate]);

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222_47%_6%)]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Invalid Show</h1>
          <p className="text-gray-400">No show specified.</p>
        </div>
      </div>
    );
  }

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222_47%_6%)]">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <ShowProvider showSlug={slug}>
      <B2CDashboard username={showUser?.username} avatarUrl={showUser?.avatar_url} />
    </ShowProvider>
  );
};

export default B2CApp;
