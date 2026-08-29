// Professional PDF Generation & Direct Print Utility for AJ Welfare Society
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export class PdfService {
  // Direct Browser Print Utility for any element by ID (with fallback for iframe sandbox)
  static printElement(elementId: string, title = 'Document'): void {
    const element = document.getElementById(elementId);
    if (!element) {
      window.print();
      return;
    }

    const styleSheets = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('');
        } catch {
          return '';
        }
      })
      .join('\n');

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <style>
            ${styleSheets}
            @media print {
              body {
                background: white !important;
                color: black !important;
                margin: 0;
                padding: 12px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${element.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(printHtml);
        printWindow.document.close();
        return;
      }
    } catch {
      // Fallback below if window.open is restricted
    }

    // Fallback: Invisible iframe printing for sandbox/iframe environments
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(printHtml);
        frameDoc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            console.warn('Iframe print fallback failed, using window.print()', err);
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          }
        }, 300);
        return;
      }
    } catch (err) {
      console.warn('Print iframe creation error:', err);
    }

    window.print();
  }

  // Export any element to PDF with robust encoding and multi-page pagination
  static async exportToPdf(elementId: string, filename = 'document.pdf'): Promise<boolean> {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`PdfService: Element with ID "${elementId}" not found.`);
      return false;
    }

    try {
      // 1. Render DOM element to high-resolution canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth || element.offsetWidth || 1200,
        windowHeight: element.scrollHeight || element.offsetHeight || 800,
        scrollY: 0,
        scrollX: 0,
        onclone: (_clonedDoc, clonedElement) => {
          if (clonedElement) {
            clonedElement.style.backgroundColor = '#ffffff';
            clonedElement.style.overflow = 'visible';
          }
        }
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Rendered canvas has 0 dimensions.');
      }

      // Create a clean, non-transparent offscreen canvas to guarantee valid JPEG encoding
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not create 2D canvas context.');
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      ctx.drawImage(canvas, 0, 0);

      // 2. Check orientation
      const isLandscape = canvas.width > canvas.height && (canvas.width / canvas.height) > 1.3;
      const orientation = isLandscape ? 'l' : 'p';
      const pdf = new jsPDF(orientation, 'mm', 'a4');

      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 3. Extract image data safely as JPEG to prevent PNG chunk signature corruption
      let imgData = offscreenCanvas.toDataURL('image/jpeg', 0.95);
      let format: 'JPEG' | 'PNG' = 'JPEG';

      if (!imgData || !imgData.startsWith('data:image/jpeg;base64,') || imgData.length < 200) {
        // Fallback to PNG if JPEG is unexpectedly unavailable
        imgData = offscreenCanvas.toDataURL('image/png');
        format = 'PNG';
      }

      // 4. Render pages with precise pagination
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, format, 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Additional pages if content spans across multiple A4 pages
      while (heightLeft > 2) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, format, 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      // 5. Save the generated PDF
      pdf.save(filename);
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback: If PDF generator fails, trigger clean browser print dialog
      try {
        this.printElement(elementId, filename.replace(/\.pdf$/i, ''));
      } catch (printErr) {
        console.error('Fallback print also failed:', printErr);
      }
      return false;
    }
  }
}

