"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  addNote,
  deleteNote,
  getCandidate,
  getNotes,
  updateCandidateStage,
  updateCandidateStatus,
} from "@/lib/api";
import { stageLabels, statusLabels } from "@/lib/labels";
import type { Candidate, Note, Stage, Status } from "@/types/candidate";

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function CandidateDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [statusSaved, setStatusSaved] = useState(false);
  const [stageSaved, setStageSaved] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [addNoteError, setAddNoteError] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [deleteNoteError, setDeleteNoteError] = useState<{
    noteId: string;
    message: string;
  } | null>(null);

  const sortedNotes = useMemo(
    () =>
      [...notes].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [notes],
  );

  const canAddNote = noteContent.trim().length > 0 && !addingNote;

  useEffect(() => {
    if (!statusSaved) {
      return;
    }

    const timer = setTimeout(() => setStatusSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [statusSaved]);

  useEffect(() => {
    if (!stageSaved) {
      return;
    }

    const timer = setTimeout(() => setStageSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [stageSaved]);

  async function handleStatusChange(newStatus: Status) {
    if (!id || !candidate || newStatus === candidate.status) {
      return;
    }

    const previousStatus = candidate.status;
    setStatusError(null);
    setCandidate({ ...candidate, status: newStatus });
    setSavingStatus(true);

    try {
      const updated = await updateCandidateStatus(id, newStatus);
      setCandidate(updated);
      setStatusSaved(true);
    } catch {
      setCandidate((prev) =>
        prev ? { ...prev, status: previousStatus } : prev,
      );
      setStatusError("Failed to update status, please try again");
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleStageChange(newStage: Stage) {
    if (!id || !candidate || newStage === candidate.stage) {
      return;
    }

    const previousStage = candidate.stage;
    setStageError(null);
    setCandidate({ ...candidate, stage: newStage });
    setSavingStage(true);

    try {
      const updated = await updateCandidateStage(id, newStage);
      setCandidate(updated);
      setStageSaved(true);
    } catch {
      setCandidate((prev) => (prev ? { ...prev, stage: previousStage } : prev));
      setStageError("Failed to update stage, please try again");
    } finally {
      setSavingStage(false);
    }
  }

  async function handleAddNote() {
    if (!id || !noteContent.trim()) {
      return;
    }

    setAddingNote(true);
    setAddNoteError(null);

    try {
      const newNote = await addNote(id, noteContent.trim());
      setNotes((prev) => [...prev, newNote]);
      setNoteContent("");
    } catch {
      setAddNoteError("Failed to add note, please try again");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!id) {
      return;
    }

    setDeletingNoteId(noteId);
    setDeleteNoteError(null);

    try {
      await deleteNote(id, noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch {
      setDeleteNoteError({
        noteId,
        message: "Failed to delete note, please try again",
      });
    } finally {
      setDeletingNoteId(null);
    }
  }

  useEffect(() => {
    if (!id) {
      setError("Candidate not found");
      setLoading(false);
      return;
    }

    const candidateId = id;

    async function loadCandidate() {
      try {
        setError(null);
        const data = await getCandidate(candidateId);
        setCandidate(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Candidate not found";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadCandidate();
  }, [id]);

  useEffect(() => {
    if (!id) {
      setNotesLoading(false);
      return;
    }

    const candidateId = id;

    async function loadNotes() {
      try {
        setNotesError(null);
        const data = await getNotes(candidateId);
        setNotes(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load notes";
        setNotesError(message);
      } finally {
        setNotesLoading(false);
      }
    }

    loadNotes();
  }, [id]);

  return (
    <div className="min-h-full bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
        >
          ← Back to candidates
        </Link>

        {loading && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-6 py-8 text-zinc-600">
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700"
              aria-hidden="true"
            />
            <p>Loading candidate…</p>
          </div>
        )}

        {!loading && error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-800"
            role="alert"
          >
            <p className="font-medium">Unable to load candidate</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && candidate && (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <header className="border-b border-zinc-200 px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                    Executive Assistant Candidate — TrackFlow Zaragoza
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
                    {candidate.full_name}
                  </h1>
                  <p className="mt-1 text-zinc-600">{candidate.position}</p>
                </div>
                <Link
                  href={`/candidates/${candidate.id}/edit`}
                  className="inline-flex shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Edit
                </Link>
              </div>
            </header>

            <dl className="divide-y divide-zinc-100 px-6">
              <div className="grid gap-1 py-4 sm:grid-cols-3">
                <dt className="text-sm font-medium text-zinc-500">Email</dt>
                <dd className="text-sm text-zinc-900 sm:col-span-2">
                  <a
                    href={`mailto:${candidate.email}`}
                    className="text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    {candidate.email}
                  </a>
                </dd>
              </div>

              <div className="grid gap-1 py-4 sm:grid-cols-3">
                <dt className="text-sm font-medium text-zinc-500">Phone</dt>
                <dd className="text-sm text-zinc-900 sm:col-span-2">
                  {candidate.phone}
                </dd>
              </div>

              <div className="grid gap-1 py-4 sm:grid-cols-3">
                <dt className="text-sm font-medium text-zinc-500">Position</dt>
                <dd className="text-sm text-zinc-900 sm:col-span-2">
                  {candidate.position}
                </dd>
              </div>

              <div className="grid gap-1 py-4 sm:grid-cols-3">
                <dt className="text-sm font-medium text-zinc-500">LinkedIn</dt>
                <dd className="text-sm text-zinc-900 sm:col-span-2">
                  {candidate.linkedin_url ? (
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      {candidate.linkedin_url}
                    </a>
                  ) : (
                    <span className="text-zinc-400">Not provided</span>
                  )}
                </dd>
              </div>

              <div className="grid gap-1 py-4 sm:grid-cols-3">
                <dt className="text-sm font-medium text-zinc-500">CV</dt>
                <dd className="text-sm text-zinc-900 sm:col-span-2">
                  {candidate.cv_url ? (
                    <a
                      href={candidate.cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      View CV
                    </a>
                  ) : (
                    <span className="text-zinc-400">Not provided</span>
                  )}
                </dd>
              </div>

              <div className="grid gap-1 py-4 sm:grid-cols-3">
                <dt className="text-sm font-medium text-zinc-500">
                  Years of experience
                </dt>
                <dd className="text-sm text-zinc-900 sm:col-span-2">
                  {candidate.experience_years}
                </dd>
              </div>

              <div className="grid gap-1 py-4 sm:grid-cols-3">
                <dt className="text-sm font-medium text-zinc-500">Status</dt>
                <dd className="text-sm text-zinc-900 sm:col-span-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={candidate.status}
                        onChange={(event) =>
                          handleStatusChange(event.target.value as Status)
                        }
                        disabled={savingStatus}
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {(Object.entries(statusLabels) as [Status, string][]).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                      {savingStatus && (
                        <span className="text-xs text-zinc-500">Saving…</span>
                      )}
                      {statusSaved && !savingStatus && (
                        <span className="text-xs text-green-600">Saved ✓</span>
                      )}
                    </div>
                    {statusError && (
                      <p className="text-xs text-red-600" role="alert">
                        {statusError}
                      </p>
                    )}
                  </div>
                </dd>
              </div>

              <div className="grid gap-1 py-4 sm:grid-cols-3">
                <dt className="text-sm font-medium text-zinc-500">Stage</dt>
                <dd className="text-sm text-zinc-900 sm:col-span-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={candidate.stage}
                        onChange={(event) =>
                          handleStageChange(event.target.value as Stage)
                        }
                        disabled={savingStage}
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {(Object.entries(stageLabels) as [Stage, string][]).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                      {savingStage && (
                        <span className="text-xs text-zinc-500">Saving…</span>
                      )}
                      {stageSaved && !savingStage && (
                        <span className="text-xs text-green-600">Saved ✓</span>
                      )}
                    </div>
                    {stageError && (
                      <p className="text-xs text-red-600" role="alert">
                        {stageError}
                      </p>
                    )}
                  </div>
                </dd>
              </div>

              <div className="grid gap-1 py-4 sm:grid-cols-3">
                <dt className="text-sm font-medium text-zinc-500">
                  Application date
                </dt>
                <dd className="text-sm text-zinc-900 sm:col-span-2">
                  {formatDate(candidate.applied_at)}
                </dd>
              </div>
            </dl>

            <section className="border-t border-zinc-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-zinc-900">Notes</h2>

              {notesLoading && (
                <p className="mt-4 text-sm text-zinc-500">Loading notes…</p>
              )}

              {!notesLoading && notesError && (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {notesError}
                </p>
              )}

              {!notesLoading && !notesError && (
                <ul className="mt-4 space-y-4">
                  {sortedNotes.length === 0 ? (
                    <li className="text-sm text-zinc-500">No notes yet</li>
                  ) : (
                    sortedNotes.map((note) => (
                      <li
                        key={note.id}
                        className="rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-zinc-900 whitespace-pre-wrap">
                              {note.content}
                            </p>
                            <p className="mt-2 text-xs text-zinc-500">
                              {formatDate(note.created_at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {deletingNoteId === note.id ? (
                              <span className="text-xs text-zinc-500">
                                Deleting…
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-xs font-medium text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            )}
                            {deleteNoteError?.noteId === note.id && (
                              <p className="text-xs text-red-600" role="alert">
                                {deleteNoteError.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}

              <form
                className="mt-6 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleAddNote();
                }}
              >
                <label className="block text-sm font-medium text-zinc-700">
                  Add a note
                  <textarea
                    value={noteContent}
                    onChange={(event) => setNoteContent(event.target.value)}
                    rows={3}
                    placeholder="Write a note about this candidate…"
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={!canAddNote}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addingNote ? "Saving…" : "Add note"}
                  </button>
                  {addNoteError && (
                    <p className="text-sm text-red-600" role="alert">
                      {addNoteError}
                    </p>
                  )}
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
