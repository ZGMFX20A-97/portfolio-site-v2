const TechStack = () => {
  return (
    <div className="bg-neu-bg border-3 border-neu-border p-6 shadow-neu-sm transform translate-x-2">
      <h2 className="text-2xl font-black mb-4 text-neu-blue uppercase">
        My Stack
      </h2>
      <div className="flex flex-wrap gap-3">
        {["TypeScript", "Node.js", "Python", "PyTorch", "Git", "Docker"].map((
          tech,
        ) => (
          <span
            key={tech}
            className="bg-neu-text text-neu-bg px-3 py-1 font-bold border-2 border-neu-border hover:bg-neu-lime transition-colors cursor-default"
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TechStack;
