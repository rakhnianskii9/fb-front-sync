import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/MuiThemeProvider";
import { Provider } from "react-redux";
import { store } from "@/store";
import DashboardLayout from "@/components/DashboardLayout";
import SelectionPage from "@/pages/SelectionPage";
import ProjectsPage from "@/pages/ProjectsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ActivesPermissionsPage from "@/pages/ActivesPermissionsPage";
import NotesPage from "@/pages/NotesPage";
import CrmPage from "@/pages/CrmPage";
import NotFound from "@/pages/not-found";
import { DevInitializer } from "@/components/DevInitializer";

function AppRoutes() {
  const location = useLocation();
  const hideSidebar = location.pathname === '/' || location.pathname === '/projects' || location.pathname === '/settings' || location.pathname === '/notes' || location.pathname === '/crm';

  return (
    <DashboardLayout hideSidebar={hideSidebar}>
      <DevInitializer />
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/selection" element={<SelectionPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/crm" element={<CrmPage />} />
        <Route path="/settings" element={<ActivesPermissionsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DashboardLayout>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <BrowserRouter basename="/fb">
              <Toaster />
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
