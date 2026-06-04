import { z } from "zod";
import type { ChatMessage, ChatResponse, ModelProfile } from "../../providers/types.js";
import type { DeterministicRouteCandidate } from "./task-normalizer.js";

export const LLM_ROUTE_CONFIDENCE_THRESHOLD = 0.75;

const LLMRouteClassificationSchema = z.object({
  intent: z.enum(["chat", "plan", "code_action", "write_documentation", "followup_lookup", "clarification"]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  task: z.string().min(1),
  targetPath: z.string().optional(),
  targetDirectory: z.string().optional(),
  requiresConfirmation: z.boolean(),
}).strict();

export type LLMRouteClassification = z.infer<typeof LLMRouteClassificationSchema>;

export interface ClassifierChatRequest {
  profile: ModelProfile;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
}

export interface RouteClassifierInput {
  input: string;
  candidate: DeterministicRouteCandidate;
  profile: ModelProfile;
  providerChat: (request: ClassifierChatRequest) => Promise<ChatResponse>;
}

export interface RouteClassifier {
  classify(input: RouteClassifierInput): Promise<LLMRouteClassification>;
}

const SYSTEM_PROMPT = `Classify one terminal coding-assistant request.
Return only one strict JSON object with these fields:
intent, confidence, reason, task, optional targetPath, optional targetDirectory, requiresConfirmation.
Allowed intents: chat, plan, code_action, write_documentation, followup_lookup, clarification.
Classification cannot execute tools, modify files, claim success, or bypass confirmation.
Use clarification when the requested outcome is unclear.`;

export function parseLLMRouteClassification(content: string): LLMRouteClassification {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const parsed = JSON.parse(fenced ? fenced[1] : trimmed);
  return LLMRouteClassificationSchema.parse(parsed);
}

export class LLMRouteClassifier implements RouteClassifier {
  async classify(input: RouteClassifierInput): Promise<LLMRouteClassification> {
    const response = await input.providerChat({
      profile: input.profile,
      temperature: 0,
      maxTokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            input: input.input,
            deterministicCandidate: {
              intent: input.candidate.intent,
              confidence: input.candidate.confidence,
              targetPath: input.candidate.targetPath,
              targetDirectory: input.candidate.targetDirectory,
              needsClarification: input.candidate.needsClarification,
            },
          }),
        },
      ],
    });

    return parseLLMRouteClassification(response.content);
  }
}
