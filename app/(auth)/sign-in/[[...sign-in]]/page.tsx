import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/Logo.png"
            width={200}
            height={60}
            alt="Brandex Studio"
            className="h-12 w-auto dark:hidden"
          />
          <Image
            src="/Logo-white.png"
            width={200}
            height={60}
            alt="Brandex Studio"
            className="hidden h-12 w-auto dark:block"
          />
          <p className="text-sm text-muted-foreground">
            AI-Powered Product Photography
          </p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
