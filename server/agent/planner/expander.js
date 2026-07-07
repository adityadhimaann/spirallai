/**
 * Query Expansion
 * Deterministically expands a single query into multiple targeted searches
 * based on the extracted entities and the user's intent.
 */

export function expandQueries(entities, intent) {
  const { companyName, ticker } = entities;
  const queries = [];

  // Base queries for all intents
  queries.push(`${companyName} latest news`);

  switch (intent) {
    case "Financial Analysis":
      queries.push(`${companyName} Q3 earnings call transcript`);
      queries.push(`${ticker} SEC 10-K filing`);
      queries.push(`${companyName} revenue growth and profit margins`);
      break;
    case "Compare Companies":
      queries.push(`${companyName} vs top competitors`);
      queries.push(`${companyName} market share comparison`);
      break;
    case "Risk Analysis":
      queries.push(`${companyName} regulatory risks and lawsuits`);
      queries.push(`${companyName} bear case and downside`);
      break;
    case "Competitive Analysis":
      queries.push(`${companyName} main competitors and rivals`);
      queries.push(`${companyName} industry position and moat`);
      break;
    case "News Summary":
      queries.push(`${companyName} major announcements this month`);
      break;
    default:
      // General Company Research
      queries.push(`${ticker} SEC 10-K filing`);
      queries.push(`${companyName} primary competitors`);
      queries.push(`${companyName} bull and bear case`);
      break;
  }

  return queries;
}
