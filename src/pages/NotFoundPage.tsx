import Navbar from "../components/LandingPage/Navbar";
import Footer from "../components/LandingPage/Footer";
import FuzzyText from "../components/ReactBits/FuzzyText.tsx";

const NotFoundPage = () => {
  return (
    <div className="relative min-h-screen font-sans flex flex-col">
      <Navbar />

      <div className="flex-grow flex items-center justify-center">
        <FuzzyText
          baseIntensity={0.3}
          hoverIntensity={0.5}
          enableHover={true}
          fontSize={250}
        >
          404
        </FuzzyText>
      </div>

      <Footer />
    </div>
  );
};

export default NotFoundPage;
