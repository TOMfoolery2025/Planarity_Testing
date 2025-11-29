import { useState, useEffect } from 'react'

import './App.css'
import GraphViz from './components/GraphViz'

interface GraphData {
  is_planar: boolean
  nodes: Array<{ id: number | string; x: number; y: number; label: string }>
  edges: Array<{ source: number | string; target: number | string; is_conflict: boolean }>
}

interface Result {
  status: 'success' | 'error'
  data?: GraphData
  message?: string
}

const PRESETS = {
  K5: `0 1\n0 2\n0 3\n0 4\n1 2\n1 3\n1 4\n2 3\n2 4\n3 4`,
  K3_3: `0 3\n0 4\n0 5\n1 3\n1 4\n1 5\n2 3\n2 4\n2 5`,
  CAFFEINE: `CN1C=NC2=C1C(=O)N(C(=O)N2C)C`,
  PLANAR: `0 1\n1 2\n2 3\n3 0\n0 2`
}

function App() {
  // State for list of inputs
  const [inputs, setInputs] = useState<string[]>(['1 2\n2 3\n3 1'])
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  // Load results from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('planarity_results')
    if (saved) {
      try {
        setResults(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse saved results", e)
      }
    }
  }, [])

  // Save results to localStorage when they change
  useEffect(() => {
    if (results.length > 0) {
      localStorage.setItem('planarity_results', JSON.stringify(results))
    }
  }, [results])

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setResults([])
    setActiveTab(0)

    try {
      // Filter out empty inputs
      const validInputs = inputs.map(s => s.trim()).filter(s => s.length > 0)

      if (validInputs.length === 0) {
        setError("Please enter at least one graph.")
        setLoading(false)
        return
      }

      // Initialize results array with placeholders
      setResults(new Array(validInputs.length).fill(null))

      const response = await fetch('http://localhost:8000/process-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validInputs),
      })

      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')

        // Process all complete lines
        buffer = lines.pop() || '' // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const { index, result } = JSON.parse(line)
              setResults(prev => {
                const next = [...prev]
                next[index] = result
                return next
              })
            } catch (e) {
              console.error("Error parsing stream line:", line, e)
            }
          }
        }
      }

    } catch (err) {
      console.error(err)
      setError("Failed to fetch results. Ensure backend is running.")
    } finally {
      setLoading(false)
    }
  }

  const addInput = () => {
    setInputs([...inputs, ''])
  }

  const updateInput = (index: number, value: string) => {
    const newInputs = [...inputs]
    newInputs[index] = value
    setInputs(newInputs)
  }

  const removeInput = (index: number) => {
    const newInputs = inputs.filter((_, i) => i !== index)
    setInputs(newInputs.length ? newInputs : ['']) // Keep at least one
  }

  const loadPreset = (preset: string) => {
    // Add preset as a new input
    setInputs([...inputs, preset])
  }

  return (
    <div className="dashboard-container">
      <div className="left-panel">
        <h2>Input Batch</h2>
        <p style={{ fontSize: '0.9em', color: '#aaa' }}>
          Add multiple graphs to analyze them in parallel.<br />
          Formats: Edge List ("1 2"), SMILES ("C-C-O"), Adjacency Matrix ("[[0,1],[1,0]]").
        </p>

        <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <button style={{ fontSize: '0.8em', padding: '5px 10px', backgroundColor: '#444' }} onClick={() => loadPreset(PRESETS.PLANAR)}>+ Planar</button>
          <button style={{ fontSize: '0.8em', padding: '5px 10px', backgroundColor: '#444' }} onClick={() => loadPreset(PRESETS.K5)}>+ K5</button>
          <button style={{ fontSize: '0.8em', padding: '5px 10px', backgroundColor: '#444' }} onClick={() => loadPreset(PRESETS.K3_3)}>+ K3,3</button>
          <button style={{ fontSize: '0.8em', padding: '5px 10px', backgroundColor: '#444' }} onClick={() => loadPreset(PRESETS.CAFFEINE)}>+ Caffeine</button>
        </div>

        <div className="input-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
          {inputs.map((inp, idx) => (
            <div key={idx} style={{ position: 'relative', border: '1px solid #444', borderRadius: '8px', padding: '10px', background: '#222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.8em', color: '#888' }}>Graph {idx + 1}</span>
                <button
                  onClick={() => removeInput(idx)}
                  style={{ padding: '2px 8px', fontSize: '0.8em', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
              <textarea
                value={inp}
                onChange={(e) => updateInput(idx, e.target.value)}
                placeholder="Enter graph data..."
                style={{ width: '100%', height: '100px', background: '#1a1a1a', border: '1px solid #333', color: '#fff', resize: 'vertical' }}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <button onClick={addInput} style={{ flex: 1, background: '#444' }}>+ Add Graph</button>
          <button onClick={handleAnalyze} disabled={loading} style={{ flex: 2 }}>
            {loading ? 'Analyzing...' : 'Analyze Batch'}
          </button>
        </div>

        {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
      </div>

      <div className="right-panel">
        <h2>Results</h2>
        {results.length > 0 ? (
          <>
            <div className="tabs">
              {results.map((res, idx) => {
                const isPlanar = res.status === 'success' && res.data?.is_planar
                const isError = res.status === 'error'
                let tabClass = 'tab'
                if (idx === activeTab) tabClass += ' active'
                if (isError) tabClass += ' error'
                else if (isPlanar) tabClass += ' planar'
                else tabClass += ' non-planar'

                return (
                  <div
                    key={idx}
                    className={tabClass}
                    onClick={() => setActiveTab(idx)}
                  >
                    Graph {idx + 1} {isError ? '⚠️' : (isPlanar ? '✅' : '❌')}
                  </div>
                )
              })}
            </div>


            <div className="result-content">
              {results[activeTab] && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {results[activeTab].status === 'success' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div className={`status-badge ${results[activeTab].data?.is_planar ? 'status-planar' : 'status-non-planar'}`}>
                          {results[activeTab].data?.is_planar ? 'PLANAR' : 'NON-PLANAR'}
                        </div>
                        <div style={{ fontSize: '0.9em', color: '#aaa' }}>
                          Nodes: {results[activeTab].data?.nodes.length} | Edges: {results[activeTab].data?.edges.length}
                        </div>
                      </div>

                      <div style={{ flex: 1, minHeight: 0 }}>
                        {results[activeTab].data && (
                          <GraphViz
                            nodes={results[activeTab].data.nodes}
                            edges={results[activeTab].data.edges}
                            width={800}
                            height={600}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="status-badge status-error">ERROR</div>
                      <p>{results[activeTab].message}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
            No results to display. Run analysis to see results.
          </div>
        )}
      </div>
    </div>
  )
}

export default App
