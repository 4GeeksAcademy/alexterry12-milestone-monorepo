import type {
  Candidate,
  CandidateCreate,
  Note,
  NotesListResponse,
  RecordsListResponse,
  Stage,
  Status,
} from "@/types/candidate";

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not defined. Set it in .env.local (see .env.example).",
    );
  }

  return baseUrl.replace(/\/$/, "");
}

async function parseErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (
      body &&
      typeof body === "object" &&
      "detail" in body &&
      body.detail !== undefined
    ) {
      return `${fallback}: ${JSON.stringify(body.detail)}`;
    }
  } catch {
    // Response body is not JSON; use the fallback message.
  }

  return `${fallback} (HTTP ${response.status})`;
}

async function request<T>(
  path: string,
  init: RequestInit,
  errorContext: string,
): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, errorContext));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getCandidates(): Promise<Candidate[]> {
  const payload = await request<RecordsListResponse>(
    "/records",
    { method: "GET" },
    "Failed to fetch candidates",
  );

  return payload.data;
}

export async function getCandidate(id: string): Promise<Candidate> {
  return request<Candidate>(
    `/records/${id}`,
    { method: "GET" },
    `Failed to fetch candidate ${id}`,
  );
}

export async function createCandidate(
  data: Omit<Candidate, "id">,
): Promise<Candidate> {
  const payload: CandidateCreate = {
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    position: data.position,
    linkedin_url: data.linkedin_url ?? null,
    cv_url: data.cv_url ?? null,
    experience_years: data.experience_years,
  };

  return request<Candidate>(
    "/records",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to create candidate",
  );
}

export async function updateCandidate(
  id: string,
  data: Partial<Candidate>,
): Promise<Candidate> {
  const current = await getCandidate(id);

  const payload: CandidateCreate = {
    full_name: data.full_name ?? current.full_name,
    email: data.email ?? current.email,
    phone: data.phone ?? current.phone,
    position: data.position ?? current.position,
    linkedin_url: data.linkedin_url ?? current.linkedin_url,
    cv_url: data.cv_url ?? current.cv_url,
    experience_years: data.experience_years ?? current.experience_years,
  };

  return request<Candidate>(
    `/records/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    `Failed to update candidate ${id}`,
  );
}

export async function updateCandidateStatus(
  id: string,
  status: Status,
): Promise<Candidate> {
  return request<Candidate>(
    `/records/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    `Failed to update status for candidate ${id}`,
  );
}

export async function updateCandidateStage(
  id: string,
  stage: Stage,
): Promise<Candidate> {
  return request<Candidate>(
    `/records/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    },
    `Failed to update stage for candidate ${id}`,
  );
}

export async function getNotes(candidateId: string): Promise<Note[]> {
  const payload = await request<NotesListResponse>(
    `/records/${candidateId}/notes`,
    { method: "GET" },
    `Failed to fetch notes for candidate ${candidateId}`,
  );

  return payload.data;
}

export async function addNote(
  candidateId: string,
  content: string,
): Promise<Note> {
  return request<Note>(
    `/records/${candidateId}/notes`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
    `Failed to add note for candidate ${candidateId}`,
  );
}

export async function deleteNote(
  candidateId: string,
  noteId: string,
): Promise<void> {
  await request<void>(
    `/records/${candidateId}/notes/${noteId}`,
    { method: "DELETE" },
    `Failed to delete note ${noteId} for candidate ${candidateId}`,
  );
}
