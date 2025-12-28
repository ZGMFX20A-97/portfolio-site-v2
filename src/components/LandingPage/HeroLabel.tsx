import { motion } from "framer-motion";

const HeroLabel = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.5, ease: "backOut" }}
      className="inline-block bg-neu-pink border-3 border-neu-text px-4 py-2 mb-6 shadow-neu transform -rotate-2"
    >
      <span className="font-black text-xl uppercase text-neu-bg">
        Welcome to my website!
      </span>
    </motion.div>
  );
};

export default HeroLabel;
