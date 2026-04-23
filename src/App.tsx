import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NoShows from "./pages/NoShows";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Rules from "./pages/Rules";
import Participants from "./pages/Participants";
import Episodes from "./pages/Episodes";
import Leagues from "./pages/Leagues";
import Settings from "./pages/Settings";
import Updates from "./pages/Updates";
import ShowDetail from "./pages/ShowDetail";
import ShowLanding from "./pages/ShowLanding";
import B2CApp from "./pages/B2CApp";
import NotFound from "./pages/NotFound";
import { RequireAuth } from "@/components/auth/RequireAuth";

const queryClient = new QueryClient();
const LAST_ROUTE_KEY = "last_visited_route";

const SessionRoutePersistence = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    const currentRoute = `${location.pathname}${location.search}`;
    if (location.pathname !== "/auth") {
      localStorage.setItem(LAST_ROUTE_KEY, currentRoute);
    }
  }, [location.pathname, location.search, loading, user]);

  useEffect(() => {
    if (loading || !user) return;

    const onEntryRoute = location.pathname === "/" || location.pathname === "/auth";
    if (!onEntryRoute) return;

    const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);
    if (!lastRoute || lastRoute === "/" || lastRoute === "/auth") return;

    navigate(lastRoute, { replace: true });
  }, [location.pathname, loading, user, navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        
        <BrowserRouter>
          <SessionRoutePersistence />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<RequireAuth />}>
              <Route path="/no-shows" element={<NoShows />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/users" element={<Users />} />
              <Route path="/dashboard/rules" element={<Rules />} />
              <Route path="/dashboard/participants" element={<Participants />} />
              <Route path="/dashboard/episodes" element={<Episodes />} />
              <Route path="/dashboard/leagues" element={<Leagues />} />
              <Route path="/dashboard/updates" element={<Updates />} />
              <Route path="/dashboard/settings" element={<Settings />} />
              <Route path="/show/:id" element={<ShowDetail />} />
            </Route>
            <Route path="/play/:slug" element={<ShowLanding />} />
            <Route path="/app/:slug" element={<B2CApp />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
