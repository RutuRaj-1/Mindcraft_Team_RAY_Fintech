import React from 'react';
import { SignInPage } from './SignInPage';

/**
 * LoginPage shim for legacy route compatibility.
 * Delegates to the unified production SignInPage.
 */
export const LoginPage: React.FC = () => {
  return <SignInPage />;
};

export default LoginPage;
