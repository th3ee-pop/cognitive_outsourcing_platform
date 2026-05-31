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

export type AiChatRole = "user" | "assistant" | "system";

export type AiConversation = {
  id: string;
  user_id?: string;
  task_id: string;
  title: string;
  task_stage: string | null;
  model: string | null;
  system_prompt_version: string | null;
  archived_at: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AiMessage = {
  id: string;
  conversation_id: string;
  user_id?: string;
  role: AiChatRole;
  content: string;
  token_count: number | null;
  created_at: string;
  metadata_json: Record<string, unknown>;
};
