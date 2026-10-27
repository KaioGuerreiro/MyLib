import { Ionicons } from '@expo/vector-icons';

export interface AvatarOption {
  id: string;
  nome: string;
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  fundo: string;
  descricao: string;
}

export const AVATARES_DISPONIVEIS: AvatarOption[] = [
  {
    id: 'owl',
    nome: 'Coruja Sábia',
    icone: 'school',
    cor: '#F59E0B',
    fundo: 'rgba(245, 158, 11, 0.18)',
    descricao: 'Símbolo da sabedoria e do conhecimento perpétuo.',
  },
  {
    id: 'wizard',
    nome: 'Mestre Arcano',
    icone: 'sparkles',
    cor: '#8B5CF6',
    fundo: 'rgba(139, 92, 246, 0.18)',
    descricao: 'Para quem desvenda segredos profundos nas páginas.',
  },
  {
    id: 'dragon',
    nome: 'Dragão Guardião',
    icone: 'flame',
    cor: '#EF4444',
    fundo: 'rgba(239, 68, 68, 0.18)',
    descricao: 'Determinação ardente e leitura sem limites.',
  },
  {
    id: 'coffee',
    nome: 'Café & Livros',
    icone: 'cafe',
    cor: '#10B981',
    fundo: 'rgba(16, 185, 129, 0.18)',
    descricao: 'O refúgio acolhedor do leitor matutino.',
  },
  {
    id: 'astro',
    nome: 'Explorador Cósmico',
    icone: 'planet',
    cor: '#3B82F6',
    fundo: 'rgba(59, 130, 246, 0.18)',
    descricao: 'Navegando por universos infinitos da imaginação.',
  },
  {
    id: 'crown',
    nome: 'Nobreza Literária',
    icone: 'ribbon',
    cor: '#EC4899',
    fundo: 'rgba(236, 72, 153, 0.18)',
    descricao: 'Dedicado aos colecionadores de grandes histórias.',
  },
  {
    id: 'night',
    nome: 'Guardião Noturno',
    icone: 'moon',
    cor: '#6366F1',
    fundo: 'rgba(99, 102, 241, 0.18)',
    descricao: 'Para quem adora devorar capítulos madrugada adentro.',
  },
  {
    id: 'shield',
    nome: 'Arquivista Real',
    icone: 'shield-checkmark',
    cor: '#06B6D4',
    fundo: 'rgba(6, 182, 212, 0.18)',
    descricao: 'O guardião do acervo e da memória literária.',
  },
];

export const AVATAR_PADRAO: AvatarOption = AVATARES_DISPONIVEIS[0];

export function getAvatarById(id?: string): AvatarOption {
  if (!id) return AVATAR_PADRAO;
  return AVATARES_DISPONIVEIS.find((a) => a.id === id) || AVATAR_PADRAO;
}
