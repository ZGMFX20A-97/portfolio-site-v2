import DecryptedText from "../ReactBits/DecryptedText";

const IntroductionCard = () => {
  return (
    <div className="text-xl md:text-2xl font-bold max-w-2xl mx-auto mb-10 bg-neu-card border-3 border-neu-border p-4 shadow-neu text-neu-text min-h-[120px] flex items-center justify-center">
      <p>
        Hi! I&apos;m CatInPajamas.<br />
        <DecryptedText
          text="A rookie engineer who loves to create something funny."
          animateOn="both"
          useOriginalCharsOnly={true}
          sequential={true}
          speed={50}
          className="revealed"
          parentClassName="all-letters"
          encryptedClassName="encrypted"
        />
      </p>
    </div>
  );
};

export default IntroductionCard;
