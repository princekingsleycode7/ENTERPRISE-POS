/**
 * components/tax/TaxReports.tsx
 *
 * Tax Report Generation Interface
 * Allows users to generate VAT, CIT, and annual summary PDF reports
 */

import React, { useState, useEffect } from 'react';
import { Download, Mail, Calendar, Loader } from 'lucide-react';
import { generateVATReport, generateCITEstimate, generateAnnualTaxSummary } from '../../services/tax/taxReportPDF';
import { offlineDB } from '../../services/offline/db';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface ReportState {
  loading: boolean;
  lastGenerated?: Date;
}

const TaxReports: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const [settings, setSettings] = useState<any>(null);
  const [vatMonth, setVatMonth] = useState<number>(new Date().getMonth() + 1);
  const [vatYear, setVatYear] = useState<number>(new Date().getFullYear());
  const [citYear, setCitYear] = useState<number>(new Date().getFullYear());
  const [summaryYear, setSummaryYear] = useState<number>(new Date().getFullYear());

  const [vatReport, setVatReport] = useState<ReportState>({ loading: false });
  const [citReport, setCitReport] = useState<ReportState>({ loading: false });
  const [summaryReport, setSummaryReport] = useState<ReportState>({ loading: false });

  // Load settings and last generated dates from database
  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await offlineDB.settings.get('global');
      if (savedSettings) {
        setSettings(savedSettings);
      }
    };
    loadSettings();

    const savedVatDate = localStorage.getItem('lastVATReportGenerated');
    const savedCitDate = localStorage.getItem('lastCITReportGenerated');
    const savedSummaryDate = localStorage.getItem('lastAnnualSummaryGenerated');

    if (savedVatDate) setVatReport(prev => ({ ...prev, lastGenerated: new Date(savedVatDate) }));
    if (savedCitDate) setCitReport(prev => ({ ...prev, lastGenerated: new Date(savedCitDate) }));
    if (savedSummaryDate) setSummaryReport(prev => ({ ...prev, lastGenerated: new Date(savedSummaryDate) }));
  }, []);

  const handleVATReportGenerate = async () => {
    setVatReport(prev => ({ ...prev, loading: true }));
    try {
      const monthName = new Date(vatYear, vatMonth - 1).toLocaleString('en-NG', { month: 'long' });
      const blob = await generateVATReport(vatMonth, vatYear, {
        businessName: settings?.store_name || 'Your Store',
        businessAddress: settings?.address || 'Store Address',
        businessTIN: settings?.nin_or_tin ? `TIN: ${settings.nin_or_tin}` : 'TIN: Not Set'
      });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VAT_Report_${monthName}_${vatYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Update localStorage
      localStorage.setItem('lastVATReportGenerated', new Date().toISOString());
      setVatReport(prev => ({ ...prev, lastGenerated: new Date() }));
      addNotification('success', '✓ VAT Report generated successfully');
    } catch (error) {
      console.error('Error generating VAT report:', error);
      addNotification('error', '✗ Error generating VAT report. Check console for details.');
    } finally {
      setVatReport(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCITReportGenerate = async () => {
    setCitReport(prev => ({ ...prev, loading: true }));
    try {
      const blob = await generateCITEstimate(citYear, {
        businessName: settings?.store_name || 'Your Store',
        businessAddress: settings?.address || 'Store Address'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CIT_Estimate_${citYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      localStorage.setItem('lastCITReportGenerated', new Date().toISOString());
      setCitReport(prev => ({ ...prev, lastGenerated: new Date() }));
      addNotification('success', '✓ CIT Estimate generated successfully');
    } catch (error) {
      console.error('Error generating CIT report:', error);
      addNotification('error', '✗ Error generating CIT report. Check console for details.');
    } finally {
      setCitReport(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSummaryGenerate = async () => {
    setSummaryReport(prev => ({ ...prev, loading: true }));
    try {
      const blob = await generateAnnualTaxSummary(summaryYear, undefined, {
        businessName: settings?.store_name || 'Your Store'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Annual_Tax_Summary_${summaryYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      localStorage.setItem('lastAnnualSummaryGenerated', new Date().toISOString());
      setSummaryReport(prev => ({ ...prev, lastGenerated: new Date() }));
      addNotification('success', '✓ Annual Summary generated successfully');
    } catch (error) {
      console.error('Error generating annual summary:', error);
      addNotification('error', '✗ Error generating annual summary. Check console for details.');
    } finally {
      setSummaryReport(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSendToEmail = (reportType: string) => {
    const subject = `Tax Report: ${reportType} - ${new Date().getFullYear()}`;
    const body = `I have attached the ${reportType} report generated from my POS system. Please review and advise.`;
    window.location.href = `mailto:your-accountant@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    addNotification('info', '✓ Email client opened. Please attach the PDF manually.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Tax Reports</h2>
        <p className="text-sm text-gray-600 mb-6">Generate professional PDF reports for VAT, CIT, and annual tax compliance.</p>
      </div>

      {/* VAT Report Card */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Monthly VAT Report</h3>
            <p className="text-sm text-gray-600 mt-1">FIRS-compliant VAT return with transaction details</p>
          </div>
          <div className="text-blue-600"><Calendar size={24} /></div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Month</label>
            <select
              value={vatMonth}
              onChange={(e) => setVatMonth(parseInt(e.target.value))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: new Date(vatYear, i).toLocaleString('en-NG', { month: 'long' })
              })).map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Year</label>
            <select
              value={vatYear}
              onChange={(e) => setVatYear(parseInt(e.target.value))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {vatReport.lastGenerated && (
          <p className="text-xs text-gray-500 mb-3">Last generated: {vatReport.lastGenerated.toLocaleString('en-NG')}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleVATReportGenerate}
            disabled={vatReport.loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {vatReport.loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download size={18} />
                Generate PDF
              </>
            )}
          </button>
          <button
            onClick={() => handleSendToEmail('Monthly VAT Report')}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Mail size={18} />
            Send Email
          </button>
        </div>
      </div>

      {/* CIT Estimate Card */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">CIT Estimate</h3>
            <p className="text-sm text-gray-600 mt-1">Annual Company Income Tax computation and liability</p>
          </div>
          <div className="text-green-600"><Calendar size={24} /></div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700">Tax Year</label>
          <select
            value={citYear}
            onChange={(e) => setCitYear(parseInt(e.target.value))}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {citReport.lastGenerated && (
          <p className="text-xs text-gray-500 mb-3">Last generated: {citReport.lastGenerated.toLocaleString('en-NG')}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleCITReportGenerate}
            disabled={citReport.loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {citReport.loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download size={18} />
                Generate PDF
              </>
            )}
          </button>
          <button
            onClick={() => handleSendToEmail('CIT Estimate')}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Mail size={18} />
            Send Email
          </button>
        </div>
      </div>

      {/* Annual Summary Card */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Annual Tax Summary</h3>
            <p className="text-sm text-gray-600 mt-1">Executive overview with revenue, tax burden, and optimization opportunities</p>
          </div>
          <div className="text-purple-600"><Calendar size={24} /></div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700">Tax Year</label>
          <select
            value={summaryYear}
            onChange={(e) => setSummaryYear(parseInt(e.target.value))}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {summaryReport.lastGenerated && (
          <p className="text-xs text-gray-500 mb-3">Last generated: {summaryReport.lastGenerated.toLocaleString('en-NG')}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSummaryGenerate}
            disabled={summaryReport.loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {summaryReport.loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download size={18} />
                Generate PDF
              </>
            )}
          </button>
          <button
            onClick={() => handleSendToEmail('Annual Tax Summary')}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Mail size={18} />
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxReports;
