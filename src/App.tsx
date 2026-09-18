import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { SignInPage } from "./pages/SignInPage";
import { HomePage } from "./pages/HomePage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OnboardingPage } from "./pages/OnboardingPage";
import { OverviewPage } from "./pages/OverviewPage";
import { VendorsPage } from "./pages/VendorsPage";
import { DecisionsPage } from "./pages/DecisionsPage";
import { InboxPage } from "./pages/InboxPage";
import { GuestsPage } from "./pages/GuestsPage";
import { AssistantPage } from "./pages/AssistantPage";
import { MembersPage } from "./pages/MembersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { JoinPage } from "./pages/JoinPage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { WeddingLayout } from "./components/WeddingLayout";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/join/:token" element={<JoinPage />} />
        <Route
          path="/*"
          element={
            <>
              <AuthLoading>
                <FullPage>Loading…</FullPage>
              </AuthLoading>
              <Unauthenticated>
                <Routes>
                  <Route path="/signin" element={<SignInPage />} />
                  <Route path="*" element={<LandingPage />} />
                </Routes>
              </Unauthenticated>
              <Authenticated>
                <a href="#main" className="skip-link">Skip to content</a>
                <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/new" element={<OnboardingPage />} />
                  <Route path="/w/:weddingId" element={<WeddingLayout />}>
                    <Route index element={<OverviewPage />} />
                    <Route path="decisions" element={<DecisionsPage />} />
                    <Route path="vendors" element={<VendorsPage />} />
                    <Route path="vendors/:slotId" element={<VendorsPage />} />
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="inbox/:threadId" element={<InboxPage />} />
                    <Route path="guests" element={<GuestsPage />} />
                    <Route path="assistant" element={<AssistantPage />} />
                    <Route path="members" element={<MembersPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </ErrorBoundary>
              </Authenticated>
            </>
          }
        />
      </Routes>
    </>
  );
}

export function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="grid min-h-screen place-items-center p-6 text-muted">
      {children}
    </main>
  );
}
