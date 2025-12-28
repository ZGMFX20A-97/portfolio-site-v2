import Navbar from "../components/LandingPage/Navbar";
import Banner from "../components/LandingPage/Banner";
import Footer from "../components/LandingPage/Footer";
import Hero from "../components/LandingPage/Hero";
import Features from "../components/LandingPage/Resource.tsx";
import Projects from "../components/LandingPage/Projects";
import bg from "../assets/misc/image.png";

const LandingPage = () => {
  return (
    <div className="min-h-screen font-sans selection:bg-neu-pink selection:text-white text-neu-text">
      <div
        className="absolute -z-10 pointer-events-none"
        style={{
          left: "50%",
          top: "50%",
          width: "100%",
          height: "100%",
          transform: "translate(-50%, -50%)",
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <Navbar />

      <Hero />
      <Banner />
      <Features />
      <Projects />

      <Footer />
    </div>
  );
};

export default LandingPage;
