import { Instagram } from "lucide-react";

const XIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z">
    </path>
  </svg>
);

const TikTokIcon = (
  <svg
    viewBox="0 0 448 512"
    aria-hidden="true"
    className="w-6 h-6 fill-current"
  >
    <path d="M448 209.9a210.1 210.1 0 0 1 -122.8-39.3V349.4A162.6 162.6 0 1 1 185 188.3V278.2a74.6 74.6 0 1 0 52.2 71.2V0l88 0a121.2 121.2 0 0 0 1.9 22.2h0A122.2 122.2 0 0 0 381 102.4a121.4 121.4 0 0 0 67 20.1z" />
  </svg>
);

const Footer = () => {
  const currentYear = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    timeZone: "Asia/Tokyo",
  });

  return (
    <footer className="bg-black text-white py-20 px-6 border-t-3 border-neu-border">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="text-4xl font-black italic">CATINPAJAMAS</div>

        <div className="flex gap-8 font-bold text-xl items-center">
          <a
            href="https://x.com/x673530651"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neu-yellow transition-colors"
            aria-label="X (formerly Twitter)"
          >
            {/* X Logo */}
            {XIcon}
          </a>
          <a
            href="https://www.instagram.com/catinpajamas_1997/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neu-pink transition-colors"
            aria-label="Instagram"
          >
            <Instagram size={24} />
          </a>
          <a
            href="https://www.tiktok.com/@catinpajamaz"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neu-blue transition-colors"
            aria-label="TikTok"
          >
            {TikTokIcon}
          </a>
        </div>
        <div className="text-gray-400 font-bold">
          © {currentYear} CatinPajamas. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
