// String-literal union types shared between rendering layer (OntologyNode,
// OntologyEdge, useELKLayout) and the API client (`lib/api/graph.ts`).
//
// Mirror of the Python `GraphNodeType` / `GraphEdgeType` literals in
// `ontokit/schemas/graph.py` — keep in sync when adding new values.
export type GraphNodeType =
  | "focus"
  | "class"
  | "root"
  | "secondary_root"
  | "individual"
  | "property"
  | "external"
  | "unexplored";

export type GraphEdgeType = "subClassOf" | "equivalentClass" | "disjointWith" | "seeAlso";
