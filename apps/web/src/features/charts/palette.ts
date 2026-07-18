/** Literal hex values for SVG chart attributes (CSS vars don't reach Recharts
 * props). Same values as the tokens in styles/tokens.css — validated with the
 * dataviz six-checks on the panel surface #fcfbf8. */
export const chart = {
  ink: '#1c1a17',
  ink2: '#56534b',
  ink3: '#8b877e',
  grid: '#eae6dc',
  line2: '#cfcaba',
  panel: '#fcfbf8',
  signal: '#2742d8',
  compare: '#d8d3c4',
  down: '#c03530',
  up: '#1e7b34',
  /** all-pairs-validated trio for co-plotted series (lines, scatter) */
  trio: ['#2742d8', '#eda100', '#e87ba4'],
  /** adjacent-pairs-validated six for stacks/bars/legends in fixed order */
  six: ['#2742d8', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834'],
};

export const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";
