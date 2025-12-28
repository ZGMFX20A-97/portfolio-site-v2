import Navbar from "../components/LandingPage/Navbar";
import Footer from "../components/LandingPage/Footer";
import ProfileImage from "../components/AboutMe/ProfileImage";
import Introduction from "../components/AboutMe/Introduction";
import TechStack from "../components/AboutMe/TechStack";
import Certifications from "../components/AboutMe/Certifications";
import LightRays from "../components/ReactBits/LightRays.tsx";

const AboutMePage = () => {
  return (
    <div className="relative min-h-screen font-sans selection:bg-neu-pink selection:text-white bg-neu-bg text-neu-text">
      <div className="absolute inset-0 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={1.5}
          lightSpread={0.8}
          rayLength={1.2}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0.1}
          distortion={0.05}
          className="custom-rays"
        />
      </div>
      <Navbar />
      <main className="relative z-0 pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="bg-neu-card border-3 border-neu-border p-8 md:p-12 shadow-neu-lg relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-neu-lime rounded-full border-3 border-neu-border z-0 opacity-50">
          </div>
          <div className="relative z-10">
            <h1 className="text-5xl md:text-7xl font-black mb-8 uppercase text-neu-text">
              About <span className="text-neu-pink text-stroke-white">Me</span>
            </h1>
            <div className="flex flex-col md:flex-row gap-10 items-start">
              <ProfileImage />
              <div className="w-full md:w-2/3 space-y-6">
                <Introduction />
                <TechStack />
                <Certifications />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutMePage;
