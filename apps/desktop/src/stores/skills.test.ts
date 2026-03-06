import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSkillsStore } from './skills';

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('Skills Store', () => {
  beforeEach(() => {
    useSkillsStore.setState({
      skills: [],
      isLoading: false,
      error: null,
      selectedAgent: 'all',
      searchQuery: '',
      installModalOpen: false,
      installSource: '',
      isInstalling: false,
      resolvedSkills: [],
      isResolving: false,
      resolveError: null,
      installError: null,
      updateResults: [],
      isCheckingUpdates: false,
    });
    mockInvoke.mockClear();
  });

  it('should initialize with default state', () => {
    const state = useSkillsStore.getState();
    expect(state.skills).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.selectedAgent).toBe('all');
  });

  it('should set selected agent', () => {
    const { setSelectedAgent } = useSkillsStore.getState();
    setSelectedAgent('claude');
    expect(useSkillsStore.getState().selectedAgent).toBe('claude');
  });

  it('should set search query', () => {
    const { setSearchQuery } = useSkillsStore.getState();
    setSearchQuery('react');
    expect(useSkillsStore.getState().searchQuery).toBe('react');
  });

  it('should open and close install modal', () => {
    const { setInstallModalOpen } = useSkillsStore.getState();

    setInstallModalOpen(true);
    expect(useSkillsStore.getState().installModalOpen).toBe(true);

    setInstallModalOpen(false);
    expect(useSkillsStore.getState().installModalOpen).toBe(false);
    expect(useSkillsStore.getState().installSource).toBe('');
  });

  it('should fetch skills successfully', async () => {
    const mockSkills = [
      {
        id: '1',
        name: 'test-skill',
        description: 'A test skill',
        source: { type: 'github', url: 'https://github.com/test/skill' },
        canonicalPath: '/path/to/skill',
        version: '1.0.0',
        author: 'Test Author',
        tags: ['test'],
        installs: [],
        updatedAt: '2024-01-01T00:00:00Z',
        treeSha: 'abc123',
        contentHash: 'def456',
      },
    ];

    mockInvoke.mockResolvedValueOnce(mockSkills);

    const { fetchSkills } = useSkillsStore.getState();
    await fetchSkills();

    const state = useSkillsStore.getState();
    expect(state.skills).toEqual(mockSkills);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should handle fetch skills error', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Network error'));

    const { fetchSkills } = useSkillsStore.getState();
    await fetchSkills();

    const state = useSkillsStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Network error');
  });

  it('should resolve source successfully', async () => {
    const mockResolved = [
      {
        name: 'resolved-skill',
        description: 'Resolved description',
        source: { type: 'github', url: 'https://github.com/test/repo' },
      },
    ];

    mockInvoke.mockResolvedValueOnce(mockResolved);

    const { resolveSource } = useSkillsStore.getState();
    await resolveSource('https://github.com/test/repo');

    const state = useSkillsStore.getState();
    expect(state.resolvedSkills).toEqual(mockResolved);
    expect(state.isResolving).toBe(false);
    expect(state.resolveError).toBeNull();
  });

  it('should clear resolved skills', () => {
    const { clearResolvedSkills } = useSkillsStore.getState();

    useSkillsStore.setState({
      resolvedSkills: [{ name: 'test', description: '', source: { type: 'github', url: '' } }],
      resolveError: 'error',
      installError: 'error',
    });

    clearResolvedSkills();

    const state = useSkillsStore.getState();
    expect(state.resolvedSkills).toEqual([]);
    expect(state.resolveError).toBeNull();
    expect(state.installError).toBeNull();
  });
});
