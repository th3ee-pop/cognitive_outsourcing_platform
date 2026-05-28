export type UserRole = "student" | "teacher" | "admin";
export type ClassType = "graduate" | "undergraduate";

export type UserProfile = {
  id: string;
  username: string;
  anonymous_code: string;
  class_type: ClassType | null;
  role: UserRole;
  must_change_password: boolean;
};

export type SessionUser = UserProfile & {
  session_id: string;
};

export type SurveyAnswer = {
  itemId: string;
  value: number;
};

export type ConceptNode = {
  id: string;
  label: string;
  kind: "central" | "concept" | "support" | "leaf";
  x: number;
  y: number;
};

export type ConceptEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export type ConceptMapPayload = {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  startedAt?: string;
};

export type ExternalAiDisclosure = {
  id?: string;
  tool_name: string;
  usage_stage: string;
  prompt_summary: string;
  adoption_description: string;
  approximate_time: string;
  created_at?: string;
};
