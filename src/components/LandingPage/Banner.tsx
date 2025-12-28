import LogoLoop from "../ReactBits/LogoLoop.tsx";
import {
  SiDocker,
  SiGit,
  SiGo,
  SiHuggingface,
  SiJupyter,
  SiPostman,
  SiPython,
  SiPytorch,
  SiReact,
  SiTailwindcss,
  SiTypescript,
} from "react-icons/si";

const Banner = () => {
  const techLogos = [
    {
      node: <SiTypescript />,
      title: "TypeScript",
      href: "https://www.typescriptlang.org",
    },
    { node: <SiPython />, title: "Python", href: "https://www.python.org" },
    { node: <SiGo />, title: "Go", href: "https://golang.org" },
    { node: <SiPytorch />, title: "PyTorch", href: "https://pytorch.org" },
    { node: <SiReact />, title: "React", href: "https://react.dev" },
    {
      node: <SiTailwindcss />,
      title: "Tailwind CSS",
      href: "https://tailwindcss.com",
    },
    { node: <SiGit />, title: "Git", href: "https://git-scm.com" },
    { node: <SiDocker />, title: "Docker", href: "https://www.docker.com" },
    { node: <SiPostman />, title: "Postman", href: "https://www.postman.com" },
    { node: <SiJupyter />, title: "Jupyter", href: "https://jupyter.org" },
    {
      node: <SiHuggingface />,
      title: "Hugging Face",
      href: "https://huggingface.co",
    },
  ];

  return (
    <div className="bg-neu-pink border-y-3 border-neu-border py-6 overflow-hidden whitespace-nowrap flex transform scale-130 origin-center shadow-neu relative z-20">
      <LogoLoop
        logos={techLogos}
        speed={120}
        direction="left"
        logoHeight={48}
        gap={60}
        hoverSpeed={0}
        scaleOnHover
        fadeOut={true}
        fadeOutColor="#ffffff"
        ariaLabel="Technology partners"
      />
    </div>
  );
};

export default Banner;
