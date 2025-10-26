import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Suppression des restrictions d'accès - toutes les pages sont maintenant accessibles
  return <>{children}</>;
}