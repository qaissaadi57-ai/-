import React, { useState, useEffect } from 'react';
import { ProgramConfig, DataRecord, FieldConfig, SheetType } from '../types';
import { Search, Plus, Edit3, Trash2, RotateCcw, Check, User, MapPin, Building2, Phone, Calendar, Flame, AlertCircle, X, Filter } from 'lucide-react';
import { defaultStationFields, defaultAgentFields } from '../data/defaultConfig';
import { getCitiesByGovernorate } from '../data/iraqLocations';
import { evaluateSearchMatch, SearchCriterion, SearchMatchResult } from '../utils/searchAlgorithms';

interface FormCardProps {
  config: ProgramConfig;
  activeSheet: SheetType;
  selectedRecord: DataRecord | null;
  onAddRecord: (data: Record<string, any>) => void;
  onUpdateRecord: (id: string, data: Record<string, any>) => void;
  onDeleteRecord: (id: string) => void;
  onClearSelection: () => void;
  records: DataRecord[];
  onSelectRecord: (record: DataRecord) => void;
  lang: 'ar' | 'en';
}

export const FormCard: React.FC<FormCardProps> = ({
  config,
  activeSheet,
  selectedRecord,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onClearSelection,
  records,
  onSelectRecord,
  lang,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Independent Sheet Search States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchCriterion, setSearchCriterion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Determine active fields based on current sheet
  const fields: FieldConfig[] = activeSheet === 'stations'
    ? (config.stationFields || defaultStationFields)
    : (config.agentFields || defaultAgentFields);

  // Sync form data when selectedRecord or activeSheet changes
  useEffect(() => {
    if (selectedRecord) {
      const initial: Record<string, any> = {};
      fields.forEach((field) => {
        initial[field.id] = selectedRecord[field.id] ?? '';
      });
      setFormData(initial);
      setFieldErrors({});
    } else {
      resetForm();
    }
  }, [selectedRecord, activeSheet]);

  const resetForm = () => {
    const empty: Record<string, any> = {};
    fields.forEach((field) => {
      empty[field.id] = field.type === 'radio' && field.options?.[0] ? field.options[0].value : '';
    });
    setFormData(empty);
    setFieldErrors({});
    onClearSelection();
  };

  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));

    // Clear inline error when field is edited
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // Smart Validation & Duplicate Prevention Engine
  const validateForm = (data: Record<string, any>, currentRecordId?: string): boolean => {
    const errors: Record<string, string> = {};

    fields.forEach((field) => {
      const rawVal = data[field.id];
      const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';

      // 1. Required Check
      if (field.required && !valStr) {
        errors[field.id] = lang === 'ar' ? 'هذا الحقل مطلوب' : 'Field is required';
        return;
      }

      if (!valStr) return;

      // 2. Phone Validation
      if (field.type === 'tel' || field.validationRule === 'phone' || field.id === 'phone' || field.id === 'gasAgentPhone') {
        const cleanPhone = valStr.replace(/[\s\-\(\)]/g, '');
        const phoneRegex = /^(\+?964|0)?[0-9]{8,12}$/;
        if (!phoneRegex.test(cleanPhone)) {
          errors[field.id] = lang === 'ar' 
            ? 'رقم الهاتف غير صحيح (مثال: 07701234567)' 
            : 'Invalid phone number (e.g. 07701234567)';
        }
      }

      // 3. Unique Value Duplicate Prevention
      if (field.isUnique || field.id === 'stationName' || field.id === 'phone' || field.id === 'stationCode' || field.id === 'gasAgentPhone') {
        const duplicate = records.find((r) => {
          if (currentRecordId && r.id === currentRecordId) return false;
          const rVal = r[field.id];
          return rVal && String(rVal).trim().toLowerCase() === valStr.toLowerCase();
        });

        if (duplicate) {
          errors[field.id] = lang === 'ar' 
            ? `مستند مكرر! توجد خانة بنفس القيم (${valStr})` 
            : `Duplicate record with value (${valStr})`;
        }
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 1. ADD / DIRECT AUTO-SAVE
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(formData)) {
      showFeedback(lang === 'ar' ? 'يرجى تصحيح الأخطاء في النموذج قبل الحفظ' : 'Please fix validation errors', 'error');
      return;
    }

    onAddRecord({
      ...formData,
      recordType: activeSheet,
    });

    const recordTitle = formData.stationName || formData.gasAgentName || formData.ownerName || '';
    showFeedback(
      lang === 'ar'
        ? `تم الحفظ التلقائي للسجل بنجاح! 🟢 ${recordTitle ? `(${recordTitle})` : ''}`
        : `Record auto-saved successfully! ${recordTitle}`,
      'success'
    );
    resetForm();
  };

  // 2. UPDATE RECORD
  const handleUpdateSubmit = () => {
    if (!selectedRecord) {
      showFeedback(lang === 'ar' ? 'يرجى تحديد سجل من الجدول للتعديل' : 'Please select a record to update', 'error');
      return;
    }

    if (!validateForm(formData, selectedRecord.id)) {
      showFeedback(lang === 'ar' ? 'يرجى تصحيح الأخطاء في النموذج قبل الحفظ' : 'Please fix validation errors', 'error');
      return;
    }

    onUpdateRecord(selectedRecord.id, {
      ...formData,
      recordType: activeSheet,
    });

    showFeedback(lang === 'ar' ? 'تم تعديل وحفظ السجل بنجاح! ✏️' : 'Record updated successfully!', 'success');
  };

  // 3. DELETE RECORD
  const handleDeleteSubmit = () => {
    if (!selectedRecord) {
      showFeedback(lang === 'ar' ? 'يرجى تحديد سجل من الجدول للحذف' : 'Please select a record to delete', 'error');
      return;
    }

    if (window.confirm(lang === 'ar' ? 'هل أنت تأكد من إتمام عملية الحذف النهائي لهذا السجل؟' : 'Are you sure you want to delete this record?')) {
      onDeleteRecord(selectedRecord.id);
      resetForm();
      showFeedback(lang === 'ar' ? 'تم حذف السجل بنجاح! 🗑️' : 'Record deleted successfully!', 'info');
    }
  };

  // Filter search results using dedicated technical algorithms for active sheet search modal
  const searchResults = searchQuery.trim()
    ? records
        .map((rec) => {
          const isCurrentType = activeSheet === 'stations'
            ? (rec.recordType === 'stations' || (!rec.recordType && (rec.stationName || rec.ownerName)))
            : (rec.recordType === 'agents' || (!rec.recordType && rec.gasAgentName));
          if (!isCurrentType) return null;

          const evalResult = evaluateSearchMatch(rec, searchCriterion as SearchCriterion, searchQuery, activeSheet);
          if (!evalResult.isMatch) return null;
          return { rec, evalResult };
        })
        .filter((item): item is { rec: DataRecord; evalResult: SearchMatchResult } => item !== null)
    : [];

  const searchOptions = activeSheet === 'stations'
    ? [
        { label: 'الكل (جميع الحقول)', value: 'all' },
        { label: 'اسم صاحب المحطة فقط', value: 'ownerName' },
        { label: 'اسم المحطة فقط', value: 'stationName' },
        { label: 'رقم الهاتف فقط', value: 'phone' },
        { label: 'المحافظة (فلترة جميع أسماء المحافظة)', value: 'governorate' },
        { label: 'رقم / كود المحطة', value: 'stationCode' },
      ]
    : [
        { label: 'الكل (جميع الحقول)', value: 'all' },
        { label: 'اسم وكيل الغاز فقط', value: 'ownerName' },
        { label: 'رقم هاتف الوكيل فقط', value: 'phone' },
        { label: 'المحافظة (فلترة جميع وكلاء المحافظة)', value: 'governorate' },
        { label: 'المدينة / المنطقة', value: 'gasAgentCity' },
      ];

  const sheetTitle = activeSheet === 'stations' ? 'نموذج بيانات المحطات' : 'نموذج بيانات وكلاء الغاز';
  const sheetIcon = activeSheet === 'stations' ? Building2 : Flame;
  const SheetIconComponent = sheetIcon;

  const isStationSheet = activeSheet === 'stations';

  // Dynamic Vivid Field & Card Styling based on active sheet
  const cardBorderClass = isStationSheet
    ? 'border-blue-300 dark:border-blue-900/80 shadow-blue-900/10'
    : 'border-amber-300 dark:border-amber-900/80 shadow-amber-900/10';

  const headerBgClass = isStationSheet
    ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900'
    : 'bg-gradient-to-r from-amber-700 via-orange-700 to-rose-900';

  const iconTextClass = isStationSheet ? 'text-blue-300' : 'text-amber-300';

  const formBgClass = isStationSheet
    ? 'bg-blue-50/20 dark:bg-slate-900/40'
    : 'bg-amber-50/20 dark:bg-slate-900/40';

  const fieldCardClass = isStationSheet
    ? 'bg-white dark:bg-slate-950 p-3.5 rounded-2xl border-2 border-blue-200 dark:border-blue-900/60 shadow-sm hover:border-blue-400 dark:hover:border-blue-600 transition-all'
    : 'bg-white dark:bg-slate-950 p-3.5 rounded-2xl border-2 border-amber-200 dark:border-amber-900/60 shadow-sm hover:border-amber-400 dark:hover:border-amber-600 transition-all';

  const labelTextClass = isStationSheet
    ? 'text-blue-950 dark:text-blue-200 font-extrabold'
    : 'text-amber-950 dark:text-amber-200 font-extrabold';

  const labelBadgeClass = isStationSheet
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
    : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800';

  const labelBadgeText = isStationSheet ? 'محطات' : 'غاز';

  const inputNormalClass = isStationSheet
    ? 'border-blue-300 dark:border-blue-700/80 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/25 bg-blue-50/30 dark:bg-slate-900 text-blue-950 dark:text-blue-100 placeholder-blue-400/60'
    : 'border-amber-300 dark:border-amber-700/80 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/25 bg-amber-50/30 dark:bg-slate-900 text-amber-950 dark:text-amber-100 placeholder-amber-400/60';

  const radioClass = isStationSheet
    ? 'text-blue-600 focus:ring-blue-500 border-blue-300'
    : 'text-amber-600 focus:ring-amber-500 border-amber-300';

  const addButtonClass = isStationSheet
    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-blue-500/20'
    : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-500/20';

  return (
    <div className={`w-full max-w-7xl mx-auto mb-8 rounded-3xl shadow-xl border ${cardBorderClass} bg-white dark:bg-slate-900 overflow-hidden rtl transition-colors duration-300`}>
      
      {/* Card Top Header */}
      <div className={`p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 ${headerBgClass} text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
            <SheetIconComponent className={`w-6 h-6 ${iconTextClass}`} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <span>{sheetTitle}</span>
              {selectedRecord && (
                <span className="text-xs font-bold bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full">
                  {lang === 'ar' ? 'وضع التعديل' : 'Edit Mode'}
                </span>
              )}
            </h2>
            <p className="text-xs text-white/80 font-medium">
              {activeSheet === 'stations'
                ? 'إدخال وتحديث سجلات محطات الوقود وأصحابها'
                : 'إدخال وتحديث سجلات وكلاء الغاز والمناطق المغطاة'}
            </p>
          </div>
        </div>

        {selectedRecord && (
          <button
            type="button"
            onClick={resetForm}
            className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'إلغاء التحديد والتعديل' : 'Cancel Edit'}</span>
          </button>
        )}
      </div>

      {/* Direct Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-3 text-xs font-bold flex items-center justify-between px-5 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500 text-white'
              : feedbackMsg.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            {feedbackMsg.text}
          </span>
          <button onClick={() => setFeedbackMsg(null)} className="opacity-80 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleAddSubmit} className={`p-5 sm:p-6 space-y-6 ${formBgClass}`}>
        
        {/* Dynamic Fields Grid with Vibrant Box Styling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((field) => {
            const val = formData[field.id] ?? '';
            const error = fieldErrors[field.id];

            return (
              <div key={field.id} className={fieldCardClass}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-xs ${labelTextClass}`}>
                    {field.name}
                    {field.required && <span className="text-rose-500 mr-1">*</span>}
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${labelBadgeClass}`}>
                    {labelBadgeText}
                  </span>
                </div>

                {/* Free Text Input (Used for City/District as explicitly requested!) */}
                {field.type === 'text' || field.type === 'tel' || field.type === 'email' || field.type === 'number' || field.type === 'date' ? (
                  <div className="relative">
                    <input
                      type={field.type}
                      value={val}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder={field.placeholder || ''}
                      className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border transition-all outline-none ${
                        error
                          ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                          : inputNormalClass
                      }`}
                    />
                  </div>
                ) : field.type === 'select' ? (
                  <select
                    value={val}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border transition-all outline-none cursor-pointer ${
                      error
                        ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                        : inputNormalClass
                    }`}
                  >
                    <option value="">{field.placeholder || 'اختر من القائمة...'}</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'radio' ? (
                  <div className="flex items-center gap-4 pt-1">
                    {field.options?.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="radio"
                          name={field.id}
                          value={opt.value}
                          checked={val === opt.value}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className={`w-4 h-4 ${radioClass}`}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                ) : null}

                {error && (
                  <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1 mt-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* 5-Button Action Toolbar (إضافة، بحث، تعديل، حذف، تفريغ) */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. Add / Direct Save Button */}
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl ${addButtonClass} text-xs font-extrabold transition-all active:scale-95 flex items-center gap-2 cursor-pointer`}
            >
              <Plus className="w-4 h-4" />
              <span>إضافة (حفظ تلقائي)</span>
            </button>

            {/* 2. Search Button (Opens dedicated sheet search modal) */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4 text-amber-400" />
              <span>بحث في البيانات</span>
            </button>

            {/* 3. Update Button */}
            <button
              type="button"
              onClick={handleUpdateSubmit}
              disabled={!selectedRecord}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
                selectedRecord
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>تعديل</span>
            </button>

            {/* 4. Delete Button */}
            <button
              type="button"
              onClick={handleDeleteSubmit}
              disabled={!selectedRecord}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
                selectedRecord
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف</span>
            </button>

            {/* 5. Clear Form Button */}
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>تفريغ الحقول</span>
            </button>
          </div>

        </div>

      </form>

      {/* Dedicated Sheet Search Dialog / Popover */}
      {isSearchOpen && (
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              <span>بحث مخصص في {activeSheet === 'stations' ? 'المحطات' : 'وكلاء الغاز'}</span>
            </h4>
            <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Criterion Selection Dropdown */}
            <select
              value={searchCriterion}
              onChange={(e) => setSearchCriterion(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none w-full sm:w-auto"
            >
              {searchOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Search Input Box */}
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="اكتب كلمة البحث هنا..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Live Search Results List */}
          {searchQuery.trim() && (
            <div className="max-h-52 overflow-y-auto space-y-2 pt-2">
              {searchResults.length > 0 ? (
                searchResults.map(({ rec, evalResult }) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      onSelectRecord(rec);
                      setIsSearchOpen(false);
                      showFeedback(`تم تحميل سجل: ${rec.stationName || rec.gasAgentName || rec.ownerName}`, 'info');
                    }}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all shadow-sm active:scale-98"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-slate-100 text-xs">
                          {evalResult.primaryTitle}
                        </span>
                        {evalResult.matchedFieldLabel && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300/60 flex items-center gap-1">
                            <span>{evalResult.matchedFieldLabel}:</span>
                            <span className="underline decoration-amber-500 font-extrabold">{evalResult.matchedValue}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {evalResult.secondaryInfo}
                      </span>
                    </div>
                    <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/50 px-2.5 py-1 rounded-lg self-start sm:self-center border border-blue-200/50">
                      {rec.governorate || rec.gasAgentGovernorate || 'المحافظة'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-3">لا توجد نتائج مطابقة لمعادلة البحث المحددة</p>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
