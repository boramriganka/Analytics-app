// Chart chrome tokens for the dark panel surface (#141416).
export const chart = {
  grid: '#26262a',
  axis: '#6e6e69',
  ink: '#f4f4f0',
  fog: '#a6a6a0',
  accent: '#c3ec4f', // single-series only
  // Validated categorical slots (all-pairs pass on #141416 — see dataviz skill)
  series: ['#3987e5', '#c98500', '#d55181'],
  surface: '#141416',
};

export const CHANNEL_COLORS = {
  online: chart.series[0],
  'in-store': chart.series[1],
  wholesale: chart.series[2],
};

export const CHANNEL_LABELS = {
  online: 'Online',
  'in-store': 'In-store',
  wholesale: 'Wholesale',
};
