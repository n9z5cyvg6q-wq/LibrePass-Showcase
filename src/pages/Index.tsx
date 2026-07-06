import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import BottomNav, { type TabId } from "@/components/BottomNav";
import MapView from "@/components/MapView";
import Dashboard from "@/components/Dashboard";
import SearchView from "@/components/SearchView";
import ProfileView from "@/components/ProfileView";
import Auth from "@/pages/Auth";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [loading, setLoading] = useState(() => !sessionStorage.getItem("lp_loaded"));
  const [activeTab, setActiveTab] = useState<TabId>("map");
  const [mapFilter, setMapFilter] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  const navigateToMap = useCallback((filter?: string) => {
    if (filter) setMapFilter(filter);
    setActiveTab("map");
  }, []);

  // Clear filter after map has consumed it
  const clearMapFilter = useCallback(() => setMapFilter(null), []);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      sessionStorage.setItem("lp_loaded", "1");
    }, 2500);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading || authLoading) {
    return (
      <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
        <LoadingScreen isVisible={true} />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case "map":
        return <MapView initialFilter={mapFilter} onFilterConsumed={clearMapFilter} />;
      case "pass":
        return <Dashboard onNavigateToMap={navigateToMap} />;
      case "search":
        return <SearchView />;
      case "profile":
        return <ProfileView />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="flex-1 flex flex-col min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
