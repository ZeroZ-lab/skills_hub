import { ComponentType } from 'react';
// Use default export (Mono with Color/Combine/Avatar attached)
// For icons with Color, we'll access via .Color property at runtime
import Claude from '@lobehub/icons/es/Claude';
import ClaudeCode from '@lobehub/icons/es/ClaudeCode';
import Cursor from '@lobehub/icons/es/Cursor';
import OpenAI from '@lobehub/icons/es/OpenAI';
import Copilot from '@lobehub/icons/es/Copilot';
import GithubCopilot from '@lobehub/icons/es/GithubCopilot';
import Gemini from '@lobehub/icons/es/Gemini';
import Cline from '@lobehub/icons/es/Cline';
import Windsurf from '@lobehub/icons/es/Windsurf';
import Replit from '@lobehub/icons/es/Replit';
import Codex from '@lobehub/icons/es/Codex';
import Github from '@lobehub/icons/es/Github';
import Amp from '@lobehub/icons/es/Amp';
import Antigravity from '@lobehub/icons/es/Antigravity';
import CodeGeeX from '@lobehub/icons/es/CodeGeeX';
import KiloCode from '@lobehub/icons/es/KiloCode';
import OpenCode from '@lobehub/icons/es/OpenCode';
import RooCode from '@lobehub/icons/es/RooCode';
import Zencoder from '@lobehub/icons/es/Zencoder';

// Agent type to icon mapping (using default export, which is Mono but has Color/Combine attached)
export const AGENT_ICON_MAP: Record<string, ComponentType<any>> = {
  // Claude family
  'claude-code': ClaudeCode,
  'claude-desktop': Claude,
  'claude-web': Claude,

  // Cursor
  'cursor': Cursor,

  // OpenAI
  'chatgpt-desktop': OpenAI,
  'chatgpt-web': OpenAI,

  // GitHub Copilot
  'github-copilot': GithubCopilot,
  'copilot-cli': Copilot,

  // Google
  'gemini-desktop': Gemini,
  'gemini-web': Gemini,
  'gemini-cli': Gemini,
  'aistudio': Gemini,

  // Cline
  'cline': Cline,

  // Windsurf
  'windsurf': Windsurf,

  // Replit
  'replit': Replit,
  'replit-agent': Replit,

  // Codex
  'codex': Codex,

  // Amp
  'amp': Amp,

  // Antigravity
  'antigravity': Antigravity,

  // CodeGeeX
  'codegeeX': CodeGeeX,

  // Kilo
  'kilo': KiloCode,

  // OpenCode
  'opencode': OpenCode,

  // Roo
  'roo': RooCode,

  // Zencoder
  'zencoder': Zencoder,

  // Version control
  'github': Github,
};

// Get icon component for agent type
export function getAgentIcon(agentType: string): ComponentType<any> | null {
  return AGENT_ICON_MAP[agentType] || null;
}
