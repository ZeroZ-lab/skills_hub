import { ComponentType } from 'react';
import ClaudeCode from '@lobehub/icons/es/ClaudeCode';
import Gemini from '@lobehub/icons/es/Gemini';
import Codex from '@lobehub/icons/es/Codex';
import OpenCode from '@lobehub/icons/es/OpenCode';

// Supported agent type to icon mapping.
export const AGENT_ICON_MAP: Record<string, ComponentType<any>> = {
  'claude-code': ClaudeCode,
  'gemini-cli': Gemini,
  'codex': Codex,
  'opencode': OpenCode,
};

// Get icon component for agent type
export function getAgentIcon(agentType: string): ComponentType<any> | null {
  return AGENT_ICON_MAP[agentType] || null;
}
