import { ThemeSwitcher } from "@/components/theme-switcher";

const Footer = () => {
  return (
    <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
      <p>
        Powered by{" "}
        <a
          href="https://www.greenhorizons.io/"
          target="_blank"
          className="font-bold hover:underline"
          rel="noreferrer"
        >
          Green Horizons
        </a>
      </p>
      <ThemeSwitcher />
    </footer>
  );
};

export default Footer;
