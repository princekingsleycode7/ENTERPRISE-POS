/**
 * components/tax/FIRSFilingGuide.tsx
 *
 * Step-by-Step FIRS Filing Guide
 * Provides interactive walkthroughs for VAT, PAYE, and CIT filing on TaxPro Max
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle, Circle, HelpCircle } from 'lucide-react';

interface FilingStep {
  number: number;
  title: string;
  description: string;
  details: string[];
  deadline?: string;
  link?: string;
}

interface FilingSection {
  name: string;
  icon: string;
  color: string;
  steps: FilingStep[];
  deadline?: string;
}

const FIRSFilingGuide: React.FC = () => {
  const [openSection, setOpenSection] = useState<string>('VAT');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Load completed steps from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('firsFilingStepsCompleted');
    if (saved) {
      setCompletedSteps(JSON.parse(saved));
    }
  }, []);

  // Save completed steps to localStorage
  const toggleStep = (stepId: string) => {
    const updated = { ...completedSteps, [stepId]: !completedSteps[stepId] };
    setCompletedSteps(updated);
    localStorage.setItem('firsFilingStepsCompleted', JSON.stringify(updated));
  };

  const sections: FilingSection[] = [
    {
      name: 'VAT',
      icon: '📋',
      color: 'blue',
      deadline: '21st of following month',
      steps: [
        {
          number: 1,
          title: 'Log into TaxPro Max',
          description: 'Access the FIRS online filing portal',
          details: [
            'Visit: https://taxpromax.firs.gov.ng',
            'Login with your TIN (Tax Identification Number)',
            'Enter your password and 2FA code if enabled',
            'You should see your account dashboard'
          ],
          link: 'https://taxpromax.firs.gov.ng'
        },
        {
          number: 2,
          title: 'Navigate to VAT Returns',
          description: 'Find the correct filing form',
          details: [
            'Click on "Filings" or "Tax Returns" in the left menu',
            'Look for "VAT Return" or "Form A (VAT Return)"',
            'Select the relevant period (month/year)',
            'The system shows unfiled periods in red'
          ]
        },
        {
          number: 3,
          title: 'Select Filing Period',
          description: 'Choose the month and year to file',
          details: [
            'Click on the month you need to file (e.g., January 2025)',
            'The VAT form will open for that period',
            'Verify the period displayed at the top of the form',
            'Do NOT file for future months'
          ]
        },
        {
          number: 4,
          title: 'Enter VAT Figures',
          description: 'Input tax calculation data',
          details: [
            'Output VAT field: Enter total VAT collected on sales (₦)',
            'Input VAT field: Enter total VAT paid on purchases (can claim back)',
            'Net Tax Payable: System auto-calculates (Output VAT - Input VAT)',
            'If Net Tax Payable is negative (over-claimed), FIRS carries forward',
            'Double-check all figures before submission'
          ]
        },
        {
          number: 5,
          title: 'Submit and Save',
          description: 'Finalize your VAT filing',
          details: [
            'Click "Submit" or "File Return" button',
            'FIRS will display an "Acknowledgment Number" (save this)',
            'Download the PDF receipt as proof of filing',
            'You should receive email confirmation from FIRS within 24 hours',
            'Mark this month as "FILED" in your compliance calendar'
          ],
          deadline: 'Must file by 21st of the following month'
        }
      ]
    },
    {
      name: 'PAYE',
      icon: '👥',
      color: 'green',
      deadline: '10th of following month',
      steps: [
        {
          number: 1,
          title: 'Log into TaxPro Max',
          description: 'Access FIRS portal with your credentials',
          details: [
            'Visit: https://taxpromax.firs.gov.ng',
            'Login with TIN and password',
            'Verify you see "PAYE/Payroll" in menu (requires employer registration)',
            'If not visible, your business may not be registered for PAYE'
          ],
          link: 'https://taxpromax.firs.gov.ng'
        },
        {
          number: 2,
          title: 'Navigate to PAYE/Payroll',
          description: 'Access monthly payroll filing section',
          details: [
            'Click "Filings" → "PAYE Returns"',
            'Or look for "Payroll Management" module',
            'Current month should show as "DUE" or "PENDING SUBMISSION"',
            'Past unfiled months appear with reminder notifications'
          ]
        },
        {
          number: 3,
          title: 'Select Month and Year',
          description: 'Choose the payroll period',
          details: [
            'Select the month and year for employee salaries filed',
            'Example: January 2025 for Jan salaries remitted',
            'System shows "Open" or "Draft" status for unsubmitted months',
            'Verify payroll period matches your salary payment dates'
          ]
        },
        {
          number: 4,
          title: 'Enter Employee Data',
          description: 'Input salary and tax withholding information',
          details: [
            'Number of Employees: Total employed during month',
            'Gross Salaries: Sum of all employees\' gross pay',
            'PAYE Tax Withheld: Total tax deducted from employees',
            'CRA (Consolidated Relief Allowance): Auto-calculated as ₦200K + 20% of gross',
            'Relief at Source (RAS): If self-assessed by employee',
            'System calculates tax liability and remittance due'
          ]
        },
        {
          number: 5,
          title: 'Submit and Remit',
          description: 'File return and process payment',
          details: [
            'Click "Calculate Tax" → System shows PAYE due',
            'If amount matches your bank records, click "Submit"',
            'FIRS displays payment reference number (RRR)',
            'Pay via bank transfer or online immediately',
            'Attach payment proof to submission for verification',
            'Deadline to remit: 10th of following month'
          ],
          deadline: 'Must remit by 10th of the following month'
        }
      ]
    },
    {
      name: 'CIT',
      icon: '🏢',
      color: 'purple',
      deadline: '6 months after year-end',
      steps: [
        {
          number: 1,
          title: 'Log into TaxPro Max',
          description: 'Access FIRS self-assessment portal',
          details: [
            'Visit: https://taxpromax.firs.gov.ng',
            'Login with TIN and password',
            'Look for "Self-Assessment" or "Tax Computation" section',
            'Select "Company Income Tax (CIT)" from options'
          ],
          link: 'https://taxpromax.firs.gov.ng'
        },
        {
          number: 2,
          title: 'Navigate to CIT Self-Assessment',
          description: 'Access annual tax computation form',
          details: [
            'Click "Filings" → "CIT Self-Assessment"',
            'Or select "Annual Returns" → "CIT"',
            'List shows previous years filed and current year (if open)',
            'Status shows "Draft" (not yet filed) or "Submitted" (filed)'
          ]
        },
        {
          number: 3,
          title: 'Select Tax Year',
          description: 'Choose the financial year to file',
          details: [
            'Select the calendar year (2024, 2025, etc.)',
            'Note: CIT filing covers January 1 – December 31 of year',
            'System opens filing window typically from January of next year',
            'Form should be completed and filed by June 30 of year following tax year'
          ]
        },
        {
          number: 4,
          title: 'Enter CIT Computation',
          description: 'Complete tax liability calculation',
          details: [
            'Gross Revenue: Total annual sales (include exempt items)',
            'Less: Cost of Goods Sold (actual COGS from books)',
            'Gross Profit: Revenue - COGS',
            'Less: Allowable Deductions (s.24 CITA)',
            '  ◦ Salaries & Benefits',
            '  ◦ Rent & Utilities',
            '  ◦ Insurance, Professional Fees, Marketing',
            '  ◦ Repairs & Maintenance',
            'Less: Capital Allowances (Initial 50%, Annual 25% on plant/machinery)',
            'Assessable Profit: Net taxable income',
            'Apply CIT Rate: 0% (₦0–₦25M), 20% (₦25M–₦100M), 30% (>₦100M)',
            'CIT Payable: Assessable Profit × Tax Rate'
          ]
        },
        {
          number: 5,
          title: 'Submit and File',
          description: 'Complete CIT filing and arrange payment',
          details: [
            'Review all entries for accuracy',
            'Click "Calculate" → System displays CIT due',
            'Compare to your accounting records (reconcile if different)',
            'Click "Submit" to finalize',
            'FIRS issues Assessment Notice with payment due date',
            'Make payment via bank transfer (RRR from FIRS)',
            'Keep payment proof for audit trail',
            'Deadline: File within 6 months after tax year-end (by June 30)'
          ],
          deadline: 'Must file within 6 months of year-end'
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">FIRS Filing Guide</h2>
        <p className="text-sm text-gray-600">Step-by-step instructions for filing VAT, PAYE, and CIT on TaxPro Max portal</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <HelpCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">TaxPro Max Portal: https://taxpromax.firs.gov.ng</p>
          <p className="text-xs mt-1">Use your TIN (Tax Identification Number) to login. Contact FIRS: 0700-FIRS-TAX (3477-829) or support@firs.gov.ng</p>
        </div>
      </div>

      {/* Filing Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.name} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => setOpenSection(openSection === section.name ? '' : section.name)}
              className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                section.color === 'blue' ? 'bg-blue-50' :
                section.color === 'green' ? 'bg-green-50' :
                'bg-purple-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{section.icon}</span>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
                  {section.deadline && (
                    <p className="text-xs text-gray-600 mt-0.5">Deadline: {section.deadline}</p>
                  )}
                </div>
              </div>
              {openSection === section.name ? (
                <ChevronUp size={24} className="text-gray-600" />
              ) : (
                <ChevronDown size={24} className="text-gray-600" />
              )}
            </button>

            {/* Section Content */}
            {openSection === section.name && (
              <div className="px-6 py-6 border-t border-gray-200 space-y-6">
                {section.steps.map((step) => {
                  const stepId = `${section.name}-step-${step.number}`;
                  const isCompleted = completedSteps[stepId];

                  return (
                    <div key={step.number} className="pb-6 border-b border-gray-200 last:border-b-0 last:pb-0">
                      {/* Step Header */}
                      <div className="flex items-start gap-4 mb-3">
                        <button
                          onClick={() => toggleStep(stepId)}
                          className="mt-1 flex-shrink-0 focus:outline-none"
                        >
                          {isCompleted ? (
                            <CheckCircle size={24} className="text-green-600" />
                          ) : (
                            <Circle size={24} className="text-gray-300" />
                          )}
                        </button>
                        <div className="flex-1">
                          <h4 className={`text-base font-semibold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            Step {step.number}: {step.title}
                          </h4>
                          <p className={`text-sm mt-1 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {/* Step Details */}
                      <div className="ml-10 space-y-2">
                        {step.details.map((detail, idx) => (
                          <p key={idx} className={`text-sm leading-relaxed ${isCompleted ? 'text-gray-400' : 'text-gray-700'}`}>
                            {detail}
                          </p>
                        ))}

                        {step.link && (
                          <a
                            href={step.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mt-3"
                          >
                            <ExternalLink size={14} />
                            Open TaxPro Max
                          </a>
                        )}

                        {step.deadline && (
                          <p className="text-sm font-medium text-red-600 mt-3 bg-red-50 px-3 py-2 rounded">
                            ⏰ {step.deadline}
                          </p>
                        )}
                      </div>

                      {/* Ask TaxAdvisor Button */}
                      <a
                        href={`#tax-advisor?question=Help me with step ${step.number}: ${step.title}`}
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mt-4 px-3 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        <HelpCircle size={14} />
                        Ask TaxAdvisor about this step
                      </a>
                    </div>
                  );
                })}

                {/* Section Complete Message */}
                {section.steps.every(step => completedSteps[`${section.name}-step-${step.number}`]) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-green-800 font-medium">✓ All {section.name} filing steps completed!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Compliance Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="font-semibold text-amber-900 mb-3">🎯 Compliance Best Practices</h3>
        <ul className="space-y-2 text-sm text-amber-800">
          <li>✓ File on time to avoid penalties (10% of tax due + ₦10,000/month for VAT; 10% for CIT)</li>
          <li>✓ Keep all receipts and invoices for 6 years (FIRS audit limitation period)</li>
          <li>✓ Reconcile your POS records with TaxPro Max figures before filing</li>
          <li>✓ Save FIRS Acknowledgment Numbers as proof of filing</li>
          <li>✓ If you make a mistake, file an amended return within 30 days of discovery</li>
          <li>✓ Register for VAT once turnover reaches ₦25M (can register voluntarily before)</li>
          <li>✓ Voluntary disclosure available if you discover under-remittance (Finance Act 2023)</li>
        </ul>
      </div>
    </div>
  );
};

export default FIRSFilingGuide;
