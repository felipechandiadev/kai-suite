import { withAuth } from 'next-auth/middleware';
export default withAuth({
  pages: { signIn: '/' },
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