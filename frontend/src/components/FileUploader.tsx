import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';

interface FileData {
    name: string;
    content: string;
}

interface FileUploaderProps {
    onFilesLoaded: (files: FileData[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesLoaded }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            readFiles(files);
        }
    }, [onFilesLoaded]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length > 0) {
            readFiles(files);
        }
    }, [onFilesLoaded]);

    const readFiles = (files: File[]) => {
        const promises = files.map(file => new Promise<FileData>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    name: file.name,
                    content: e.target?.result as string || ''
                });
            };
            reader.readAsText(file);
        }));

        Promise.all(promises).then(results => {
            onFilesLoaded(results);
        });
    };

    return (
        <div
            className={`file-uploader ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isDragging ? 'rgba(var(--accent-primary-rgb), 0.1)' : 'transparent',
                borderColor: isDragging ? 'var(--accent-primary)' : 'var(--border-color)',
                marginBottom: '10px'
            }}
        >
            <input
                type="file"
                id="file-upload"
                style={{ display: 'none' }}
                onChange={handleFileInput}
                accept=".txt,.csv,.json"
                multiple
            />
            <label htmlFor="file-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: isDragging ? 1.05 : 1 }}
                >
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        {isDragging ? 'Drop files here' : 'Drag & Drop or Click to Upload'}
                    </p>
                    <span style={{ fontSize: '0.8em', color: 'var(--text-tertiary)' }}>
                        (.txt, .csv, or .json)
                    </span>
                </motion.div>
            </label>
        </div>
    );
};

export default FileUploader;
