import Icon from "./Icon";
import QRcode from "../../assets/misc/QRcode.jpg";

const FloatingZap = () => {
  return (
    <Icon
      animate={{ y: [0, 30, 0], rotate: [0, -5, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="bottom-40 right-10 md:right-20 bg-neu-lime !p-0 w-40 h-40 flex items-center justify-center overflow-hidden"
    >
      <img src={QRcode} alt="QRcode" className="w-full h-full object-cover" />
    </Icon>
  );
};

export default FloatingZap;
