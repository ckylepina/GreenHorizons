import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import Link from "next/link";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Button } from "../ui/button";
import Image from "next/image";
import { Home } from "lucide-react";

const Header = () => {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center px-4 py-3 text-sm">
        <div className="flex items-center gap-5 font-semibold">
          <Link href="/">
            <Button
              // Use responsive padding: smaller on mobile, larger on md+
              className="bg-white dark:bg-white hover:bg-neutral-100 dark:hover:bg-neutral-200 p-2 md:p-3"
              size="sm"
            >
              {/* Desktop: show full logo image */}
              <div className="hidden md:flex">
                <Image
                  src="/greenhorizonsicon.png"
                  alt="Green Horizons Icon"
                  width={150}
                  height={150}
                  unoptimized
                />
              </div>
              {/* Mobile: show smaller home icon */}
              <div className="flex md:hidden">
                <Home className="w-4 h-4" />
              </div>
            </Button>
          </Link>
        </div>
        {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
      </div>
    </nav>
  );
};

export default Header;