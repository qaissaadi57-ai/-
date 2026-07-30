export type FieldType = 'text' | 'number' | 'date' | 'time' | 'select' | 'radio' | 'email' | 'tel';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldConfig {
  id: string;
  name: string;        // Display label in primary language (e.g. "اسم صاحب المحطة")
  nameEn?: string;      // English label
  type: FieldType;
  options?: FieldOption[]; // for select or radio
  required?: boolean;
  placeholder?: string;
  gridWidth?: 'half' | 'full';
  isSearchable?: boolean;
  validationRule?: 'phone' | 'email' | 'number' | 'text' | 'governorate' | 'city' | 'date';
  min?: number;
  max?: number;
  isUnique?: boolean;
}

export interface ProgramConfig {
  title: string;
  subtitle: string;
  dir: 'rtl' | 'ltr';
  primaryColor: string; // hex or tailwind class theme
  fields: FieldConfig[];
  stationFields?: FieldConfig[];
  agentFields?: FieldConfig[];
}

export type SheetType = 'stations' | 'agents';

export interface DataRecord {
  id: string;
  recordType?: SheetType;
  createdAt: string;
  updatedAt: string;
  [key: string]: any; // dynamic values based on field.id
}

export type ActionMode = 'create' | 'edit' | 'view';

