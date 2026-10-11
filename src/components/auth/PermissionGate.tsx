"use client";

import React from "react";
import { useAuthStore } from "@/stores/authStore";
import { hasPermission, type AdminPermissionKey } from "@/lib/permissions";

interface PermissionGateProps {
  permission: AdminPermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { claims } = useAuthStore();

  const isAllowed = hasPermission(claims, permission);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
