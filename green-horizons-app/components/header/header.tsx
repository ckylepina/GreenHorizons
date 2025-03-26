import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import Link from "next/link";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Button } from "../ui/button";
import Image from "next/image";

const Header = () => {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-5 items-center font-semibold">
        <Link
        href="/"
      >
        <Button
          className="flex items-center gap-2 bg-white dark:bg-white hover:bg-neutral-100 dark:hover:bg-neutral-200"
          size="sm"
        >
          <Image
            src="/greenhorizonsicon.png"
            alt="Green Horizons Icon"
            width={150}
            height={150}
            unoptimized
          />
          <span></span>
        </Button>
      </Link>
          <div className="flex items-center gap-2">
          </div>
        </div>
        {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
      </div>
    </nav>
  );
};

export default Header;