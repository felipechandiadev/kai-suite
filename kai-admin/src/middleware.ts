import { withAuth } from 'next-auth/middleware';
import { authOptions } from '@/lib/auth/auth-options';

export default withAuth({
  pages: { signIn: '/' },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: authOptions.cookies,
});
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/design-system/:path*',
    '/ui-components/:path*',
    '/sales/:path*',
    '/purchasing/:path*',
    '/inventory/:path*',
    '/catalog/:path*',
    '/accounting/:path*',
    '/treasury/:path*',
    '/hcm/:path*',
    '/settings/:path*',
  ],
};