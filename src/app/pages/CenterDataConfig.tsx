/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useRef } from 'react';
import {
  UploadCloud,
  Layers,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Settings,
  Link2,
  List,
  FileCheck,
  CheckCircle2,
  Circle,
  Save,
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { useAppData } from '../lib/contexts/AppDataContext';
import { DEFAULT_CENTERS } from '../constants';
import { getL07FromFileName, getCenterInfoByL07 } from '../lib/utils/center-utils';
import {
  readExcelFile,
  parseMoneyToNumber,
  isMoneyColumn,
  findColumnMapping,
  COMMON_FIELD_ALIASES,
} from '../lib/utils/data-utils';
import { ContextMenu } from '../components/ContextMenu';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';
import { ColumnMappingDialog } from '../components/ColumnMappingDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

interface CenterRow {
  id: string;
  l07: string;
  aeCode: string;
  bus: string;
  url: string;
  status: string;
  timePeriod: string;
  fileObj?: File | null;
  cachedData?: any[];
  lastProcessedUrl?: string;
  columnMapping?: Record<string, string>;
  errorMessage?: string;
}

export function CenterDataConfig() {
  const { appData, updateAppData } = useAppData();

  const [searchTerm, setSearchTerm] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const filteredData = appData.Fr_InputList.filter(
    (row) =>
      !searchTerm ||
      row.l07?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.aeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.bus?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.url?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearPageData = () => {
    updateAppData((prev) => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.map((row) => ({
        ...row,
        url: '',
        fileObj: undefined,
        status: 'ready',
        cachedData: undefined,
        errorMessage: undefined,
      })),
    }));
    setShowClearDialog(false);
    toast.success('Đã xóa tệp và reset trạng thái (giữ lại cấu hình L07, Mã AE, Business).');
  };

  const deletePageRows = () => {
    const idsToKeep = new Set(appData.Fr_InputList.map((r) => r.id));
    paginatedData.forEach((r) => idsToKeep.delete(r.id));
    updateAppData((prev) => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.filter((row) => idsToKeep.has(row.id)),
    }));
    toast.success(`Đã xóa ${paginatedData.length} dòng trên trang hiện tại.`);
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const configInputRef = useRef<HTMLInputElement>(null);

  const handleContextMenu = (e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowId });
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return;
    if (action === 'deleteRow') deleteRow(contextMenu.rowId);
    setContextMenu(null);
  };

  const handleConfigFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const wb = await readExcelFile(file);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
      
      const getVal = (row: any, aliases: string[]) => {
        const key = Object.keys(row).find(k => aliases.includes(k.toUpperCase().trim()));
        return key ? String(row[key]).trim() : '';
      };

      const newList = data.map((row: any) => ({
        id: Date.now().toString() + Math.random(),
        l07: getVal(row, ['L07', 'MÃ L07', 'MÃ TRUNG TÂM']),
        aeCode: getVal(row, ['MÃ AE', 'AE CODE', 'AE', 'MA AE', 'MÃAE', 'MÃ TT']),
        bus: getVal(row, ['BUSINESS', 'BUS']),
        url: '',
        status: 'ready',
        timePeriod: new Date().toISOString().slice(0, 7),
      }));
      updateAppData((prev) => ({ ...prev, Fr_InputList: newList }));
      toast.success(`Đã nạp thành công ${newList.length} cấu hình center.`);
    } catch (e: any) {
      toast.error('Lỗi khi nạp file cấu hình: ' + e.message);
    }
    e.target.value = '';
  };

  const addRow = () => {
    const newRow: CenterRow = {
      id: Date.now().toString(),
      l07: '',
      aeCode: '',
      bus: '',
      url: '',
      status: 'ready',
      timePeriod: new Date().toISOString().slice(0, 7),
    };
    updateAppData((prev) => ({
      ...prev,
      Fr_InputList: [...prev.Fr_InputList, newRow],
    }));
  };

  const deleteRow = (id: string) => {
    updateAppData((prev) => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.filter((row) => row.id !== id),
    }));
  };

  const updateRow = (id: string, field: keyof CenterRow, value: any) => {
    updateAppData((prev) => {
      const newList = prev.Fr_InputList.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };
          if (field === 'l07' && typeof value === 'string') {
            const l07 = value.trim().toUpperCase();
            const centerInfo = getCenterInfoByL07(l07);
            if (centerInfo) {
              updatedRow.aeCode = centerInfo.aeCode;
              updatedRow.bus = centerInfo.bus;
            } else if (l07 !== '') {
              toast.info(
                `Không tìm thấy thông tin cho L07: ${l07}. Bạn có thể nhập thủ công Mã AE và Business.`,
                { id: 'l07-not-found' }
              );
            }
            if (l07 !== '' && updatedRow.status === 'Error' && updatedRow.errorMessage?.includes('nhận diện Mã AE')) {
              updatedRow.status = 'Uploaded';
              updatedRow.errorMessage = undefined;
            }
          }
          return updatedRow;
        }
        return row;
      });
      return { ...prev, Fr_InputList: newList };
    });
  };

  const handleFileUpload = (id: string, file: File) => {
    const allowedExtensions = ['.xlsx', '.xls', '.gsheet'];
    const maxSize = 100 * 1024 * 1024;
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    let status = 'Uploaded';
    let errorMessage: string | undefined = undefined;

    if (!allowedExtensions.includes(fileExtension)) {
      status = 'Error';
      errorMessage = `Định dạng file không hợp lệ. Vui lòng tải lên file Excel (.xlsx, .xls).`;
    } else if (file.size > maxSize) {
      status = 'Error';
      errorMessage = `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Vui lòng tải lên file nhỏ hơn 100MB.`;
    }

    updateAppData((prev) => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.map((row) => {
        if (row.id === id) {
          const newL07 = row.l07 || getL07FromFileName(file.name) || '';
          let finalStatus = status;
          let finalErrorMessage = errorMessage;
          if (!newL07 && finalStatus !== 'Error') {
            finalStatus = 'Error';
            finalErrorMessage = 'Không thể tự động nhận diện Mã AE. Vui lòng nhập L07 thủ công.';
          }
          return { ...row, fileObj: file, url: file.name, status: finalStatus, errorMessage: finalErrorMessage, l07: newL07 };
        }
        return row;
      }),
    }));
  };

  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingTargetRow, setMappingTargetRow] = useState<CenterRow | null>(null);

  const centerTargetFields = [
    'ID Number', 'Full name', 'Salary Scale', 'From', 'To',
    'Bank Account Number', 'Bank Name', 'CITAD code', 'TAX CODE', 'Contract No',
    'CHARGE TO LXO', 'CHARGE TO EC', 'CHARGE TO PT-DEMO', 'Charge MKT Local',
    'Charge Renewal Projects', 'Charge Discovery Camp', 'Charge Summer Outing', 'TOTAL PAYMENT',
  ];

  const openMappingDialog = (row: CenterRow) => {
    setMappingTargetRow(row);
    setMappingDialogOpen(true);
  };

  const handleSaveMapping = (mapping: Record<string, string>) => {
    if (mappingTargetRow) {
      updateRow(mappingTargetRow.id, 'columnMapping', mapping);
      toast.success(`Đã lưu mapping cho ${mappingTargetRow.l07 || mappingTargetRow.url}`);
    }
  };

  const handleMultiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const allowedExtensions = ['.xlsx', '.xls', '.gsheet'];
    const maxSize = 100 * 1024 * 1024;

    updateAppData((prev) => {
      const newList = [...prev.Fr_InputList];
      Array.from(files).forEach((file) => {
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        let isInvalid = false;
        let errorMessage: string | undefined = undefined;
        if (!allowedExtensions.includes(fileExtension)) {
          isInvalid = true;
          errorMessage = `Định dạng file không hợp lệ.`;
        } else if (file.size > maxSize) {
          isInvalid = true;
          errorMessage = `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB).`;
        }
        const l07 = getL07FromFileName(file.name);
        if (isInvalid) {
          newList.push({ id: Date.now().toString() + Math.random(), l07: l07 || '', aeCode: '', bus: '', url: file.name, status: 'Error', fileObj: file, errorMessage, timePeriod: new Date().toISOString().slice(0, 7) });
          return;
        }
        if (l07) {
          const existingIdx = newList.findIndex((row) => row.l07 === l07);
          const centerInfo = getCenterInfoByL07(l07);
          const aeCode = centerInfo?.aeCode || '';
          const bus = centerInfo?.bus || '';
          if (existingIdx !== -1) {
            newList[existingIdx] = { ...newList[existingIdx], url: file.name, status: 'Uploaded', fileObj: file, aeCode: newList[existingIdx].aeCode || aeCode, bus: newList[existingIdx].bus || bus, errorMessage: undefined };
          } else {
            newList.push({ id: Date.now().toString() + Math.random(), l07, aeCode, bus, url: file.name, status: 'Uploaded', fileObj: file, timePeriod: new Date().toISOString().slice(0, 7) });
          }
        } else {
          newList.push({ id: Date.now().toString() + Math.random(), l07: '', aeCode: '', bus: '', url: file.name, status: 'Error', fileObj: file, errorMessage: 'Không thể tự động nhận diện Mã AE. Vui lòng nhập L07 thủ công.', timePeriod: new Date().toISOString().slice(0, 7) });
        }
      });
      return { ...prev, Fr_InputList: newList };
    });
    e.target.value = '';
  };

  const processFrCenters = async (onlyNew = false) => {
    const currentList = [...appData.Fr_InputList];
    const targets = onlyNew
      ? currentList.filter((item) => item.status !== 'Success' && item.status !== 'Error' && (item.fileObj || item.url))
      : currentList.filter((item) => item.status !== 'Error' && (item.fileObj || item.url));

    if (targets.length === 0) { toast.error('Không có dữ liệu mới để tổng hợp!'); return; }

    setIsProcessing(true);
    setProgress(0);
    setProcessingMessage('Bắt đầu tổng hợp dữ liệu Centers...');
    await new Promise((resolve) => setTimeout(resolve, 10));

    let successCount = 0;
    let failCount = 0;
    const finalHeaders = [
      'No', 'L07', 'Mã AE', 'Business', 'ID Number', 'Full name', 'Salary Scale',
      'From', 'To', 'Bank Account Number', 'Bank Name', 'CITAD code', 'TAX CODE',
      'Contract No', 'CHARGE TO LXO', 'CHARGE TO EC', 'CHARGE TO PT-DEMO',
      'Charge MKT Local', 'Charge Renewal Projects', 'Charge Discovery Camp',
      'Charge Summer Outing', 'TOTAL PAYMENT',
    ];

    try {
      for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        setProgress(Math.round(((i + 1) / targets.length) * 100));
        setProcessingMessage(`Đang xử lý ${i + 1}/${targets.length}: ${item.l07 || item.url}...`);
        await new Promise((resolve) => setTimeout(resolve, 10));

        try {
          const wb = await readExcelFile(item.fileObj || item.url);
          const relevantSheets = wb.SheetNames.filter((name, index) => {
            const n = name.toUpperCase();
            return n.includes('STAFF') || n.includes('NHÂN VIÊN') || n.includes('SALARY') ||
              n.includes('SCALE') || n.includes('ĐƠN GIÁ') || n.includes('ROSTER') ||
              n.includes('LỊCH TRỰC') || n.includes('TIMESHEET') || n.includes('BẢNG CÔNG') ||
              n.includes('COST') || n.includes('PAYROLL') || n.includes('SHEET') ||
              n.includes('BANK') || n.includes('HOLD') || index === 0;
          });

          const dataRows: any[] = [];
          let foundAnySheet = false;

          relevantSheets.forEach((sheetName) => {
            try {
              const nameUpper = sheetName.toUpperCase();
              const ws = wb.Sheets[sheetName];
              if (!ws) return;
              const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
              if (rows.length === 0) return;

              const isStaff = nameUpper.includes('STAFF') || nameUpper.includes('NHÂN VIÊN');
              const isScale = nameUpper.includes('SALARY') || nameUpper.includes('SCALE') || nameUpper.includes('ĐƠN GIÁ');
              const isRoster = nameUpper.includes('ROSTER') || nameUpper.includes('LỊCH TRỰC');
              const isTimesheet = nameUpper.includes('TIMESHEET') || nameUpper.includes('BẢNG CÔNG');

              if (isStaff || isScale || isRoster || isTimesheet) {
                const headers = rows[0] as string[];
                const dataObjects = rows.slice(1).map((row) => {
                  const obj: any = {};
                  headers.forEach((header, index) => { obj[header] = row[index]; });
                  obj._sourceFile = item.fileObj?.name || item.url || 'Unknown';
                  return obj;
                });
                if (isStaff) updateAppData((prev) => ({ ...prev, Q_Staff: [...(prev.Q_Staff || []), ...dataObjects] }));
                else if (isScale) updateAppData((prev) => ({ ...prev, Q_Salary_Scale: [...(prev.Q_Salary_Scale || []), ...dataObjects] }));
                else if (isRoster) updateAppData((prev) => ({ ...prev, Q_Roster: [...(prev.Q_Roster || []), ...dataObjects] }));
                else if (isTimesheet) updateAppData((prev) => ({ ...prev, Timesheets: [...(prev.Timesheets || []), ...dataObjects] }));
                return;
              }

              let headerRowIdx = -1;
              let h: string[] = [];
              for (let i = 0; i < Math.min(30, rows.length); i++) {
                const row = rows[i].map((x) => String(x || '').trim().toUpperCase());
                const hasId = row.some((x) => COMMON_FIELD_ALIASES['ID Number'].some((a) => x.includes(a.toUpperCase())) || COMMON_FIELD_ALIASES['Full name'].some((a) => x.includes(a.toUpperCase())));
                const hasTotal = row.some((x) => COMMON_FIELD_ALIASES['TOTAL PAYMENT'].some((a) => x.includes(a.toUpperCase())));
                if (hasId && hasTotal) { headerRowIdx = i; h = rows[i].map((x) => String(x || '').trim()); break; }
              }

              if (headerRowIdx !== -1) {
                foundAnySheet = true;
                const colMap = findColumnMapping(h, finalHeaders, item.columnMapping);
                const iId = colMap['ID Number'];
                const iN = colMap['Full name'];
                const iT = colMap['TOTAL PAYMENT'];
                const iAcc = colMap['Bank Account Number'];

                if ((iId !== undefined || iN !== undefined) && iT !== undefined) {
                  for (let r = headerRowIdx + 1; r < rows.length; r++) {
                    const rData = rows[r];
                    if (!rData) continue;
                    const nameVal = iN !== undefined ? String(rData[iN] || '').trim() : '';
                    const totalValFromFile = iT !== undefined ? parseMoneyToNumber(rData[iT]) : 0;
                    let accVal = '';
                    if (iAcc !== undefined) {
                      const rawAcc = rData[iAcc];
                      accVal = rawAcc !== undefined && rawAcc !== null ? String(rawAcc).replace(/\s/g, '') : '';
                      if (typeof rawAcc === 'number' && (accVal.includes('E') || accVal.includes('e'))) {
                        accVal = rawAcc.toLocaleString('fullwide', { useGrouping: false });
                      }
                    }
                    if (!nameVal) continue;
                    const upperName = nameVal.toUpperCase();
                    if (upperName.includes('TOTAL COST') || upperName.includes('PREPARED BY') || upperName.includes('TA SUPERVISOR')) continue;
                    if (!accVal) continue;

                    const obj: any = {};
                    let calculatedTotal = 0;
                    const chargeColumns = ['CHARGE TO LXO', 'CHARGE TO EC', 'CHARGE TO PT-DEMO', 'Charge MKT Local', 'Charge Renewal Projects', 'Charge Discovery Camp', 'Charge Summer Outing'];
                    finalHeaders.forEach((th) => {
                      if (th === 'L07' || th === 'Business') return;
                      const colIdx = colMap[th];
                      if (colIdx !== undefined) {
                        let val = rData[colIdx];
                        if (th === 'Bank Account Number') val = accVal;
                        else if (isMoneyColumn(th)) {
                          val = parseMoneyToNumber(val);
                          if (chargeColumns.includes(th)) calculatedTotal += val;
                        }
                        obj[th] = val;
                      } else { obj[th] = ''; }
                    });
                    obj['L07'] = item.l07;
                    obj['Mã AE'] = item.aeCode;
                    obj['Business'] = item.bus;
                    obj['TOTAL PAYMENT'] = calculatedTotal > 0 ? calculatedTotal : totalValFromFile;
                    dataRows.push(obj);
                  }
                }
              }
            } catch (sheetError: any) {
              console.error(`Lỗi xử lý sheet ${sheetName}:`, sheetError);
            }
          });

          if (dataRows.length > 0) { item.cachedData = dataRows; item.status = 'Success'; successCount++; }
          else if (!foundAnySheet) throw new Error('Không tìm thấy dòng tiêu đề chứa thông tin ID/Tên và Total Payment.');
          else { item.status = 'Error: No data rows found'; failCount++; }
        } catch (e: any) {
          item.status = `Error: ${e.message}`;
          failCount++;
        }

        updateAppData((prev) => ({ ...prev, Fr_InputList: prev.Fr_InputList.map((row) => row.id === item.id ? { ...item } : row) }), false);
      }

      const allData: any[] = [];
      const seenKeys = new Set();
      const aeMapForMod2: Record<string, { name: string; bus: string }> = {};

      currentList.forEach((item, centerIdx) => {
        if (item.aeCode) {
          const code = String(item.aeCode).trim().toLowerCase();
          if (code) aeMapForMod2[code] = { name: item.l07, bus: item.bus };
        }
        if (item.l07) {
          const l07Key = String(item.l07).trim().toLowerCase();
          if (l07Key && !aeMapForMod2[l07Key]) aeMapForMod2[l07Key] = { name: item.l07, bus: item.bus };
        }
        if (item.cachedData && item.cachedData.length > 0) {
          item.cachedData.forEach((row: any, rowIdx: number) => {
            const idNum = String(row['ID Number'] || '').trim();
            const l07 = String(row['L07'] || '').trim();
            const total = parseMoneyToNumber(row['TOTAL PAYMENT']);
            const key = `${idNum}|${l07}|${total}`;
            row._centerIdx = centerIdx;
            row._rowIdx = rowIdx;
            if (!seenKeys.has(key)) { allData.push(row); seenKeys.add(key); }
          });
        }
      });

      updateAppData((prev) => ({ ...prev, Fr_InputList: currentList, Final_Centers: { headers: finalHeaders, data: allData }, AE_Map: aeMapForMod2 }));
      toast.success(`Tổng hợp xong! Thành công: ${successCount}, Lỗi/Trống: ${failCount}. Tổng ${allData.length} dòng.`);
    } catch (error: any) {
      console.error('Critical Error in processFrCenters:', error);
      toast.error('Lỗi hệ thống khi xử lý: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col min-h-0 bg-transparent p-4 md:p-8 gap-8 items-center overflow-auto custom-scrollbar"
    >
      {/* White Card */}
      <div style={{ height: '496.61px' }} className="bg-white soft-card flex-1 flex flex-col min-h-0 w-full max-w-[1240px] relative overflow-hidden">
        <div className="absolute inset-0 pattern-dots opacity-[0.05] pointer-events-none" />

        {/* ── Header ── */}
        <div style={{ borderColor: '#000000', color: '#302d2d' }} className="px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-6 bg-muted/20 shrink-0 border-b relative z-10 w-[1239px] h-[100px]">
          <div className="absolute inset-0 pattern-dots opacity-[0.05] pointer-events-none" />
          <div style={{ padding: '12px' }} className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary border border-primary/30 shadow-inner">
              <List className="w-7 h-7" />
            </div>
            <div>
              <h4 style={{ color: '#655f5f' }} className="text-[17px] leading-[12.75px] font-serif tracking-tight">
                Dữ liệu <span className="italic font-script text-primary text-4xl lowercase">Centers</span>
                <br />
                <span style={{ fontSize: '11px' }} className="font-bold tracking-widest">{appData.Fr_InputList.length} CENTERS</span>
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-4 pr-8">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button style={{ padding: '12px', borderColor: '#8a978a' }} className="soft-button-outline flex items-center gap-3 bg-white text-muted-foreground hover:text-primary transition-all shadow-sm rounded-3xl w-[130px]">
                  <Settings className="w-4 h-4 text-[#6d766a]" />
                  <span style={{ fontSize: '13.2px', lineHeight: '13.8px' }} className="font-bold tracking-widest uppercase">Cài đặt</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 border border-primary/10 shadow-xl p-1.5 bg-white rounded-2xl">
                <DropdownMenuLabel className="text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 px-3 py-2">Thao tác</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/10 mx-1.5" />
                <DropdownMenuItem onClick={deletePageRows} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-rose-50 text-rose-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                  <span className="text-[0.6875rem] font-bold uppercase tracking-widest">Xoá trang</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => processFrCenters(true)} disabled={isProcessing} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                  <RefreshCw className={`w-4 h-4 text-primary ${isProcessing ? 'animate-spin' : ''}`} />
                  <span className="text-[0.6875rem] font-bold uppercase tracking-widest">Reload</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                  <UploadCloud className="w-4 h-4 text-primary" />
                  <span className="text-[0.6875rem] font-bold uppercase tracking-widest">Tải lên nhiều file</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => configInputRef.current?.click()} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                  <FileCheck className="w-4 h-4 text-primary" />
                  <span className="text-[0.6875rem] font-bold uppercase tracking-widest">Nạp file cấu hình</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => processFrCenters(false)} disabled={isProcessing} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Layers className="w-4 h-4 text-primary" />}
                  <span className="text-[0.6875rem] font-bold uppercase tracking-widest">Tổng hợp dữ liệu</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input type="file" id="multi-center-upload" multiple className="hidden" accept=".xlsx, .xls, .gsheet" onChange={handleMultiUpload} ref={fileInputRef} />
            <input type="file" id="config-center-upload" className="hidden" accept=".xlsx, .xls, .gsheet" onChange={handleConfigFileUpload} ref={configInputRef} />
            <div className="bg-primary/5 border border-primary/10 text-primary text-[0.625rem] font-bold h-10 px-5 rounded-xl flex items-center justify-center uppercase tracking-widest shadow-sm">
              {appData.Fr_InputList.length} Centers
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <datalist id="l07-options">
          {DEFAULT_CENTERS.map((c, idx) => (
            <option key={`${c.l07}-${idx}`} value={c.l07}>{c.aeCode} - {c.bus}</option>
          ))}
        </datalist>

        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th style={{ width: '60px' }} className="sticky top-0 z-20 bg-slate-50 px-4 py-3 text-[11px] leading-[11px] font-bold text-slate-500 uppercase tracking-widest text-center border-b border-r border-slate-200">STT</th>
                <th style={{ width: '190px' }} className="sticky top-0 z-20 bg-slate-50 px-4 py-2 text-[12px] leading-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 text-center">L07</th>
                <th style={{ width: '235px' }} className="sticky top-0 z-20 bg-slate-50 px-4 py-3 text-[11px] leading-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 text-center">Mã AE</th>
                <th style={{ width: '190px' }} className="sticky top-0 z-20 bg-slate-50 px-4 py-3 text-[11px] leading-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 text-center">Business</th>
                <th style={{ width: '200px' }} className="sticky top-0 z-20 bg-slate-50 px-4 py-3 text-[11px] leading-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 text-center">File / Link Dữ Liệu</th>
                <th style={{ width: '150px' }} className="sticky top-0 z-20 bg-slate-50 px-4 py-3 text-[11px] leading-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 text-center">Trạng thái</th>
                <th style={{ width: '80px' }} className="sticky top-0 z-20 bg-slate-50 px-4 py-3 text-[11px] leading-[11px] font-bold text-slate-500 uppercase tracking-widest text-center border-b border-slate-200">Xoá</th>
              </tr>
            </thead>
            <tbody>
              {appData.Fr_InputList.map((item, index) => (
                <tr key={item.id} className="group hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                  <td className="px-4 py-3 text-center leading-[8px]">
                    <span className="text-xs font-bold text-foreground/30">{index + 1}</span>
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" list="l07-options" value={item.l07} onChange={(e) => updateRow(item.id, 'l07', e.target.value)} className="w-full font-bold text-foreground text-[12px] leading-[9px] outline-none bg-transparent border-none focus:ring-0 p-0 uppercase tracking-tight rounded-sm" placeholder="L07" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" value={item.aeCode} onChange={(e) => updateRow(item.id, 'aeCode', e.target.value)} className="w-full font-bold text-foreground text-[12px] leading-[15px] outline-none bg-transparent border-none focus:ring-0 p-0 uppercase tracking-tight" placeholder="Mã AE" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" value={item.bus} onChange={(e) => updateRow(item.id, 'bus', e.target.value)} className="w-full font-bold text-foreground text-[12px] leading-[15px] outline-none bg-transparent border-none focus:ring-0 p-0 uppercase tracking-tight" placeholder="Business" />
                  </td>
                  <td style={{ width: '200px' }} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer bg-white border border-primary/10 hover:bg-primary/5 text-primary px-3 py-1.5 rounded-lg text-[0.625rem] font-bold transition-all flex items-center gap-1.5 shrink-0 uppercase tracking-widest shadow-sm">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input type="file" className="hidden" accept=".xlsx, .xls, .gsheet" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(item.id, e.target.files[0]); }} />
                      </label>
                      <div className="flex-1 relative">
                        <input type="text" placeholder="Dán Link Google Sheet..." className="w-full border border-primary/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-foreground/20 bg-primary/5 uppercase tracking-tight" value={item.url} onChange={(e) => updateRow(item.id, 'url', e.target.value)} />
                        <Link2 className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30" />
                      </div>
                      {item.fileObj && (
                        <button onClick={() => openMappingDialog(item)} className={`p-1.5 border border-primary/10 rounded-lg transition-all shadow-sm ${item.columnMapping ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-primary/5'}`} title="Cấu hình mapping cột">
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {item.fileObj && (
                      <div className="mt-1 text-[0.6rem] text-emerald-600 font-bold flex items-center gap-1 w-fit px-2 py-0.5 rounded-full bg-emerald-50 uppercase tracking-widest">
                        <FileCheck className="w-2.5 h-2.5" /> {item.fileObj.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.status === 'Error' ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-600 text-[0.6rem] font-bold uppercase tracking-widest border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> Lỗi
                        </div>
                        {item.errorMessage && <span className="text-[0.55rem] text-rose-500 text-center max-w-[120px] leading-tight">{item.errorMessage}</span>}
                      </div>
                    ) : item.status === 'ready' || item.status === 'Uploaded' || item.status === 'Success' || item.fileObj ? (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[0.6rem] font-bold uppercase tracking-widest border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Sẵn sàng
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 text-slate-400 text-[0.6rem] font-bold uppercase tracking-widest border border-slate-200">
                        <Circle className="w-3 h-3" /> Trống
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => deleteRow(item.id)} className="w-8 h-8 rounded-lg text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-50 transition-all flex items-center justify-center mx-auto">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="px-4 h-12 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 rounded-b-2xl">
            <div className="flex items-center gap-3">
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[0.5625rem] font-black outline-none cursor-pointer">
                {[20, 50, 100, 200].map(s => <option key={s} value={s}>{s} / trang</option>)}
              </select>
              <p className="text-[0.5625rem] font-bold tracking-widest text-foreground/40">
                <span className="text-primary font-black">{(currentPage - 1) * itemsPerPage + 1}</span>
                {' – '}
                <span className="text-primary font-black">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span>
                {' / '}
                <span className="text-primary font-black">{filteredData.length}</span>
                {' dòng'}
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-primary/5 text-primary/50 hover:text-primary disabled:opacity-20 transition-all">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M8 9L5 6l3-3M4 3v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-primary/5 text-primary/50 hover:text-primary disabled:opacity-20 transition-all">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return (
                  <button key={p} onClick={() => setCurrentPage(p)} className={`h-7 min-w-[28px] px-1 flex items-center justify-center rounded-lg font-black text-[0.5625rem] transition-all ${currentPage === p ? 'bg-primary text-white' : 'text-primary/50 hover:bg-primary/5 hover:text-primary'}`}>{p}</button>
                );
              })}
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-primary/5 text-primary/50 hover:text-primary disabled:opacity-20 transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-primary/5 text-primary/50 hover:text-primary disabled:opacity-20 transition-all">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M4 9l3-3-3-3M8 3v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        )}

      </div>{/* end white card */}

      {/* ── Processing Banner ── */}
      {isProcessing && (
        <div className="mt-3 w-full max-w-[1400px] p-4 border border-primary/10 bg-white flex flex-col gap-3 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="font-bold uppercase text-[0.6875rem] tracking-widest text-primary">{processingMessage}</span>
            </div>
            <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-primary">Xác nhận xoá file và trạng thái</DialogTitle>
            <DialogDescription className="font-bold text-primary/60">
              Bạn có chắc chắn muốn xóa toàn bộ file đã tải lên và đặt lại trạng thái? Các cấu hình L07 (Mã), Mã AE và Business sẽ được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClearDialog(false)} className="border border-slate-200 font-black uppercase text-xs rounded-xl">Hủy</Button>
            <Button variant="destructive" onClick={clearPageData} className="bg-rose-500 font-black uppercase text-xs hover:bg-rose-600 rounded-xl">Xác nhận xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ColumnMappingDialog
        isOpen={mappingDialogOpen}
        onClose={() => setMappingDialogOpen(false)}
        file={mappingTargetRow?.fileObj || null}
        onSave={handleSaveMapping}
        initialMapping={mappingTargetRow?.columnMapping}
        targetFields={centerTargetFields}
      />
    </motion.div>
  );
}
