export type FirmOption = { id: string; name: string };

export type Firm = {
  id: string;
  name: string;
  industry?: string;
  contactEmail?: string;
  phoneNumber?: string;
  address?: string;
  createdAt?: string | null;
};

export type FirmAdminRow = {
  id: string;
  name: string;
  email: string;
  firmId: string | null;
  firmName: string;
};
