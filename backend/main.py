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

@app.post("/process-batch")
async def process_batch(inputs: List[str] = Body(...)):
    """
    Process a batch of graph strings.
    Streams results as NDJSON (Newline Delimited JSON).
    """
    async def process_generator():
        # 1. Identify Cache Hits vs Misses
        misses_indices = []
        misses_inputs = []
        
        # We need to yield results in order or out of order?
        # The prompt implies "as soon as graphs are ready", so out-of-order is fine/better for responsiveness.
        # But the frontend assumes index matching?
        # Let's yield objects with "index" to allow frontend to place them correctly.
        
        # First, yield cache hits immediately
        for i, inp in enumerate(inputs):
            h = hashlib.sha256(inp.encode("utf-8")).hexdigest()
            if h in RESULT_CACHE:
                yield json.dumps({"index": i, "result": RESULT_CACHE[h]}) + "\n"
            else:
                misses_indices.append(i)
                misses_inputs.append(inp)

        # 2. Process Misses in Parallel
        if misses_inputs:
            loop = asyncio.get_running_loop()
            tasks = []
            
            # Create tasks mapping to their original index
            for i, inp in zip(misses_indices, misses_inputs):
                # We wrap the executor call to include the index in the return
                task = loop.run_in_executor(executor, process_graph_task, inp)
                tasks.append((i, inp, task))
            
            # Wait for tasks as they complete
            pending = [t[2] for t in tasks]
            task_map = {t[2]: (t[0], t[1]) for t in tasks} # task -> (index, input)
            
            for completed_task in asyncio.as_completed(pending):
                result = await completed_task
                
                # Find which index this result belongs to
                # asyncio.as_completed yields futures, we need to match them? 
                # Actually as_completed yields a new future that resolves to the result.
                # It doesn't give us the original future object easily to map back.
                
                # Better approach: Wrap the task function itself to return index
                pass 

    # Refined Generator Approach
    async def result_generator():
        # 1. Cache Hits
        misses = []
        for i, inp in enumerate(inputs):
            h = hashlib.sha256(inp.encode("utf-8")).hexdigest()
            if h in RESULT_CACHE:
                yield json.dumps({"index": i, "result": RESULT_CACHE[h]}) + "\n"
            else:
                misses.append((i, inp))
        
        # 2. Cache Misses
        if misses:
            loop = asyncio.get_running_loop()
            
            # Define a wrapper to keep track of index
            def run_task_with_index(index, inp):
                res = process_graph_task(inp)
                return index, inp, res

            tasks = [
                loop.run_in_executor(executor, run_task_with_index, i, inp)
                for i, inp in misses
            ]
            
            for coro in asyncio.as_completed(tasks):
                index, inp, res = await coro
                
                # Update Cache
                h = hashlib.sha256(inp.encode("utf-8")).hexdigest()
                RESULT_CACHE[h] = res
                
                yield json.dumps({"index": index, "result": res}) + "\n"

    return StreamingResponse(result_generator(), media_type="application/x-ndjson")
