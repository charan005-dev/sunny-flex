import { useQuery } from "@tanstack/react-query";
import api from "../services/api";

export interface Tenant {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface Cohort {
  id: string;
  code: string;
  name: string;
  tenantId: string;
}

export interface RouteConfig {
  id: string;
  path: string;
  name: string;
  description: string | null;
  slotDefinitions: SlotDefinition[];
}

export interface SlotDefinition {
  id: string;
  slotKey: string;
  name: string;
  allowedSlotTypes: string[];
  required: boolean;
  sortOrder: number;
  viewports: string[];
}

export interface ComponentEntry {
  id: string;
  code: string;
  name: string;
  description: string | null;
  slotType: string;
  defaultProps: Record<string, unknown> | null;
}

export interface PageLayout {
  id: string;
  routeId: string;
  tenantId: string;
  cohortId: string;
  viewport: string;
  layoutJson: LayoutConfig;
  version: number;
  status: string;
}

export interface LayoutConfig {
  routePath: string;
  viewport: string;
  gridTemplate: {
    columns: string;
    rows: string;
    gap: string;
    areas: string[];
  };
  slots: Record<string, {
    componentCode: string;
    gridArea: string;
    props: Record<string, unknown>;
  }>;
}

export function useTenants() {
  return useQuery<Tenant[]>({
    queryKey: ["tenants"],
    queryFn: async () => {
      const res = await api.get("/tenants");
      return res.data.data;
    },
  });
}

export function useCohorts(tenantId: string | null) {
  return useQuery<Cohort[]>({
    queryKey: ["cohorts", tenantId],
    queryFn: async () => {
      const res = await api.get(`/tenants/${tenantId}/cohorts`);
      return res.data.data;
    },
    enabled: !!tenantId,
  });
}

export function useRoutes() {
  return useQuery<RouteConfig[]>({
    queryKey: ["routes"],
    queryFn: async () => {
      const res = await api.get("/routes");
      return res.data.data;
    },
  });
}

export function useComponents() {
  return useQuery<ComponentEntry[]>({
    queryKey: ["components"],
    queryFn: async () => {
      const res = await api.get("/components");
      return res.data.data;
    },
  });
}

export function useLayouts(params: {
  routeId?: string;
  tenantId?: string;
  cohortId?: string;
  viewport?: string;
  status?: string;
}) {
  return useQuery<PageLayout[]>({
    queryKey: ["layouts", params],
    queryFn: async () => {
      const res = await api.get("/layouts", { params });
      return res.data.data;
    },
    enabled: !!(params.routeId && params.tenantId && params.cohortId),
  });
}
