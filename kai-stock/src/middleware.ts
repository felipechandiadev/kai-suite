import { withAuth } from "next-auth/middleware";
import { authOptions } from "@/lib/auth/auth-options";

export default withAuth({
  pages: { signIn: "/" },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: authOptions.cookies,
});

export const config = {
  matcher: ["/scan", "/search", "/variant/:path*", "/product/:path*"],
};
