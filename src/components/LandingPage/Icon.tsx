import { motion } from "framer-motion";
import clsx from "clsx";
import { ReactNode } from "react";

interface IconProps {
  className?: string;
  animate?: any;
  transition?: any;
  children: ReactNode;
}

const Icon = ({ className, animate, transition, children }: IconProps) => {
  return (
    <motion.div
      animate={animate}
      transition={transition}
      className={clsx(
        "absolute p-4 border-3 border-neu-border shadow-neu hidden lg:block",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export default Icon;
