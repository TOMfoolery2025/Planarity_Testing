import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import GraphViz from '../components/GraphViz';
import FileUploader from '../components/FileUploader';

interface Result {
    status: 'success' | 'error'
    data?: {
        is_planar: boolean
        nodes: Array<{ id: number | string; x: number; y: number; label: string }>
        edges: Array<{ source: number | string; target: number | string; is_conflict: boolean }>
        k5_count?: number
        k33_count?: number
        execution_time?: number
        result_source?: 'Compute' | 'Cache'
    }
    message?: string
}

// Presets
const PRESETS = {
    "K5 (Non-Planar)": "0 1\n0 2\n0 3\n0 4\n1 2\n1 3\n1 4\n2 3\n2 4\n3 4",
    "K3,3 (Non-Planar)": "0 3\n0 4\n0 5\n1 3\n1 4\n1 5\n2 3\n2 4\n2 5",
    "Planar Example": "0 1\n1 2\n2 0\n0 3\n3 4",
    "Caffeine (Planar)": "C1 N1\nC1 N2\nC1 O1\nN1 C2\nN1 C3\nC2 N3\nC2 O2\nN3 C4\nN3 C5\nC4 N2\nC4 N4\nN4 C1\nN4 C6\nC5 H1\nC5 H2\nC5 H3\nC3 H4\nC3 H5\nC3 H6\nC6 H7\nC6 H8\nC6 H9"
};

