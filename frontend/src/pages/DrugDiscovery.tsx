import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MoleculeViewer from '../components/MoleculeViewer';
import FileUploader from '../components/FileUploader';
import './DrugDiscovery.css'; // We'll create this for specific styles

interface AnalysisResult {
    valid: boolean;
    smiles: string;
    properties?: {
        molecular_weight: number;
        logp: number;
        hbd: number;
        hba: number;
        tpsa: number;
        rotatable_bonds: number;
    };
    lipinski?: {
        violations: number;
        passes: boolean;
    };
    structure_3d?: {
        atoms: any[];
        bonds: any[];
    };
    error?: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    analysis?: AnalysisResult | AnalysisResult[];
}

const DrugDiscovery: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hello! I'm your AI Research Scientist. Provide a SMILES string and ask me anything about it." }
    ]);
    const [input, setInput] = useState('');
    const [smilesInput, setSmilesInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input;
        let currentSmiles: string | string[] = smilesInput;

        // Try to parse as JSON array
        try {
            const parsed = JSON.parse(smilesInput);
            if (Array.isArray(parsed)) {
                currentSmiles = parsed;
            }
        } catch (e) {
            // Not JSON, treat as single string
        }

        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:8000/drug-discovery/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smiles: currentSmiles, message: userMessage }),
            });

            const data = await response.json();

            // Handle Batch Analysis
            if (Array.isArray(data.analysis)) {
                // If batch, set the first valid one as current for 3D view, or just null
                const firstValid = data.analysis.find((a: any) => a.valid);
                if (firstValid) {
                    setCurrentAnalysis(firstValid);
                }
            } else if (data.analysis && data.analysis.valid) {
                setCurrentAnalysis(data.analysis);
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response,
                analysis: data.analysis // Can be object or array
            }]);
        } catch (error) {
            console.error("Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error processing your request." }]);
        } finally {
            setLoading(false);
        }
    };

    const runStressTest = async () => {
        const aspirin = "CC(=O)OC1=CC=CC=C1C(=O)O";
        const requests = Array(100).fill(null).map((_, i) =>
            fetch('http://127.0.0.1:8000/drug-discovery/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smiles: aspirin, message: `Stress test request ${i}` }),
            }).then(res => res.json())
        );

        console.log("Starting stress test...");
        const start = performance.now();
        await Promise.all(requests);
        const end = performance.now();
        console.log(`Stress test completed in ${(end - start).toFixed(2)}ms`);
        alert(`Stress test completed in ${(end - start).toFixed(2)}ms. Check console for details.`);
    };

    return (
        <div className="dd-container">
            <div className="dd-sidebar">
                <h2>Drug Discovery</h2>
                <p>AI-Powered Molecular Analysis</p>

                <div className="input-group">
                    <label>Target Molecule(s) (SMILES)</label>
                    <FileUploader onFilesLoaded={(files: { name: string; content: string }[]) => {
                        const allSmiles: string[] = [];
                        files.forEach(file => {
                            try {
                                const parsed = JSON.parse(file.content);
                                if (Array.isArray(parsed)) {
                                    allSmiles.push(...parsed);
                                } else if (typeof parsed === 'object' && parsed.smiles) {
                                    // Handle object with smiles property if needed, but simple array is priority
                                    if (Array.isArray(parsed.smiles)) {
                                        allSmiles.push(...parsed.smiles);
                                    } else {
                                        allSmiles.push(parsed.smiles);
                                    }
                                }
                            } catch (e) {
                                // If not JSON, maybe it's a raw text list?
                                // For now, let's assume JSON array as requested
                            }
                        });
                        if (allSmiles.length > 0) {
                            setSmilesInput(JSON.stringify(allSmiles, null, 2));
                        }
                    }} />
                    <textarea
                        value={smilesInput}
                        onChange={(e) => setSmilesInput(e.target.value)}
                        placeholder="e.g. CC(=O)OC1=CC=CC=C1C(=O)O or JSON array"
                        style={{ height: '100px', width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '8px', marginTop: '10px' }}
                    />
                </div>

                {currentAnalysis && currentAnalysis.structure_3d && (
                    <div className="molecule-viewer-container">
                        <h3>3D Structure: {currentAnalysis.smiles.slice(0, 15)}...</h3>
                        <MoleculeViewer data={currentAnalysis.structure_3d} />
                    </div>
                )}

                <div className="info-box">
                    <h3>Example SMILES</h3>
                    <ul>
                        <li onClick={() => setSmilesInput("CC(=O)OC1=CC=CC=C1C(=O)O")}>Aspirin</li>
                        <li onClick={() => setSmilesInput("CN1C=NC2=C1C(=O)N(C(=O)N2C)C")}>Caffeine</li>
                        <li onClick={() => setSmilesInput('["C1CCCCC1", "c1ccccc1"]')}>Batch Example</li>
                    </ul>
                </div>

                <button onClick={runStressTest} className="stress-btn">
                    Run 100 Concurrent Requests
                </button>
            </div>

            <div className="dd-chat-area">
                <div className="messages">
                    <AnimatePresence>
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`message ${msg.role}`}
                            >
                                <div className="bubble">
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                </div>
                                {msg.analysis && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="analysis-card"
                                    >
                                        <h4>Analysis Results</h4>
                                        {Array.isArray(msg.analysis) ? (
                                            <div className="batch-results">
                                                {msg.analysis.map((res: any, i: number) => (
                                                    <div key={i} className="batch-item" onClick={() => res.valid && setCurrentAnalysis(res)} style={{ cursor: res.valid ? 'pointer' : 'default', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: currentAnalysis === res ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
                                                        <strong>#{i + 1}</strong> {res.smiles.slice(0, 20)}...
                                                        {res.valid ? (
                                                            <div style={{ fontSize: '0.8em', color: '#aaa' }}>
                                                                MW: {res.properties.molecular_weight} | LogP: {res.properties.logp} |
                                                                <span style={{ color: res.lipinski.passes ? '#4caf50' : '#f44336', marginLeft: '5px' }}>
                                                                    {res.lipinski.passes ? 'Pass' : 'Fail'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div style={{ color: '#f44336' }}>Invalid</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            msg.analysis.valid && (
                                                <>
                                                    <div className="props-grid">
                                                        <div><span>MW:</span> {msg.analysis.properties?.molecular_weight}</div>
                                                        <div><span>LogP:</span> {msg.analysis.properties?.logp}</div>
                                                        <div><span>HBD:</span> {msg.analysis.properties?.hbd}</div>
                                                        <div><span>HBA:</span> {msg.analysis.properties?.hba}</div>
                                                        <div><span>TPSA:</span> {msg.analysis.properties?.tpsa}</div>
                                                    </div>
                                                    <div className={`lipinski ${msg.analysis.lipinski?.passes ? 'pass' : 'fail'}`}>
                                                        Lipinski Rule: {msg.analysis.lipinski?.passes ? 'PASS' : 'FAIL'}
                                                    </div>
                                                </>
                                            )
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {loading && <div className="message assistant"><div className="bubble loading">Thinking...</div></div>}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="chat-input-form">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about the molecule(s)..."
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading || !input}>Send</button>
                </form>
            </div>
        </div>
    );
};

export default DrugDiscovery;
