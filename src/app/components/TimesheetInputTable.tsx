/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useRef } from 'react';
import {
  Search,
  Plus,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  RefreshCw,
  Link2,
  Circle
} from 'lucide-react';
import { motion } from 'motion/react';
import { getL07FromFileName, getCenterInfoByL07 } from '../lib/utils/center-utils';

export interface TimesheetInputRow {
  id: string;
  l07: string;
  aeCode: string;
  bus: string;
  url: string;
  fileName?: string;
  sheetName?: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  count?: number;
  date?: string;
  columnMapping?: Record<string, string>;
}

interface TimesheetInputTableProps {
  rows: TimesheetInputRow[];
  onUpdateRow: (id: string, field: keyof TimesheetInputRow, value: any) => void;
  onDeleteRow: (id: string) => void;
  onAddRow: () => void;
  onUploadFile: (id: string, file: File) => void;
  onClearAll: () => void;
  onUploadFiles: (files: File[]) => void;
  isProcessing?: boolean;
}

export function TimesheetInputTable({
  rows,
  onUpdateRow,
  onDeleteRow,
  onAddRow,
  onUploadFile,
  onUploadFiles,
  onClearAll,
  isProcessing,
}: TimesheetInputTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const paginatedRows = rows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFileClick = (id: string) => {
    setActiveRowId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      if (activeRowId) {
        // Single file upload case (retry existing row)
        const file = files[0];
        onUploadFile(activeRowId, file);
        const l07 = getL07FromFileName(file.name);
        if (l07) {
          onUpdateRow(activeRowId, 'l07', l07);
          const centerInfo = getCenterInfoByL07(l07);
          if (centerInfo) {
            onUpdateRow(activeRowId, 'aeCode', centerInfo.aeCode || '');
            onUpdateRow(activeRowId, 'bus', centerInfo.bus || '');
          }
        }
      } else {
        // Multiple file upload case (new bulk upload)
        onUploadFiles(Array.from(files));
      }
    }
    e.target.value = '';
    setActiveRowId(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white overflow-hidden rounded-b-[2rem]">
      {/* Bulk Upload Header - REMOVED Upload Multiple button */}
      <div className="p-0"></div>
      
      {/* Table Scroll Container */}
      <div className="flex-1 overflow-auto custom-scrollbar outline-none bg-transparent relative min-h-0">
        <table className="w-full min-w-max border border-border border-collapse">
          <thead>
            <tr className="bg-white">
              <th className="sticky top-0 z-40 whitespace-nowrap bg-white hover:bg-white transition-colors cursor-pointer select-none group border-b border-r border-border text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground p-4 text-center w-16">STT</th>
              <th className="sticky top-0 z-40 whitespace-nowrap bg-white hover:bg-white transition-colors cursor-pointer select-none group border-b border-r border-border text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground p-4">L07</th>
              <th className="sticky top-0 z-40 whitespace-nowrap bg-white hover:bg-white transition-colors cursor-pointer select-none group border-b border-r border-border text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground p-4">Mã AE</th>
              <th className="sticky top-0 z-40 whitespace-nowrap bg-white hover:bg-white transition-colors cursor-pointer select-none group border-b border-r border-border text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground p-4">Business</th>
              <th className="sticky top-0 z-40 whitespace-nowrap bg-white hover:bg-white transition-colors cursor-pointer select-none group border-b border-r border-border text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground p-4">File / Link</th>
              <th className="sticky top-0 z-40 whitespace-nowrap bg-white hover:bg-white transition-colors cursor-pointer select-none group border-b border-r border-border text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground p-4 text-center">Ngày Upload</th>
              <th className="sticky top-0 z-40 whitespace-nowrap bg-white hover:bg-white transition-colors cursor-pointer select-none group border-b border-r border-border text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground p-4 text-center">Trạng Thái</th>
              <th className="sticky top-0 z-40 whitespace-nowrap bg-white hover:bg-white transition-colors cursor-pointer select-none group border-b border-border text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400 border-b border-border">
                    Chưa có dữ liệu nào
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-2 text-center text-xs text-slate-500 border-b border-r border-border">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="px-4 py-2 border-b border-r border-border">
                      <input
                        type="text"
                        value={row.l07 || ''}
                        onChange={(e) => onUpdateRow(row.id, 'l07', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 p-0"
                        placeholder="L07..."
                      />
                    </td>
                    <td className="px-4 py-2 border-b border-r border-border">
                      <input
                        type="text"
                        value={row.aeCode || ''}
                        onChange={(e) => onUpdateRow(row.id, 'aeCode', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 p-0"
                        placeholder="Mã AE..."
                      />
                    </td>
                    <td className="px-4 py-2 border-b border-r border-border">
                      <input
                        type="text"
                        value={row.bus || ''}
                        onChange={(e) => onUpdateRow(row.id, 'bus', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 p-0"
                        placeholder="Business..."
                      />
                    </td>
                    <td className="px-4 py-2 border-b border-r border-border">
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2 py-1">
                        <Link2 className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={row.fileName || row.url || ''}
                          onChange={(e) => onUpdateRow(row.id, 'url', e.target.value)}
                          placeholder="Link Sheet..."
                          className="w-full bg-transparent border-none focus:ring-0 text-xs text-slate-600 p-0"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-slate-500 border-b border-r border-border">
                      {row.date || '---'}
                    </td>
                    <td className="px-4 py-2 text-center border-b border-r border-border">
                      <div className="flex justify-center">
                        {row.status === 'success' ? (
                          <span className="text-[0.65rem] font-bold uppercase py-0.5 px-2 rounded-full bg-emerald-50 text-emerald-700">Success</span>
                        ) : row.status === 'error' ? (
                          <span className="text-[0.65rem] font-bold uppercase py-0.5 px-2 rounded-full bg-rose-50 text-rose-700">Error</span>
                        ) : (
                          <span className="text-[0.65rem] font-bold uppercase py-0.5 px-2 rounded-full bg-slate-100 text-slate-600">{row.status}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center border-b border-border">
                      <div className="flex justify-center gap-1">
                         <button
                          onClick={() => handleFileClick(row.id)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                          title="Upload/Retry"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteRow(row.id)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {/* Footer Controls matching DataTable format */}
      <div className="px-4 h-[52px] bg-white border-t border-border flex items-center justify-between shrink-0 relative z-40 sticky bottom-0">
        <div className="flex items-center gap-2 text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground/60">
          <span>{rows.length === 0 ? '0' : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, rows.length)} / {rows.length}</span>
        </div>

        <div className="flex items-center gap-1.5 opacity-80">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-white hover:bg-primary/5 hover:border-primary/20 text-muted-foreground hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="px-2 font-black text-[0.6rem] text-muted-foreground select-none">
            TRANG {currentPage} / {totalPages || 1}
          </div>

          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-white hover:bg-primary/5 hover:border-primary/20 text-muted-foreground hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        multiple
      />
    </div>
  );
}