
export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  difficulty: string;
  topicsCount: number;
  date: string;
  isInfinite: boolean;
}

export interface GameState {
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  multiplier: number;
  isGameOver: boolean;
  status: 'idle' | 'loading' | 'playing' | 'summary';
  categories: string[];
  difficulty: string;
  questionCount: number;
  isInfinite: boolean;
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export interface CategoryItem {
  name: string;
  icon: string;
}

export const CATEGORIES: CategoryItem[] = [
  { name: "General Knowledge", icon: "🌐" },
  { name: "Science & Nature", icon: "🔬" },
  { name: "Computer Science", icon: "💻" },
  { name: "Mathematics", icon: "➗" },
  { name: "Mythology", icon: "🔱" },
  { name: "Sports", icon: "⚽" },
  { name: "Geography", icon: "🗺️" },
  { name: "History", icon: "📜" },
  { name: "Politics", icon: "⚖️" },
  { name: "Art", icon: "🎨" },
  { name: "Celebrities", icon: "🌟" },
  { name: "Animals", icon: "🐾" },
  { name: "Vehicles", icon: "🚗" },
  { name: "Comics", icon: "🦸" },
  { name: "Gadgets", icon: "📱" },
  { name: "Anime & Manga", icon: "⛩️" },
  { name: "Cartoons & Animations", icon: "🎬" },
  { name: "Space Exploration", icon: "🚀" },
  { name: "World Cuisine", icon: "🍕" },
  { name: "Pop Culture", icon: "🎸" }
];
