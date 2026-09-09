export type LeadRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  jobTitle: string | null;
  message: string | null;
  source: string;
  sourceRef: string | null;
  status: string;
  ownerNotes: string | null;
  createdAt: string;
};
