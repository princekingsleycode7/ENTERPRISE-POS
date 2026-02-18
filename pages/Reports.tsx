import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Download, RefreshCw, BarChart2, Users, ShoppingCart } from 'lucide-react';
import { Button } from '../components/common/Button';
import { SalesSummary } from '../components/reports/SalesSummary';
import { ProductPerformance } from '../components/reports/ProductPerformance';
import { EmployeePerformance } from '../components/reports/EmployeePerformance';
import { reportService, SalesSummaryData, ProductPerformanceData, EmployeePerformanceData } from '../services/reports/reportService';
import { useAuthStore } from '../stores/useAuthStore';

type ReportType = 'summary' | 'products' | 'employees';
type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export const Reports: React.FC = () => {
  const { hasPermission } = useAuthStore();
  
  // State
  const [activeTab, setActiveTab] = useState<ReportType>('summary');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [summaryData, setSummaryData] = useState<SalesSummaryData | null>(null);
  const [productData, setProductData] = useState<ProductPerformanceData[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeePerformanceData[]>([]);

  // Permission Check
  if (!hasPermission('view_reports')) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">You do not have permission to view reports.</p>
        </div>
      </div>
    );
  }

  const getDateDates = () => {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case 'today':
        start.setHours(0,0,0,0);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0,0,0,0);
        end.setDate(end.getDate() - 1);
        end.setHours(23,59,59,999);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'custom':
        return { 
          start: customStart ? new Date(customStart) : new Date(), 
          end: customEnd ? new Date(customEnd) : new Date() 
        };
    }
    return { start, end };
  };

  const fetchReportData = async () => {
    setLoading(true);
    const { start, end } = getDateDates();

    try {
      if (activeTab === 'summary') {
        const data = await reportService.getSalesSummary(start, end);
        setSummaryData(data);
      } else if (activeTab === 'products') {
        const data = await reportService.getProductPerformance(start, end);
        setProductData(data);
      } else if (activeTab === 'employees') {
        const data = await reportService.getEmployeePerformance(start, end);
        setEmployeeData(data);
      }
    } catch (error) {
      console.error("Failed to load report", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, dateRange, customStart, customEnd]);

  const handleExport = () => {
    const { start, end } = getDateDates();
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = `Report_${activeTab}_${start.toISOString().split('T')[0]}.csv`;

    if (activeTab === 'summary' && summaryData) {
       csvContent += "Metric,Value\n";
       csvContent += `Total Revenue,${summaryData.totalRevenue}\n`;
       csvContent += `Transactions,${summaryData.totalTransactions}\n`;
       // Add more summary details
    } else if (activeTab === 'products') {
       csvContent += "Name,Category,Sold,Revenue,Profit,Margin\n";
       productData.forEach(p => {
         csvContent += `"${p.name}",${p.category},${p.quantitySold},${p.revenue},${p.profit},${p.margin}\n`;
       });
    } else if (activeTab === 'employees') {
       csvContent += "Name,Transactions,Sales,Avg Sale\n";
       employeeData.forEach(e => {
         csvContent += `"${e.name}",${e.transactionCount},${e.totalSales},${e.averageSale}\n`;
       });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col h-full overflow-hidden">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Analyze sales performance and business metrics.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
           {/* Date Range Selector */}
           <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
             {(['today', 'yesterday', 'week', 'month', 'custom'] as DateRange[]).map(r => (
               <button
                 key={r}
                 onClick={() => setDateRange(r)}
                 className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                   dateRange === r ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                 }`}
               >
                 {r}
               </button>
             ))}
           </div>
           
           {dateRange === 'custom' && (
             <div className="flex gap-2">
               <input type="date" className="border rounded px-2 py-1 text-sm" value={customStart} onChange={e => setCustomStart(e.target.value)} />
               <input type="date" className="border rounded px-2 py-1 text-sm" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
             </div>
           )}

           <Button variant="secondary" onClick={handleExport} className="gap-2">
             <Download size={16} /> Export
           </Button>
           <Button variant="ghost" onClick={fetchReportData} className="p-2">
             <RefreshCw size={18} />
           </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart2 size={18} /> Sales Summary
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingCart size={18} /> Product Performance
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'employees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={18} /> Employee Performance
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        {activeTab === 'summary' && <SalesSummary data={summaryData} loading={loading} />}
        {activeTab === 'products' && <ProductPerformance data={productData} loading={loading} />}
        {activeTab === 'employees' && <EmployeePerformance data={employeeData} loading={loading} />}
      </div>
    </div>
  );
};