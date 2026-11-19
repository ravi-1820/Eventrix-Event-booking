import React, { useRef, useState } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/Button';
import { Download, Printer, X, Loader2, Image, FileText } from 'lucide-react';
import { VerifiedEventTicket } from '../tickets/VerifiedEventTicket';
import { downloadTicketPDF, downloadTicketImage } from '../../lib/ticketExporter';
import { useLanguage } from '../../context/LanguageContext';

export function TicketPassModal({ isOpen, onClose, booking, currentUser }) {
  const { t } = useLanguage();
  const ticketRef = useRef(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  if (!booking) return null;

  const handleDownloadPDF = async () => {
    if (!ticketRef.current || isDownloadingPdf) return;
    try {
      setIsDownloadingPdf(true);
      await downloadTicketPDF(ticketRef.current, booking.booking_id || 'ticket');
    } catch (err) {
      console.error('Error generating PDF ticket:', err);
      // Graceful fallback to window print
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!ticketRef.current || isDownloadingImage) return;
    try {
      setIsDownloadingImage(true);
      await downloadTicketImage(ticketRef.current, booking.booking_id || 'ticket');
    } catch (err) {
      console.error('Error generating ticket image:', err);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        isOpen={isOpen} 
        onClose={onClose} 
        className="max-w-2xl p-0 bg-transparent border-0 shadow-none overflow-hidden max-h-[95vh] flex flex-col"
      >
        <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden font-sans">
          
          {/* Top Modal Navigation Header (Hidden in Print) */}
          <div className="no-print px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {t('ticket.officialPass', 'Official Event Pass')}
              </span>
              <span className="font-mono text-xs font-bold text-[#075985] bg-[#E0F2FE] px-2 py-0.5 rounded-md border border-[#BAE6FD]">
                {booking.booking_id}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Pass"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Ticket Area containing the exact same VerifiedEventTicket */}
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 eventrix-print-area">
            <VerifiedEventTicket
              ref={ticketRef}
              booking={booking}
              currentUser={currentUser}
            />
          </div>

          {/* Sticky Bottom Action Bar with [ Download PDF ] [ Save Image ] [ Print ] [ Close ] (Hidden in Print) */}
          <div className="no-print p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 rounded-b-3xl flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Download PDF Button */}
              <Button
                variant="primary"
                size="md"
                disabled={isDownloadingPdf}
                onClick={handleDownloadPDF}
                className="gap-2 bg-[#075985] hover:bg-[#0369A1] text-white font-bold shadow-md shadow-[#075985]/20 cursor-pointer px-4 sm:px-5"
                title="Download verified vector-ready PDF"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('common.loading', 'Generating PDF...')}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{t('booking.downloadPdf', 'Download Pass (PDF)')}</span>
                  </>
                )}
              </Button>

              {/* Download Image Button */}
              <Button
                variant="outline"
                size="md"
                disabled={isDownloadingImage}
                onClick={handleDownloadImage}
                className="gap-1.5 text-slate-700 dark:text-slate-300 font-semibold px-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Save high-resolution PNG image"
              >
                {isDownloadingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Image className="w-4 h-4 text-[#075985]" />
                )}
                <span className="hidden sm:inline">{t('ticket.downloadImage', 'Save Image')}</span>
              </Button>

              {/* Print Ticket Button */}
              <Button
                variant="outline"
                size="md"
                onClick={handlePrint}
                className="gap-1.5 text-slate-700 dark:text-slate-300 font-semibold px-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Direct Print A4 Ticket"
              >
                <Printer className="w-4 h-4" />
                <span>{t('ticket.print', 'Print')}</span>
              </Button>
            </div>

            {/* Close Button */}
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              className="text-slate-700 dark:text-slate-300 font-semibold px-5 cursor-pointer ml-auto"
            >
              {t('modal.close', 'Close')}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
