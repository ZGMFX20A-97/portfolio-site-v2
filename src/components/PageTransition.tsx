import { useEffect } from "react";
import { motion } from "framer-motion";

let isFirstLoad = true;

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const shouldAnimate = !isFirstLoad;

  useEffect(() => {
    // Delay setting isFirstLoad to false to handle React Strict Mode double-mount
    const timer = setTimeout(() => {
      isFirstLoad = false;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: shouldAnimate ? 0 : 1 }}
      animate={{
        opacity: 1,
        transition: { duration: 0.5 },
      }}
      exit={{
        opacity: 0,
        transition: { duration: 0.5 },
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
