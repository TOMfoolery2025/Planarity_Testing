import { useState } from 'react';
import { motion } from 'framer-motion';

const Docs = () => {
    const [activeSection, setActiveSection] = useState('overview');

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="doc-layout">
            {/* Sidebar */}
            <nav className="doc-sidebar">
                <div className="doc-nav-group">
                    <h3>Guide</h3>
                    <a className={`doc-nav-item ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => scrollToSection('overview')}>Overview</a>
                    <a className={`doc-nav-item ${activeSection === 'architecture' ? 'active' : ''}`} onClick={() => scrollToSection('architecture')}>System Architecture</a>
                    <a className={`doc-nav-item ${activeSection === 'sequence' ? 'active' : ''}`} onClick={() => scrollToSection('sequence')}>Request Sequence</a>
                </div>
                <div className="doc-nav-group">
                    <h3>Workflows</h3>
                    <a className={`doc-nav-item ${activeSection === 'planarity-workflow' ? 'active' : ''}`} onClick={() => scrollToSection('planarity-workflow')}>Planarity Testing</a>
                    <a className={`doc-nav-item ${activeSection === 'drug-workflow' ? 'active' : ''}`} onClick={() => scrollToSection('drug-workflow')}>Drug Discovery</a>
                </div>
                <div className="doc-nav-group">
                    <h3>Reference</h3>
                    <a className={`doc-nav-item ${activeSection === 'files' ? 'active' : ''}`} onClick={() => scrollToSection('files')}>Key Files</a>
                    <a className={`doc-nav-item ${activeSection === 'formats' ? 'active' : ''}`} onClick={() => scrollToSection('formats')}>File Formats</a>
                </div>
            </nav>

            {/* Main Content */}
            <main className="doc-content">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

                    {/* Overview */}
                    <section id="overview" className="api-header-section">
                        <h1 className="api-title">Documentation</h1>
                        <p className="api-description">
                            Detailed technical guide for the Planarity Testing & Drug Discovery Platform.
                        </p>
                    </section>

                    {/* Architecture */}
                    <section id="architecture" className="endpoint-card">
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>System Architecture</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                            The system uses a <strong>Race-to-Result</strong> pattern to ensure low latency.
                        </p>

                        <div className="diagram-container" style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', textAlign: 'center' }}>
                                <div style={{ padding: '20px', border: '1px solid var(--accent-primary)', borderRadius: '8px' }}>
                                    <h3 style={{ color: 'var(--accent-primary)' }}>Frontend</h3>
                                    <p style={{ fontSize: '0.9em', color: '#aaa' }}>React + Vite</p>
                                    <div style={{ marginTop: '10px', fontSize: '0.8em', textAlign: 'left' }}>
                                        - <code>Home.tsx</code>: Graph UI<br />
                                        - <code>DrugDiscovery.tsx</code>: Chat UI<br />
                                        - <code>MoleculeViewer.tsx</code>: 3D View
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ height: '2px', width: '100%', background: 'var(--text-tertiary)', position: 'relative' }}>
                                        <span style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.8em' }}>HTTP / JSON</span>
                                    </div>
                                </div>
                                <div style={{ padding: '20px', border: '1px solid #2ecc71', borderRadius: '8px' }}>
                                    <h3 style={{ color: '#2ecc71' }}>Backend</h3>
                                    <p style={{ fontSize: '0.9em', color: '#aaa' }}>FastAPI + Python</p>
                                    <div style={{ marginTop: '10px', fontSize: '0.8em', textAlign: 'left' }}>
                                        - <code>main.py</code>: API Router<br />
                                        - <code>worker.py</code>: CPU Tasks<br />
                                        - <code>drug_discovery.py</code>: RDKit
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Sequence Diagram */}
                    <section id="sequence" className="endpoint-card">
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Request Sequence Diagram</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                            Visualizing the parallel execution flow for a graph analysis request.
                        </p>

                        <div className="sequence-diagram" style={{ position: 'relative', padding: '40px 20px', background: '#1e1e1e', borderRadius: '8px', overflowX: 'auto' }}>
                            {/* Actors */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', minWidth: '600px' }}>
                                <div style={{ width: '100px', textAlign: 'center', fontWeight: 'bold' }}>User</div>
                                <div style={{ width: '100px', textAlign: 'center', fontWeight: 'bold' }}>Backend</div>
                                <div style={{ width: '100px', textAlign: 'center', fontWeight: 'bold' }}>Cache</div>
                                <div style={{ width: '100px', textAlign: 'center', fontWeight: 'bold' }}>Worker</div>
                            </div>

                            {/* Lifelines */}
                            <div style={{ position: 'absolute', top: '70px', bottom: '20px', left: '70px', width: '2px', background: '#444' }}></div>
                            <div style={{ position: 'absolute', top: '70px', bottom: '20px', left: 'calc(25% + 35px)', width: '2px', background: '#444' }}></div>
                            <div style={{ position: 'absolute', top: '70px', bottom: '20px', left: 'calc(50% + 35px)', width: '2px', background: '#444' }}></div>
                            <div style={{ position: 'absolute', top: '70px', bottom: '20px', left: 'calc(75% + 35px)', width: '2px', background: '#444' }}></div>

                            {/* Messages */}
                            <div style={{ position: 'relative', minWidth: '600px', height: '300px' }}>
                                {/* 1. Request */}
                                <div style={{ position: 'absolute', top: '0', left: '70px', width: '25%', borderTop: '2px solid var(--accent-primary)' }}></div>
                                <div style={{ position: 'absolute', top: '-10px', left: '12%', fontSize: '0.8em' }}>POST /process-batch</div>

                                {/* 2. Fork */}
                                <div style={{ position: 'absolute', top: '40px', left: 'calc(25% + 35px)', width: '25%', borderTop: '2px dashed #aaa' }}></div>
                                <div style={{ position: 'absolute', top: '30px', left: '37%', fontSize: '0.8em' }}>Check Cache (Async)</div>

                                <div style={{ position: 'absolute', top: '60px', left: 'calc(25% + 35px)', width: '50%', borderTop: '2px solid #aaa' }}></div>
                                <div style={{ position: 'absolute', top: '50px', left: '50%', fontSize: '0.8em' }}>Submit Task (ProcessPool)</div>

                                {/* 3. Race */}
                                <div style={{ position: 'absolute', top: '100px', left: 'calc(25% + 35px)', right: '0', textAlign: 'center', color: '#e74c3c', fontSize: '0.9em', fontWeight: 'bold' }}>
                                    RACE: First Completed Wins
                                </div>

                                {/* 4. Return */}
                                <div style={{ position: 'absolute', top: '150px', left: 'calc(50% + 35px)', width: '25%', borderTop: '2px dashed #2ecc71' }}></div>
                                <div style={{ position: 'absolute', top: '140px', left: '37%', fontSize: '0.8em', color: '#2ecc71' }}>Result Found (Hit)</div>

                                <div style={{ position: 'absolute', top: '200px', left: '70px', width: '25%', borderTop: '2px solid var(--accent-primary)' }}></div>
                                <div style={{ position: 'absolute', top: '190px', left: '12%', fontSize: '0.8em' }}>Return JSON</div>
                            </div>
                        </div>
                    </section>

                    {/* Planarity Workflow */}
                    <section id="planarity-workflow" className="endpoint-card">
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Workflow: Planarity Testing</h2>
                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                                <li style={{ marginBottom: '15px' }}>
                                    <strong>Upload</strong> (<code>Home.tsx</code>):
                                    <br /><span style={{ color: '#aaa', fontSize: '0.9em' }}>User drags a JSON file. <code>FileUploader</code> parses it into an edge list string.</span>
                                </li>
                                <li style={{ marginBottom: '15px' }}>
                                    <strong>API Call</strong> (<code>main.py</code>):
                                    <br /><span style={{ color: '#aaa', fontSize: '0.9em' }}><code>POST /process-batch</code> receives <code>List[str]</code>. It creates a SHA256 hash for each graph.</span>
                                </li>
                                <li style={{ marginBottom: '15px' }}>
                                    <strong>Execution</strong> (<code>worker.py</code>):
                                    <br /><span style={{ color: '#aaa', fontSize: '0.9em' }}><code>process_graph_task</code> parses the string into a NetworkX graph. It calls <code>nx.check_planarity(G)</code>.</span>
                                </li>
                                <li style={{ marginBottom: '15px' }}>
                                    <strong>Algorithm</strong> (<code>networkx</code>):
                                    <br /><span style={{ color: '#aaa', fontSize: '0.9em' }}>Runs <strong>Boyer-Myrvold</strong>. If non-planar, it extracts the Kuratowski subgraph (K5 or K3,3).</span>
                                </li>
                                <li>
                                    <strong>Response</strong>:
                                    <br /><span style={{ color: '#aaa', fontSize: '0.9em' }}>JSON containing <code>is_planar</code>, <code>nodes</code>, <code>edges</code>, and <code>execution_time</code> is streamed back.</span>
                                </li>
                            </ol>
                        </div>
                    </section>

                    {/* Drug Discovery Workflow */}
                    <section id="drug-workflow" className="endpoint-card">
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Workflow: Drug Discovery</h2>
                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                                <li style={{ marginBottom: '15px' }}>
                                    <strong>Input</strong> (<code>DrugDiscovery.tsx</code>):
                                    <br /><span style={{ color: '#aaa', fontSize: '0.9em' }}>User enters SMILES (e.g., <code>CC(=O)OC1=CC=CC=C1C(=O)O</code>).</span>
                                </li>
                                <li style={{ marginBottom: '15px' }}>
                                    <strong>Analysis</strong> (<code>drug_discovery.py</code>):
                                    <br /><span style={{ color: '#aaa', fontSize: '0.9em' }}>
                                        - <code>Chem.MolFromSmiles</code>: Parses molecule.<br />
                                        - <code>Descriptors</code>: Calculates MW, LogP, TPSA.<br />
                                        - <code>AllChem.EmbedMolecule</code>: Generates 3D coordinates.
                                    </span>
                                </li>
                                <li style={{ marginBottom: '15px' }}>
                                    <strong>AI Insight</strong> (<code>main.py</code>):
                                    <br /><span style={{ color: '#aaa', fontSize: '0.9em' }}>
                                        Constructs a prompt with the calculated properties and sends it to <strong>Gemini 2.0 Flash</strong>.
                                    </span>
                                </li>
                                <li>
                                    <strong>Visualization</strong> (<code>MoleculeViewer.tsx</code>):
                                    <br /><span style={{ color: '#aaa', fontSize: '0.9em' }}>
                                        Receives 3D atoms/bonds. Renders them using <code>@react-three/fiber</code> (Three.js).
                                    </span>
                                </li>
                            </ol>
                        </div>
                    </section>

                    {/* Key Files */}
                    <section id="files" className="endpoint-card">
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Key Files & Libraries</h2>
                        <table className="param-table">
                            <thead>
                                <tr><th>File / Library</th><th>Description</th></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>backend/main.py</code></td>
                                    <td>FastAPI entry point. Handles routing, concurrency (asyncio), and caching logic.</td>
                                </tr>
                                <tr>
                                    <td><code>backend/app/worker.py</code></td>
                                    <td>Contains CPU-bound tasks (graph processing) run by <code>ProcessPoolExecutor</code>.</td>
                                </tr>
                                <tr>
                                    <td><code>backend/app/drug_discovery.py</code></td>
                                    <td>RDKit integration for molecular analysis and Gemini API prompting.</td>
                                </tr>
                                <tr>
                                    <td><code>networkx</code></td>
                                    <td>Python library used for the Boyer-Myrvold planarity test.</td>
                                </tr>
                                <tr>
                                    <td><code>rdkit</code></td>
                                    <td>Cheminformatics library for parsing SMILES and generating 3D structures.</td>
                                </tr>
                                <tr>
                                    <td><code>google-generativeai</code></td>
                                    <td>Client for accessing Google's Gemini models.</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    {/* File Formats */}
                    <section id="formats" className="endpoint-card">
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Acceptable File Formats</h2>

                        <h3 style={{ fontSize: '1.1rem', marginTop: '20px', color: 'var(--accent-primary)' }}>1. Graph Upload (JSON)</h3>
                        <div className="code-preview">
                            <pre>{`[
  "0 1\\n1 2\\n2 0",           // Edge List String
  {
    "edges": [[0, 1], [1, 2]] // Object with edges array
  }
]`}</pre>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', marginTop: '20px', color: 'var(--accent-primary)' }}>2. Graph Upload (TXT/CSV)</h3>
                        <div className="code-preview">
                            <pre>{`0 1
1 2
2 0
3 4`}</pre>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', marginTop: '20px', color: 'var(--accent-primary)' }}>3. Drug Discovery (JSON)</h3>
                        <div className="code-preview">
                            <pre>{`[
  "CC(=O)OC1=CC=CC=C1C(=O)O",  // Aspirin
  "CN1C=NC2=C1C(=O)N(C(=O)N2C)C" // Caffeine
]`}</pre>
                        </div>
                    </section>

                </motion.div>
            </main>
        </div >
    );
};

export default Docs;
