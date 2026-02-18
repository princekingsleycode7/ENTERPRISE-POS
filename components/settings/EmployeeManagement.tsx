import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Power, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { Employee, Role } from '../../types';
import { settingsService } from '../../services/settings/settingsService';
import { useAuthStore } from '../../stores/useAuthStore';
import { pinAuth } from '../../services/auth/pinAuth';
import { ReauthModal } from '../auth/ReauthModal';

export const EmployeeManagement: React.FC = () => {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => Promise<void> | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', pin: '', role: 'cashier' as Role });

  const loadEmployees = async () => {
    const data = await settingsService.getAllEmployees();
    setEmployees(data);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || (!editingEmp && !formData.pin)) return;

    if (editingEmp) {
       // Update logic
       const updates: Partial<Employee> = { 
         name: formData.name, 
         role: formData.role 
       };
       if (formData.pin) {
         updates.pin_hash = await pinAuth.hashPIN(formData.pin);
       }
       await settingsService.updateEmployee(editingEmp.id!, updates, user!.id);
    } else {
       // Create logic
       const pinHash = await pinAuth.hashPIN(formData.pin);
       await settingsService.addEmployee({
         name: formData.name,
         role: formData.role,
         pin_hash: pinHash,
         active: true
       }, user!.id);
    }
    
    setIsFormOpen(false);
    setEditingEmp(null);
    setFormData({ name: '', pin: '', role: 'cashier' });
    loadEmployees();
  };

  const openEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setFormData({ name: emp.name, pin: '', role: emp.role });
    setIsFormOpen(true);
  };

  const openCreate = () => {
    setEditingEmp(null);
    setFormData({ name: '', pin: '', role: 'cashier' });
    setIsFormOpen(true);
  };

  const toggleStatus = (emp: Employee) => {
    const action = async () => {
      if (emp.active) {
        await settingsService.deactivateEmployee(emp.id!, user!.id);
      } else {
        await settingsService.activateEmployee(emp.id!, user!.id);
      }
      loadEmployees();
    };
    
    // Require auth for deactivation
    if (emp.active) {
      setPendingAction(() => action);
      setIsAuthOpen(true);
    } else {
      action();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Users size={20} /> User Management
        </h3>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={18} /> Add Employee
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                <td className="px-6 py-4 capitalize">{emp.role}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    emp.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {emp.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => toggleStatus(emp)}
                      className={`p-1 rounded ${emp.active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                      title={emp.active ? "Deactivate" : "Activate"}
                    >
                      <Power size={18} />
                    </button>
                    <button 
                      onClick={() => openEdit(emp)}
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">
              {editingEmp ? 'Edit Employee' : 'Add New Employee'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                 <input
                   type="text"
                   required
                   className="w-full border border-gray-300 rounded-lg p-2"
                   value={formData.name}
                   onChange={e => setFormData({ ...formData, name: e.target.value })}
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                 <select
                   className="w-full border border-gray-300 rounded-lg p-2"
                   value={formData.role}
                   onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                 >
                   <option value="cashier">Cashier</option>
                   <option value="manager">Manager</option>
                   <option value="admin">Admin</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   {editingEmp ? 'Reset PIN (Leave blank to keep current)' : 'PIN (4 Digits)'}
                 </label>
                 <input
                   type="password"
                   pattern="[0-9]*"
                   inputMode="numeric"
                   maxLength={4}
                   required={!editingEmp}
                   className="w-full border border-gray-300 rounded-lg p-2"
                   value={formData.pin}
                   onChange={e => setFormData({ ...formData, pin: e.target.value })}
                 />
               </div>
               <div className="flex justify-end gap-2 mt-6">
                 <Button variant="ghost" onClick={() => setIsFormOpen(false)} type="button">Cancel</Button>
                 <Button type="submit">Save Employee</Button>
               </div>
            </form>
          </div>
        </div>
      )}

      <ReauthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={async () => {
          if (pendingAction) await pendingAction();
          setPendingAction(null);
        }}
        actionName="modify employee status"
      />
    </div>
  );
};