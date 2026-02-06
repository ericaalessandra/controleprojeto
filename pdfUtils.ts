import { jsPDF } from 'jspdf';
import { Company } from './types';
import QRCode from 'qrcode';

/**
 * Gera um hash SHA-256 para garantir a integridade do documento.
 */
export const generateIntegrityHash = async (data: string) => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Gera um QR Code em Base64 contendo o hash de integridade.
 */
export const generateQRCode = async (text: string): Promise<string> => {
    try {
        return await QRCode.toDataURL(text, { margin: 1, width: 100 });
    } catch (err) {
        console.error("Erro ao gerar QR Code:", err);
        return '';
    }
};

/**
 * Aplica um cabeçalho profissional em todas as páginas do documento.
 */
/**
 * Aplica um cabeçalho profissional em todas as páginas do documento.
 */
export const applyProfessionalHeader = (doc: jsPDF, title: string, company: Company | null, rightLogoData?: string | null) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    const timestamp = new Date().toLocaleString('pt-BR');

    // Helper interno para desenhar logos com preservação de aspecto
    const drawHeaderLogo = (data: string, xPos: number, align: 'left' | 'right') => {
        try {
            // 1. Identificar formato
            const header = data.split(',')[0].toLowerCase();
            let format: 'PNG' | 'JPEG' | 'WEBP' = 'PNG';
            if (header.includes('image/jpeg') || header.includes('image/jpg')) format = 'JPEG';
            else if (header.includes('image/webp')) format = 'WEBP';

            // 2. Extrair Dimensões Naturais
            let oW = 100, oH = 100;
            try {
                const imgProps = doc.getImageProperties(data);
                oW = imgProps.width || 100;
                oH = imgProps.height || 100;
            } catch (dimErr) {
                console.warn("Could not read image dimensions, using safe defaults.");
            }

            const ratio = oW / oH;

            // 3. Bounding Box do Cabeçalho (mm)
            const maxW = 35;
            const maxH = 12;

            // 4. Algoritmo de Escala "Contain"
            let finalW, finalH;
            if (ratio > maxW / maxH) {
                finalW = maxW;
                finalH = maxW / ratio;
            } else {
                finalH = maxH;
                finalW = maxH * ratio;
            }

            // 5. Posicionamento Vertical (Centralizado no header)
            const yPos = 10 + (maxH - finalH) / 2;

            // 6. Posicionamento Horizontal
            // Se for 'right', o xPos é a margem direita, então subtraímos a largura
            const finalX = align === 'right' ? xPos - finalW : xPos;

            // 7. Inserção
            const renderFormat = (format === 'WEBP') ? 'PNG' : format;
            doc.addImage(data, renderFormat, finalX, yPos, finalW, finalH, undefined, 'SLOW');
        } catch (e) {
            console.error("PDF Logo Error:", e);
        }
    };

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const margin = 14;
        const pageWidth = doc.internal.pageSize.getWidth();

        // Linha divisória
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.5);
        doc.line(margin, 30, pageWidth - margin, 30);

        // Logo da Empresa (Esquerda)
        if (company?.logoData) {
            drawHeaderLogo(company.logoData, margin, 'left');
        }

        // Logo do Projeto (Direita) - Se fornecido
        if (rightLogoData) {
            drawHeaderLogo(rightLogoData, pageWidth - margin, 'right');
        }

        // Título Centralizado
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0, 113, 227);
        const titleText = title;
        const titleWidth = doc.getTextWidth(titleText);
        const titleX = (pageWidth - titleWidth) / 2;
        doc.text(titleText, titleX, 18);

        // Nome da Unidade / Sistema (Subtítulo Centralizado)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        const subTitle = company?.name || 'Sistema de Gestão';
        const subTitleWidth = doc.getTextWidth(subTitle);
        const subTitleX = (pageWidth - subTitleWidth) / 2;
        doc.text(subTitle, subTitleX, 24);
    }
};

/**
 * Aplica um rodapé profissional com Assinatura Digital (Hash) e QR Code.
 */
export const applyProfessionalFooter = (doc: jsPDF, hash?: string, qrCode?: string) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setDrawColor(240, 240, 240);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        doc.setFont('helvetica', 'normal');

        // Data de Expedição (Esquerda)
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const timestamp = new Date().toLocaleString('pt-BR');
        doc.text(`Expedição: ${timestamp}`, margin, pageHeight - 10);

        // Texto do Rodapé de Segurança (Esquerda - Abaixo da Data)
        doc.setFontSize(6);
        doc.setTextColor(180, 180, 180);
        doc.text('Innova4Up Governance & Privacy Module', margin, pageHeight - 6);

        if (hash) {
            doc.text(` | Auth Hash: ${hash.substring(0, 32)}...`, margin + 45, pageHeight - 6);
        }

        // QR Code (Se houver)
        if (qrCode) {
            try {
                doc.addImage(qrCode, 'PNG', pageWidth - margin - 35, pageHeight - 13, 10, 10);
            } catch (e) {
                console.warn("QR Code render error:", e);
            }
        }

        // Numeração de Página (Direita)
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const pageText = `Página ${i} de ${pageCount}`;
        doc.text(pageText, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
};

export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    } catch {
        return dateString;
    }
};
