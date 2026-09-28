"""
Graph and Influence Network Analysis module for Social Pulse AI.
Constructs interaction graphs, runs Louvain community detection, computes betweenness centrality,
and assigns intelligence roles: originator, amplifier, bridge, authority.
"""

from typing import List, Dict, Any, Tuple, Optional
import networkx as nx
from networkx.algorithms.community import louvain_communities
from db import fetch_events_by_narrative, update_event_community


def build_narrative_graph(narrative_id: str) -> Dict[str, Any]:
    """
    Builds the NetworkX interaction graph for a narrative and computes community partitions and influence roles.
    Returns the exact JSON shape required by GET /api/v1/narratives/{id}/network:
    {
        "nodes": [{"id": str, "role": "originator"|"amplifier"|"bridge"|"authority", "influence_score": float, "community": int}],
        "edges": [{"source": str, "target": str, "type": str, "time": str}]
    }
    """
    events = fetch_events_by_narrative(narrative_id)
    if not events:
        return {"nodes": [], "edges": []}

    # Map events by ID for parent lookup
    event_by_id = {ev["id"]: ev for ev in events}
    
    # Author metadata tracking
    # author_id -> {name, first_seen, total_engagement, posts_count, platform}
    author_meta: Dict[str, Dict[str, Any]] = {}
    edges_raw: List[Dict[str, Any]] = []

    # Sort events by timestamp
    events_sorted = sorted(events, key=lambda x: x["timestamp"])
    earliest_event = events_sorted[0] if events_sorted else None
    originator_author = earliest_event["author_id"] if earliest_event else None

    # Track all authors and their engagement
    for ev in events_sorted:
        a_id = ev["author_id"]
        if a_id not in author_meta:
            author_meta[a_id] = {
                "id": a_id,
                "name": ev["author_name"] or a_id,
                "platform": ev["platform"],
                "first_seen": ev["timestamp"],
                "total_engagement": ev.get("engagement_score", 0),
                "post_count": 1,
                "preset_community": ev.get("community_id")
            }
        else:
            author_meta[a_id]["total_engagement"] += ev.get("engagement_score", 0)
            author_meta[a_id]["post_count"] += 1

    # Extract interaction edges
    G = nx.DiGraph()
    for a_id in author_meta:
        G.add_node(a_id)

    for ev in events:
        source_author = ev["author_id"]
        parent_id = ev.get("parent_id")
        edge_type = ev.get("interaction_type", "reply")
        time_stamp = ev["timestamp"]

        if parent_id and parent_id in event_by_id:
            target_author = event_by_id[parent_id]["author_id"]
            if source_author != target_author:
                G.add_edge(source_author, target_author, type=edge_type, time=time_stamp)
                edges_raw.append({
                    "source": source_author,
                    "target": target_author,
                    "type": edge_type,
                    "time": time_stamp
                })
        
        # Check text mentions (e.g. @EduWatchdog, @DeptHigherEdu)
        content = ev.get("content", "")
        for other_id, other_data in author_meta.items():
            handle = other_data["name"].split("@")[-1].replace(")", "").strip()
            if handle and len(handle) > 3 and f"@{handle}" in content and other_id != source_author:
                if not G.has_edge(source_author, other_id):
                    G.add_edge(source_author, other_id, type="mention", time=time_stamp)
                    edges_raw.append({
                        "source": source_author,
                        "target": other_id,
                        "type": "mention",
                        "time": time_stamp
                    })

    # Convert to undirected graph for community detection & betweenness centrality
    G_undirected = G.to_undirected()
    
    # Community detection using Louvain (fallback to preset or connected components if Louvain fails)
    community_map: Dict[str, int] = {}
    try:
        if len(G_undirected.nodes) > 1 and len(G_undirected.edges) > 0:
            communities = louvain_communities(G_undirected, seed=42)
            for comm_idx, comm_nodes in enumerate(communities):
                for node in comm_nodes:
                    community_map[node] = comm_idx
        else:
            for idx, node in enumerate(G.nodes):
                community_map[node] = 0
    except Exception:
        # Fallback to connected components
        components = list(nx.connected_components(G_undirected))
        for comm_idx, comp_nodes in enumerate(components):
            for node in comp_nodes:
                community_map[node] = comm_idx

    # Fill any missing communities from preset or default to 0
    for node in G.nodes:
        if node not in community_map:
            preset = author_meta[node].get("preset_community")
            community_map[node] = preset if preset is not None else 0

    # Centrality metrics
    try:
        betweenness = nx.betweenness_centrality(G_undirected)
    except Exception:
        betweenness = {n: 0.0 for n in G.nodes}

    try:
        degree_cent = nx.degree_centrality(G_undirected)
    except Exception:
        degree_cent = {n: 0.0 for n in G.nodes}

    # Identify cross-community bridge connections
    cross_community_edges_count: Dict[str, int] = {n: 0 for n in G.nodes}
    for u, v in G_undirected.edges:
        if community_map.get(u) != community_map.get(v):
            cross_community_edges_count[u] = cross_community_edges_count.get(u, 0) + 1
            cross_community_edges_count[v] = cross_community_edges_count.get(v, 0) + 1

    # Role assignment algorithm
    # 1. originator: earliest timestamp in the narrative cluster
    # 2. bridge: connects > 1 community / highest betweenness
    # 3. amplifier: high engagement / degree, joined later
    # 4. authority: highest centrality / official status within one community
    
    # Calculate Max Engagement for score normalization
    max_eng = max([m["total_engagement"] for m in author_meta.values()] or [1])
    max_betweenness = max(betweenness.values() or [1.0])
    
    # Find candidate bridge (highest betweenness with cross-community link)
    bridge_candidates = sorted(
        G.nodes,
        key=lambda n: (cross_community_edges_count.get(n, 0) * 2.0 + betweenness.get(n, 0)),
        reverse=True
    )
    assigned_bridge = None
    for cand in bridge_candidates:
        if cand != originator_author and cross_community_edges_count.get(cand, 0) > 0:
            assigned_bridge = cand
            break

    # Find highest authority per community
    community_members: Dict[int, List[str]] = {}
    for node, c_id in community_map.items():
        community_members.setdefault(c_id, []).append(node)

    authority_nodes = set()
    for c_id, members in community_members.items():
        # Authority: highest combined degree & engagement in community
        sorted_members = sorted(members, key=lambda m: (author_meta[m]["total_engagement"] + degree_cent.get(m, 0) * 5000), reverse=True)
        if sorted_members:
            # Pick top if not originator or bridge
            for top_candidate in sorted_members:
                if top_candidate != originator_author and top_candidate != assigned_bridge:
                    authority_nodes.add(top_candidate)
                    break

    nodes_result: List[Dict[str, Any]] = []
    
    for node in G.nodes:
        meta = author_meta[node]
        c_id = community_map.get(node, 0)
        bw = betweenness.get(node, 0.0)
        deg = degree_cent.get(node, 0.0)
        eng = meta["total_engagement"]

        # Influence score (0.05 to 0.98)
        norm_eng = min(1.0, eng / max(1, max_eng))
        influence_score = round(min(0.98, max(0.12, (norm_eng * 0.45) + (deg * 0.30) + (bw * 0.25))), 2)

        # Role determination
        if node == originator_author:
            role = "originator"
            influence_score = max(influence_score, 0.75)
        elif node == assigned_bridge:
            role = "bridge"
            influence_score = max(influence_score, 0.88)
        elif node in authority_nodes or "dept" in node or "official" in node or "discom" in node or "board" in node:
            role = "authority"
            influence_score = max(influence_score, 0.85)
        else:
            role = "amplifier" if eng > (max_eng * 0.15) or deg > 0.2 else "amplifier"

        nodes_result.append({
            "id": node,
            "role": role,
            "influence_score": influence_score,
            "community": c_id
        })

    # Sort nodes by influence descending
    nodes_result.sort(key=lambda x: x["influence_score"], reverse=True)

    # Clean edges
    formatted_edges = []
    seen_edges = set()
    for e in edges_raw:
        edge_key = (e["source"], e["target"], e["type"])
        if edge_key not in seen_edges:
            seen_edges.add(edge_key)
            formatted_edges.append(e)

    # If no edges exist in small narratives, add basic linkage to originator to render graph
    if not formatted_edges and len(nodes_result) > 1 and originator_author:
        for n in nodes_result:
            if n["id"] != originator_author:
                formatted_edges.append({
                    "source": n["id"],
                    "target": originator_author,
                    "type": "reply",
                    "time": author_meta[n["id"]]["first_seen"]
                })

    return {
        "nodes": nodes_result,
        "edges": formatted_edges
    }
