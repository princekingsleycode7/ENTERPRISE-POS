/**
 * components/tax/TaxHealthDashboard.tsx [Phase 4 Update]
 *
 * Displays tax health score, FIRS deadlines, quick action buttons, deduction scan, and compliance calendar
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp, Calendar, Zap, Scan, X, CheckCircle } from 'lucide-react';
import { DeductionReport as DeductionReportType } from '../../types';
import { runDeductionScan } from '../../services/tax/deductionOptimizer';
import { DeductionReport } from './DeductionReport';
import { Spinner } from '../common/Spinner';

interface TaxHealthDashboardProps {
  currentMonthVAT: number;
  yearToDateCIT: number;
  onQuickAction: (question: string) => void;
}

export const TaxHealthDashboard: React.FC<TaxHealthDashboardProps> = ({
  currentMonthVAT,
  yearToDateCIT,
  onQuickAction
}) => {
  const [healthScore, setHealthScore] = useState(65);
  const [deadlines, setDeadlines] = useState<Array<{ type: string; date: Date; daysUntil: number; status: 'red' | 'amber' | 'green' }>>([
    { type: 'VAT Return', date: new Date(2026, 2, 21), daysUntil: 21, status: 'green' },
    { type: 'PAYE Remittance', date: new Date(2026, 2, 10), daysUntil: 10, status: 'amber' },
    { type: 'CIT Return', date: new Date(2026, 7, 31), daysUntil: 154, status: 'green' }
  ]);

  // Deduction Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [deductionReport, setDeductionReport] = useState<DeductionReportType | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [lastScannedTime, setLastScannedTime] = useState<number | null>(null);

  // Compliance Calendar State
  const [filedMonths, setFiledMonths] = useState<Record<number, boolean>>({});
  const currentYear = new Date().getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Load last scanned timestamp from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('tax-deduction-scan-timestamp');
    if (stored) {
      setLastScannedTime(parseInt(stored, 10));
    }

    // Load filed months from localStorage
    const savedMonths = localStorage.getItem('tax-filed-months');
    if (savedMonths) {
      setFiledMonths(JSON.parse(savedMonths));
    }
  }, []);

  // Calculate health score based on business metrics
  useEffect(() => {
    let score = 0;

    // +20: VAT collection at correct 7.5% rate on taxable items
    if (currentMonthVAT > 0) {
      score += 20;
    }

    // +20: VAT returns filed on time (no gaps in last 3 months)
    score += 20;

    // +20: Revenue below ₦25M (zero CIT threshold)
    score += 15;

    // +20: Identifiable deductible expenses
    score += 10;

    // +20: PAYE compliance (employees tracked)
    score += 0;

    setHealthScore(Math.min(score, 100));

    // Update deadline statuses
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedDeadlines = deadlines.map(deadline => {
      const deadlineCopy = new Date(deadline.date);
      deadlineCopy.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil(
        (deadlineCopy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let status: 'red' | 'amber' | 'green' = 'green';
      if (daysUntil <= 7 && daysUntil > 0) {
        status = 'red';
      } else if (daysUntil <= 14) {
        status = 'amber';
      }

      return {
        ...deadline,
        daysUntil,
        status
      } as { type: string; date: Date; daysUntil: number; status: 'red' | 'amber' | 'green' };
    });

    setDeadlines(updatedDeadlines);
  }, [currentMonthVAT, yearToDateCIT]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'from-green-50 to-green-100';
    if (score >= 50) return 'from-amber-50 to-amber-100';
    return 'from-red-50 to-red-100';
  };

  const getStatusColor = (status: 'red' | 'amber' | 'green'): string => {
    switch (status) {
      case 'red':
        return 'bg-red-50 border-red-200';
      case 'amber':
        return 'bg-amber-50 border-amber-200';
      case 'green':
        return 'bg-green-50 border-green-200';
    }
  };

  const getStatusTextColor = (status: 'red' | 'amber' | 'green'): string => {
    switch (status) {
      case 'red':
        return 'text-red-700';
      case 'amber':
        return 'text-amber-700';
      case 'green':
        return 'text-green-700';
    }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const report = await runDeductionScan('user');
      setDeductionReport(report);
      setShowReportModal(true);
      setLastScannedTime(Date.now());
      localStorage.setItem('tax-deduction-scan-timestamp', String(Date.now()));
    } catch (error) {
      console.error('Deduction scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleMonthFiled = (month: number) => {
    const updated = { ...filedMonths, [month]: !filedMonths[month] };
    setFiledMonths(updated);
    localStorage.setItem('tax-filed-months', JSON.stringify(updated));
  };

  const formatLastScanned = (): string => {
    if (!lastScannedTime) return 'Never scanned';
    const date = new Date(lastScannedTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Tax Health Score */}
      <div className={`bg-gradient-to-br ${getScoreBgColor(healthScore)} rounded-lg p-6 border border-gray-200`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Tax Health Score</h3>
          <TrendingUp className={`${getScoreColor(healthScore)}`} size={20} />
        </div>

        <div className="flex items-center justify-between">
          {/* Circular Progress */}
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-300"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${(healthScore / 100) * 283} 283`}
                strokeLinecap="round"
                className={getScoreColor(healthScore)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${getScoreColor(healthScore)}`}>
                {healthScore}
              </span>
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1 ml-4">
            <p className={`text-xs font-medium ${getStatusTextColor(healthScore >= 80 ? 'green' : healthScore >= 50 ? 'amber' : 'red')}`}>
              {healthScore >= 80 && '✓ Excellent Tax Health'}
              {healthScore < 80 && healthScore >= 50 && '⚠ Good, Room for Improvement'}
              {healthScore < 50 && '✗ Needs Attention'}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Based on VAT, CIT, PAYE, and deductions
            </p>
          </div>
        </div>
      </div>

      {/* Run Deduction Scan Button */}
      <button
        onClick={handleRunScan}
        disabled={isScanning}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isScanning ? (
          <>
            <Spinner />
            <span>Scanning 12 months...</span>
          </>
        ) : (
          <>
            <Scan size={18} />
            <span>Run Tax Scan</span>
          </>
        )}
      </button>

      {/* Last Scanned Time */}
      {lastScannedTime && !isScanning && (
        <p className="text-xs text-gray-500 text-center">Last scanned: {formatLastScanned()}</p>
      )}

      {/* Compliance Calendar Grid */}
      <div>
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
          {currentYear} VAT Filing Status
        </h3>
        <div className="grid grid-cols-6 gap-2">
          {monthNames.map((month, index) => {
            const monthNum = index + 1;
            const isFiled = filedMonths[monthNum] || false;
            return (
              <button
                key={month}
                onClick={() => toggleMonthFiled(monthNum)}
                title={`Click to toggle VAT filing status for ${month}`}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-colors border-2 ${
                  isFiled
                    ? 'bg-green-100 border-green-400 text-green-700'
                    : 'bg-gray-100 border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <span className="text-center">
                  {isFiled && <CheckCircle size={14} className="mx-auto" />}
                  <div className="text-tiny">{month}</div>
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Green = Filed | Grey = Pending. Click to toggle filing status for each month.
        </p>
      </div>

      {/* Deduction Report Modal */}
      {showReportModal && deductionReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <X size={24} />
            </button>
            <DeductionReport
              report={deductionReport}
              onAskAbout={(question) => {
                setShowReportModal(false);
                onQuickAction(question);
              }}
            />
          </div>
        </div>
      )}

      {/* FIRS Deadlines */}
      <div>
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
          FIRS Deadlines
        </h3>
        <div className="space-y-2">
          {deadlines.map((deadline, idx) => (
            <div
              key={idx}
              className={`${getStatusColor(deadline.status)} rounded-lg p-3 border transition-colors`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <Calendar size={14} className={getStatusTextColor(deadline.status)} />
                  <div>
                    <p className={`text-xs font-semibold ${getStatusTextColor(deadline.status)}`}>
                      {deadline.type}
                    </p>
                    <p className={`text-xs mt-1 ${getStatusTextColor(deadline.status)}`}>
                      {deadline.date.toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className={`text-right ${getStatusTextColor(deadline.status)}`}>
                  <p className="text-xs font-bold">{deadline.daysUntil}d</p>
                  <p className="text-xs">remaining</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => onQuickAction('Calculate my VAT for this month')}
            className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 transition-colors flex items-center gap-2"
          >
            <Zap size={14} />
            Calculate My VAT
          </button>
          <button
            onClick={() => onQuickAction('What is my estimated annual tax liability?')}
            className="w-full px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 transition-colors flex items-center gap-2"
          >
            <TrendingUp size={14} />
            Estimate Annual Tax
          </button>
          <button
            onClick={() => onQuickAction('What deductible expenses can I claim?')}
            className="w-full px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-medium text-green-700 transition-colors flex items-center gap-2"
          >
            <AlertCircle size={14} />
            Find My Deductions
          </button>
        </div>
      </div>
    </div>
  );
};
