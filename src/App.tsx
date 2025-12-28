import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LandingPage from "./pages/LandingPage";
import AboutMePage from "./pages/AboutMePage";
import NotFoundPage from "./pages/NotFoundPage";
import PageTransition from "./components/PageTransition";
import GlobalClickEffect from "./components/GlobalClickEffect";

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <>
      <GlobalClickEffect />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <LandingPage />
              </PageTransition>
            }
          />
          <Route
            path="/about"
            element={
              <PageTransition>
                <AboutMePage />
              </PageTransition>
            }
          />
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFoundPage />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
    </>
  );
};

function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
