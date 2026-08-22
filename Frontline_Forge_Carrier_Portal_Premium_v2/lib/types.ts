export type PortalRole = "admin" | "dispatcher" | "carrier_owner" | "driver";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: PortalRole;
  carrier_id: string | null;
  must_change_password: boolean;
  status: string;
};
