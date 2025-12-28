import React from "react";
import { motion } from "framer-motion";
import { BookOpenText, Github, Zap } from "lucide-react";
import clsx from "clsx";

interface ResourceCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  index: number;
  link?: string;
}

const ResourceCard = (
  { title, description, icon: Icon, color, index, link }: ResourceCardProps,
) => {
  const CardContent = (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className={clsx(
        "p-8 border-3 border-neu-border shadow-neu-lg hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all cursor-pointer h-full",
        color,
      )}
    >
      <div className="bg-neu-card w-16 h-16 border-3 border-neu-border flex items-center justify-center mb-6 shadow-neu-sm">
        <Icon size={32} className="text-neu-text" />
      </div>
      <h3 className="text-3xl font-black mb-4 uppercase text-neu-bg">
        {title}
      </h3>
      <p className="text-lg font-bold opacity-90 text-neu-bg">{description}</p>
    </motion.div>
  );

  return link
    ? (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        {CardContent}
      </a>
    )
    : CardContent;
};

const Resources = () => {
  const features = [
    {
      title: "Github",
      description: "Check out my open-source projects on Github.",
      icon: Github,
      color: "bg-neu-lime",
      link: "https://github.com/ZGMFX20A-97",
    },
    {
      title: "Apxml",
      description:
        "The most comprehensive resource for AI students, developers and researchers",
      icon: BookOpenText,
      color: "bg-neu-blue",
      link: "https://apxml.com/",
    },
    {
      title: "Connpass",
      description:
        "A platform for supporting IT study groups and connecting engineers.",
      icon: Zap,
      color: "bg-neu-purple",
      link: "https://connpass.com/user/Catinpajamas/",
    },
  ];

  return (
    <section className="py-12 px-6 bg-neu-bg border-b-3 border-neu-border">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-5xl md:text-7xl font-black text-center mb-20 uppercase text-neu-text">
          <span className="underline decoration-neu-yellow decoration-8 underline-offset-8">
            Resources
          </span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => <ResourceCard key={i} {...f} index={i} />)}
        </div>
      </div>
    </section>
  );
};

export default Resources;
