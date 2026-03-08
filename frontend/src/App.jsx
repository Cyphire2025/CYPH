import "./lib/http";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

// pages
import LandingPage from "./pages/landingnew";
import Signup from "./pages/signup";
// import Signup from "./pages/home/signup(phone)";
import Signin from "./pages/signin";
import ChooseMode from "./pages/ChooseMode";
import SponsorshipHome from "./pages/sponsorshiphome";
import SponsorshipModeChoose from "./pages/SponsorshipModeChoose.jsx";
import Intellectualhome from "./pages/Intellectuals";
import Home from "./pages/home";
import Tasks from "./pages/Tasks";

import ShowAllIntellectuals from "./pages/ShowAllIntellectuals.jsx";
import ApplyProfessor from "./pages/ApplyProfessor.jsx";
import ApplyExpert from "./pages/ApplyExpert.jsx";
import ApplyInfluencer from "./pages/ApplyInfluencer";
import ApplyMentor from "./pages/ApplyMentor.jsx";

// import TechPostTask from "./pages/Techposttask";
import TechPostTask from "./pages/Techposttask(better)";
import ViewTask from "./pages/viewtask";
import ViewSponsorship from "./pages/ViewSponsorship.jsx";
import EducationPostTask from "./pages/EducationPostTask";
import ArchitecturePostTask from "./pages/ArchitecturePostTask";
import EventManagementPostTask from "./pages/EventManagementPostTask";
import ListSponsorship from "./pages/ListSponsorship.jsx";
import Sponsorships from "./pages/Sponsorships.jsx";
import ListEvent from "./pages/ListEvent.jsx";
import Events from "./pages/Events.jsx";

import ProfilePage from "./pages/profile";
import DashboardPage from "./pages/dashboard";
import ViewProfilePage from "./pages/viewprofile";

import Pricing from "./pages/Pricing.jsx";
import Checkout from "./pages/Checkout.jsx";
import ChooseCategory from "./pages/ChooseCategory";

// pages2
import ScrollToTop from "./components/ScrollToTop";
import { ProtectedRoute, PublicOnlyRoute } from "./components/RouteProtection";
import AboutUs from "./pages2/AboutUs.jsx";
import Team from "./pages2/Team.jsx";
import JoinUs from "./pages2/JoinUs.jsx";
import Contact from "./pages2/Contact.jsx";
import HowitWorks from "./pages2/HowItWorks.jsx";
import PricingPlans from "./pages2/PricingPlans.jsx";
import EscrowPolicy from "./pages2/EscrowPolicy.jsx";
import HelpCenter from "./pages2/HelpCenter.tsx";

function App() {
  // 🛡 CSRF warm-up — ensures CSRF cookie is set on first load (fixes Vercel “missing token”)
  useEffect(() => {
    const warmupCsrf = async () => {
      const API = import.meta.env.VITE_API_BASE || "https://cyphire.onrender.com";
      try {
        await fetch(`${API}/readyz`, {
          method: "GET",
          credentials: "include" // crucial for cross-origin cookie
        });
      } catch (err) {
        console.warn("CSRF warm-up skipped:", err);
      }
    };
    warmupCsrf();
  }, []);

  return (
    <Router>
      <ScrollToTop />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "12px",
          },
          success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/u/:slug" element={<ViewProfilePage />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/team" element={<Team />} />
        <Route path="/join-us" element={<JoinUs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/how-it-works" element={<HowitWorks />} />
        <Route path="/pricing-plans" element={<PricingPlans />} />
        <Route path="/escrow-policy" element={<EscrowPolicy />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/choose" element={<ChooseMode />} />
          <Route path="/home" element={<Home />} />
          <Route path="/sponsorship-mode" element={<SponsorshipModeChoose />} />
          <Route path="/sponsorshiphome" element={<SponsorshipHome />} />
          <Route path="/sponsorship-marketplace" element={<SponsorshipHome />} />
          <Route path="/intellectuals" element={<Intellectualhome />} />
          <Route path="/apply-professor" element={<ApplyProfessor />} />
          <Route path="/apply-expert" element={<ApplyExpert />} />
          <Route path="/apply-influencer" element={<ApplyInfluencer />} />
          <Route path="/apply-mentor" element={<ApplyMentor />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/posttask-tech" element={<TechPostTask />} />
          <Route path="/posttask-education" element={<EducationPostTask />} />
          <Route path="/posttask-architecture" element={<ArchitecturePostTask />} />
          <Route path="/posttask-event" element={<EventManagementPostTask />} />
          <Route path="/List-Sponsorship" element={<ListSponsorship />} />
          <Route path="/Sponsorships" element={<Sponsorships />} />
          <Route path="/list-event" element={<ListEvent />} />
          <Route path="/events" element={<Events />} />
          <Route path="/intellectuals-all" element={<ShowAllIntellectuals />} />
          <Route path="/task/:id" element={<ViewTask />} />
          <Route path="/sponsorship/:id" element={<ViewSponsorship />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/choose-category" element={<ChooseCategory />} />
          <Route path="/help" element={<HelpCenter />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
