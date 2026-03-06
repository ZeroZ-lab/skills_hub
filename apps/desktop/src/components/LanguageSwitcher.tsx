import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Select } from '@/components/ui/select';

const languages = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="flex w-full items-center gap-2">
      <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Select
        className="h-8 text-xs"
        options={languages}
        value={i18n.language}
        onChange={handleChange}
      />
    </div>
  );
}
