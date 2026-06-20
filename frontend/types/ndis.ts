export interface Medication {
  name: string;
  dose: string;
  timing: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface CurrentSupport {
  service: string;
  frequency: string;
  raw: string;
}

export interface ParticipantProfile {
  name: string;
  dob: string;
  ndis_number: string;
  primary_disability: string;
  secondary_conditions: string[];
  medications: Medication[];
  allergies: string[];
  behavioural_support_plan: string;
  seizure_management_plan: string;
  communication_needs: string;
  mobility_needs: string;
  informal_supports: string[];
  emergency_contact: EmergencyContact;
  stated_goals: string[];
  current_supports: CurrentSupport[];
  funding_level: string;
  plan_start_date: string;
}

export interface Checkpoint {
  checkpoint_id: string;
  field: string;
  value_shown: string;
  why: string;
}

export interface Decision {
  checkpoint_id: string;
  field: string;
  value_shown: string;
  decision: "yes" | "no";
  note: string;
}

export interface Finding {
  rule: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface ParseResponse {
  session_id: string;
  profile: ParticipantProfile;
  checkpoints: Checkpoint[];
}

export interface GenerateResponse {
  documents: {
    "care-plan": string;
    "progress-notes": string;
    "risk-consent": string;
  };
  report: Finding[];
  passed: boolean;
  excluded: string[];
}

export interface ExportFile {
  name: string;
  url: string | null;
  detail: string;
}

export interface ExportResponse {
  files: ExportFile[];
}
