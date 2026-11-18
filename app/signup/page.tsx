'use client';

import { AuthFlow } from '../../src/auth/AuthFlow';

export default function SignUpPage() {
  return <AuthFlow initialStep="signup" redirectTo="/dashboard" onAuthenticated={() => {}} />;
}