const Home: React.FC = () => {
    const [inputs, setInputs] = useState<string[]>([""]);
    const [results, setResults] = useState<(Result | null)[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const savedInputs = localStorage.getItem('graphInputs');
        if (savedInputs) {
            setInputs(JSON.parse(savedInputs));
        }
        const savedResults = localStorage.getItem('graphResults');
        if (savedResults) {
            try {
                setResults(JSON.parse(savedResults));
            } catch (e) {
                console.error("Failed to parse saved results", e);
                setResults([]);
            }
        }
    }, []);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('graphInputs', JSON.stringify(inputs));
    }, [inputs]);

    useEffect(() => {
        localStorage.setItem('graphResults', JSON.stringify(results));
    }, [results]);

    const handleInputChange = (index: number, value: string) => {
        const newInputs = [...inputs];
        newInputs[index] = value;
        setInputs(newInputs);
    };

    const addInputCard = () => {
        setInputs([...inputs, ""]);
        setResults([...results, null]);
        setActiveTab(inputs.length);
    };

    const removeInputCard = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (inputs.length === 1) {
            setInputs([""]);
            setResults([null]);
            setActiveTab(0);
            return;
        }
        const newInputs = inputs.filter((_, i) => i !== index);
        const newResults = results.filter((_, i) => i !== index);
        setInputs(newInputs);
        setResults(newResults);
        if (activeTab >= newInputs.length) {
            setActiveTab(newInputs.length - 1);
        }
    };

    const loadPreset = (index: number, presetName: keyof typeof PRESETS) => {
        handleInputChange(index, PRESETS[presetName]);
    };

    const processBatch = async () => {
        setIsProcessing(true);
        setResults(new Array(inputs.length).fill(null)); // Clear previous results

        try {
            const validInputs = inputs.map(s => s.trim()).filter(s => s.length > 0);

            if (validInputs.length === 0) {
                setResults([]);
                setIsProcessing(false);
                return;
            }

            const response = await fetch('http://127.0.0.1:8000/process-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validInputs)
            });

            if (!response.body) {
                throw new Error("ReadableStream not supported in this browser.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        setResults(prev => {
                            const newRes = [...prev];
                            newRes[data.index] = data.result;
                            return newRes;
                        });
                    } catch (e) {
                        console.error("Error parsing JSON:", e);
                    }
                }
            }
        } catch (error) {
            console.error("Error processing batch:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const scrollToDashboard = () => {
        dashboardRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="page-container" style={{ maxWidth: '100%', padding: 0, overflowY: 'auto', overflowX: 'hidden' }}>
            {/* Hero Section */}
            <section style={{
                height: '90vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: '0 20px'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 style={{
                        fontSize: '5rem',
                        fontWeight: 800,
                        marginBottom: '20px',
                        lineHeight: 1.1,
                        background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Planarity Testing <br />
                        <span style={{
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>Reimagined</span>
                    </h1>
                    <p style={{
                        fontSize: '1.2rem',
                        color: 'var(--text-secondary)',
                        maxWidth: '600px',
                        margin: '0 auto 40px'
                    }}>
                        Advanced graph analysis powered by parallel processing and 3D visualization.
                        Detect planarity, find Kuratowski subgraphs, and visualize chemical compounds instantly.
                    </p>
                    <button
                        className="btn-connect"
                        style={{ fontSize: '1.1rem', padding: '16px 40px' }}
                        onClick={scrollToDashboard}
                    >
                        Start Analyzing
                    </button>
                </motion.div>
            </section>

            {/* Dashboard Section */}
            <div ref={dashboardRef} className="dashboard-container">
                <motion.div
                    className="left-panel"
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0 }}>Input Graphs</h2>
                        <button className="btn-secondary" onClick={addInputCard} title="Add new graph">+</button>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <FileUploader onFilesLoaded={(files: { name: string; content: string }[]) => {
                            const newInputs: string[] = [];
                            files.forEach(file => {
                                try {
                                    const parsed = JSON.parse(file.content);
                                    if (Array.isArray(parsed)) {
                                        // Array of graphs
                                        parsed.forEach(item => {
                                            if (typeof item === 'string') newInputs.push(item);
                                            else if (typeof item === 'object' && item.edges) {
                                                // Handle object with edges property
                                                if (Array.isArray(item.edges)) {
                                                    // Convert edge list array to string
                                                    const edgeString = item.edges.map((e: any) => {
                                                        if (Array.isArray(e)) return `${e[0]} ${e[1]}`;
                                                        if (typeof e === 'object') return `${e.source} ${e.target}`;
                                                        return String(e);
                                                    }).join('\n');
                                                    newInputs.push(edgeString);
                                                }
                                            }
                                        });
                                    } else if (typeof parsed === 'object' && parsed.edges) {
                                        // Single graph object
                                        if (Array.isArray(parsed.edges)) {
                                            const edgeString = parsed.edges.map((e: any) => {
                                                if (Array.isArray(e)) return `${e[0]} ${e[1]}`;
                                                if (typeof e === 'object') return `${e.source} ${e.target}`;
                                                return String(e);
                                            }).join('\n');
                                            newInputs.push(edgeString);
                                        }
                                    }
                                } catch (e) {
                                    // Not JSON, treat as raw text
                                    if (file.content.trim()) {
                                        newInputs.push(file.content);
                                    }
                                }
                            });

                            if (newInputs.length > 0) {
                                setInputs(prev => {
                                    // Filter out empty initial input if it exists
                                    const filteredPrev = prev.length === 1 && !prev[0].trim() ? [] : prev;
                                    return [...filteredPrev, ...newInputs];
                                });
                                setResults(prev => {
                                    const filteredPrev = prev.length === 1 && !inputs[0].trim() ? [] : prev;
                                    return [...filteredPrev, ...new Array(newInputs.length).fill(null)];
                                });
                                setActiveTab(prev => {
                                    const filteredPrevLen = inputs.length === 1 && !inputs[0].trim() ? 0 : inputs.length;
                                    return filteredPrevLen; // Switch to first new tab
                                });
                            }
                        }} />
                    </div>

                    <div className="tabs">
                        {inputs.map((_, idx) => {
                            const result = results[idx];
                            const isError = result?.status === 'error';
                            const isPlanar = result?.status === 'success' && result?.data?.is_planar;
                            // eslint-disable-next-line no-nested-ternary
                            const tabClass = `tab ${activeTab === idx ? 'active' : ''} ${isError ? 'error' : (isPlanar ? 'planar' : (result ? 'non-planar' : ''))}`;

                            return (
                                <div
                                    key={idx}
                                    className={tabClass}
                                    onClick={() => setActiveTab(idx)}
                                >
                                    Graph {idx + 1} {isError ? '⚠️' : (isPlanar ? '✅' : (result ? '❌' : ''))}
                                    {inputs.length > 1 && (
                                        <span className="btn-remove" style={{ marginLeft: '8px' }} onClick={(e) => removeInputCard(idx, e)}>×</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="input-card">
                        <textarea
                            className="input-textarea"
                            value={inputs[activeTab]}
                            onChange={(e) => handleInputChange(activeTab, e.target.value)}
                            placeholder="Enter edges (e.g., '0 1\n1 2') or SMILES string..."
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {Object.keys(PRESETS).map((preset) => (
                                <button
                                    key={preset}
                                    className="btn-preset"
                                    onClick={() => loadPreset(activeTab, preset as keyof typeof PRESETS)}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                        <button
                            className="btn-primary"
                            style={{ width: '100%' }}
                            onClick={processBatch}
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Processing...' : 'Analyze All Graphs'}
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    className="right-panel"
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    {results[activeTab] ? (
                        results[activeTab]?.status === 'success' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <div>
                                        <span className={`status-badge ${results[activeTab]?.data?.is_planar ? 'status-planar' : 'status-non-planar'}`}>
                                            {results[activeTab]?.data?.is_planar ? 'PLANAR' : 'NON-PLANAR'}
                                        </span>
                                        {!results[activeTab]?.data?.is_planar && (
                                            <span style={{ marginLeft: '10px', color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                                                (K5: {results[activeTab]?.data?.k5_count}, K3,3: {results[activeTab]?.data?.k33_count})
                                            </span>
                                        )}
                                        <div style={{ fontSize: '0.8em', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                            Time: {results[activeTab]?.data?.execution_time?.toFixed(4)}s | Source: {results[activeTab]?.data?.result_source || 'Unknown'}
                                        </div>
                                    </div>
                                    <button
                                        className="btn-secondary"
                                        style={{ fontSize: '0.9rem', padding: '6px 12px' }}
                                        onClick={() => {
                                            const data = results[activeTab]?.data;
                                            if (!data) return;
                                            // @ts-ignore
                                            const cert = data.certificate || { error: "Certificate not found" };
                                            if (data.execution_time !== undefined) {
                                                // @ts-ignore
                                                cert.execution_time = data.execution_time;
                                                // @ts-ignore
                                                cert.execution_time_unit = "seconds";
                                            }
                                            if (data.result_source) {
                                                // @ts-ignore
                                                cert.result_source = data.result_source;
                                            }
                                            const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `certificate_graph_${activeTab + 1}.json`;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                        }}
                                    >
                                        Download Certificate 📜
                                    </button>
                                </div>

                                <div className="result-content" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                                    <GraphViz
                                        nodes={results[activeTab]?.data?.nodes || []}
                                        edges={results[activeTab]?.data?.edges || []}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="result-content">
                                <h3 style={{ color: 'var(--error)' }}>Error</h3>
                                <p>{results[activeTab]?.message}</p>
                            </div>
                        )
                    ) : (
                        <div className="result-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            {isProcessing ? 'Processing...' : 'Enter a graph and click Analyze to see results'}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default Home;
