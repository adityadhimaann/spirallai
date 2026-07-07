import { StateGraph, START, END } from "@langchain/langgraph";
import { ResearchState } from "./state.js";
import {
  plannerNode,
  financialsNode,
  newsNode,
  competitiveNode,
  bullAgentNode,
  bearAgentNode,
  judgeNode,
} from "./nodes.js";

export function buildInvestmentAgent() {
  const graph = new StateGraph(ResearchState)
    .addNode("planner_node", plannerNode)
    .addNode("financials_node", financialsNode)
    .addNode("news_node", newsNode)
    .addNode("competitive_node", competitiveNode)
    .addNode("bullCase_node", bullAgentNode)
    .addNode("bearCase_node", bearAgentNode)
    .addNode("judge_node", judgeNode)

    // Run the deterministic planner first
    .addEdge(START, "planner_node")

    // Fan-out: all three research nodes run concurrently after planner.
    .addEdge("planner_node", "financials_node")
    .addEdge("planner_node", "news_node")
    .addEdge("planner_node", "competitive_node")

    // Fan-in: bull and bear agents each wait for ALL three research
    // nodes to finish before running (also concurrently with each other).
    .addEdge("financials_node", "bullCase_node")
    .addEdge("news_node", "bullCase_node")
    .addEdge("competitive_node", "bullCase_node")
    .addEdge("financials_node", "bearCase_node")
    .addEdge("news_node", "bearCase_node")
    .addEdge("competitive_node", "bearCase_node")

    // Judge waits for both the bull and bear cases.
    .addEdge("bullCase_node", "judge_node")
    .addEdge("bearCase_node", "judge_node")
    .addEdge("judge_node", END);

  return graph.compile();
}
