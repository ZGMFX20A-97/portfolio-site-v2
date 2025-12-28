import React from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-neu-bg/80 backdrop-blur-md border-b-3 border-neu-border px-6 py-4 flex justify-between items-center text-neu-text">
      <Link to="/" className="text-2xl font-black italic tracking-tighter">
        <span className="text-neu-lime">CAT</span>
        <span className="text-neu-blue">IN</span>
        <span className="text-neu-pink">PAJAMAS</span>
      </Link>

      <div className="hidden md:flex gap-6 font-bold items-center">
        <Link
          to="/about"
          className="px-4 py-2 bg-neu-bg border-3 border-neu-border shadow-neu hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all hover:bg-neu-pink"
        >
          AboutMe
        </Link>
        <a
          href="mailto:catinpajamas1997@gmail.com"
          className="px-4 py-2 bg-neu-bg border-3 border-neu-border shadow-neu hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all hover:bg-neu-lime"
        >
          Contact
        </a>
      </div>

      <button
        className="md:hidden text-neu-text"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={32} /> : <Menu size={32} />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-neu-card border-b-3 border-neu-border p-6 flex flex-col gap-4 font-bold md:hidden">
          <Link
            to="/about"
            className="block w-full bg-neu-bg border-3 border-neu-border p-3 shadow-neu text-center font-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all hover:bg-neu-pink"
          >
            AboutMe
          </Link>
          <Link
            to="/qa"
            className="block w-full bg-neu-bg border-3 border-neu-border p-3 shadow-neu text-center font-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all hover:bg-neu-yellow"
          >
            Q&A
          </Link>
          <Link
            to="/career"
            className="block w-full bg-neu-bg border-3 border-neu-border p-3 shadow-neu text-center font-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all hover:bg-neu-purple"
          >
            Career
          </Link>
          <a
            href="#"
            className="block w-full bg-neu-bg border-3 border-neu-border p-3 shadow-neu text-center font-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all hover:bg-neu-lime"
          >
            Pricing
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
