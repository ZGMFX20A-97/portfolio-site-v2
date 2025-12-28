import iconImage from "../../assets/misc/icon.jpg";
import PixelTransition from "../ReactBits/PixelTransition.tsx";

const ProfileImage = () => {
  return (
    <div className="w-full md:w-1/3">
      <div className="border-3 border-neu-border shadow-neu p-2 bg-neu-purple rotate-2 hover:rotate-0 transition-all duration-300">
        <PixelTransition
          firstContent={
            <img
              src={iconImage}
              alt="Icon"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          }
          secondContent={
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "grid",
                placeItems: "center",
                backgroundColor: "#111",
              }}
            >
              <p
                style={{ fontWeight: 900, fontSize: "3rem", color: "#ffffff" }}
              >
                Let&apos;s rock!
              </p>
            </div>
          }
          gridSize={25}
          pixelColor="#ffffff"
          once={false}
          animationStepDuration={0.2}
          className="custom-pixel-card"
        />
      </div>
    </div>
  );
};

export default ProfileImage;
