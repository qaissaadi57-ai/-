import React, { useState } from 'react';
import { ProgramConfig, DataRecord, FieldConfig, SheetType } from '../types';
import { Search, Download, Upload, Trash2, Edit3, FileSpreadsheet, ChevronLeft, ChevronRight, Filter, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { IRAQ_GOVERNORATES } from '../data/iraqLocations';
import { getSubscriptionInfo } from '../utils/subscriptionUtils';
import { defaultStationFields, defaultAgentFields } from '../data/defaultConfig';
import { evaluateSearchMatch, SearchCriterion } from '../utils/searchAlgorithms';

interface RecordTableProps {
  config: ProgramConfig;
  activeSheet: SheetType;
  records: DataRecord[];
  selectedRecord: DataRecord | null;
  onSelectRecord: (record: DataRecord) => void;
  onDeleteRecord: (id: string) => void;
  onImportRecords: (records: DataRecord[]) => void;
  lang: 'ar' | 'en';
}

export const RecordTable: React.FC<RecordTableProps> = ({
  config,
  activeSheet,
  records,
  selectedRecord,
  onSelectRecord,
  onDeleteRecord,
  onImportRecords,
  lang,
}) => {
  const [tableSearch, setTableSearch] = useState('');
  const [searchMode, setSearchMode] = useState<'all' | 'owner' | 'station' | 'phone' | 'governorate'>('all');
  const [govFilter, setGovFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Active Fields per sheet
  const fields: FieldConfig[] = activeSheet === 'stations'
    ? (config.stationFields || defaultStationFields)
    : (config.agentFields || defaultAgentFields);

  // Complete list of Iraqi governorates
  const governorateOptions = IRAQ_GOVERNORATES.map((g) => g.name);

  // Criterion Mapping for search modes
  const criterionMap: Record<string, SearchCriterion> = {
    owner: 'ownerName',
    station: 'stationName',
    phone: 'phone',
    governorate: 'governorate',
    all: 'all',
  };

  // Targeted Search & Filter Logic across both sheets using Arabic & Phone algorithms
  const sheetRecords = records.filter((rec) => {
    const isStation = rec.recordType === 'stations' || (!rec.recordType && (rec.stationName || rec.ownerName));
    const isAgent = rec.recordType === 'agents' || (!rec.recordType && rec.gasAgentName);

    if (activeSheet === 'stations' && !isStation) return false;
    if (activeSheet === 'agents' && !isAgent) return false;

    // 1. Dropdown Governorate Filter
    if (govFilter) {
      const govResult = evaluateSearchMatch(rec, 'governorate', govFilter, activeSheet);
      if (!govResult.isMatch) return false;
    }

    // 2. Technical Keyword Search Equation
    if (tableSearch.trim()) {
      const criterion = criterionMap[searchMode] || 'all';
      const searchResult = evaluateSearchMatch(rec, criterion, tableSearch, activeSheet);
      if (!searchResult.isMatch) return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(sheetRecords.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRecords = sheetRecords.slice(startIndex, startIndex + pageSize);

  // Export active sheet data to Excel
  const handleExportExcel = () => {
    const exportData = sheetRecords.map((rec) => {
      const row: Record<string, any> = {};
      fields.forEach((f) => {
        const label = lang === 'ar' ? f.name : f.nameEn || f.name;
        row[label] = rec[f.id] ?? '';
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    const sheetName = activeSheet === 'stations' ? 'محطات_الوقود' : 'وكلاء_الغاز';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Download Blank Excel Template for active sheet
  const handleDownloadTemplate = () => {
    const templateRow: Record<string, any> = {};
    fields.forEach((f) => {
      const label = lang === 'ar' ? f.name : f.nameEn || f.name;
      templateRow[label] = f.placeholder || '';
    });
    const worksheet = XLSX.utils.json_to_sheet([templateRow]);
    const workbook = XLSX.utils.book_new();
    const sheetName = activeSheet === 'stations' ? 'نموذج_المحطات' : 'نموذج_وكلاء_الغاز';
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, `${sheetName}.xlsx`);
  };

  // Import from Excel file for active sheet
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (data.length > 0) {
          const imported: DataRecord[] = data.map((row, idx) => {
            const recordObj: Record<string, any> = {
              id: 'imp_' + Date.now() + '_' + idx,
              recordType: activeSheet,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            fields.forEach((f) => {
              const labelAr = f.name;
              const labelEn = f.nameEn || f.name;
              recordObj[f.id] = row[labelAr] ?? row[labelEn] ?? row[f.id] ?? '';
            });

            return recordObj as DataRecord;
          });

          onImportRecords(imported);
          alert(lang === 'ar' ? `تم استيراد ${imported.length} سجل بنجاح إلى شيت ${activeSheet === 'stations' ? 'المحطات' : 'وكلاء الغاز'}!` : `Successfully imported ${imported.length} records!`);
        }
      } catch (err) {
        console.error('Failed to import Excel file', err);
        alert(lang === 'ar' ? 'فشل استيراد الملف. يرجى التأكد من بصيغة Excel الصحيحة.' : 'Failed to parse Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const tableTitle = activeSheet === 'stations' ? 'جدول سجلات المحطات' : 'جدول سجلات وكلاء الغاز';
  const isStationSheet = activeSheet === 'stations';

  const tableHeaderBg = isStationSheet
    ? 'bg-gradient-to-r from-blue-50 via-indigo-50/60 to-slate-50 dark:from-slate-900 dark:to-slate-800'
    : 'bg-gradient-to-r from-amber-50 via-orange-50/60 to-slate-50 dark:from-slate-900 dark:to-slate-800';

  const tableIconBg = isStationSheet ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white';

  const countBadgeBg = isStationSheet
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
    : 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200';

  const theadBg = isStationSheet
    ? 'bg-blue-100/70 text-blue-950 dark:bg-blue-950/80 dark:text-blue-200 border-b border-blue-200 dark:border-blue-900'
    : 'bg-amber-100/70 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200 border-b border-amber-200 dark:border-amber-900';

  return (
    <div className={`w-full max-w-7xl mx-auto rounded-3xl shadow-xl border ${isStationSheet ? 'border-blue-200 dark:border-blue-900/60' : 'border-amber-200 dark:border-amber-900/60'} bg-white dark:bg-slate-900 overflow-hidden rtl transition-colors duration-300`}>
      
      {/* Table Top Header Bar */}
      <div className={`p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 ${tableHeaderBg} flex flex-wrap items-center justify-between gap-4`}>
        
        <div className="flex items-center gap-3">
          <div className={`p-2.5 ${tableIconBg} rounded-2xl shadow-md`}>
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base sm:text-lg flex items-center gap-2">
              <span>{tableTitle}</span>
              <span className={`text-xs ${countBadgeBg} px-2.5 py-0.5 rounded-full font-bold`}>
                {sheetRecords.length} {lang === 'ar' ? 'سجل' : 'records'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'استعراض سجلات الشيت والفلترة والتصدير إلى Excel' : 'Review stored sheet records, filter, and export'}
            </p>
          </div>
        </div>

        {/* Action Controls: Search Mode, Governorate Filter, Keyword Search, Excel Export/Import */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Targeted Search Field Selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm">
            <Search className="w-3.5 h-3.5 text-indigo-600" />
            <select
              value={searchMode}
              onChange={(e) => {
                setSearchMode(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-black text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
            >
              <option value="all">{lang === 'ar' ? '🔍 بحث شامل (جميع الحقول)' : 'All Fields'}</option>
              <option value="owner">
                {lang === 'ar'
                  ? activeSheet === 'stations' ? '👤 اسم صاحب المحطة فقط' : '👤 اسم وكيل الغاز فقط'
                  : 'Owner / Agent Name Only'}
              </option>
              <option value="station">
                {lang === 'ar'
                  ? activeSheet === 'stations' ? '⛽ اسم المحطة / الكود فقط' : '⛽ اسم المكتب / الوكيل'
                  : 'Station / Office Name Only'}
              </option>
              <option value="phone">{lang === 'ar' ? '📞 رقم الهاتف فقط' : 'Phone Number Only'}</option>
              <option value="governorate">{lang === 'ar' ? '🏛️ المحافظة (فلترة السجلات)' : 'Governorate Filter'}</option>
            </select>
          </div>

          {/* Governorate Dropdown Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={govFilter}
              onChange={(e) => {
                setGovFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
            >
              <option value="">{lang === 'ar' ? 'تصفية المحافظات' : 'All Governorates'}</option>
              {governorateOptions.map((gov) => (
                <option key={gov} value={gov}>
                  {gov}
                </option>
              ))}
            </select>
          </div>

          {/* Table Keyword Search */}
          <div className="relative">
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                searchMode === 'owner'
                  ? (activeSheet === 'stations' ? 'اسم صاحب المحطة...' : 'اسم الوكيل...')
                  : searchMode === 'station'
                  ? (activeSheet === 'stations' ? 'اسم المحطة...' : 'اسم المكتب...')
                  : searchMode === 'phone'
                  ? 'رقم الهاتف...'
                  : searchMode === 'governorate'
                  ? 'اسم المحافظة...'
                  : 'بحث سريع...'
              }
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 w-36 sm:w-48"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Reset Filters button if active */}
          {(govFilter || tableSearch) && (
            <button
              type="button"
              onClick={() => {
                setGovFilter('');
                setTableSearch('');
                setSearchMode('all');
                setCurrentPage(1);
              }}
              className="p-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="إعادة ضبط الفلترة"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إلغاء الفلترة</span>
            </button>
          )}

          {/* Download Template */}
          <button
            onClick={handleDownloadTemplate}
            title="تحميل نموذج Excel فارغ"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">نموذج فارغ</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير Excel</span>
          </button>

          {/* Import Excel */}
          <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>استيراد</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

        </div>
      </div>

      {/* Active Technical Search / Filter Status Banner */}
      {(tableSearch.trim() || govFilter) && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-slate-900/10 border-b border-blue-200 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black shadow-sm">
              معادلة البحث المطبقة
            </span>
            <span>
              {searchMode === 'owner' && (activeSheet === 'stations' ? `👤 اسم صاحب المحطة: "${tableSearch}"` : `👤 اسم الوكيل: "${tableSearch}"`)}
              {searchMode === 'station' && (activeSheet === 'stations' ? `⛽ اسم المحطة: "${tableSearch}"` : `⛽ اسم المكتب: "${tableSearch}"`)}
              {searchMode === 'phone' && `📞 رقم الهاتف: "${tableSearch}"`}
              {searchMode === 'governorate' && `🏛️ اسم المحافظة: "${tableSearch}"`}
              {searchMode === 'all' && tableSearch && `🔍 بحث شامل في جميع الحقول: "${tableSearch}"`}
              {govFilter && ` [تصفية المحافظة: ${govFilter}]`}
            </span>
          </div>
          <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-3 py-0.5 rounded-full border border-blue-300/40">
            تم العثور على: {sheetRecords.length} سجل مطابق
          </span>
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right rtl:text-right">
          <thead className={`text-xs font-extrabold ${theadBg}`}>
            <tr>
              <th className="px-4 py-3">#</th>
              {fields.map((field) => (
                <th key={field.id} className="px-4 py-3 whitespace-nowrap">
                  {lang === 'ar' ? field.name : field.nameEn || field.name}
                </th>
              ))}
              <th className="px-4 py-3 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((rec, index) => {
                const isSelected = selectedRecord?.id === rec.id;

                return (
                  <tr
                    key={rec.id}
                    onClick={() => onSelectRecord(rec)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 font-semibold border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      {startIndex + index + 1}
                    </td>

                    {fields.map((field) => {
                      const val = rec[field.id];
                      let displayVal = val !== undefined && val !== null ? String(val) : '-';

                      if (field.type === 'radio' && field.options) {
                        const opt = field.options.find((o) => o.value === val);
                        if (opt) displayVal = opt.label;
                      }

                      return (
                        <td key={field.id} className="px-4 py-3 whitespace-nowrap text-slate-800 dark:text-slate-200">
                          {(field.id === 'subscriptionEndDate' || field.id === 'gasAgentSubscriptionEndDate') && val ? (() => {
                            const subInfo = getSubscriptionInfo(String(val));
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold">{displayVal}</span>
                                {subInfo.status === 'expired' && (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300/40 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-red-600 animate-pulse" />
                                    {lang === 'ar' ? subInfo.badgeTextAr : subInfo.badgeTextEn}
                                  </span>
                                )}
                                {subInfo.status === 'expiring_soon' && (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    {lang === 'ar' ? subInfo.badgeTextAr : subInfo.badgeTextEn}
                                  </span>
                                )}
                                {subInfo.status === 'active' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/30">
                                    {lang === 'ar' ? subInfo.badgeTextAr : subInfo.badgeTextEn}
                                  </span>
                                )}
                              </div>
                            );
                          })() : (
                            displayVal
                          )}
                        </td>
                      );
                    })}

                    <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectRecord(rec)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          title="تعديل في النموذج"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteRecord(rec.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                          title="حذف السجل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={fields.length + 2} className="px-4 py-8 text-center text-slate-400">
                  {lang === 'ar' ? 'لا توجد سجلات مطابقة في هذا الشيت' : 'No matching records in sheet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {lang === 'ar'
            ? `عرض ${startIndex + 1} - ${Math.min(startIndex + pageSize, sheetRecords.length)} من إجمالي ${sheetRecords.length} سجل`
            : `Showing ${startIndex + 1} - ${Math.min(startIndex + pageSize, sheetRecords.length)} of ${sheetRecords.length} records`}
        </span>

        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>

    </div>
  );
};
