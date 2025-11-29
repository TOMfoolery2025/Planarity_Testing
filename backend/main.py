from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import hashlib
import asyncio
from concurrent.futures import ProcessPoolExecutor
from app.worker import process_graph_task

app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global cache for graph analysis results
# Key: SHA256 hash of input string
# Value: Result dictionary
RESULT_CACHE: Dict[str, Any] = {}

# Global executor
executor = ProcessPoolExecutor()

@app.on_event("shutdown")
def shutdown_event():
    executor.shutdown()

@app.get("/")
def read_root():
    return {"Hello": "World"}

from fastapi.responses import StreamingResponse
import json

import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def async_check_cache(h: str):
    """Simulate an async cache lookup."""
    # In a real scenario (Redis), this would be await redis.get(h)
    # For local dict, it's instant, but we wrap it to treat it as a task.
    return RESULT_CACHE.get(h)

@app.post("/process-batch")
async def process_batch(inputs: List[str] = Body(...)):
    """
    Process a batch of graph strings.
    Streams results as NDJSON.
    """
    loop = asyncio.get_running_loop()
    
    # Deduplicate compute tasks
    unique_computes = {} # hash -> Future

    async def race_for_input(index: int, inp: str):
        start_time = time.time()
        h = hashlib.sha256(inp.encode("utf-8")).hexdigest()
        
        # 1. Get or create compute task (Deduplicated)
        if h not in unique_computes:
            unique_computes[h] = loop.run_in_executor(executor, process_graph_task, inp)
        compute_future = unique_computes[h]
        
        # 2. Create tasks
        cache_task = asyncio.create_task(async_check_cache(h))
        compute_task = asyncio.ensure_future(compute_future)
        
        # 3. Race them
        # We wait for FIRST_COMPLETED.
        # Note: compute_task is a Future from run_in_executor, which is awaitable.
        done, pending = await asyncio.wait(
            [cache_task, compute_task], 
            return_when=asyncio.FIRST_COMPLETED
        )
        
        res = None
        winner = "Unknown"
        
        # Check if Cache won (and actually had a hit)
        if cache_task in done:
            res = cache_task.result()
            if res is not None:
                winner = "Cache"
            else:
                # Cache missed, so we must wait for compute
                res = await compute_task
                winner = "Compute"
                # Update cache
                RESULT_CACHE[h] = res
        else:
            # Compute finished first (or cache is still pending?? unlikely for local dict)
            # If compute finished, we use it.
            res = await compute_task
            winner = "Compute"
            # Update cache
            RESULT_CACHE[h] = res
            
        duration = time.time() - start_time
        logger.info(f"Graph {index}: {winner} won in {duration:.4f}s")
        
        if res and isinstance(res, dict):
            if "data" in res and isinstance(res["data"], dict):
                res["data"]["execution_time"] = duration
                res["data"]["result_source"] = winner
            else:
                res["execution_time"] = duration
                res["result_source"] = winner

        return json.dumps({"index": index, "result": res}) + "\n"

    async def result_generator():
        tasks = [race_for_input(i, inp) for i, inp in enumerate(inputs)]
        for coro in asyncio.as_completed(tasks):
            yield await coro

    return StreamingResponse(result_generator(), media_type="application/x-ndjson")

# Drug Discovery Endpoint
from app.drug_discovery import analyze_molecule, generate_llm_response
from pydantic import BaseModel

from typing import Union

class DrugDiscoveryRequest(BaseModel):
    smiles: Union[str, List[str]] = None
    message: str

@app.post("/drug-discovery/chat")
async def drug_discovery_chat(request: DrugDiscoveryRequest):
    """
    Analyzes a molecule (or list of molecules) and provides an LLM response.
    Handles high concurrency by offloading CPU tasks to executor.
    """
    loop = asyncio.get_running_loop()
    
    analysis = None
    if request.smiles:
        if isinstance(request.smiles, str) and request.smiles.strip():
            # Single SMILES
            analysis = await loop.run_in_executor(executor, analyze_molecule, request.smiles)
        elif isinstance(request.smiles, list) and len(request.smiles) > 0:
            # Batch SMILES
            # Run all analyses in parallel
            tasks = [loop.run_in_executor(executor, analyze_molecule, s) for s in request.smiles if s.strip()]
            if tasks:
                analysis = await asyncio.gather(*tasks)
    
    # 2. Generate LLM response (I/O bound) -> Async await
    llm_response = await generate_llm_response(analysis, request.message)
    
    return {
        "analysis": analysis,
        "response": llm_response
    }
