import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import DigitalPermit from "./pages/DigitalPermit.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminSpotEditor from "./pages/AdminSpotEditor.tsx";
import LiveDashboard from "./pages/LiveDashboard.tsx";
import { SpotLifecycleProvider } from "@/components/SpotLifecycleProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
  <ThemeProvider>
    <LanguageProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SpotLifecycleProvider />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/permit" element={<DigitalPermit />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/spots" element={<AdminSpotEditor />} />
            <Route path="/live" element={<LiveDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </LanguageProvider>
  </ThemeProvider>
  </QueryClientProvider>
);

export default App;
