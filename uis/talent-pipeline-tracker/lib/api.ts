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

const NETWORK_ERROR_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

/**
 * Fixed, user-facing message for a failed response. Server text is never shown:
 * it can leak internals and is not written for the people using this screen.
 */
async function errorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  // Drain the body so a non-JSON error surfaces in dev logs, not in the UI.
  try {
    await response.json();
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[api] Error response was not JSON (status ${response.status}).`,
      );
    }
  }

  const { status } = response;
  if (status === 400 || status === 422) {
    return "Some of the details were not valid. Review the fields and try again.";
  }
  if (status === 404) {
    return "We could not find what you were looking for. It may have been removed.";
  }
  if (status >= 500) {
    return "The server had a problem with this request. Please try again in a moment.";
  }
  return fallback;
}

async function request<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(await errorMessage(response, fallbackMessage));
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
    "Could not load candidates. Please try again.",
  );

  return payload.data;
}

export async function getCandidate(id: string): Promise<Candidate> {
  return request<Candidate>(
    `/records/${id}`,
    { method: "GET" },
    "Could not load this candidate. Please try again.",
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
    "Could not register the candidate. Please try again.",
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
    "Could not save the changes. Please try again.",
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
    "Could not update the status. Please try again.",
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
    "Could not update the stage. Please try again.",
  );
}

export async function getNotes(candidateId: string): Promise<Note[]> {
  const payload = await request<NotesListResponse>(
    `/records/${candidateId}/notes`,
    { method: "GET" },
    "Could not load notes. Please try again.",
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
    "Could not add the note. Please try again.",
  );
}

export async function deleteNote(
  candidateId: string,
  noteId: string,
): Promise<void> {
  await request<void>(
    `/records/${candidateId}/notes/${noteId}`,
    { method: "DELETE" },
    "Could not delete the note. Please try again.",
  );
}
