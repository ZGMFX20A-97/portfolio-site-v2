import { motion, useScroll, useTransform } from "framer-motion";
import HeroLabel from "./HeroLabel";
import IntroductionCard from "./IntroductionCard";
import Icon from "./Icon";
import WantedlyZap from "./WantedlyZap.tsx";
import iconImage from "../../assets/misc/icon.jpg";

const Hero = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);

  return (
    <section className="hero-bg relative pt-32 pb-10 px-6 min-h-screen flex flex-col justify-center items-center overflow-hidden">
      <motion.div
        style={{ y }}
        className="relative z-10 max-w-5xl mx-auto text-center overflow-visible"
      >
        <HeroLabel />

        <h1 className="text-6xl md:text-8xl font-black leading-none mb-8 text-neu-text">
          Think Statistically <br />
          <span className="text-neu-bg text-stroke-white">
            Make Intentionally
          </span>{" "}
          <br />
          <span className="bg-neu-lime px-2 text-neu-bg inline-block transform rotate-2 border-3 border-neu-text shadow-neu-lg">
            Repeat Iteratively
          </span>
        </h1>

        <IntroductionCard />
      </motion.div>

      {/* 猫アイコン */}
      <Icon
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="top-40 left-10 md:left-20 bg-neu-card !p-0 w-20 h-20 flex items-center justify-center overflow-hidden"
      >
        <img
          src={iconImage}
          alt="icon"
          className="w-full h-full object-cover"
        />
      </Icon>
      <WantedlyZap />
    </section>
  );
};

export default Hero;
