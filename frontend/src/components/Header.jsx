import React, { useState } from 'react';
import { RefreshCw, Download, Clock, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Header.css';

export default function Header({ onRefresh, onExport, isLoading, metadata }) {
    const [isExporting, setIsExporting] = useState(false);

    const formatDate = (ts) => {
        if (!ts) return '—';
        const d = new Date(ts);
        return d.toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const handlePdfExport = async () => {
        setIsExporting(true);
        const element = document.querySelector('.page-content');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#0f172a' // Dark background
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 30;

            pdf.setFillColor(15, 23, 42);
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(20);
            pdf.text('Matmut GEO Dashboard - Rapport Executif', 10, 20);

            pdf.addImage(imgData, 'PNG', 0, imgY, imgWidth * ratio, imgHeight * ratio);
            pdf.save(`matmut-report-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('PDF Export failed', err);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <header className="app-header glass">
            <div className="header-left">
                <h1 className="header-title">
                    <span className="title-accent">📊</span> Dashboard GEO Monitoring
                </h1>
                <div className="header-meta">
                    <Clock size={12} />
                    <span>Dernière MAJ: {formatDate(metadata?.timestamp)}</span>
                    {metadata?.is_demo && (
                        <span className="demo-badge">DÉMO</span>
                    )}
                </div>
            </div>
            <div className="header-actions">
                <button
                    className="btn btn-secondary"
                    onClick={onRefresh}
                    disabled={isLoading}
                >
                    <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
                    <span>Rafraîchir</span>
                </button>
                <button className="btn btn-outline" onClick={handlePdfExport} disabled={isExporting}>
                    <FileText size={16} />
                    <span>{isExporting ? 'Génération...' : 'PDF'}</span>
                </button>
                <button className="btn btn-primary" onClick={onExport}>
                    <Download size={16} />
                    <span>JSON</span>
                </button>
            </div>
        </header>
    );
}
