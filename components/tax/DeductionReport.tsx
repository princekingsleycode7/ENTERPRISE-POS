/**
 * components/tax/DeductionReport.tsx
 *
 * Visual display of the Deduction Scan results
 * Shows potential tax savings with tabs for each category
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Zap,
  X
} from 'lucide-react';
import { DeductionReport as DeductionReportType } from '../../types';
import { formatNaira } from '../../services/tax/taxAgentService';

interface DeductionReportProps {
  report: DeductionReportType;
  onClose?: () => void;
  onAskAbout?: (question: string) => void;
}

type TabType = 'priority' | 'vat' | 'deductions' | 'capital';

export const DeductionReport: React.FC<DeductionReportProps> = ({
  report,
  onClose,
  onAskAbout
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('priority');

  const savingsPercentage = report.totalPotentialSavings > 0 ? '✅' : '⚠️';

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-h-96 flex flex-col">
      {/* Header with Close Button */}
      <div className="flex items-center justify-between p-6 pb-0">
        <h2 className="text-2xl font-bold text-gray-900">Tax Optimization Scan</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Green Banner - Total Savings */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-6 py-4 mx-6 mt-4 rounded-lg">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-green-600" size={28} />
          <div>
            <p className="text-sm text-green-700">Estimated Tax Savings</p>
            <p className="text-3xl font-bold text-green-900">
              {formatNaira(report.totalPotentialSavings)}
            </p>
            <p className="text-xs text-green-700 mt-1">
              {report.priorityActions.length} actionable opportunities found
            </p>
          </div>
        </div>
      </div>

      {/* Threshold Warning Banner */}
      {report.thresholdWarning && report.thresholdWarning.isCritical && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 mx-6 mt-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {report.thresholdWarning.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-6 mt-4 gap-1">
        <button
          onClick={() => setActiveTab('priority')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'priority'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Priority Actions
        </button>
        {report.vatOvercharges.length > 0 && (
          <button
            onClick={() => setActiveTab('vat')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'vat'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            VAT Issues ({report.vatOvercharges.length})
          </button>
        )}
        {report.missedDeductions.length > 0 && (
          <button
            onClick={() => setActiveTab('deductions')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'deductions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Missed Deductions ({report.missedDeductions.length})
          </button>
        )}
        {report.capitalAllowances.length > 0 && (
          <button
            onClick={() => setActiveTab('capital')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'capital'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Capital Allowances ({report.capitalAllowances.length})
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Priority Actions */}
        {activeTab === 'priority' && (
          <div className="space-y-3">
            {report.priorityActions.length === 0 ? (
              <p className="text-gray-500 text-sm">No priority actions identified.</p>
            ) : (
              report.priorityActions.map(action => (
                <div
                  key={action.rank}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold">
                        {action.rank}
                      </span>
                      <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        action.effortLevel === 'Low'
                          ? 'bg-green-100 text-green-700'
                          : action.effortLevel === 'Medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {action.effortLevel} Effort
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{action.description}</p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatNaira(action.estimatedSavingNaira)}
                      </p>
                      <p className="text-xs text-gray-500">{action.lawReference}</p>
                    </div>
                    {onAskAbout && (
                      <button
                        onClick={() => onAskAbout(action.actionableQuestion)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        Ask About This
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* VAT Issues */}
        {activeTab === 'vat' && (
          <div className="overflow-x-auto">
            {report.vatOvercharges.length === 0 ? (
              <p className="text-gray-500 text-sm">No VAT overcharges identified.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Item</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700">Qty</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700">VAT Charged</th>
                  </tr>
                </thead>
                <tbody>
                  {report.vatOvercharges.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="px-3 py-2 text-gray-900">{item.itemName}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-semibold text-red-600">
                        {formatNaira(item.vatChargedNaira)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Missed Deductions */}
        {activeTab === 'deductions' && (
          <div className="overflow-x-auto">
            {report.missedDeductions.length === 0 ? (
              <p className="text-gray-500 text-sm">No missed deductions identified.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Category</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700">Amount</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Law Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {report.missedDeductions.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="px-3 py-2 text-gray-900">{item.description}</td>
                      <td className="px-3 py-2 text-right font-semibold text-blue-600">
                        {formatNaira(item.amount)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{item.lawCitation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Capital Allowances */}
        {activeTab === 'capital' && (
          <div className="overflow-x-auto">
            {report.capitalAllowances.length === 0 ? (
              <p className="text-gray-500 text-sm">No capital allowances identified.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">
                      Equipment
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700">Cost</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700">
                      Initial (50%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.capitalAllowances.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="px-3 py-2 text-gray-900">{item.description}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {formatNaira(item.costNaira)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-purple-600">
                        {formatNaira(item.initialAllowance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 text-xs text-gray-600">
        <p>
          Scan completed: {new Date(report.scanDate).toLocaleString()}
        </p>
       
      </div>
    </div>
  );
};
