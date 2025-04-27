import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Searching from "./pages/Searching";
import Chat from "./pages/Chat";
import ProjectDashboard from "./pages/ProjectDashboard";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProviderDashboard from "./pages/ProviderDashboard";
import Request from "./pages/Request";
import RequestDetails from "./pages/RequestDetails";
import Developers from "./pages/Developers";
import DeveloperProfile from "./pages/DeveloperProfile";
import DeveloperOnboarding from "./pages/DeveloperOnboarding";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import DeveloperSettings from "./pages/DeveloperSettings";
import DeveloperSelection from "./pages/DeveloperSelection";
import ServiceDetails from "./pages/ServiceDetails";
import RequestSuccess from "./pages/RequestSuccess";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/searching" element={<ProtectedRoute><Searching /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/provider-dashboard" element={<ProtectedRoute><ProviderDashboard /></ProtectedRoute>} />
          <Route path="/request" element={<ProtectedRoute><Request /></ProtectedRoute>} />
          <Route path="/request/:id" element={<ProtectedRoute><RequestDetails /></ProtectedRoute>} />
          <Route path="/select-developer" element={<ProtectedRoute><DeveloperSelection /></ProtectedRoute>} />
          <Route path="/request-success/:requestId" element={<ProtectedRoute><RequestSuccess /></ProtectedRoute>} />
          <Route path="/service/:id" element={<ProtectedRoute><ServiceDetails /></ProtectedRoute>} />
          <Route path="/developers" element={<ProtectedRoute><Developers /></ProtectedRoute>} />
          <Route path="/developers/:id" element={<ProtectedRoute><DeveloperProfile /></ProtectedRoute>} />
          <Route path="/developer-onboarding" element={<ProtectedRoute><DeveloperOnboarding /></ProtectedRoute>} />
          <Route path="/developer" element={<ProtectedRoute><DeveloperDashboard /></ProtectedRoute>} />
          <Route path="/developer/profile" element={<ProtectedRoute><DeveloperProfile /></ProtectedRoute>} />
          <Route path="/developer/settings" element={<ProtectedRoute><DeveloperSettings /></ProtectedRoute>} />
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
