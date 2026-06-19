import { redirect } from 'next/navigation';

/** /signup is an alias for the canonical /register route. */
export default function SignupPage() {
  redirect('/register');
}
