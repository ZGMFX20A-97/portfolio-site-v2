const Certifications = () => {
  return (
    <div className="bg-neu-bg border-3 border-neu-border p-6 shadow-neu-sm transform translate-x-4">
      <h2 className="text-2xl font-black mb-4 text-neu-lime uppercase">
        Certifications
      </h2>
      <div className="space-y-4">
        {/* 資格 1 */}
        <div className="flex items-center gap-4 border-b-2 border-neu-border pb-2 last:border-0 last:pb-0">
          <div className="w-12 h-12 bg-neu-card border-2 border-neu-border flex items-center justify-center font-bold text-neu-text shrink-0">
            01
          </div>
          <div>
            <h3 className="font-black text-lg text-neu-text">
              AWS Certified Machine Learning Engineer - Associate
            </h3>
            <p className="text-sm font-bold text-neu-text/70">2025/12</p>
          </div>
        </div>

        {/* 資格 2 */}
        <div className="flex items-center gap-4 border-b-2 border-neu-border pb-2 last:border-0 last:pb-0">
          <div className="w-12 h-12 bg-neu-card border-2 border-neu-border flex items-center justify-center font-bold text-neu-text shrink-0">
            02
          </div>
          <div>
            <h3 className="font-black text-lg text-neu-text">
              Python3 Data Analyst Certification
            </h3>
            <p className="text-sm font-bold text-neu-text/70">2024/10</p>
          </div>
        </div>

        {/* 資格 3 */}
        <div className="flex items-center gap-4 border-b-2 border-neu-border pb-2 last:border-0 last:pb-0">
          <div className="w-12 h-12 bg-neu-card border-2 border-neu-border flex items-center justify-center font-bold text-neu-text shrink-0">
            03
          </div>
          <div>
            <h3 className="font-black text-lg text-neu-text">
              AWS Certified Solutions Architect - Associate
            </h3>
            <p className="text-sm font-bold text-neu-text/70">2024/09</p>
          </div>
        </div>

        {/* 資格 4 */}
        <div className="flex items-center gap-4 border-b-2 border-neu-border pb-2 last:border-0 last:pb-0">
          <div className="w-12 h-12 bg-neu-card border-2 border-neu-border flex items-center justify-center font-bold text-neu-text shrink-0">
            04
          </div>
          <div>
            <h3 className="font-black text-lg text-neu-text">
              Oracle Certified Java Programmer,Gold SE 11
            </h3>
            <p className="text-sm font-bold text-neu-text/70">2024/03</p>
          </div>
        </div>

        {/* 資格 5 */}
        <div className="flex items-center gap-4 border-b-2 border-neu-border pb-2 last:border-0 last:pb-0">
          <div className="w-12 h-12 bg-neu-card border-2 border-neu-border flex items-center justify-center font-bold text-neu-text shrink-0">
            05
          </div>
          <div>
            <h3 className="font-black text-lg text-neu-text">
              Oracle Certified Java Programmer,Silver SE 11
            </h3>
            <p className="text-sm font-bold text-neu-text/70">2023/12</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certifications;
