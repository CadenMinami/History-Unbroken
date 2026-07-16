import { Check, Link2, Plus, Unlink, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { CasePackage } from "@/schemas/case-package";

import styles from "./causal-caseboard.module.css";

type CausalNode = CasePackage["causalNodes"][number];
type CausalEdge = CasePackage["causalEdges"][number];

interface CausalLinkProposal {
  fromNodeId: string;
  toNodeId: string;
  verb: string;
}

interface CausalChainProps {
  nodes: CausalNode[];
  edges: CausalEdge[];
  placedIds: Set<string>;
  connectedIds: Set<string>;
  onToggleNode: (nodeId: string, placed: boolean) => void;
  onDisconnectEdge: (edgeId: string) => void;
  onProposeEdge: (proposal: CausalLinkProposal) => boolean;
  edgeNotices?: Partial<Record<string, { label: string; statement: string }>>;
}

function displayVerb(verb: string): string {
  return verb.replaceAll("_", " ");
}

export function CausalChain({
  nodes,
  edges,
  placedIds,
  connectedIds,
  onToggleNode,
  onDisconnectEdge,
  onProposeEdge,
  edgeNotices = {},
}: CausalChainProps) {
  const [fromNodeId, setFromNodeId] = useState("");
  const [toNodeId, setToNodeId] = useState("");
  const [verb, setVerb] = useState("");
  const [feedback, setFeedback] = useState("");
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const unorderedNodes = useMemo(
    () => [...nodes].sort((left, right) => left.label.localeCompare(right.label)),
    [nodes],
  );
  const placedNodes = unorderedNodes.filter((node) => placedIds.has(node.id));
  const relationOptions = [...new Set(edges.map((edge) => edge.verb))].sort();
  const connectedEdges = edges.filter((edge) => connectedIds.has(edge.id));
  const selectedEdge = edges.find(
    (edge) =>
      edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId && edge.verb === verb,
  );
  const selectedNotice = selectedEdge ? edgeNotices[selectedEdge.id] : undefined;

  function testLink() {
    const accepted = onProposeEdge({ fromNodeId, toNodeId, verb });
    if (accepted) {
      setFeedback(
        selectedNotice
          ? "Authored reconstruction recorded. Its historical limitation remains attached to the link."
          : "Evidence-linked relationship recorded.",
      );
      setFromNodeId("");
      setToNodeId("");
      setVerb("");
    } else {
      setFeedback(
        "That relationship is not supported by the reviewed record. Recheck the direction and causal verb.",
      );
    }
  }

  return (
    <section className={styles.chainBand} aria-labelledby="chain-heading">
      <div className={styles.sectionIntro}>
        <span>02</span>
        <div>
          <p className={styles.eyebrow}>Evidence-linked mechanism</p>
          <h2 id="chain-heading">Build a bounded chain</h2>
          <p>
            Place the relevant steps from this unordered evidence bank. Then test a cause,
            relationship, and effect against the authored case graph. Reconstruction-only links
            keep their limits visible.
          </p>
        </div>
      </div>

      <div className={styles.nodeBank} aria-label="Unordered causal step bank">
        {unorderedNodes.map((node, index) => {
          const placed = placedIds.has(node.id);
          return (
            <article className={placed ? styles.nodePlaced : styles.node} key={node.id}>
              <div className={styles.nodeNumber}>{String(index + 1).padStart(2, "0")}</div>
              <div>
                <span>{node.category}</span>
                <h3>{node.label}</h3>
              </div>
              <button
                aria-label={`${placed ? "Remove" : "Place"} ${node.label}`}
                aria-pressed={placed}
                onClick={() => onToggleNode(node.id, placed)}
                type="button"
              >
                {placed ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
                {placed ? "Remove" : "Place"}
              </button>
              {placed ? <Check className={styles.nodeCheck} aria-hidden="true" /> : null}
            </article>
          );
        })}
      </div>

      <section className={styles.linkBuilder} aria-labelledby="link-builder-heading">
        <div>
          <p className={styles.eyebrow}>Relationship test</p>
          <h3 id="link-builder-heading">Connect a supported link</h3>
        </div>
        <div className={styles.linkControls}>
          <label>
            <span>Cause</span>
            <select aria-label="Cause" onChange={(event) => setFromNodeId(event.target.value)} value={fromNodeId}>
              <option value="">Choose a placed step</option>
              {placedNodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
            </select>
          </label>
          <label>
            <span>Relationship</span>
            <select aria-label="Relationship" onChange={(event) => setVerb(event.target.value)} value={verb}>
              <option value="">Choose a causal verb</option>
              {relationOptions.map((option) => <option key={option} value={option}>{displayVerb(option)}</option>)}
            </select>
          </label>
          <label>
            <span>Effect</span>
            <select aria-label="Effect" onChange={(event) => setToNodeId(event.target.value)} value={toNodeId}>
              <option value="">Choose a placed step</option>
              {placedNodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
            </select>
          </label>
          <button
            disabled={!fromNodeId || !verb || !toNodeId}
            onClick={testLink}
            type="button"
          >
            <Link2 aria-hidden="true" />
            Test causal link
          </button>
        </div>
        {selectedNotice ? (
          <aside className={styles.edgeNotice}>
            <strong>{selectedNotice.label}</strong>
            <p>{selectedNotice.statement}</p>
          </aside>
        ) : null}
        {feedback ? <p className={styles.linkFeedback} role="status">{feedback}</p> : null}

        <div className={styles.connectedLinks}>
          <h4>Recorded links</h4>
          {connectedEdges.length === 0 ? (
            <p>Place and connect every supported step.</p>
          ) : (
            <ul>
              {connectedEdges.map((edge) => {
                const from = nodeById.get(edge.fromNodeId)!;
                const to = nodeById.get(edge.toNodeId)!;
                return (
                  <li key={edge.id}>
                    <span>{from.label}</span>
                    <div className={styles.relationMeta}>
                      <b>{displayVerb(edge.verb)}</b>
                      {edgeNotices[edge.id] ? <small>{edgeNotices[edge.id]?.label}</small> : null}
                    </div>
                    <span>{to.label}</span>
                    <button
                      aria-label={`Disconnect ${from.label} ${displayVerb(edge.verb)} ${to.label}`}
                      aria-pressed="true"
                      onClick={() => onDisconnectEdge(edge.id)}
                      type="button"
                    >
                      <Unlink aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </section>
  );
}
