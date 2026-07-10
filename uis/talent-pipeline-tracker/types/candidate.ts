export type Status = "received" | "in_progress" | "selected" | "discarded";

export type Stage =
  | "pending"
  | "review"
  | "personal_interview"
  | "technical_interview"
  | "offer_presented";

/** Matches the Talent Tracker API `RecordOut` schema (snake_case). */
export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  experience_years: number;
  status: Status;
  stage: Stage;
  notes_count: number;
  applied_at: string;
  updated_at: string;
  /** Present on list responses; omitted on single-record GET. */
  notes?: Note[];
}

/** Matches the Talent Tracker API `RecordCreate` schema. */
export type CandidateCreate = Pick<
  Candidate,
  | "full_name"
  | "email"
  | "phone"
  | "position"
  | "linkedin_url"
  | "cv_url"
  | "experience_years"
>;

/** Matches the Talent Tracker API note object shape. */
export interface Note {
  id: string;
  record_id: string;
  content: string;
  created_at: string;
}

export interface RecordsListResponse {
  total: number;
  page: number;
  limit: number;
  data: Candidate[];
}

export interface NotesListResponse {
  data: Note[];
  meta: {
    total: number;
  };
}
