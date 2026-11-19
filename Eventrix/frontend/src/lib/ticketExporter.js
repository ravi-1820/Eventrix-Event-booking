import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Capture ticket DOM element with maximum fidelity:
 * - Awaits web fonts (document.fonts.ready)
 * - Resets all ancestor CSS transforms in cloned DOM to eliminate displacement/clipping
 * - Strips overflow: hidden / truncate clipping from text containers
 * - Uses clean integer scale (2) to eliminate subpixel rasterization rounding bugs
 */
export async function captureTicketCanvas(element) {
  if (!element) throw new Error('Ticket element not found');

  // 1. Ensure all custom fonts are ready
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn('Font loading wait warning:', e);
    }
  }

  // 2. Perform canvas capture with comprehensive styling normalization in onclone
  const canvas = await html2canvas(element, {
    scale: 2, // 2x gives razor-sharp 300dpi equivalent without fractional rounding errors
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#FFFFFF',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: 1200,
    onclone: (clonedDoc, clonedEl) => {
      // A. Traverse from cloned element up through all parents and neutralize transforms and overflow
      let curr = clonedEl;
      while (curr && curr !== clonedDoc.body) {
        if (curr.style) {
          curr.style.transform = 'none';
          curr.style.webkitTransform = 'none';
          curr.style.transition = 'none';
          curr.style.webkitTransition = 'none';
          curr.style.filter = 'none';
        }
        curr = curr.parentElement;
      }

      // B. Ensure cloned ticket container has exact dimensions and clean styling
      clonedEl.style.transform = 'none';
      clonedEl.style.webkitTransform = 'none';
      clonedEl.style.margin = '0 auto';
      clonedEl.style.maxWidth = '640px';
      clonedEl.style.width = '640px';
      clonedEl.style.boxShadow = 'none';
      clonedEl.style.overflow = 'visible';

      // C. Ensure all text and badge elements are visible and not clipped
      const allElements = clonedEl.querySelectorAll('*');
      allElements.forEach((el) => {
        // Remove truncate class and overflow:hidden on text containers
        if (el.classList.contains('truncate')) {
          el.classList.remove('truncate');
          el.style.overflow = 'visible';
          el.style.textOverflow = 'clip';
          el.style.whiteSpace = 'normal';
        }
        if (
          el.tagName === 'P' || 
          el.tagName === 'SPAN' || 
          el.tagName === 'H1' || 
          el.tagName === 'H2' || 
          el.tagName === 'H3' || 
          el.tagName === 'H4'
        ) {
          el.style.overflow = 'visible';
          if (!el.style.lineHeight) {
            el.style.lineHeight = '1.45';
          }
        }
        // Force SVG visibility and explicit display
        if (el.tagName.toLowerCase() === 'svg') {
          el.style.overflow = 'visible';
          el.style.display = 'inline-block';
        }
      });
    },
  });

  return canvas;
}

/**
 * Generate and download professional A4 PDF pass
 */
export async function downloadTicketPDF(element, bookingId = 'ticket') {
  const canvas = await captureTicketCanvas(element);
  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const margin = 12; // 12mm margins

  const targetWidth = pdfWidth - margin * 2; // 186mm
  const targetHeight = (canvas.height * targetWidth) / canvas.width;

  let finalWidth = targetWidth;
  let finalHeight = targetHeight;

  // Fit strictly on 1 page if height exceeds page boundary
  if (finalHeight > pdfHeight - margin * 2) {
    finalHeight = pdfHeight - margin * 2;
    finalWidth = (canvas.width * finalHeight) / canvas.height;
  }

  const posX = (pdfWidth - finalWidth) / 2;
  const posY = Math.max(margin, (pdfHeight - finalHeight) / 2);

  pdf.addImage(imgData, 'JPEG', posX, posY, finalWidth, finalHeight);
  pdf.save(`Eventrix_Pass_${bookingId}.pdf`);
}

/**
 * Generate and download crisp PNG image pass
 */
export async function downloadTicketImage(element, bookingId = 'ticket') {
  const canvas = await captureTicketCanvas(element);
  const imgData = canvas.toDataURL('image/png');
  
  const link = document.createElement('a');
  link.download = `Eventrix_Pass_${bookingId}.png`;
  link.href = imgData;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
