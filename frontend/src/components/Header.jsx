import React, { useState } from 'react';
import { RefreshCw, Download, Calendar } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Header.css';

export default function Header({ onRefresh, onExport, isLoading, metadata }) {
    const [isExporting, setIsExporting] = useState(false);
    const isDemo = metadata?.is_demo === true;

    const handlePdfExport = async () => {
        setIsExporting(true);
        const dashboard = document.querySelector('.page-content');
        if (!dashboard) return;

        // Temporarily hide buttons for clean capture
        const buttons = document.querySelectorAll('button');
        buttons.forEach(b => b.style.opacity = '0');

        try {
            const canvas = await html2canvas(dashboard, {
                scale: 2,
                backgroundColor: '#0f172a',
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`matmut-report-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error("PDF Export failed", err);
        } finally {
            buttons.forEach(b => b.style.opacity = '1');
            setIsExporting(false);
        }
    };

    return (
        <header className="app-header glass">
            <div className="header-left">
                <h1 className="header-title">
                    <span className="title-accent">📊</span> Vue d'ensemble
                </h1>
                <div className="header-meta">
                    <Calendar size={14} />
                    <span>Dernière mise à jour: {metadata?.timestamp ? new Date(metadata.timestamp).toLocaleString() : 'Jamais'}</span>
                </div>
            </div>

            <div className="header-actions">
                {isDemo && (
                    <div className="demo-badge">
                        <span>MODE DÉMO</span>
                    </div>
                )}

                <button className="btn-secondary" onClick={handlePdfExport} disabled={isExporting}>
                    <Download size={18} />
                    <span>PDF</span>
                </button>

                <button className="btn-primary" onClick={onRefresh} disabled={isLoading}>
                    <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
                    <span>{isLoading ? 'Analyse...' : 'Actualiser'}</span>
                </button>
            </div>
        </header>
    );
}
