// import { useEffect, useState, useCallback } from 'react';
// import { Link } from 'react-router-dom';
// import { getEmployees, getDepartments, changeEmployeeStatus } from '../../api/employees';
// import './Employees.css';

// export default function EmployeeList({ canEdit = true }) {
//   const [rows, setRows] = useState([]);
//   const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
//   const [departments, setDepartments] = useState([]);
//   const [filters, setFilters] = useState({ search: '', department_id: '', status: '' });
//   const [page, setPage] = useState(1);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   const load = useCallback(async () => {
//     setLoading(true); setError('');
//     try {
//       const res = await getEmployees({ ...filters, page, limit: 10 });
//       setRows(res.data); setMeta(res.meta);
//     } catch (e) {
//       setError(e.response?.data?.message || 'Failed to load employees');
//     } finally { setLoading(false); }
//   }, [filters, page]);

//   useEffect(() => { getDepartments().then(setDepartments).catch(() => {}); }, []);
//   // debounce typing in the search box
//   useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

//   const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

//   const toggleStatus = async (emp) => {
//     const next = emp.status === 'active' ? 'inactive' : 'active';
//     let reason = '';
//     if (next === 'inactive') {
//       reason = window.prompt(`Reason for deactivating ${emp.first_name} ${emp.last_name}?`);
//       if (reason === null) return;
//     }
//     try { await changeEmployeeStatus(emp.id, next, reason); load(); }
//     catch (e) { alert(e.response?.data?.message || 'Could not change status'); }
//   };

//   return (
//     <div className="emp-page">
//       <div className="emp-header">
//         <h2>Employees <span className="emp-count">({meta.total})</span></h2>
//         {canEdit && <Link className="btn btn-primary" to="/employees/new">+ Add Employee</Link>}
//       </div>

//       <div className="emp-filters">
//         <input placeholder="Search name, email or code..." value={filters.search}
//                onChange={(e) => setFilter('search', e.target.value)} />
//         <select value={filters.department_id} onChange={(e) => setFilter('department_id', e.target.value)}>
//           <option value="">All departments</option>
//           {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
//         </select>
//         <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
//           <option value="">All statuses</option>
//           <option value="active">Active</option>
//           <option value="inactive">Inactive</option>
//           <option value="terminated">Terminated</option>
//         </select>
//       </div>

//       {error && <div className="alert alert-error">{error}</div>}

//       <div className="table-wrap">
//         <table className="emp-table">
//           <thead>
//             <tr><th>Code</th><th>Name</th><th>Email</th><th>Department</th><th>Position</th><th>Status</th><th></th></tr>
//           </thead>
//           <tbody>
//             {loading ? <tr><td colSpan="7" className="center">Loading...</td></tr>
//               : rows.length === 0 ? <tr><td colSpan="7" className="center">No employees found</td></tr>
//               : rows.map((e) => (
//                 <tr key={e.id}>
//                   <td>{e.employee_code}</td>
//                   <td><Link to={`/employees/${e.id}`}>{e.first_name} {e.last_name}</Link></td>
//                   <td>{e.email}</td>
//                   <td>{e.department_name || '-'}</td>
//                   <td>{e.position_title || '-'}</td>
//                   <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
//                   <td className="actions">
//                     <Link to={`/employees/${e.id}`}>View</Link>
//                     {canEdit && <>
//                       <Link to={`/employees/${e.id}/edit`}>Edit</Link>
//                       <button className="link-btn" onClick={() => toggleStatus(e)}>
//                         {e.status === 'active' ? 'Deactivate' : 'Activate'}
//                       </button>
//                     </>}
//                   </td>
//                 </tr>
//               ))}
//           </tbody>
//         </table>
//       </div>

//       <div className="pager">
//         <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
//         <span>Page {meta.page} of {meta.pages || 1}</span>
//         <button disabled={page >= meta.pages} onClick={() => setPage(page + 1)}>Next</button>
//       </div>
//     </div>
//   );
// }
