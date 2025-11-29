from app.parser import GraphParser
from app.engine import analyze_graph
import networkx as nx
import os

def process_graph_task(input_str: str):
    try:
        # Log process ID
        pid = os.getpid()
        print(f"[Process {pid}] Starting analysis for graph: {input_str[:30]}...")
        
        # Parse the graph
        graph = GraphParser.parse(input_str)
        
        # Analyze the graph
        result = analyze_graph(graph)
        
        return {"status": "success", "data": result}
    except Exception as e:
        print(f"[Process {os.getpid()}] Error: {e}")
        return {"status": "error", "message": str(e)}
