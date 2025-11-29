import networkx as nx

def analyze_graph(G: nx.Graph) -> dict:
    """
    Analyzes the graph for planarity and generates a layout.
    Returns a dictionary with nodes, edges, and planarity status.
    """
    is_planar, certificate = nx.check_planarity(G, counterexample=True)
    
    conflict_edges = set()
    if not is_planar:
        # certificate is the counterexample subgraph (Kuratowski subgraph)
        for u, v in certificate.edges():
            conflict_edges.add(tuple(sorted((u, v))))
        # Use spring layout for non-planar graphs
        pos = nx.spring_layout(G, seed=42)
    else:
        # Use planar layout for planar graphs
        try:
            pos = nx.planar_layout(G)
        except nx.NetworkXException:
            # Fallback if planar_layout fails for some reason (e.g. disconnected components sometimes behave oddly if not handled)
            # But planar_layout should handle disconnected graphs by laying out components.
            pos = nx.spring_layout(G, seed=42)

    # Serialize the certificate
    certificate_data = {}
    if is_planar:
        # Planar Embedding: Rotation system (neighbors in clockwise order)
        # certificate is a PlanarEmbedding object (inherits from DiGraph)
        # We can represent it as a dict of lists
        for node in certificate.nodes():
            certificate_data[node] = list(certificate.neighbors(node))
    else:
        # Non-Planar: Kuratowski subgraph (counterexample)
        # certificate is a Graph object
        certificate_data = {
            "type": "Kuratowski Subgraph",
            "edges": list(certificate.edges())
        }

    nodes = []
    for node in G.nodes():
        # pos[node] is a numpy array or list [x, y]
        x, y = pos[node]
        # Get label if exists, else use node ID
        label = str(G.nodes[node].get('label', node))
        nodes.append({
            "id": node,
            "x": float(x),
            "y": float(y),
            "label": label
        })
        
    edges = []
    for u, v in G.edges():
        # Check if this edge is in the conflict set
        is_conflict = tuple(sorted((u, v))) in conflict_edges
        edges.append({
            "source": u,
            "target": v,
            "is_conflict": is_conflict
        })
        
    return {
        "is_planar": is_planar,
        "nodes": nodes,
        "edges": edges,
        "certificate": certificate_data
    }
