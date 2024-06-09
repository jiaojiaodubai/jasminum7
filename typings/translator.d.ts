type TranslatorRow = {
  zhLabel: string;
  enLabel: string;
  filename: string;
  localeUpdateTime: string;
  remoteUpdateTime: string;
  status: string;
};

type TranslatorMetadata = {
  translatorID: string;
  label: string;
  creator: string;
  target: string;
  minVersion?: string;
  maxVersion?: string;
  priority: number;
  inRepository: boolean;
  translatorType: number;
  browserSupport?: string;
  lastUpdated: string;
};
