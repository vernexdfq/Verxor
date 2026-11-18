'use client';

import { AuthFlow } from '../../src/auth/AuthFlow';

export default function SignInPage() {
  return <AuthFlow initialStep="signin" redirectTo="/dashboard" onAuthenticated={() => {}} />;
}
