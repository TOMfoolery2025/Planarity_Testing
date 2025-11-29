import { Link, useLocation } from 'react-router-dom'

const Navbar = () => {
    const location = useLocation()

    const isActive = (path: string) => location.pathname === path

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <span className="brand-logo">🕸️</span>
                <span className="brand-text">Planarity<span className="brand-accent">Test</span></span>
            </div>
            <div className="navbar-links">
                <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
                <Link to="/api" className={`nav-link ${isActive('/api') ? 'active' : ''}`}>API</Link>
                <Link to="/docs" className={`nav-link ${isActive('/docs') ? 'active' : ''}`}>Docs</Link>
                <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`}>About</Link>
            </div>

        </nav>
    )
}

export default Navbar
