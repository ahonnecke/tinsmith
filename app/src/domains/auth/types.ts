export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  org_name?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  orgId: string;
  role: string;
}
