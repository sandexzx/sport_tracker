import { useState } from 'react';

export function useExportData() {
  const [isExporting, setIsExporting] = useState(false);

  const exportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sport_tracker_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportData, isExporting };
}
