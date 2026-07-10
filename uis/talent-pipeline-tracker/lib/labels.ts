import type { Stage, Status } from "@/types/candidate";

export const statusLabels: Record<Status, string> = {
  received: "Received",
  in_progress: "In progress",
  selected: "Selected",
  discarded: "Discarded",
};

export const stageLabels: Record<Stage, string> = {
  pending: "Pending review",
  review: "Under review",
  personal_interview: "Personal interview",
  technical_interview: "Technical interview",
  offer_presented: "Offer presented",
};
