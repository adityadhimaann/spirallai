import "dotenv/config";
import { judgeNode } from "./agent/nodes.js";

const mockState = {
  bullCase: "Pfizer is great.",
  bearCase: "Pfizer is bad.",
  financials: {
    isMock: false,
    symbol: "PFE",
    name: "Pfizer Inc."
  },
  news: {
    articles: [{title: "Pfizer news", url: "https://pfizer.com"}]
  },
  competitive: {
    findings: [{title: "Pfizer competitors", url: "https://pfizer.com"}]
  }
};

async function run() {
  const res = await judgeNode(mockState);
  console.log("FINAL RESULT:", res);
}
run();
