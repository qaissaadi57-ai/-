import React, { useState } from 'react';
import { ProgramConfig, FieldConfig, FieldType } from '../types';
import { X, Plus, Trash2, Edit2, Settings, MoveUp, MoveDown, Save, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomizeFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProgramConfig;
  onSaveConfig: (newConfig: ProgramConfig) => void;
  lang: 'ar' | 'en';
}

export const CustomizeFieldsModal: React.FC<CustomizeFieldsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  lang,
}) => {
  const [title, setTitle] = useState(config.title);
  const [subtitle, setSubtitle] = useState(config.subtitle);
  const [dir, setDir] = useState<'rtl' | 'ltr'>(config.dir);
  const [fields, setFields] = useState<FieldConfig[]>([...config.fields]);

  // New field state
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldNameEn, setNewFieldNameEn] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  if (!isOpen) return null;

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const newId = 'field_' + Date.now();
    const newF: FieldConfig = {
      id: newId,
      name: newFieldName,
      nameEn: newFieldNameEn || newFieldName,
      type: newFieldType,
      required: newFieldRequired,
      gridWidth: 'half',
    };
    if (newFieldType === 'radio') {
      newF.options = [
        { label: lang === 'ar' ? 'نعم' : 'Yes', value: 'yes' },
        { label: lang === 'ar' ? 'لا' : 'No', value: 'no' },
      ];
    }
    setFields([...fields, newF]);
    setNewFieldName('');
    setNewFieldNameEn('');
    setNewFieldRequired(false);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const copy = [...fields];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setFields(copy);
  };

  const handleUpdateFieldLabel = (index: number, newName: string) => {
    const copy = [...fields];
    copy[index].name = newName;
    setFields(copy);
  };

  const handleSave = () => {
    onSaveConfig({
      ...config,
      title,
      subtitle,
      dir,
      fields,
    });
    onClose();
  };

  const isRtl = dir === 'rtl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ${isRtl ? 'rtl' : 'ltr'}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {lang === 'ar' ? 'تخصيص اسم البرنامج والعناوين والحقول' : 'Customize Program Name & Fields'}
              </h2>
              <p className="text-xs text-blue-100">
                {lang === 'ar' ? 'يمكنك تغيير اسم البرنامج وأسماء الحقول بالكامل لتطابق متطلباتك' : 'Customize the program title and box field labels'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Program Title & Subtitle Settings */}
          <div className="bg-blue-50/60 dark:bg-slate-800/50 p-4 rounded-2xl border border-blue-100 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              {lang === 'ar' ? 'عنوان واجهة البرنامج' : 'Program Title & Header'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'ar' ? 'اسم البرنامج الرئيسي' : 'Main Program Title'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'ar' ? 'العنوان الفرعي' : 'Subtitle'}
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'ar' ? 'اتجاه الكتابة' : 'Text Direction'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDir('rtl')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border ${
                      dir === 'rtl' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    من اليمين لليار (RTL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDir('ltr')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border ${
                      dir === 'ltr' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Left-to-Right (LTR)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Existing Fields List */}
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3">
              {lang === 'ar' ? 'قائمة حقول وصناديق الإدخال الحالية:' : 'Current Form Fields:'}
            </h3>

            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex flex-col gap-1 text-slate-400">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveField(idx, 'up')}
                      className="hover:text-blue-600 disabled:opacity-30"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === fields.length - 1}
                      onClick={() => handleMoveField(idx, 'down')}
                      className="hover:text-blue-600 disabled:opacity-30"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => handleUpdateFieldLabel(idx, e.target.value)}
                      placeholder="اسم الحقل"
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100"
                    />
                    <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md text-center font-mono">
                      {field.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      ID: {field.id}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveField(field.id)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="حذف الحقل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Field Section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2">
              {lang === 'ar' ? 'إضافة حقل/صندوق جديد إلى النموذج:' : 'Add New Field:'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder={lang === 'ar' ? 'اسم الحقل (مثلاً: رقم الهاتف)' : 'Field Name'}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm outline-none"
              />

              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm outline-none"
              >
                <option value="text">نص عادي (Text)</option>
                <option value="number">رقم (Number)</option>
                <option value="date">تاريخ (Date)</option>
                <option value="select">قائمة خيارات (Select)</option>
                <option value="radio">خيارات اختيار (Radio)</option>
              </select>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 px-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>{lang === 'ar' ? 'حقل إجباري' : 'Required'}</span>
              </label>

              <button
                type="button"
                onClick={handleAddField}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إضافة الحقل' : 'Add Field'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-md transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
