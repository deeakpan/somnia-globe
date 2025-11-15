/**
 * Category Color Mapping
 * Each project category gets a unique color for map visualization
 */

export const CATEGORY_COLORS: Record<string, string> = {
  defi: '#3B82F6',        // Blue
  gaming: '#10B981',      // Green
  nft: '#8B5CF6',         // Purple
  social: '#EC4899',      // Pink
  infrastructure: '#F59E0B', // Amber
  dao: '#06B6D4',         // Cyan
  metaverse: '#6366F1',   // Indigo
  other: '#6B7280',       // Gray
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.other;
}

