import syroMalabarData from '@/data/syro-malabar-2026.json';

export type LiturgicalReading = {
  reference: string;
  description: string;
};

export type LiturgicalDay = {
  season: string;
  liturgical_day: string;
  feasts: string[];
  readings: LiturgicalReading[];
};

export function getSyroMalabarLiturgy(dateStr: string): LiturgicalDay | null {
  // expects dateStr in YYYY-MM-DD format
  const data = syroMalabarData as Record<string, LiturgicalDay>;
  return data[dateStr] || null;
}

export function getLiturgicalTheme(rite: string, season?: string) {
  if (rite === 'Latin Rite') {
    return {
      color: '#e11d48', // rose/reddish typical default theme
      iconName: 'Cross',
      bgClass: 'bg-rose-500/10',
      borderClass: 'border-rose-500/20'
    };
  } else {
    // Syro-Malabar Rite
    // Determine color by season
    let color = '#d97706'; // default amber/gold
    let bgClass = 'bg-amber-500/10';
    let borderClass = 'border-amber-500/20';
    let iconName = 'Sunrise'; // default icon

    if (season) {
      const s = season.toLowerCase();
      if (s.includes('denha')) {
        color = '#0284c7'; // Light blue
        bgClass = 'bg-sky-500/10';
        borderClass = 'border-sky-500/20';
        iconName = 'Droplet';
      } else if (s.includes('fast') || s.includes('sauma')) {
        color = '#7c3aed'; // Purple
        bgClass = 'bg-violet-500/10';
        borderClass = 'border-violet-500/20';
        iconName = 'Flame';
      } else if (s.includes('resurrection') || s.includes('qyamtha')) {
        color = '#f59e0b'; // Gold
        bgClass = 'bg-amber-500/10';
        borderClass = 'border-amber-500/20';
        iconName = 'Sun';
      } else if (s.includes('apostles')) {
        color = '#1de144ff'; // Rose
        bgClass = 'bg-rose-500/10';
        borderClass = 'border-rose-500/20';
        iconName = 'Users';
      } else if (s.includes('annunciation') || s.includes('nativity')) {
        color = '#0d9488'; // Teal
        bgClass = 'bg-teal-500/10';
        borderClass = 'border-teal-500/20';
        iconName = 'Star';
      }
    }

    return {
      color,
      iconName,
      bgClass,
      borderClass
    };
  }
}
