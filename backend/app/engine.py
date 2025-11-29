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

    # Calculate biconnected components count and extract subgraphs
    biconnected_subgraphs = []
    try:
        components = list(nx.biconnected_components(G))
        num_biconnected = len(components)
        
        for i, comp_nodes in enumerate(components):
            # Create subgraph
            subgraph = G.subgraph(comp_nodes).copy()
            
            # Serialize subgraph nodes (keep original positions)
            sub_nodes = []
            for node in subgraph.nodes():
                x, y = pos[node]
                label = str(G.nodes[node].get('label', node))
                sub_nodes.append({
                    "id": node,
                    "x": float(x),
                    "y": float(y),
                    "label": label
                })
            
            # Serialize subgraph edges
            sub_edges = []
            for u, v in subgraph.edges():
                # Check conflict in context of original graph (though subgraph might be planar itself)
                is_conflict = tuple(sorted((u, v))) in conflict_edges
                sub_edges.append({
                    "source": u,
                    "target": v,
                    "is_conflict": is_conflict
                })
                
            biconnected_subgraphs.append({
                "id": i,
                "nodes": sub_nodes,
                "edges": sub_edges
            })
            
    except Exception as e:
        print(f"Error calculating biconnected components: {e}")
        num_biconnected = 0
        biconnected_subgraphs = []
        
    return {
        "is_planar": is_planar,
        "nodes": nodes,
        "edges": edges,
        "certificate": certificate_data,
        "biconnected_components": num_biconnected,
        "biconnected_subgraphs": biconnected_subgraphs
    }
